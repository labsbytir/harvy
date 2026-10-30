---
publish: true
title: Changelog
description: Dated record of developer documentation and contract changes.
tags: [meta]
---

# Changelog

Documentation changes, newest first. Entries are added by the docs-sync loop (every 10 minutes) and by manual documentation work. Contract changes are only claimed when verified against source or deployment.

## 2026-10-30

- **Docs-sync pass:** codebase map records the batch-1 connector adapter landing — `v2/catalog/connectors/openapi.ts` (Open JSON API adapter family: bounded GET/POST to normalized events with provenance, ≤10 records, fetch performed by Automation). **Unverified** — no run or adoption claimed.

- **Docs-sync pass:** the email-inbox scoping fix **landed (committed)** — tenant-scoped reads (org prefix on R2 keys), plus-inbox-address attribution, bounded tests, and `typecheck:email-inbox` wired into `check:local`. Codebase map updated; get-started now says five typechecks. Repository tree is clean (work committed); deployment/route of the inbox Worker remains unverified.

- **Docs-sync pass:** codebase map's email-inbox row gains the landed worker tests (`v2/tests/email-inbox-worker.test.mjs`) and notes a scoping fix **in progress (unverified)**. No behavior change is claimed.

- **Docs-sync pass:** status ledger records the automation execution host as **down** — `connector.harvy.dev` unreachable (HTTP 522, verified by request), builder fleet stopped; connector adoption cannot advance until it is restored. Local n8n fallback is proposed in chat only, not activated.

- **Docs-sync pass:** codebase map gains the new `v2/email-inbox/` Worker (receive-only inbound MIME to R2 with an authenticated read-only read API) labelled **local implementation, deployment/route unverified**. Registry and inbox reference ledgers landed under `v2/catalog/reference/` (internal, unpublished).

- **Docs-sync pass:** neutralized provider branding in the public codebase map per the platform branding rule (contract wording kept). Source-policy change (a social channel source now approved under a user-owned, channel-list-only scope; two legacy sources remain excluded) was applied to canonical docs by its owning session and required no public-page change.

- **Status ledger refreshed (docs-sync pass):** Basin counts independently re-queried — added src_openflights 300, src_dbpedia 103, src_energydata_info 300 (matching the connector ledger's proven windows), src_courtlistener_bulk now 174,808; src_worldbank recorded as 7,370 rows / 965 distinct with the known duplicate-drain caveat. Still Partial: no full-adoption claim.

- **Governance reconciliation (docs-sync):** `PLAN.md`/`DEVELOPMENT.md` corrected against code at HEAD `9d22091` — the `HYPERDRIVE_PRIVATE` binding is declared in both Wrangler configs and the dedicated batch client is tested, while the Better Auth PostgreSQL adapter (`v2/auth/auth.ts:199-208`) is still invalid and remote provisioning/deployment remain unverified. Stale SAM-count subtraction (pre-lift policy) and the blanket "no live connector" claim were replaced with evidence-bounded statements; no full-adoption claim is made. Contradiction audit with code citations added to PLAN.md.
- **Status ledger updated (docs-sync loop):** `Basin analytics` and `Connector adoption` moved to **Partial** — pipeline rows land in `default.evidence` and read SQL was independently verified this date (src_unhcr 1,164 rows, src_owid 1,700, src_courtlistener_bulk 174,786). Product query surface (HQL/cube to Basin) and the per-source adoption bar remain unverified.
- **Docs site published** at `docs.harvy.dev` (Quartz, curated `publish: true` pages; operational ledgers tombstoned off the public build).
- Added developer guides: Get started, Authentication, Code walkthrough, Build an integration (poller tutorial), API examples, Query guide, Recipes, Developer standards.
- Added references: API endpoints (per-endpoint parameters and curl/JS/Python examples for all resources), API reference (route inventory), Data model, Limits, Errors, Concepts, Codebase map, Status, Dataset engineering.
- All code snippets and contract literals verified against `v2/api/worker.ts`, `v2/auth/worker.ts`, `v2/shared/*` before publishing.
- Docs-sync loop started: monitors OpenChamber sessions and repository changes every 10 minutes; updates this changelog and affected pages.
