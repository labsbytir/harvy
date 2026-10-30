---
publish: true
title: API endpoints
description: Per-endpoint parameters, request examples in curl, JavaScript and Python, and response contracts.
tags: [api, reference]
---

# API endpoints

**Status:** Source-derived from `v2/api/worker.ts` and `v2/auth/worker.ts` on 2026-10-30. The hosted product API is unverified. Response examples are synthetic shapes, not live captures.

Every request below needs an API key and organization scope. Inject `HARVY_API_KEY` and `HARVY_ORGANIZATION_ID` via an approved secret mechanism ([[GETTING_STARTED|Get started]]); never hard-code them. Browser clients use session cookies instead and omit these headers. The server derives tenant/workspace from the actor — request parameters cannot widen scope. [[API_EXAMPLES|API examples]] has the narrative walkthrough; this page is the per-endpoint reference. Headers and roles are explained in [[AUTH|Authentication]]; analytics queries in [[QUERY_GUIDE|Query guide]].

## `GET /api/v1/context`

Returns the actor's tenant, workspace, role, allowed products, capabilities and contract revisions. Start every integration here to learn which products and capabilities the key actually has.

**Parameters:** none.

**Request:**

```sh
curl --fail-with-body --silent --show-error \
  -H "x-api-key: $HARVY_API_KEY" \
  -H "x-harvy-organization-id: $HARVY_ORGANIZATION_ID" \
  https://harvy.dev/api/v1/context
```

```js
// Node 18+ (global fetch)
const response = await fetch("https://harvy.dev/api/v1/context", {
  headers: {
    "x-api-key": process.env.HARVY_API_KEY,
    "x-harvy-organization-id": process.env.HARVY_ORGANIZATION_ID,
  },
});
if (!response.ok) throw new Error(`context ${response.status}`);
const context = await response.json();
console.log(context.allowedProducts, context.capabilities);
```

```python
# Python 3 (requires: pip install requests)
import os, requests

response = requests.get(
    "https://harvy.dev/api/v1/context",
    headers={
        "x-api-key": os.environ["HARVY_API_KEY"],
        "x-harvy-organization-id": os.environ["HARVY_ORGANIZATION_ID"],
    },
    timeout=30,
)
response.raise_for_status()
context = response.json()
print(context["allowedProducts"], context["capabilities"])
```

**Response (synthetic):**

```json
{
  "principalId": "00000000-0000-4000-8000-000000000001",
  "tenantId": "00000000-0000-4000-8000-000000000002",
  "workspaceId": "00000000-0000-4000-8000-000000000002",
  "tenantName": "Example organization",
  "role": "member",
  "allowedProducts": ["Newsk", "Tower"],
  "capabilities": ["query.view", "events.view", "evidence.view", "events.edit"],
  "featureRevision": "3",
  "ontologySchemaRevision": "1",
  "hqlVersion": 1
}
```

Note the camelCase fields in context versus `snake_case` in event records — a known contract inconsistency documented in [[DEVELOPER_STANDARDS|Developer standards]]. Follow the actual response. Errors: `401` no auth/org, `403` no membership.

## `GET /api/v1/events`

Lists product-scoped events, newest first, with cursor pagination.

**Parameters (query):**

| Name | Type | Required | Description |
|---|---|---|---|
| `product` | string | yes* | `Newsk`, `Tower`, `Ops`, or `Civic`. Exact case. *Required unless the tenant has exactly one enabled product. |
| `q` | string | no | Search in title/summary. Max 200 characters. |
| `from` | string | no | ISO date; `last_seen_at` lower bound. |
| `to` | string | no | ISO date; `last_seen_at` upper bound. |
| `status` | string | no | One of `new`, `reviewing`, `saved`, `closed`. |
| `source_id` | string | no | Only events with evidence from this source. |
| `limit` | integer | no | 1–100. Default 50. |
| `before` | string | no | Opaque cursor from the previous page's `next_cursor`. |

**Request:**

```sh
curl --fail-with-body --silent --show-error \
  -H "x-api-key: $HARVY_API_KEY" \
  -H "x-harvy-organization-id: $HARVY_ORGANIZATION_ID" \
  'https://harvy.dev/api/v1/events?product=Newsk&status=reviewing&limit=5'
```

