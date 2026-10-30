---
publish: true
title: Code walkthrough
description: How a Harvy API request actually works — auth, scoping, validation and concurrency explained from the source.
tags: [guide, architecture]
---

# Code walkthrough

**Status:** Explanations are source-derived from this checkout (2026-10-30) and illustrate the real code paths in `v2/auth/worker.ts`, `v2/api/worker.ts` and `v2/shared/`. Snippets are annotated excerpts; the files are authoritative. Deployment status is in [[STATUS|Implementation status]].

This page explains **what the code does and why**, so you can extend it safely. It pairs with [[API_ENDPOINTS|API endpoints]] (external contract) and [[CODEBASE|Codebase map]] (file ownership).

## The anatomy of one request

A call to `GET /api/v1/events?product=Newsk` passes through four layers:

```text
browser/client
  -> v2/api/worker.ts   fetch() entry, route match
  -> v2/auth/worker.ts  actor() resolution (session OR api key)
  -> capability + product entitlement checks
  -> scoped SQL query   (tenant_id, workspace_id, product bound FIRST)
  -> JSON response      (private, no-store)
```

The critical design rule at every layer: **scope comes from the authenticated actor, never from the request body or query parameters.** A caller who passes someone else's tenant ID gets nothing.

## Layer 1: the API Worker routes

`v2/api/worker.ts` exports one `fetch` handler. It resolves the database (PostgreSQL via Hyperdrive, with a D1 path for local/test), then dispatches on the URL:

```ts
export default {
  async fetch(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
    const db = databaseFor(env);
    try { return await handleApiRequest(request, env, db); }
    finally {
      if (db instanceof PostgresDatabase) {
        if (ctx) ctx.waitUntil(db.close());
        else await db.close();
      }
    }
  },
};
```

What to notice: the database connection is **per-request and closed in `finally`**, even on error paths. When you add a route, you do not manage connections — you receive the `db` handle. `handleApiRequest` creates a `traceId()` per request and returns it inside every error envelope, so a user-reported failure can be correlated to a log line.

## Layer 2: who is the caller?

`actor()` in `v2/api/worker.ts` forwards the request headers to the auth Worker's internal endpoint and trusts only its answer:

```ts
async function actor(request: Request, env: Env): Promise<Actor | null> {
  try {
    const authRequest = new Request("https://auth.internal/__internal/actor", { headers: request.headers });
    const response = await env.AUTH.fetch(authRequest);
    if (!response.ok) return null;
    const value = await response.json() as Partial<Actor>;
    if (typeof value.id !== "string" || typeof value.tenantId !== "string" ||
        typeof value.workspaceId !== "string" || typeof value.tenantName !== "string" || typeof value.role !== "string") return null;
    return { ...value, harvyAdmin: value.harvyAdmin === true } as Actor;
  } catch { return null; }
}
```

In `v2/auth/worker.ts`, `resolveActor` accepts **two** authentication methods and no others:

1. **Browser session** — Better Auth session cookie. The active organization becomes the tenant; membership is verified in the `member` table.
2. **API key** — `x-api-key: harvy_live_…` header (or `Authorization: Bearer harvy_live_…`). The key is verified, its `referenceId` resolves the user, and the **`x-harvy-organization-id` header is mandatory** — a key alone is not scope. Membership in that organization is verified before any actor is returned.

```ts
const apiKey = request.headers.get("x-api-key")
  || (authorization.startsWith("Bearer harvy_live_") ? authorization.slice(7).trim() : "");
// ...
const tenantId = request.headers.get("x-harvy-organization-id");
if (!tenantId) return Response.json({ error: "Organization scope required." }, { status: 403 });
const member = await db.prepare(
  "SELECT role FROM member WHERE organization_id = ? AND user_id = ? LIMIT 1",
).bind(tenantId, user.id).first<{ role: string }>();
```

Why it matters for you: if your request returns `401`/`403`, it is almost always a missing organization header, a key belonging to a non-member, or a disabled product — not a wrong URL. When extending auth, never derive `tenantId` from a request field; take it from the verified session or verified membership as this code does.

## Layer 3: capability and product checks

Each route gates on a capability string derived from the actor's role:

```ts
if (pathname === "/api/v1/events" && request.method === "GET") {
  if (!has(a, "events.view")) return fail("forbidden", "Event access denied.", 403, trace);
  const product = await entitledProduct(db, a.tenantId, url.searchParams.get("product"));
  if (!product) return fail("forbidden", "Choose a product enabled for this organization.", 403, trace);
  // ...
}
```

`has()` re-derives the capability list from `role` + `harvyAdmin` — there is no capability stored on the client. `entitledProduct` resolves the requested product against the tenant's enabled products; when a tenant has exactly one product, the parameter may be omitted. A product name in the URL never grants access — it only *narrows* access the tenant already has.

