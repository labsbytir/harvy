---
publish: true
title: API reference
description: API Worker routes, access rules, scope, and implementation sources.
tags:
  - api
  - contracts
---

# API reference

This is a source-derived reference for the routes currently implemented in `v2/api/worker.ts` and `v2/api/investigations.ts`. It is not an OpenAPI document and it does not claim that the API Worker is deployed.

For copyable, source-checked requests and error handling, start with [[GETTING_STARTED|Get started]] and [[API_EXAMPLES|API examples]]. For per-endpoint parameter tables and request/response examples in three languages, see [[API_ENDPOINTS|API endpoints]].

## Common behavior

- `/health` is public and returns `Cache-Control: no-store`.
- Internal callback/publication routes require the configured Automation signature and are not browser endpoints.
- Every `/api/v1/*` route requires an authenticated actor, a configured SQL database, an organization/workspace scope, and the required capability.
- Product-scoped routes require an enabled product selected by `x-harvy-product` or the `product` query/body field.
- Writes use bounded JSON, revision checks, and tenant/workspace/product predicates.
- Errors have a stable code, an HTTP status, and a trace identifier.
- Private or tenant-scoped responses must not be publicly cached.

## Availability

The API Worker implements `GET /health` as a public health endpoint. Product requests under `/api/v1/` require an authenticated actor and configured storage; Automation callbacks are internal-only and are intentionally omitted from the public route inventory. See the repository source for those private contracts.

## Context and administration

| Method | Path | Capability / scope | Notes |
|---|---|---|---|
| `GET` | `/api/v1/context` | Authenticated actor | Returns tenant/workspace, role, products, capabilities, revisions, HQL version, and configured service health. |
| `GET` | `/api/v1/entitlements` | `entitlements.manage` | Lists product grants for the actor's tenant. |
| `PUT` | `/api/v1/entitlements` | `entitlements.manage` | Revision-checked product grant update; writes an audit record. |
| `GET` | `/api/v1/admin/audit` | `entitlements.manage` | Bounded audit feed for entitlement, monitor, and dashboard state. |
| `GET` | `/api/v1/sources` | `monitors.view` | Approved sources only; non-managers see enabled sources only; capped at 200. |
| `PATCH` | `/api/v1/sources/:source_id` | `monitors.manage` | Pause/resume an approved monitor with `expected_revision`. |

## Search and events

| Method | Path | Capability / scope | Notes |
|---|---|---|---|
| `GET` | `/api/v1/search` | `query.view` | Searches scoped events, evidence metadata, Newsk stories, dashboards, Ops actions, investigations, and entities. `q` max 120 characters; `limit` max 20. |
| `GET` | `/api/v1/events` | `events.view` | Product-scoped event list with bounded filters and pagination. |
| `GET` | `/api/v1/events/:event_id` | `evidence.view` | Returns one scoped event and source evidence. |
| `PATCH` | `/api/v1/events/:event_id` | `events.edit` | Revision-checked status/assignment update. Statuses: `new`, `reviewing`, `saved`, `closed`. |
| `POST` | `/api/v1/events/:event_id/handoff` | `events.handoff` | Creates an Ops action only for Tower/Civic events with evidence and Ops enabled. Idempotent for the same event. |

## Analytics and query

| Method | Path | Capability / scope | Notes |
|---|---|---|---|
| `GET` | `/api/v1/cube/meta` | `query.view` + enabled product | Returns registered cube metadata. |
| `GET` | `/api/v1/cube/load?query=<JSON>` | `query.view` + enabled product | Parses a bounded JSON cube query from the query string; encoded query max 65,536 bytes. |
| `POST` | `/api/v1/cube/load` | `query.view` + enabled product | Parses the bounded Drizzle Cube query body. |
| `POST` | `/api/v1/query` | `query.view` + enabled product | Parses the bounded HQL subset; dispatches engine-marked cubes to Basin and other cubes to the local analytics layer. |

The query contracts are defined in `v2/shared/hql.ts`, `v2/shared/cubes.ts`, and `v2/api/analytics.ts`. Raw SQL, unregistered cubes/fields, unbounded limits, joins, and unsupported operators are rejected.

## Newsk stories and briefs