```js
const params = new URLSearchParams({ product: "Newsk", status: "reviewing", limit: "5" });
const response = await fetch(`https://harvy.dev/api/v1/events?${params}`, {
  headers: {
    "x-api-key": process.env.HARVY_API_KEY,
    "x-harvy-organization-id": process.env.HARVY_ORGANIZATION_ID,
  },
});
const page = await response.json();
for (const event of page.items) console.log(event.id, event.title);
```

```python
import os, requests

response = requests.get(
    "https://harvy.dev/api/v1/events",
    headers={
        "x-api-key": os.environ["HARVY_API_KEY"],
        "x-harvy-organization-id": os.environ["HARVY_ORGANIZATION_ID"],
    },
    params={"product": "Newsk", "status": "reviewing", "limit": 5},
    timeout=30,
)
response.raise_for_status()
for event in response.json()["items"]:
    print(event["id"], event["title"])
```

**Response (synthetic):**

```json
{
  "items": [
    {
      "id": "00000000-0000-4000-8000-000000000003",
      "product": "Newsk",
      "title": "Example event title",
      "summary": "Example summary text.",
      "status": "reviewing",
      "assigned_to": null,
      "revision": 2,
      "first_seen_at": 1793100000000,
      "last_seen_at": 1793350000000,
      "latitude": null,
      "longitude": null,
      "evidence_count": 4
    }
  ],
  "next_cursor": "1793350000000:00000000-0000-4000-8000-000000000003"
}
```

Timestamps are Unix milliseconds. `next_cursor` is `null` when the page is complete; to fetch the next page pass it as `before` with identical filters. Errors: `400` invalid filter/cursor, `403` missing `events.view` or product entitlement, `401` no auth/org.

## `GET /api/v1/events/:event_id`

Returns one event with its evidence and state history.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `event_id` | path (UUID) | yes | Event ID returned by the list endpoint. |
| `product` | query string | yes* | Same rule as the list endpoint. |

**Request:**

```sh
curl --fail-with-body --silent --show-error \
  -H "x-api-key: $HARVY_API_KEY" \
  -H "x-harvy-organization-id: $HARVY_ORGANIZATION_ID" \
  "https://harvy.dev/api/v1/events/$EVENT_ID?product=Newsk"
```

```js
const response = await fetch(
  `https://harvy.dev/api/v1/events/${eventId}?product=Newsk`,
  {
    headers: {
      "x-api-key": process.env.HARVY_API_KEY,
      "x-harvy-organization-id": process.env.HARVY_ORGANIZATION_ID,
    },
  },
);
const detail = await response.json();
for (const item of detail.evidence) console.log(item.publisher, item.source_url);
```

```python
import os, requests

response = requests.get(
    f"https://harvy.dev/api/v1/events/{event_id}",
    headers={
        "x-api-key": os.environ["HARVY_API_KEY"],
        "x-harvy-organization-id": os.environ["HARVY_ORGANIZATION_ID"],
    },
    params={"product": "Newsk"},
    timeout=30,
)
response.raise_for_status()
for item in response.json()["evidence"]:
    print(item["publisher"], item["source_url"])
```

**Response (synthetic):** the event object above, plus:

```json
{
  "evidence": [
    {
      "id": "00000000-0000-4000-8000-000000000004",
      "source_id": "registered-source-id",
      "source_url": "https://publisher.example/article",
      "publisher": "Publisher name",
      "headline": "Source headline",
      "excerpt": "Relevant excerpt.",
      "captured_at": 1793300000000,
      "artifact_id": "manifest-id-or-null"
    }
  ],
  "activity": [
    {
      "revision": 2,
      "status": "reviewing",
      "assigned_to": null,
      "changed_by": "00000000-0000-4000-8000-000000000001",
      "changed_at": 1793350000000
    }
  ]
}
```

Evidence is capped at 100 rows, activity at 50. `artifact_id` is metadata, not a download URL. An event outside the actor's scope returns `404`, not `403` — do not probe other tenants' IDs. Errors: `403` missing `evidence.view`, `404` not found in scope.

## `PATCH /api/v1/events/:event_id`

Changes an event's status or assignment with optimistic concurrency.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `event_id` | path (UUID) | yes | Event ID. |
| `product` | query string | yes* | Same rule as the list endpoint. |
| `status` | body string | no* | `new`, `reviewing`, `saved`, or `closed`. |
| `assigned_to` | body string/null | no* | Currently only the actor's own ID or `null`. |
| `expected_revision` | body integer | yes | The `revision` last read. A mismatch returns `409`. |

\* At least one of `status` or `assigned_to` must be present.

**Request (curl):**

```sh
curl --fail-with-body --silent --show-error -X PATCH \
  -H "x-api-key: $HARVY_API_KEY" \
  -H "x-harvy-organization-id: $HARVY_ORGANIZATION_ID" \
  -H 'Content-Type: application/json' \
  --data "{\"status\":\"reviewing\",\"expected_revision\":$EVENT_REVISION}" \
  "https://harvy.dev/api/v1/events/$EVENT_ID?product=Newsk"
