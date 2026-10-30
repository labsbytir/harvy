---
publish: true
title: Data model
description: Field-level reference for every API record — types, constraints and source files.
tags: [api, reference]
---

# Data model

**Status:** Source-derived from `v2/web/src/api.ts` types and `v2/api/` SELECT/INSERT columns (2026-10-30). Times are Unix milliseconds. IDs are UUIDs unless noted.

Every record below is scoped by `tenant_id` + `workspace_id` (+ `product` where shown); those columns are server-bound and never accepted from a client ([[CONCEPTS|Concepts]]).

## Context

Returned by `GET /api/v1/context`. Note camelCase here versus `snake_case` elsewhere — a known contract inconsistency ([[DEVELOPER_STANDARDS|Developer standards]]).

| Field | Type | Notes |
|---|---|---|
| `principalId` | string | actor ID |
| `tenantId`, `workspaceId` | string | scope; workspace mirrors tenant today |
| `tenantName` | string | organization name |
| `role` | string | membership role ([[AUTH|roles]]) |
| `allowedProducts` | string[] | enabled products |
| `capabilities` | string[] | capability strings |
| `featureRevision` | string | entitlement revision |
| `ontologySchemaRevision` | string | currently `"1"` |
| `hqlVersion` | number | currently `1` |

## Event

List/detail/update responses. `product` ∈ `Newsk` \| `Tower` \| `Ops` \| `Civic`.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `product` | string | owning product |
| `title` | string | searchable |
| `summary` | string | searchable |
| `status` | string | `new`, `reviewing`, `saved`, `closed` |
| `assigned_to` | string/null | self-assignment only |
| `revision` | integer | optimistic-concurrency counter |
| `first_seen_at`, `last_seen_at` | number | ms timestamps |
| `latitude`, `longitude` | number/null | source-provided only, finite and in range |
| `evidence_count` | integer | computed in list queries |

Detail adds `evidence[]` (≤ 100) and `activity[]` (≤ 50):

| Evidence field | Type | Notes |
|---|---|---|
| `id`, `source_id` | UUID / registered ID | |
| `source_url` | string | preserved provenance |
| `publisher`, `headline`, `excerpt` | string | |
| `captured_at` | number | |
| `artifact_id` | string/null | metadata, not a download URL |

| Activity field | Type | Notes |
|---|---|---|
| `revision`, `status`, `assigned_to` | — | state at that revision |
| `changed_by` | string | actor ID |
| `changed_at` | number | |

## Source and ProductEntitlement

| Source field | Type | Notes |
|---|---|---|
| `id` | UUID | approved, registered sources only |
| `product`, `publisher`, `label` | string | |
| `enabled` | boolean | paused/resumed via PATCH |
| `revision` | integer ≥ 1 | |
| `created_at` | number | |

ProductEntitlement: `product`, `enabled`, `revision` (starts `0` before first grant row).

## Story and Brief

| Story field | Type | Notes |
|---|---|---|
| `id`, `event_id` | UUID | event must be Newsk-scoped |
| `title` | string | 1–240 chars |
| `notes` | string | ≤ 20,000 chars |
| `status` | string | `draft`, `ready`, `handed_off`, `archived` (no edits after `handed_off`) |
| `revision` | integer | |
| `created_at`, `updated_at` | number | |

Brief: `id`, `story_id`, `title`, `body` (extractive), `citations[]` (`url`, `publisher`, `headline`, `captured_at`), `generated_by: "extractive"`, timestamps. GET returns `citations_json` string — parse it.

## OpsAction

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `source_story_id` | UUID/null | event handoffs have none |
| `source_event_id` | UUID | |
| `source_product` | string | product the action came from |
| `story_title`, `event_title` | string | joined labels |
| `source_url`, `publisher` | string/null | latest evidence of the event |
| `status` | string | `open`, `in_progress`, `done`, `cancelled` — transition table in [[API_ENDPOINTS|API endpoints]] |
| `revision` | integer | |

## Run

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `source_id` | UUID | registered source snapshot taken at dispatch |
| `idempotency_key` | string/null | visible only to `runs.manage` actors |
| `status` | string | `queued`, `running`, `succeeded`, `partial`, `failed`, `cancelled` |
| `error_code` | string/null | e.g. `dispatch_unconfirmed` |
| `trace_id` | string | correlation for support |
| `created_at`, `updated_at` | number | |

## Dashboard

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | owner-only edit/delete |
| `product` | string | must be enabled |
| `title` | string | 1–160 chars |
| `description` | string | ≤ 1,000 chars |
| `config_json` | string | validated by shared schema, JSON ≤ 32,000 chars |
| `visibility` | string | `private` \| `workspace` |
| `can_edit` | boolean | computed: caller is owner |
| `revision` | integer | |

## Investigation, InvestigationItem, Entity, Relationship

| Investigation | Type | Notes |
|---|---|---|
| `id`, `product` | — | |
| `title`, `summary` | string | validated (`invalid_investigation`) |
| `status` | string | `active`, `archived` |
| `revision` | integer | |
| `created_by`, `created_at`, `updated_at` | — | |
| `item_count` | integer | on list |

| Item | Type | Notes |
|---|---|---|
| `item_kind` | string | `note`, `event`, `evidence`, `entity`, `relationship` |
| `title` | string | 1–240 chars |
| `note` | string | ≤ 5,000 chars |
| `target_event_id`, `target_evidence_id`, `target_entity_id`, `target_relationship_id` | UUID/null | exactly one target for non-note kinds |

| Entity | Type | Notes |
|---|---|---|
| `entity_type` | string | `person`, `organization`, `place`, `asset`, `public_body`, `other` |
| `display_name` | string | 1–200 chars |
| `description` | string | ≤ 2,000 chars |
| `revision` | integer | |

| Relationship | Type | Notes |
|---|---|---|
| `from_entity_id`, `to_entity_id` | UUID | two distinct in-scope entities |
| `relationship_type` | string | 1–80 chars |
| `interpretation` | string | `observed`, `inferred`, `disputed` |
| `evidence_id` | UUID | **required** in-scope evidence |
| `notes` | string | ≤ 2,000 chars |

Graph: `nodes[]` (entity subset) + `edges[]` (relationships), `capped: boolean` — treat a capped graph as partial.

## WorkspaceSearchResult

`type` (`event`, `evidence`, `story`, `dashboard`, `action`, `investigation`, `entity`), `id`, `product`, `title`, `description`, `updated_at`, optional `event_id` / `source_product`.

## See also

- [[CONCEPTS|Concepts]] — what these records mean.
- [[LIMITS|Limits]] — bounds enforced on each field.
- [[API_ENDPOINTS|API endpoints]] — where each record is read or written.