| Method | Path | Capability / scope | Notes |
|---|---|---|---|
| `GET` | `/api/v1/stories` | Newsk + `stories.view` | Lists up to 100 workspace stories. |
| `POST` | `/api/v1/stories` | Newsk + `stories.edit` | Creates a draft from a scoped Newsk event. |
| `GET` | `/api/v1/stories/:story_id` | Newsk + `stories.view` | Reads one story. |
| `PATCH` | `/api/v1/stories/:story_id` | Newsk | Revision-checked story update through `updateStory`. |
| `POST` | `/api/v1/stories/:story_id/handoff` | Newsk + Ops + `stories.handoff` | Requires `ready` state and source evidence; creates an Ops action. |
| `POST` | `/api/v1/briefs` | Newsk + `stories.edit` | Creates an extractive, citation-bearing brief from a story. |
| `GET` | `/api/v1/briefs` | Newsk + `stories.view` | Lists up to 100 briefs. |

## Dashboards

| Method | Path | Capability / scope | Notes |
|---|---|---|---|
| `GET` | `/api/v1/dashboards` | `dashboards.view` | Returns visible dashboards for entitled products. |
| `POST` | `/api/v1/dashboards` | `dashboards.edit` | Creates a bounded private/workspace dashboard config. |
| `PATCH` | `/api/v1/dashboards/:dashboard_id` | `dashboards.edit` | Owner-only revision-checked update. |
| `DELETE` | `/api/v1/dashboards/:dashboard_id` | `dashboards.edit` | Owner-only revision-checked soft delete. |

Dashboard configs are validated by the shared schema; arbitrary JSON is not accepted as a dashboard contract.

## Runs and Automation dispatch

| Method | Path | Capability / scope | Notes |
|---|---|---|---|
| `POST` | `/api/v1/runs` | `runs.manage` | Registers an approved source snapshot, consumes quota, enforces idempotency, claims dispatch, and sends a bounded signed envelope. |
| `GET` | `/api/v1/runs` | `runs.view` | Lists up to 100 product-scoped runs. Idempotency keys are visible only to managers. |
| `GET` | `/api/v1/runs/:run_id` | `runs.view` | Reads one scoped run. |

The run envelope requires an approved registered source, `required_proxy: webshare`, `preflight_required: true`, `direct_fallback_allowed: false`, a 300-second deadline, and a stable idempotency key. The live Automation workflow and provider egress remain unverified.

## Investigations and graph

Implemented in [`v2/api/investigations.ts`](https://github.com/labsbytir/harvy/blob/main/v2/api/investigations.ts):

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/v1/investigations` | Lists scoped investigations. |
| `POST` | `/api/v1/investigations` | Creates an investigation. |
| `GET` | `/api/v1/investigations/:id` | Reads an investigation with up to 100 items. |
| `PATCH` | `/api/v1/investigations/:id` | Revision-checked title/summary/status update. |
| `POST` | `/api/v1/investigations/:id/items` | Adds a note or scoped event/evidence/entity/relationship item. |
| `DELETE` | `/api/v1/investigations/:id/items/:item_id` | Removes an item with revision checking. |
| `GET` | `/api/v1/entities` | Searches scoped entities. |
| `POST` | `/api/v1/entities` | Creates a typed entity. |
| `GET` | `/api/v1/entities/:id` | Reads an entity with evidence-backed relationships. |
| `POST` | `/api/v1/relationships` | Creates an evidence-backed observed/inferred/disputed relationship. |
| `GET` | `/api/v1/graph` | Returns capped scoped graph nodes and edges, optionally filtered by investigation. |

## Related contracts

- [[API_ENDPOINTS|API endpoints]] — per-endpoint parameter tables and examples.
- [[AUTH|Authentication and authorization]] — keys, sessions, roles.
- [[QUERY_GUIDE|Query guide]] — HQL and cube query contracts.
- [[DEVELOPER_STANDARDS|Developer standards]]
- [[CODEBASE|Codebase map]]
- [[STATUS|Implementation status]]
- `v2/shared/errors.ts` — error taxonomy and response shape.
- `v2/shared/automation.ts` — run envelope and callback contracts.
- `v2/shared/hql.ts` — HQL validation.
- `v2/shared/cubes.ts` — cube registry and engine selection.
