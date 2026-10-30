---
publish: true
title: Concepts
description: The domain vocabulary — products, scope, events, evidence, investigations and provenance.
tags: [guide, concepts]
---

# Concepts

**Status:** Vocabulary as implemented in this checkout (2026-10-30). For deployment reality see [[STATUS|Implementation status]].

This page defines the words the API and codebase use. Read it before the [[API_ENDPOINTS|endpoint reference]]; every contract assumes it.

## Products and scope

Harvy serves four products from one platform: **Newsk** (newsroom work), **Tower** (business intelligence), **Ops** (operational action), **Civic** (public-interest work). An organization enables products per tenant ([[AUTH|Authentication]]).

Three scope dimensions are bound to **every** record and every query:

| Dimension | Meaning |
|---|---|
| **Tenant** | the organization; hard isolation boundary |
| **Workspace** | the working container inside a tenant (currently one per tenant) |
| **Product** | which of the four products owns the record |

A request may *narrow* these (by choosing a product) but never *widen* them. Cross-tenant reads return `404` — absence, not a leak.

## Events and evidence

- **Event** — the unit of intelligence: a title, summary, status (`new`, `reviewing`, `saved`, `closed`), optional source-provided coordinates, and a revision counter. Events are what analysts triage and what [[TUTORIAL|integrations]] poll.
- **Evidence** — a captured source observation attached to an event: publisher, source URL, headline, excerpt, capture time, optional artifact ID. Every claim an event makes should trace to evidence; evidence-less handoffs are rejected by design.
- **Artifact** — persisted raw/processed material referenced by an evidence row. The `artifact_id` is metadata; it is not a public download URL.
- **Source** — a registered, approved monitoring configuration (target, workflow, mode, page budget). Only approved, enabled sources can be collected. Unregistered targets do not exist as far as the API is concerned.

Provenance rule that runs through everything ([[DATASET_ENGINEERING|Dataset engineering]]): a name match is not an identity claim; observed, inferred and disputed must stay distinguishable.

## Newsk workflow objects

- **Story** — a narrative built from one Newsk event: `draft` → `ready` → `handed_off` (or `archived`). Handed-off stories are immutable.
- **Brief** — an extractive, citation-bearing rendering of a story (notes + numbered sources). It is assembled from story notes and evidence — not generated prose — and refuses to exist without at least one citation.
- **Ops action** — the unit of operational work, created when a story or a Tower/Civic event is handed to Ops. Has its own status machine (`open` → `in_progress` → `done`, `cancelled`, reopen rules) — see [[API_ENDPOINTS|Ops actions]].

## Investigations, entities and relationships

- **Investigation** — a casebook (`active`/`archived`) collecting notes and references to events, evidence, entities and relationships. Items are append/remove with revision-checked updates; up to 100 items per investigation.
- **Entity** — a typed node: `person`, `organization`, `place`, `asset`, `public_body`, `other`.
- **Relationship** — a directed, **evidence-backed** link between two distinct entities, typed and labeled `observed`, `inferred` or `disputed`. A relationship without evidence is invalid — the graph never outruns its sources.
- **Graph** — the capped view of entities and relationships, optionally scoped to one investigation.

## Runs and collection

- **Run** — one bounded collection dispatch for a source, registered with an idempotency key, quota-bounded, dispatched with a fixed envelope (approved proxy, preflight, page cap, 300-second deadline). Statuses: `queued`, `running`, `succeeded`, `partial`, `failed`, `cancelled`.
- **Idempotency key** — the client's promise that a retry means the same logical run. The same key returns the existing run; the same key with a different source is a `409`.

## Revisions

Every mutable record carries an integer `revision`. Writes send `expected_revision`; the update is conditional, and a mismatch returns `409 revision_conflict` instead of losing a concurrent write. This is the concurrency model of the whole platform — learn it once ([[CODE_WALKTHROUGH|Code walkthrough]] shows the SQL).

## Where to next

- [[DATA_MODEL|Data model]] — field-level reference for every record above.
- [[LIMITS|Limits]] — the hard bounds each contract enforces.
- [[ERRORS|Errors]] — the complete error-code catalog.
- [[RECIPES|Recipes]] — copyable snippets for common tasks.