```

```js
// Read-modify-write: never hard-code a revision.
const detail = await response.json(); // from GET event detail
const update = await fetch(
  `https://harvy.dev/api/v1/events/${eventId}?product=Newsk`,
  {
    method: "PATCH",
    headers: {
      "x-api-key": process.env.HARVY_API_KEY,
      "x-harvy-organization-id": process.env.HARVY_ORGANIZATION_ID,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: "reviewing", expected_revision: detail.revision }),
  },
);
if (update.status === 409) {
  // Conflict: re-read the event, then decide whether to retry.
  throw new Error("revision_conflict");
}
```

```python
import os, requests

detail = requests.get(
    f"https://harvy.dev/api/v1/events/{event_id}",
    headers={
        "x-api-key": os.environ["HARVY_API_KEY"],
        "x-harvy-organization-id": os.environ["HARVY_ORGANIZATION_ID"],
    },
    params={"product": "Newsk"},
    timeout=30,
).json()

update = requests.patch(
    f"https://harvy.dev/api/v1/events/{event_id}",
    headers={
        "x-api-key": os.environ["HARVY_API_KEY"],
        "x-harvy-organization-id": os.environ["HARVY_ORGANIZATION_ID"],
    },
    params={"product": "Newsk"},
    json={"status": "reviewing", "expected_revision": detail["revision"]},
    timeout=30,
)
if update.status_code == 409:
    raise RuntimeError("revision_conflict: re-read the event before retrying")
update.raise_for_status()
```

**Response:** the full event detail (same shape as `GET`), with the incremented `revision`. Errors: `400` invalid body/status, `403` missing `events.edit` or invalid assignment, `404` out of scope, `409` stale `expected_revision`. This writes real data — do not call it as a connection test.

## `GET /api/v1/search`

Searches events, evidence, stories (Newsk), dashboards, Ops actions, investigations and entities in one call.

**Parameters (query):**

| Name | Type | Required | Description |
|---|---|---|---|
| `q` | string | yes | Search term, 2–120 characters. |
| `product` | string | yes* | Product scope. |
| `limit` | integer | no | 1–20. Default 10. |
| `from`, `to` | string | no | ISO date bounds. |

**Request:**

```sh
curl --fail-with-body --silent --show-error \
  -H "x-api-key: $HARVY_API_KEY" \
  -H "x-harvy-organization-id: $HARVY_ORGANIZATION_ID" \
  'https://harvy.dev/api/v1/search?q=substation&product=Newsk&limit=12'
