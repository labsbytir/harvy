---
title: Implementation status
description: Evidence-backed status ledger for Harvy code, infrastructure, and delivery gates.
tags:
  - status
  - delivery
---

# Implementation status

This page is a compact reader-facing status view. [[PLAN|PLAN.md]] remains the single delivery plan; this page must not become a second plan.

## Status vocabulary

- **Implemented** — present in this checkout and covered by relevant local checks.
- **Partial** — a meaningful local slice exists, but an acceptance path or feature boundary is missing.
- **Planned** — described target work without a complete implementation.
- **Blocked** — work cannot proceed until a named credential, permission, resource, or decision is available.
- **Unverified** — an implementation or remote resource exists, but the required live evidence has not been collected.
- **Excluded** — deliberately not part of the active V2 product/source boundary.

## Current ledger

| Area | Status | Evidence | Missing proof or next gate |
|---|---|---|---|
| Local API route surface | Implemented | `v2/api/worker.ts`, `v2/api/investigations.ts`, API tests | Deployed API Worker and live route checks. |
| Better Auth integration | Partial | `v2/auth/`, auth/client typechecks and consent tests | Deployed auth routing, live organization membership, and production database. |
| Tenant/workspace/product scope | Implemented locally | Shared predicates, migrations, route tests, cross-tenant tests | Two-live-tenant deployment test. |
| HQL and cube validation | Implemented locally | `v2/shared/hql.ts`, `v2/shared/cubes.ts`, compiler tests | OpenAPI/schema generation and live Basin catalog/query validation. |
| PostgreSQL + Hyperdrive | Planned / blocked | Target documented in `DEVELOPMENT.md` and `PLAN.md` | Adapter, Hyperdrive config, core migrations, and connection verification. |
| D1 adapter | Local/test only | Current worker config and migrations | Do not treat it as the launch transactional authority. |
| R2 raw/artifact storage | Partial | Artifact contracts and local manifest checks | `harvy-artifacts` binding/resource and live publication evidence. |
| Basin analytics | Unverified | Compiler and unit tests | Provisioned catalog/pipeline and delayed live SQL verification. |
| Automation dispatch | Implemented locally / unverified live | Signed envelope, callback, idempotency, quota, and retry contracts | Live Automation workflow, provider egress, R2, Basin, and callback run. |
| Connector adoption | Blocked / unverified | Catalog and connector status ledgers | Approved path, bounded real runs, idempotent replay, UI/query visibility, and independent review per source. |
| Web product shell | Partial | `v2/web/src/`, local application build | Deployed auth/API routes and browser acceptance with real scoped data. |
| Public docs | Implemented | `docs/` built by Quartz and deployed to Pages | Keep source links/status current as code changes. |
| Cache target | Unmeasured | Cache policy tests prevent unsafe private caching | Representative public eligible traffic measurement; never cache private data to hit a target. |

## Local verification

The repository currently validates with:

```sh
npm run check:local
npm run docs:build
```

These commands prove local typechecks/tests/builds only. They do not prove external source access, proxy egress, live credentials, a deployed API, a production database, or customer isolation.

## Release discipline

A release report must list **Done**, **Failed**, **Blocked**, and **Next** with evidence. Missing required checks are `BLOCKED`, not passing. A template, manifest, registered source, or local fixture never counts as a live connector by itself.
