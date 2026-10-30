---
publish: true
title: Limits
description: Every hard bound the API enforces — payload sizes, list caps, string lengths and quotas.
tags: [api, reference]
---

# Limits

**Status:** All values verified against source on 2026-10-30 (`v2/api/worker.ts`, `v2/api/investigations.ts`, `v2/shared/hql.ts`, `v2/auth/auth.ts`). A limit not listed here is not documented — read the source.

Exceeding a bound returns `400` (or `413`/`429` where noted). The server rejects first and queries second; there is no "trim and continue" behavior.

## Request-level

| Bound | Value | Source |
|---|---|---|
| JSON request body | 65,536 bytes | `readBoundedText` — `413 too_large` |
| HQL / cube query body | 65,536 bytes | same path |
| Encoded `cube/load?query=` | 65,536 bytes | query-string byte check |
| Content-Type | `application/json` on writes | client contract |

## Lists and paging

| List | Cap | Notes |
|---|---|---|
| Events page | 100 (`limit` 1–100, default 50) | `next_cursor` → `before` |
| Event detail: evidence | 100 rows | newest first |
| Event detail: activity | 50 rows | newest first |
| Search results | 20 (`limit` 1–20, default 10) | combined types |
| Sources | 200 | approved only |
| Stories, briefs, runs, dashboards, investigations, Ops actions, admin audit | 100 each | audit `limit` 1–100 |
| Investigation items | 100 per investigation | |
| Entity search results | 100 | |
| Entity relationships | 100 | |

## Strings and fields

| Field | Bound |
|---|---|
| Event search `q` | ≤ 200 chars |
| Search endpoint `q` | 2–120 chars |
| Story title / investigation item title | 1–240 chars |
| Story notes | ≤ 20,000 chars |
| Investigation item note | ≤ 5,000 chars |
| Entity display name | 1–200 chars |
| Entity description / relationship notes | ≤ 2,000 chars |
| Relationship type | 1–80 chars |
| Dashboard title | 1–160 chars |
| Dashboard description | ≤ 1,000 chars |
| Dashboard config JSON | ≤ 32,000 chars, schema-validated |
| Run `idempotency_key` | 8–128 chars of `A-Za-z0-9._:-` |
| Error `code` | `^[a-z][a-z0-9_]{0,63}$`; message truncated at 300 |
| Run `error_code` (callback) | ≤ 64 chars |

## HQL query

| Bound | Value |
|---|---|
| `dimensions`, `measures` | ≤ 20 each |
| `filters` | ≤ 50 |
| `order_by` | ≤ 20 |
| `limit` | 1–500 |
| Filter value string | ≤ 1,000 chars |
| Filter array | ≤ 100 items |
| Name syntax | `^[a-z][a-z0-9_]{0,63}$` |
| Top-level fields | closed set — unknown keys reject the document |

## Rates, quotas and time

| Bound | Value | Effect |
|---|---|---|
| Email sign-in | 5 per 60 s per window | auth rate limit |
| Workspace run quota | hourly | `429 run_quota_exceeded` |
| Dispatch claim lease | 30 s | concurrency guard on runs |
| Automation dispatch fetch | 15 s timeout | ambiguous → `dispatch_unconfirmed` |
| Run deadline (envelope) | 300 s | fixed in dispatch contract |
| Callback signature window | ±5 min | `401` outside |
| Coordinates | finite, lat ±90, lon ±180 | else `invalid_event` |

## See also

- [[ERRORS|Errors]] — what a violation returns.
- [[DATA_MODEL|Data model]] — where each bound lives.
- [[API_ENDPOINTS|API endpoints]] — per-endpoint parameter tables.
