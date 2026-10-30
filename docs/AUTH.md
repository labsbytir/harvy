---
publish: true
title: Authentication and authorization
description: API keys, browser sessions, organization scope, roles, and capability checks.
tags: [api, auth, guide]
---

# Authentication and authorization

**Status:** Source-derived from `v2/auth/worker.ts`, `v2/auth/auth.ts` and `v2/api/worker.ts` on 2026-10-30. The deployed auth flow is unverified; see [[STATUS|Implementation status]].

Harvy accepts exactly two authentication methods. Everything else fails closed.

## API keys (server-to-server)

Keys are created through an authorized signed-in account and carry the `harvy_live_` prefix. Send either header form:

| Header | Value |
|---|---|
| `x-api-key` | the full key, e.g. `harvy_live_…` |
| `Authorization` | `Bearer harvy_live_…` (equivalent) |

A key alone is **not** scope. Every keyed request must also send:

| Header | Value |
|---|---|
| `x-harvy-organization-id` | the organization (tenant) ID the key's owner is a member of |

The auth Worker verifies the key, resolves its user, then verifies the user's membership in the named organization. A key with no organization header gets `403`; a key whose user is not a member gets `403`. Inject keys via an approved secret mechanism (`HARVY_API_KEY`), never in URLs, code or docs.

## Browser sessions

The web app signs in through the auth Worker (email sign-in is rate-limited to 5 attempts per minute) and keeps a session cookie. Browser requests use `credentials: "same-origin"` and do **not** send API-key headers. The active organization is stored on the session; if none is selected the request fails with "Select an organization."

Sign-up requires explicit privacy-policy acceptance; the consent is recorded with a policy version.

## Roles and capabilities

The actor's role (from organization membership) maps to a capability list:

| Role | Capabilities |
|---|---|
| `owner` / `admin` | all read capabilities + `events.edit`, `stories.edit`, `investigations.edit`, `stories.handoff`, `events.handoff`, `ops.actions.edit`, `monitors.manage`, `runs.manage`, `dashboards.edit`, `members.manage` |
| `member` / `editor` / `analyst` | all read capabilities + `events.edit`, `stories.edit`, `investigations.edit`, `stories.handoff`, `events.handoff`, `ops.actions.edit`, `runs.manage`, `dashboards.edit` |
| `viewer` | read-only: `query.view`, `events.view`, `evidence.view`, `stories.view`, `investigations.view`, `dashboards.view`, `monitors.view`, `runs.view`, `ops.actions.view` |
| `platform_admin` | platform administration only (no product reads by default) |

Read capabilities are: `query.view`, `events.view`, `evidence.view`, `stories.view`, `investigations.view`, `dashboards.view`, `monitors.view`, `runs.view`, `ops.actions.view`. A separate platform-admin flag (configured per user) adds `entitlements.manage`. `GET /api/v1/context` returns your exact list — trust that, not this table, if they ever diverge.

## Product entitlements

Capabilities decide *what* you may do; product entitlements decide *where*. Each organization enables products (`Newsk`, `Tower`, `Ops`, `Civic`) per tenant, and product-scoped routes require the requested product to be enabled. With exactly one enabled product the `product` parameter may be omitted; with several it is required (or the `x-harvy-product` header on cube routes).

## What the failure codes mean

| Status | Typical cause |
|---|---|
| `401 unauthorized` | missing/invalid key, expired session, or (on the auth Worker) missing configuration |
| `403 forbidden` | no organization header, non-member key, missing capability, or disabled product |
| `403` on sign-in routes | no active organization selected on the session |

Never treat a `403` as retryable — it is a policy result, not a transient failure.

## Source

- `v2/auth/worker.ts` — `resolveActor`: session path, key path, membership checks.
- `v2/auth/auth.ts` — Better Auth configuration, rate limits, API-key prefix.
- `v2/api/worker.ts` — `capabilities()` and `has()` gate every product route.

See [[API_ENDPOINTS|API endpoints]] for how these headers appear in each request.