```

**Response (synthetic):**

```json
{
  "items": [
    {
      "type": "event",
      "id": "00000000-0000-4000-8000-000000000003",
      "product": "Newsk",
      "title": "Example event title",
      "description": "Example summary text.",
      "updated_at": 1793350000000
    }
  ]
}
```

`type` is one of `event`, `evidence`, `story`, `dashboard`, `action`, `investigation`, `entity`; items may carry `event_id` or `source_product`. Results are capped at `limit` and sorted by `updated_at` descending. Errors: `400` invalid term/range, `403` missing `query.view`.

## `GET /api/v1/entitlements` and `PUT /api/v1/entitlements`

Platform administration of product grants. Requires the `entitlements.manage` capability (platform-admin flag). `GET` lists one row per product. `PUT` changes one grant.

**PUT body:**

| Name | Type | Required | Description |
|---|---|---|---|
| `product` | string | yes | `Newsk`, `Tower`, `Ops`, `Civic`. |
| `enabled` | boolean | yes | New state. |
| `expected_revision` | integer | yes | Current revision (`0` when the grant row does not exist yet). |

```sh
curl --fail-with-body --silent --show-error -X PUT   -H "x-api-key: $HARVY_API_KEY"   -H "x-harvy-organization-id: $HARVY_ORGANIZATION_ID"   -H 'Content-Type: application/json'   --data '{"product":"Newsk","enabled":true,"expected_revision":0}'   https://harvy.dev/api/v1/entitlements
```

Response: `{ "product": "Newsk", "enabled": true, "revision": 1 }`. Setting the same state returns the current revision without writing; a stale revision returns `409`. Every change writes an audit record. Errors: `403` missing capability, `400` invalid fields, `409` conflict.

## `GET /api/v1/sources` and `PATCH /api/v1/sources/:source_id`

Approved monitoring sources for one product. `GET` (capability `monitors.view`) lists up to 200 approved sources; without `monitors.manage` only enabled sources are visible. `PATCH` (capability `monitors.manage`) pauses or resumes one source.

**PATCH body:**

| Name | Type | Required | Description |
|---|---|---|---|
| `enabled` | boolean | yes | New monitor state. |
| `expected_revision` | integer ≥ 1 | yes | Current source revision. |

```sh
curl --fail-with-body --silent --show-error -X PATCH   -H "x-api-key: $HARVY_API_KEY"   -H "x-harvy-organization-id: $HARVY_ORGANIZATION_ID"   -H 'Content-Type: application/json'   --data '{"enabled":false,"expected_revision":3}'   "https://harvy.dev/api/v1/sources/$SOURCE_ID?product=Newsk"
```

Response: `{ "id": "…", "enabled": false, "revision": 4 }`. Only approved, registered sources exist here; unregistered IDs return `404`. Errors: `400`, `403`, `404`, `409 revision_conflict`.

## Stories (Newsk)

Stories turn a Newsk event into a reviewable narrative. All story routes require the `Newsk` product enabled.

**`GET /api/v1/stories`** (capability `stories.view`) — lists up to 100 workspace stories: `{ id, event_id, title, notes, status, revision, created_at, updated_at }`.

**`POST /api/v1/stories`** (capability `stories.edit`) — creates a draft from a scoped Newsk event.

| Body field | Type | Constraints |
|---|---|---|
| `event_id` | UUID | must be a Newsk event in the caller's workspace |
| `title` | string | 1–240 characters |
| `notes` | string | up to 20,000 characters |

```sh
curl --fail-with-body --silent --show-error -X POST   -H "x-api-key: $HARVY_API_KEY"   -H "x-harvy-organization-id: $HARVY_ORGANIZATION_ID"   -H 'Content-Type: application/json' \
  --data "{\"event_id\":\"$EVENT_ID\",\"title\":\"Draft story\",\"notes\":\"Working notes.\"}"   https://harvy.dev/api/v1/stories
```

Returns `201` with the created story (`status: "draft"`, `revision: 1`). A non-scoped event returns `404`.

**`GET /api/v1/stories/:story_id`** — one story or `404`.

**`PATCH /api/v1/stories/:story_id`** — revision-checked update (capability `stories.edit`): body is `{ title, notes, status, revision }` with `status` one of `draft`, `ready`, `archived`, and `revision` equal to the current one. A `handed_off` story cannot be edited (`409 story_handed_off`). Stale revision returns `409`.

**`POST /api/v1/stories/:story_id/handoff`** (capability `stories.handoff`) — requires `Newsk` **and** `Ops` enabled. The story must be `ready`, its event must have at least one evidence row (`409 insufficient_evidence` otherwise). Creates an Ops action and marks the story `handed_off` in one batch. Response `201`: `{ action_id, story_id, status: "open", created_at }`. Idempotent per story.

## Briefs (Newsk)

**`POST /api/v1/briefs`** (capability `stories.edit`) — generates an extractive, citation-bearing brief from a story. Body: `{ "story_id": "…" }`. The story's event must have at least one evidence row (`409 insufficient_evidence` otherwise). Response `201`: `{ id, title, body, citations, generated_by: "extractive", created_at }` where `citations` is the evidence list (URL, publisher, headline, captured time). The body concatenates story notes with numbered source citations — it is extractive, not model-generated prose.

**`GET /api/v1/briefs`** (capability `stories.view`) — up to 100 briefs.

## Ops actions

**`GET /api/v1/actions`** (Ops enabled, capability `ops.actions.view`) — up to 100 actions with story/event titles and the latest evidence source URL and publisher.

**`PATCH /api/v1/actions/:action_id`** (capability `ops.actions.edit`) — body `{ status, revision }`. Valid statuses and transitions:

| Current | Allowed next |
|---|---|
| `open` | `in_progress`, `cancelled` |
| `in_progress` | `open`, `done`, `cancelled` |
| `done` | — (terminal) |
| `cancelled` | `open` |

An illegal transition returns `409 invalid_transition`; a stale `revision` returns `409 revision_conflict`.

## Dashboards

**`GET /api/v1/dashboards`** (capability `dashboards.view`) — up to 100 visible dashboards: workspace-visible ones plus the caller's own. Each row carries `can_edit` (owner only).

**`POST /api/v1/dashboards`** (capability `dashboards.edit`):

| Body field | Type | Constraints |
|---|---|---|
| `title` | string | 1–160 characters |
| `product` | string | one of the four products, enabled for the tenant |
| `config` | object | must pass the shared dashboard schema; JSON ≤ 32,000 characters |
| `description` | string | optional, ≤ 1,000 characters |
| `visibility` | string | `private` (default) or `workspace` |

Response `201`: `{ id, revision: 1, created_at, updated_at }`. Arbitrary JSON is rejected (`400 invalid_dashboard`).

**`PATCH /api/v1/dashboards/:dashboard_id`** — owner-only; body repeats `title`, `config`, optional `description`/`visibility`, plus `revision`. Returns `409 revision_conflict` on mismatch.

**`DELETE /api/v1/dashboards/:dashboard_id`** — owner-only soft delete; body `{ "expected_revision": n }`. Response `{ "deleted": true }`.

## Runs (Automation dispatch)

**`POST /api/v1/runs`** (capability `runs.manage`) — registers and dispatches a collection run for an approved source.

| Body field | Type | Constraints |
|---|---|---|
| `source_id` | UUID | approved, enabled, registered source in the workspace |
| `idempotency_key` | string | 8–128 chars of `A-Za-z0-9._:-`, stable per logical run |

```sh
curl --fail-with-body --silent --show-error -X POST \
  -H "x-api-key: $HARVY_API_KEY" \
  -H "x-harvy-organization-id: $HARVY_ORGANIZATION_ID" \
  -H 'Content-Type: application/json' \
  --data "{\"source_id\":\"$SOURCE_ID\",\"idempotency_key\":\"my-job-2026-10-30-a\"}" \
  https://harvy.dev/api/v1/runs
