---
publish: true
title: Errors
description: Complete error-code catalog with HTTP statuses and client handling rules.
tags: [api, reference]
---

# Errors

**Status:** Every code extracted from `v2/api/worker.ts`, `v2/api/investigations.ts` and `v2/shared/errors.ts` on 2026-10-30. Statuses verified at the `fail()` call sites.

## The envelope

```json
{ "error": { "code": "forbidden", "message": "Event access denied.", "trace_id": "…", "retryable": false } }
```

Codes are lowercase `^[a-z][a-z0-9_]{0,63}$` (unknown codes collapse to `internal`), messages truncate at 300 characters, and stack traces never cross the boundary. Responses are `Cache-Control: private, no-store`. Include `trace_id` in support reports.

## 400 — invalid request

| Code | Where | Meaning |
|---|---|---|
| `invalid_request` | most routes | malformed/oversized JSON body |
| `invalid_event` / `invalid_event_update` | events | event fields or update fields invalid |
| `invalid_search` / `invalid_time_range` | search, events | term too long, limit out of range, bad date bounds |
| `invalid_entitlement` | entitlements | product/fields invalid |
| `invalid_source` / `invalid_source_state` | sources, runs | unsafe source target or bad PATCH body |
| `invalid_story` | stories | title/notes/status invalid |
| `invalid_action` | Ops actions | status or revision invalid |
| `invalid_dashboard` | dashboards | config/title/visibility invalid |
| `invalid_audit_query` | admin audit | limit outside 1–100 |
| `invalid_query` | HQL, cube | query outside the bounded contract |
| `invalid_investigation` / `invalid_investigation_item` | investigations | fields, kinds or revision invalid |
| `invalid_entity` / `invalid_relationship` | entities, graph | type/name/evidence rules failed |
| `invalid_graph_filter` | graph | bad investigation filter |
| `invalid_state` | story handoff | story not `ready` (409 at call site — see below) |
| `query_failed` | HQL, cube | authorized query failed at execution |
| `invalid_callback` / `invalid_publication` / `invalid_evidence` / `invalid_manifest` | **internal routes** | Automation callback/publication contract violations |

## 401 — not authenticated

| Code | Meaning |
|---|---|
| `unauthorized` | missing/invalid API key or session; invalid callback signature (internal) |

## 403 — not permitted

| Code | Meaning |
|---|---|
| `forbidden` | capability missing, product not enabled, non-member key, missing organization header, or invalid assignment rule |

A `403` is policy, not transient — do not retry unchanged.

## 404 — not in scope

| Code | Meaning |
|---|---|
| `not_found` | record absent **or outside the actor's scope** (deliberately indistinguishable) |
| `run_not_found` | run state lost after registration |

## 409 — conflict

| Code | Meaning | Client action |
|---|---|---|
| `revision_conflict` | stale `expected_revision` | re-read, decide, retry |
| `story_handed_off` | story is immutable after handoff | stop editing |
| `invalid_state` | handoff precondition (story not ready) | fix state first |
| `invalid_transition` | Ops action status machine rejects the move | consult the transition table |
| `idempotency_conflict` | idempotency key reused with a different source | use a fresh key |
| `insufficient_evidence` | handoff/brief without evidence | attach evidence first |
| `artifact_missing` / `artifact_conflict` | **internal** publication artifact checks failed | — |
| `invalid_run_state` | **internal** publication against non-active run | — |

## 413 / 429 / 5xx

| Status | Code | Meaning |
|---|---|---|
| 413 | `too_large` | body or callback payload over 65,536 bytes |
| 429 | `run_quota_exceeded` | hourly workspace run quota reached — retry next window |
| 500 | `run_registration_failed` / `handoff_failed` | state write failed; report with `trace_id` |
| 503 | `unavailable` | storage or analytics dependency not provisioned |
| 503 | `automation_unavailable` | Automation endpoint/token not configured |

## Retry rules

Retryable with backoff: `429 run_quota_exceeded` (next window), `503` (later), `500` after status check, and `409 revision_conflict` **after re-reading**. Never retry unchanged: `400`, `401`, `403`, `404`, `413`.

## See also

- [[LIMITS|Limits]] — the bounds whose violation produces these codes.
- [[API_EXAMPLES|API examples]] — handling the envelope in code.
- [[TUTORIAL|Build an integration]] — retry and backoff in practice.
