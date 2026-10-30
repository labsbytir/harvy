---
publish: true
title: Developer standards
description: Conventions and review checklist for contributors.
tags: [guide, standards]
---

# Developer standards

**Status:** Contributor quick reference, not a competing policy. `docs/DEVELOPMENT.md` is the canonical engineering standard. Reviewed against the code 2026-10-30; some checks are still planned.

## Before you edit

1. Confirm the root (`git rev-parse --show-toplevel`) and record `git status --short`. Preserve unrelated changes.
2. Read every caller, the shared contract, tests, migrations and bindings before changing behavior.
3. Put runtime code under `v2/`, canonical docs under `docs/`, and delivery decisions in the single `docs/PLAN.md`. Do not hand-edit `dist/`.
4. Keep external payloads and credentials out of source, logs and public docs. Review the publication boundary before publishing operational notes.

## Names and contracts

| Concern | Current convention | Source |
|---|---|---|
| Product | `Newsk`, `Tower`, `Ops`, `Civic`; API values are case-sensitive | `v2/api/worker.ts` `PRODUCTS` |
| Product route | `/api/v1/<resource>`; internal callbacks are separate | `GET /api/v1/events` |
| JSON names | Existing event fields use `snake_case`; context fields currently use camelCase | `expected_revision`, `next_cursor`; `allowedProducts` |
| IDs | Record and event IDs are UUIDs; registered source IDs are not guessed | `v2/shared/harvydex.ts` |
| Scope | Authenticated actor → tenant + workspace + entitled product | `v2/api/worker.ts` `listEvents` |
| Mutation | Bounded JSON and expected revision for mutable records | `PATCH /api/v1/events/:id` |
| Error | `{ error: { code, message, trace_id, retryable } }` | `v2/shared/errors.ts` |

The canonical standard targets `snake_case` public JSON; the current context response uses camelCase. **Clients must follow the real response**, not silently rename it. Fixing this inconsistency requires a reviewed contract migration.

## Scope-safe code walk

The current event read path in `v2/api/worker.ts` calls `actor(request, env)`, checks `has(a, "events.view")`, then resolves `entitledProduct(db, a.tenantId, url.searchParams.get("product"))`. Inside `listEvents`, predicates start with `e.tenant_id = ?`, `e.workspace_id = ?`, and `e.product = ?`, and arguments start with `a.tenantId`, `a.workspaceId`, and the entitled product. The client cannot select an arbitrary tenant by passing its ID.

The same handler validates time ranges, status and pagination cursor, caps the result at 100, orders by time and ID, and returns a `next_cursor`. Extend those existing checks when adding a filter; do not create an unscoped shortcut. Add a focused negative test for missing membership, disabled product or cross-tenant reads when changing this boundary.

## Check before submitting

```sh
npm run check:local
npm run docs:build
git diff --check
```

These are **local checks**, not a full release preflight: unified lint, OpenAPI drift detection, production multi-tenant isolation and live connector checks are not established by these commands. Mark missing release gates BLOCKED, not passing. Do not commit, deploy, activate workflows or run remote migrations without authorization.

- `docs/DEVELOPMENT.md` (repository) — coding, data ownership, tests, security, Automation and docs.
- [[CODEBASE|Codebase map]] — module and request boundaries.
- [[API_EXAMPLES|API examples]] — demonstrated request and error behavior.
