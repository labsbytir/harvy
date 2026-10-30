---
publish: true
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

## Start building

1. [[GETTING_STARTED|Get started]] — install, run checks, trace your first request, and understand what is not deployed.
2. [[AUTH|Authentication and authorization]] — API keys, sessions, organization scope, roles and capabilities.
3. [[CODE_WALKTHROUGH|Code walkthrough]] — how the Workers code executes a request: auth, scoping, validation, concurrency.

## Tutorials

- [[TUTORIAL|Build an integration]] — a complete event poller: cursors, evidence reads, revision-safe writes, production checklist.
- [[API_EXAMPLES|API examples]] — authenticated requests, pagination, source evidence, safe updates, and errors.

## Concepts

- [[CONCEPTS|Concepts]] — products, scope, events, evidence, investigations, revisions.
- [[DATA_MODEL|Data model]] — field-level reference for every record.
- [[DATASET_ENGINEERING|Dataset engineering]] — large, provenance-preserving data paths.

## Reference

- [[API_ENDPOINTS|API endpoints]] — per-endpoint parameters and request/response examples in curl, JavaScript and Python.
- [[API_REFERENCE|API reference]] — full route inventory and capability requirements; not generated OpenAPI.
- [[QUERY_GUIDE|Query guide]] — HQL JSON queries, cube metadata, and validation limits.
- [[ERRORS|Errors]] — the complete error-code catalog and retry rules.
- [[LIMITS|Limits]] — every enforced bound: payloads, lists, strings, quotas.
- [[RECIPES|Recipes]] — short copyable snippets for common tasks.
- [[DEVELOPER_STANDARDS|Developer standards]] — naming, scope, testing, and a practical review checklist.
- [[CODEBASE|Codebase map]] — request path and module owners.
- [[STATUS|Implementation status]] — implemented, partial, planned, blocked, and unverified.
- [[CHANGELOG|Changelog]] — dated record of documentation and contract changes.

## How this site is maintained

These pages are curated from repository-owned Markdown. Operational plans and runbooks remain in `docs/` but are not part of the public build. A plan is not an API guarantee. [[STATUS|Implementation status]] separates local proof from live proof.

## Working rules

1. Read the repository’s `docs/DEVELOPMENT.md` and `docs/PLAN.md` before changing behavior.
2. Read callers, tests, migrations, and Wrangler configuration before editing a boundary.
3. Preserve tenant, workspace, product, and shared-record scope at every read and write.
4. Keep provenance, source URLs, timestamps, collection method, coverage gaps, and evidence limitations.
5. Treat local fixtures and templates as local proof only. Live acceptance must have live evidence.
6. Record blocked and unverified work instead of silently bypassing a gate.

## Source of truth

Canonical content is maintained in the repository's `docs/` directory. The Quartz build reads that directory directly, so this site is not a second hand-edited documentation tree.