The `PRODUCTS` constant (`Newsk`, `Tower`, `Ops`, `Civic`) is case-sensitive. Adding a product means updating `PRODUCTS`, the entitlements contract, and capability checks — not just accepting a new string.

## Layer 4: the scoped query pattern

`listEvents` shows the house style for every read in the system:

```ts
const where = ["e.tenant_id = ?", "e.workspace_id = ?", "e.product = ?"];
const args: (string | number)[] = [a.tenantId, a.workspaceId, product];
if (search) { where.push("lower(e.title || ' ' || e.summary) LIKE lower(?) ESCAPE '\\'"); args.push(likePattern(search)); }
if (from !== null) { where.push("e.last_seen_at >= ?"); args.push(from); }
if (to !== null) { where.push("e.last_seen_at <= ?"); args.push(to); }
// ... cursor predicate ...
args.push(limit + 1);
```

Four habits to copy:

- **Scope predicates first, user filters after.** A future refactor that drops a `where` clause cannot accidentally unscope the query because the bound scope arguments are structural.
- **Parameter binding, never string interpolation.** `likePattern()` escapes `%`, `_` and `\` so a search term cannot become a wildcard scan.
- **Bounded input everywhere.** Search text ≤ 200 chars, `limit` clamped to 100, cursors validated as `time:id` with a UUID. Validation failures return `{ error: "invalid_…" }` before any SQL runs.
- **Fetch `limit + 1` rows** to detect a next page without a second count query, then return an opaque `next_cursor`. Clients pass the cursor back verbatim; the server re-validates it.

## Writes: optimistic concurrency

Mutable records carry a `revision` integer. Every write sends `expected_revision` and the UPDATE is conditional:

```ts
const result = await db.prepare(
  "UPDATE harvy_v2_events SET status = ?, assigned_to = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND tenant_id = ? AND workspace_id = ? AND product = ? AND revision = ?",
).bind(status, assignedTo, changedAt, eventMatch[1], a.tenantId, a.workspaceId, product, current.revision).run();
if (!result.meta.changes) return fail("revision_conflict", "Event changed elsewhere; reload it before saving.", 409, trace);
```

If two analysts edit the same event, the second write matches zero rows and gets `409 revision_conflict` instead of silently clobbering the first. State changes are also recorded in an activity table in the same batch, so history is append-only. When you add a mutable endpoint: carry a revision, guard the UPDATE, write audit/activity, return `409` on mismatch.

## Errors and observability

`v2/shared/errors.ts` defines the only public error shape:

```ts
export function harvyError(code: string, message: string, traceId: string, retryable = false): HarvyError {
  const safeCode = CODE.test(code) ? code : "internal";
  const safeMessage = typeof message === "string" && message.length > 0 ? message.slice(0, 300) : "Request failed.";
  return { error: { code: safeCode, message: safeMessage, trace_id: traceId, retryable } };
}
```

The envelope deliberately leaks nothing: codes match a strict pattern (unknown ones collapse to `internal`), messages are truncated, and stack traces/provider payloads never cross the boundary. The `trace_id` is the correlation key — log it server-side, surface it client-side. Responses default to `Cache-Control: private, no-store` so a shared cache cannot leak one tenant's data to another; never add public caching to a scoped response.

## Data ownership, in one screen

| Concern | Owner | File |
|---|---|---|
| Identity, sessions, API keys, membership | Auth Worker | `v2/auth/` |
| Product routes, capability gates, run dispatch | API Worker | `v2/api/worker.ts` |
| Investigations, entities, relationships | API Worker (module) | `v2/api/investigations.ts` |
| Shared error envelope, HQL, cubes, artifact manifests | Shared contracts | `v2/shared/` |
| Semantic analytics queries | Analytics layer / Basin compiler | `v2/api/analytics.ts` |
| Transactional records (events, evidence, runs…) | PostgreSQL via Hyperdrive | migrations + `sql-database.ts` |

For storage-boundary rules (PostgreSQL vs R2 vs Basin), see [[DATASET_ENGINEERING|Dataset engineering]].

## Where to look next

- [[API_ENDPOINTS|API endpoints]] — the external contract these layers implement.
- [[AUTH|Authentication and authorization]] — the two accepted auth methods in detail.
- [[TUTORIAL|Build an integration]] — put these contracts to work in a complete script.
- [[DEVELOPER_STANDARDS|Developer standards]] — conventions and the review checklist.
- [[CODEBASE|Codebase map]] — every module and its tests.
- `v2/tests/` — read the scoped-route tests before changing a boundary; extend them with the same shape.
