---
publish: true
title: Implementation status
description: Evidence-backed status ledger for Harvy code, infrastructure, and delivery gates.
tags:
  - status
  - delivery
---

# Implementation status

This page is a compact reader-facing status view. `docs/ROADMAP.md` in the repository remains the single roadmap; this page must not become a second plan.

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
| PostgreSQL + Hyperdrive | Planned / blocked | Target documented in `DEVELOPMENT.md` and `ROADMAP.md` | Adapter, Hyperdrive config, core migrations, and connection verification. |
| D1 adapter | Local/test only | Current worker config and migrations | Do not treat it as the launch transactional authority. |
| R2 raw/artifact storage | Partial | Artifact contracts and local manifest checks | `harvy-artifacts` binding/resource and live publication evidence. |
| Basin analytics | Paused | Compiler removed 2026-10-30; cubes serve from Postgres/Hyperdrive (`v2/shared/cubes.ts` `engine: "postgres"`). Historical Basin row counts (src_unhcr 1,164, src_owid 1,700, src_courtlistener_bulk 174,808, src_openflights 300, src_dbpedia 103, src_energydata_info 300, src_worldbank 7,370 rows / 965 distinct, src_who 25) are historical evidence only — the feeding n8n instance was reset 2026-10-30 and no new Basin writes are permitted | Postgres/Hyperdrive live provisioning and the product query surface (HQL/cube). |
| Automation dispatch | Implemented locally / unverified live | Signed envelope, callback, idempotency, quota, and retry contracts | Live Automation workflow, provider egress, R2, Basin, and callback run. |
| Connector adoption | Partial | Batch 1 rebuilt on the fresh n8n instance at `n8n.harvy.dev` (2026-10-30, after an instance reset): 6 active workflows — usgs-earthquakes, nws-alerts, fema_openfema, worldbank, blockchair, data-gov — on 6h crons plus inactive socrata_portal; 46 verified manual executions (39 success / 7 transient proxy-429, recovered); dedupe hardened to DB level with UNIQUE `event_id` indexes on every ingested table (rows == distinct: usgs 234, nws 316, fema 3003, worldbank 200, data-gov 50, blockchair 1; error table 0); Basin re-verified read-only (src_courtlistener_bulk 174,813 rows / 174,387 distinct; the GDACS and CourtListener workflows no longer exist — wiped with the old volume, batch-2 rebuilds; 3 more built and activated 2026-10-30 23:17 UTC — overpass_api 300 rows, wikidata_power_plants 93 rows, openflights 5000 rows, all idempotent on re-run (runnable, not adopted); adoption denominator frozen at N = 158 / T = 79 by `v2/catalog/workflow-ledger.json` revision `2026-10-30.1`, with 117 buildable rows, 17 access-gated, and 24 on the excluded RSSHub path) | first scheduled cycles verified for usgs (+14 → 234) and nws (+113 → 316) with dedupe holding (fema/worldbank/blockchair/data-gov first fires pending). Auditor sign-off on the 20 semantic merges in the frozen ledger is still open, so the numerator may only be reported as `adopted/158`. R2 S3 credentials unavailable and PostgreSQL unreachable (port 5432 blocked; `harvy` role password located per supervision session — unverified from docs), so durable per-record storage is n8n data tables only (PG `harvy` DB empty; Basin paused, no new writes). Harvy API ↔ n8n webhook dispatch and the full per-source adoption bar (UI/query visibility, independent review) remain unverified. |
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

A release report must list **Done**, **Failed**, **Blocked**, and **Next** with evidence. Missing required checks are `BLOCKED`, not passing. A template, manifest, registered source, or local fixture never counts as a live workflow by itself.
