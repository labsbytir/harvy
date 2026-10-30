---
publish: true
title: API examples
description: Authenticated event reads, pagination, evidence, and revision-safe updates.
tags: [api, guide]
---

# API examples

**Status:** Source-checked against the local API Worker and browser client on 2026-10-30. Hosted product API behavior is unverified. No example response is a live observation.

These commands require an authorized account, a provisioned API, and `HARVY_API_KEY` and `HARVY_ORGANIZATION_ID` injected by an approved secret mechanism ([[GETTING_STARTED|Get started]]). Your organization must have `Newsk` enabled; casing matters. Never embed a key in a URL or document. The server derives tenant/workspace from the actor, not the `product` parameter.

## Check your capabilities

```sh
curl --fail-with-body --silent --show-error \
  -H "x-api-key: $HARVY_API_KEY" \
  -H "x-harvy-organization-id: $HARVY_ORGANIZATION_ID" \
  https://harvy.dev/api/v1/context
```

The context includes `allowedProducts`, `capabilities`, `tenantId`, `workspaceId`, `featureRevision` and `hqlVersion`. If `Newsk` or `events.view` is missing, stop. Adding a product parameter does not grant access. Source: [`v2/api/worker.ts`](https://github.com/labsbytir/harvy/blob/main/v2/api/worker.ts).

## List events

```sh
curl --fail-with-body --silent --show-error \
  -H "x-api-key: $HARVY_API_KEY" \
  -H "x-harvy-organization-id: $HARVY_ORGANIZATION_ID" \
  'https://harvy.dev/api/v1/events?product=Newsk&limit=5'
```

The response has `items` and `next_cursor` (`null` when done). An event has an `id`, `title`, `status`, `revision`, timestamps in Unix milliseconds and `evidence_count`. Empty results mean no **visible matching records**, not complete source coverage. Optional filters: `q`, `from`, `to`, `status`, `source_id`, `before`; dates such as `2026-10-30T00:00:00Z` must parse correctly. `limit` is capped at 100.

Use the returned cursor verbatim as `before`, with the same filters; encode it rather than concatenating it into a URL:

```js
// Run on the authenticated Harvy origin after selecting an organization.
const params = new URLSearchParams({ product: "Newsk", limit: "5" });
const response = await fetch(`/api/v1/events?${params}`, { credentials: "same-origin" });
if (!response.ok) throw new Error(`Events request failed: ${response.status}`);
const page = await response.json();
if (page.next_cursor) {
  params.set("before", page.next_cursor);
  const next = await fetch(`/api/v1/events?${params}`, { credentials: "same-origin" });
  if (!next.ok) throw new Error(`Next page failed: ${next.status}`);
  console.log((await next.json()).items);
}
```

Source: [`v2/web/src/api.ts`](https://github.com/labsbytir/harvy/blob/main/v2/web/src/api.ts) and [`v2/api/worker.ts`](https://github.com/labsbytir/harvy/blob/main/v2/api/worker.ts).

## Inspect evidence

Set `EVENT_ID` to an `id` from the authorized event list (a UUID):

```sh
curl --fail-with-body --silent --show-error \
  -H "x-api-key: $HARVY_API_KEY" \
  -H "x-harvy-organization-id: $HARVY_ORGANIZATION_ID" \
  "https://harvy.dev/api/v1/events/$EVENT_ID?product=Newsk"
```

The result adds `evidence` (up to 100 items with `publisher`, `source_url`, `headline`, `captured_at`) and `activity` (up to 50 items). `artifact_id` is metadata, **not** a downloadable object URL. Out-of-scope events return not found.

## Update only with authorization

Only an actor with `events.edit` can update an event. Use its current `revision`, not a fixed number. This **writes real data**, so do not run it as a connection test:

```sh
# Set EVENT_REVISION to the revision returned by the event-detail request.
curl --fail-with-body --silent --show-error -X PATCH \
  -H "x-api-key: $HARVY_API_KEY" \
  -H "x-harvy-organization-id: $HARVY_ORGANIZATION_ID" \
  -H 'Content-Type: application/json' \
  --data "{\"status\":\"reviewing\",\"expected_revision\":$EVENT_REVISION}" \
  "https://harvy.dev/api/v1/events/$EVENT_ID?product=Newsk"
```

Valid statuses: `new`, `reviewing`, `saved`, `closed`. A stale revision returns `409 revision_conflict`; fetch the event again before deciding whether to retry.

## Errors and caching

Failures use the shared envelope (synthetic illustration, not a real trace):

```json
{"error":{"code":"forbidden","message":"Event access denied.","trace_id":"00000000-0000-4000-8000-000000000000","retryable":false}}
```

`401`: sign in or select an organization. `403`: permission or entitlement missing. `400`: invalid filter. `404`: scoped record not found. `409`: stale write revision. `503`: dependency not provisioned. Record `trace_id` when reporting failures. Tenant responses use `Cache-Control: private, no-store`; never share them through a public cache. Sources: [`v2/shared/errors.ts`](https://github.com/labsbytir/harvy/blob/main/v2/shared/errors.ts), [`v2/api/worker.ts`](https://github.com/labsbytir/harvy/blob/main/v2/api/worker.ts).

For per-endpoint parameters and multi-language request examples, see [[API_ENDPOINTS|API endpoints]]; for the full error catalog see [[ERRORS|Errors]]. For the rest of the route inventory, see [[API_REFERENCE|API reference]]. HQL is bounded typed JSON (`v2/shared/hql.ts`); raw SQL is not accepted.
