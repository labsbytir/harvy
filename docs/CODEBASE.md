---
publish: true
title: Codebase map
description: Repository boundaries, ownership, callers, tests, and configuration.
tags:
  - architecture
  - codebase
---

# Codebase map

This map describes the clean V2 repository. Paths are authoritative; diagrams and plans are not proof that a target service exists.

## Top-level boundaries

| Area | Primary paths | Owns | Read before changing |
|---|---|---|---|
| Web | `v2/web/` | React product shell, public preview, worker routing, UI data access | `docs/UI_SPEC.md`, web callers, `v2/web/wrangler.jsonc` |
| API | `v2/api/` | authenticated HTTP routes, actor scope, analytics, investigations, callbacks | `v2/api/worker.ts`, route tests, shared contracts |
| Auth | `v2/auth/` | Better Auth server/client integration and organization membership | auth worker, auth schema, auth tests, bindings |
| Email inbox | `v2/email-inbox/` | receive-only inbound MIME storage (R2) with an authenticated read-only read API | `v2/email-inbox/worker.ts` + worker tests (`v2/tests/email-inbox-worker.test.mjs`); committed implementation with tenant-scoped reads (org prefix on R2 keys) and plus-inbox-address attribution; typecheck:email-inbox runs in `check:local`; deployment/route unverified |
| Shared | `v2/shared/` | HarvyDex, HQL, automation, artifacts, errors, cache policy, cubes | all callers and contract tests |
| Migrations | `v2/migrations/` | database schema source | migration order, adapter, isolation tests |
| Catalog | `v2/catalog/` | source and API registry/reference ledgers | connector policy, source permissions, provenance rules; connector adapter implementations live in `v2/catalog/connectors/` (batch-1: Open JSON API adapter family — bounded GET/POST to normalized events with provenance, ≤10 records, fetch performed by Automation; unverified) |
| Workflows | `v2/workflows/` | inactive local Automation starters and examples | `docs/DEVELOPMENT.md`, workflow README |
| Docs | `docs/` | canonical engineering and operations documentation | `docs/PLAN.md`, `docs/DEVELOPMENT.md` |
| Tests | `v2/tests/`, `v2/auth/*.test.mjs` | local contract, API, auth, and UI utility checks | the implementation under test |

## Request path

```text
Browser
  -> v2/web/ worker and client
  -> Better Auth session / organization actor
  -> v2/api/worker.ts
  -> actor scope + product entitlement + capability check
  -> bounded domain handler or analytics layer
  -> local SQL adapter (D1 test adapter today; PostgreSQL + Hyperdrive target)
  -> Basin SQL only for engine-marked historical analytics
```

Automation is a separate boundary:

```text
POST /api/v1/runs
  -> registered approved source snapshot
  -> bounded signed Automation envelope
  -> VPS Automation workflow
  -> approved Unlimited-scrape provider or registered API path + required approved proxy
  -> normalized artifact in R2 + historical ingest
  -> signed callback/publication to the API Worker
```

The live Automation path is not proven by checked-in templates or local tests.

## API route ownership

- `v2/api/worker.ts` owns health, callbacks, context, entitlements, audit, sources, search, events, stories, briefs, dashboards, runs, and HQL.
- `v2/api/investigations.ts` owns investigations, investigation items, entities, relationships, and graph reads.
- `v2/api/analytics.ts` owns cube metadata, normalization, HQL-to-semantic conversion, and execution dispatch.
- `v2/api/basin-compiler.ts` owns bounded Basin SQL compilation and Basin execution configuration.
- `v2/shared/` owns the input/output contracts used by API, web, and Automation boundaries.

## Caller and test rule

Before changing a shared function or contract:

1. Search every caller.
2. Read the corresponding test and migration/config binding.
3. Preserve existing error, validation, scope, and revision behavior.
4. Add or update one focused test for non-trivial behavior.
5. Run the required local checks and label missing live checks `BLOCKED`.

## Configuration evidence

- `v2/web/wrangler.jsonc` configures the web Worker locally.
- `v2/api/wrangler.jsonc` configures the API Worker locally.
- `v2/auth/wrangler.jsonc` configures the Auth Worker locally.
- A Wrangler binding is local configuration, not deployment evidence.
- The intended launch database is PostgreSQL through Hyperdrive; the current local implementation still has D1-backed paths and requires migration/adapter work before launch.