```

Response `202`: `{ run_id, status: "queued", idempotency_key, trace_id }`. Behavior worth knowing:

- **Idempotent**: the same key returns the existing run (`200` once it left `queued`). A key reused with a *different* `source_id` returns `409 idempotency_conflict`.
- **Bounded**: an hourly workspace quota can return `429 run_quota_exceeded`.
- **No direct fallback**: the dispatched envelope fixes the approved proxy path, requires preflight, and caps pages and a 300-second deadline. The dispatch call itself has a 15-second timeout; an ambiguous outcome is recorded as `dispatch_unconfirmed` (`error_code`) rather than silently failed.
- The live Automation workflow is **unverified** — see [[STATUS|Implementation status]].

**`GET /api/v1/runs?product=…`** (capability `runs.view`) — up to 100 runs. `idempotency_key` is included only for `runs.manage` actors. **`GET /api/v1/runs/:run_id`** — one run or `404`.

## Error reference

All endpoints share the envelope from [[API_EXAMPLES|API examples]]: `{"error": {"code", "message", "trace_id", "retryable"}}`.

| HTTP | `code` (common) | Meaning | Client action |
|---|---|---|---|
| 400 | `invalid_request`, `invalid_search`, `invalid_event_update`, `invalid_query` | Bounded input failed validation | Fix the request; do not retry unchanged |
| 401 | `unauthorized` | Missing/invalid key or session | Authenticate and select an organization |
| 403 | `forbidden` | Capability or product entitlement missing | Do not retry; request access |
| 404 | `not_found` | Record absent or outside scope | Treat out-of-scope as not found |
| 409 | `revision_conflict` | Stale `expected_revision` | Re-read, decide, retry if appropriate |
| 413 | `too_large` | Body above 65,536 bytes | Reduce payload |
| 503 | `unavailable` | Storage or analytics dependency unprovisioned | Retry later or report with `trace_id` |

The complete catalog with every code is [[ERRORS|Errors]]; bounds are in [[LIMITS|Limits]]. Exact behavior is authoritative in `v2/api/worker.ts`; this is a source-derived summary, not generated OpenAPI.

## See also

- [[GETTING_STARTED|Get started]] — environment setup and first request.
- [[API_EXAMPLES|API examples]] — pagination, evidence and safe-update walkthrough.
- [[API_REFERENCE|API reference]] — full route inventory including stories, dashboards, runs, investigations.
- [[CODE_WALKTHROUGH|Code walkthrough]] — how these endpoints work inside the Workers.
