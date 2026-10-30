---
publish: true
title: Query guide
description: Analytics queries — HQL JSON, cube metadata and bounded query execution.
tags: [api, analytics, guide]
---

# Query guide

**Status:** Source-derived from `v2/shared/hql.ts`, `v2/shared/cubes.ts`, `v2/api/analytics.ts` and `v2/api/worker.ts` on 2026-10-30. Live Basin/catalog behavior is unverified.

Harvy exposes analytics through two related contracts. Both are capability-gated (`query.view`) and scoped to the actor's tenant, workspace and entitled product. **Raw SQL is never accepted**; every query is validated JSON over registered semantics.

## HQL: typed JSON queries

`POST /api/v1/query` accepts a bounded HQL document:

```json
{
  "hql_version": 1,
  "cube": "evidence_activity",
  "product": "Newsk",
  "dimensions": ["source_id", "day"],
  "measures": ["evidence_count"],
  "filters": [
    { "field": "publisher", "operator": "contains", "value": "times" },
    { "field": "captured_at", "operator": "gte", "value": 1793100000000 }
  ],
  "order_by": [{ "field": "evidence_count", "direction": "desc" }],
  "limit": 100,
  "time_range": { "from": "2026-10-01T00:00:00Z", "to": "2026-10-30T00:00:00Z" }
}
```

Field by field (limits are enforced in `parseHqlQuery`; violating any returns `400 invalid_query`):

| Field | Type | Rules |
|---|---|---|
| `hql_version` | integer | must be `1` |
| `cube` | string | registered cube name, matching `^[a-z][a-z0-9_]{0,63}$` |
| `product` | string | optional; `Newsk`, `Tower`, `Ops`, `Civic` |
| `dimensions` | string[] | ≤ 20, same name syntax |
| `measures` | string[] | ≤ 20, same name syntax |
| `filters` | object[] | ≤ 50; each `{ field, operator, value }` |
| `order_by` | object[] | ≤ 20; each `{ field, direction: "asc"\\|"desc" }` |
| `limit` | integer | 1–500, required |
| `time_range` | object | optional `{ from, to }`, ISO strings, `from ≤ to` |

Filter operators: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `contains`, `in`. Filter values are strings (≤ 1,000 chars), finite numbers, booleans, or arrays (≤ 100 items). Unknown fields at the top level reject the whole document — the schema is closed.

**Response:**

```json
{
  "rows": [ { "source_id": "…", "day": "2026-10-30", "evidence_count": 12 } ],
  "annotation": null,
  "query": { "hql_version": 1, "…": "echoed request" },
  "snapshot": null,
  "trace_id": "00000000-0000-4000-8000-000000000000"
}
```

The query is echoed back after validation; `trace_id` supports support requests. Cubes marked for the warehouse engine execute there; others run on the local analytics layer. Warehouse provisioning failures return `503 unavailable` — the API fails closed rather than degrading silently.

**curl:**

```sh
curl --fail-with-body --silent --show-error -X POST \\
  -H "x-api-key: $HARVY_API_KEY" \\
  -H "x-harvy-organization-id: $HARVY_ORGANIZATION_ID" \\
  -H 'Content-Type: application/json' \\
  --data @query.json \\
  https://harvy.dev/api/v1/query
```

**JavaScript:**

```js
const response = await fetch("https://harvy.dev/api/v1/query", {
  method: "POST",
  headers: {
    "x-api-key": process.env.HARVY_API_KEY,
    "x-harvy-organization-id": process.env.HARVY_ORGANIZATION_ID,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    hql_version: 1,
    cube: "evidence_activity",
    product: "Newsk",
    dimensions: ["source_id"],
    measures: ["evidence_count"],
    filters: [],
    limit: 100,
  }),
});
const { rows, trace_id } = await response.json();
```

**Python:**

```python
import os, requests

response = requests.post(
    "https://harvy.dev/api/v1/query",
    headers={
        "x-api-key": os.environ["HARVY_API_KEY"],
        "x-harvy-organization-id": os.environ["HARVY_ORGANIZATION_ID"],
    },
    json={
        "hql_version": 1,
        "cube": "evidence_activity",
        "product": "Newsk",
        "dimensions": ["source_id"],
        "measures": ["evidence_count"],
        "filters": [],
        "limit": 100,
    },
    timeout=60,
)
response.raise_for_status()
rows = response.json()["rows"]
```

The cube/measures names above are illustrative; query `GET /api/v1/cube/meta` for what your deployment registers.

## Cube metadata and load

The web client's chart layer uses a second, compatible surface:

| Route | Method | Notes |
|---|---|---|
| `/api/v1/cube/meta` | `GET` | registered cubes/members for the header-chosen product (`x-harvy-product`) |
| `/api/v1/cube/load` | `GET` | query passed as JSON in the `query` parameter; encoded size ≤ 65,536 bytes |
| `/api/v1/cube/load` | `POST` | same contract as a bounded JSON body |

Both return `{ data, annotation }`. The same bounded normalization applies: unregistered members, joins, unsupported operators and unbounded limits are rejected with `400 invalid_query`. Choose `x-harvy-product` for these routes (`GET /api/v1/cube/meta` example):

```sh
curl --fail-with-body --silent --show-error \\
  -H "x-api-key: $HARVY_API_KEY" \\
  -H "x-harvy-organization-id: $HARVY_ORGANIZATION_ID" \\
  -H 'x-harvy-product: Newsk' \\
  https://harvy.dev/api/v1/cube/meta
```

## Validation mindset

The query layer deliberately favors **rejecting ambiguity** over guessing:

- No raw SQL, no joins, no free-form expressions.
- Names must match `^[a-z][a-z0-9_]{0,63}$`; unknown cubes/members fail at validation.
- Every limit is bounded (document size, arrays, result rows).
- Scope is applied by the server from the actor; a query cannot select another tenant.

When adding a cube or member: register it in `v2/shared/cubes.ts`, extend the analytics layer or warehouse compiler, and add a rejection test for an unregistered sibling name — the closed schema is the security boundary.

## See also

- [[API_ENDPOINTS|API endpoints]] — request conventions and errors.
- [[CODE_WALKTHROUGH|Code walkthrough]] — how validation and scoping work inside the Worker.
- [[DATASET_ENGINEERING|Dataset engineering]] — storage layers behind the cubes.
