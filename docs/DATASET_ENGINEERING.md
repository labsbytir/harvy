---
title: Dataset engineering
description: Standards for building large, source-grounded intelligence datasets.
tags:
  - data
  - datasets
  - provenance
---

# Dataset engineering

This is the operating standard for building intelligence datasets at scale without turning volume into unsupported identity or certainty claims.

## Dataset contract

Every record must carry, directly or through a manifest:

- stable HarvyDex record ID and semantic type;
- explicit scope: shared, tenant, workspace, and product where applicable;
- source URL or registered API identity;
- publisher/source label and collection timestamp;
- observed time range when the source exposes one;
- collection method and connector/source scope ID;
- raw artifact reference and content hash when persisted;
- normalized schema version and configuration revision;
- coverage gaps, limitations, and error/partial status;
- links to supporting evidence, never just a derived name match.

A name match is not a verified identity claim. Keep observed, inferred, disputed, corrected, and unverified distinctions visible.

## Pipeline stages

```text
inventory
  -> permission and source review
  -> bounded collection
  -> raw artifact retention
  -> normalization and schema validation
  -> deterministic identity and dedupe
  -> provenance/evidence indexing
  -> scoped query/UI exposure
  -> quality and freshness measurement
  -> independent review
```

A failed collection or storage step must not become a successful dataset result. Partial output is explicitly partial.

## Scale without unsafe breadth

- Partition by stable source cursor, date, geography, or provider page—not arbitrary time windows.
- Set explicit item/page/byte/time budgets before dispatch.
- Keep external concurrency at the approved source/provider limit; never trade rate-limit safety for throughput.
- Use resumable checkpoints and deterministic replay keys.
- Store large payloads in R2 and pass artifact references through workflow boundaries.
- Separate bounded verification runs from full ingest runs.
- Record completeness and skipped partitions; never silently claim full coverage.
- Apply source permissions, retention, licensing, and deletion rules before activation.

## Idempotency and replay

A replay with the same source scope, source revision, partition, and deterministic record key must not create duplicate evidence or artifacts. Run IDs and idempotency keys are scoped to tenant/workspace as appropriate. An ambiguous dispatch can be retried with the same key only under the run contract; an explicit terminal retry creates a linked new run.

## Storage boundaries

| Layer | Responsibility | Rule |
|---|---|---|
| PostgreSQL through Hyperdrive | Transactional identity, tenancy, permissions, run registry, operational indexes | Target launch authority; local D1 paths are not proof of production readiness. |
| R2 | Raw captures, normalized artifacts, manifests | Verify content type, size, hash, scope, and object existence before publication. |
| Basin SQL/Catalog | Historical analytical tables and large-scale query | Use registered schemas and bounded SQL; verify after expected ingest flush lag. |
| K2/Queues/Workflows | Only when a measured consumer needs durable asynchronous delivery | Define owner, schema, retry, replay, and dead-letter behavior first. |

## Quality gates

Before a source is adopted, verify two bounded successful runs, idempotent replay, source permission/path, normalized provenance, artifact persistence, analytical/query visibility, UI evidence, health/freshness, and independent review. Report the numerator and denominator; do not replace adoption with registration count.

## Related standards

- [[DEVELOPMENT|Engineering standard]]
- [[CONNECTOR_PLAN|Connector adoption gates]]
- [[CONNECTOR_STATUS|Connector evidence ledger]]
- [[REPO_INDEX|Infrastructure and resource evidence]]
