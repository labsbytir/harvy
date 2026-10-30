---
title: Harvy Developer Documentation
description: Codebase, API, architecture, standards, and delivery status for Harvy.
tags:
  - index
  - developer-docs
---

# Harvy Developer Documentation

Harvy is a source-grounded intelligence system. This site documents the **actual repository**, its contracts, its standards, and the difference between local implementation and verified deployment.

> [!warning]
> A green local check is not proof of a deployed service, live connector, proxy egress, tenant isolation, or production data path. Every page must distinguish **implemented**, **partial**, **planned**, **blocked**, and **unverified**.

## Start here

- [[CODEBASE|Codebase map]] — where code lives and which module owns each boundary.
- [[API_REFERENCE|API reference]] — routes implemented by the API Worker, with auth, scope, and source links.
- [[DEVELOPMENT|Engineering standards]] — the canonical coding, data, security, API, automation, and contribution rules.
- [[STATUS|Implementation status]] — evidence-backed delivery ledger.
- [[PLAN|Delivery plan]] — the single project plan; do not create competing planning documents.
- [[REPO_INDEX|Repository and infrastructure index]] — current checkout and account evidence.

## Architecture and data

- [[DATASET_ENGINEERING|Dataset engineering]] — how to build large, provenance-preserving intelligence datasets.
- [[UI_SPEC|UI and analytics specification]] — product surfaces and acceptance criteria.
- [[BASIN_PROVISIONING|Basin provisioning]] and [[BASIN_PIPELINE_FIX|Basin pipeline runbook]].
- [[DEPLOY_RUNBOOK|Deployment runbook]].
- [[CONNECTOR_PLAN|Connector policy and adoption gates]].
- [[CONNECTOR_STATUS|Connector evidence ledger]].

## Working rules

1. Read [[DEVELOPMENT]] and [[PLAN]] before changing behavior.
2. Read callers, tests, migrations, and Wrangler configuration before editing a boundary.
3. Preserve tenant, workspace, product, and shared-record scope at every read and write.
4. Keep provenance, source URLs, timestamps, collection method, coverage gaps, and evidence limitations.
5. Treat local fixtures and templates as local proof only. Live acceptance must have live evidence.
6. Record blocked and unverified work instead of silently bypassing a gate.

## Source of truth

Canonical content is maintained in the repository's `docs/` directory. The Quartz build reads that directory directly, so this site is not a second hand-edited documentation tree.
