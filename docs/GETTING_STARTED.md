---
publish: true
title: Get started
description: Set up the repository and follow your first scoped API request.
tags: [guide, developer-docs]
---

# Get started

**Status:** Local developer workflow; hosted product API and sign-in not verified. Reviewed 2026-10-30.

## Install and check

From the [Harvy repository](https://github.com/labsbytir/harvy) root:

```sh
git rev-parse --show-toplevel
npm ci
npm run check:local
npm run docs:build
```

`check:local` runs five typechecks (root, API, auth, auth-client, email-inbox), tests and the web build. `docs:build` renders the canonical `docs/` Markdown into `dist/docs`. Neither command proves a deployed API, production database, live connector, or two-tenant isolation. For a local web preview use `npm run dev`; for the documentation preview use `npm run docs:dev`. The web preview can show fixture states when services are unavailable.

## Trace a request through the code

1. `v2/web/src/api.ts` calls `/api/v1/events` with same-origin credentials and handles error JSON.
2. `v2/api/worker.ts` asks the auth Worker for the actor, checks `events.view`, and resolves the requested product against that tenant's entitlements.
3. `listEvents` binds the actor's tenant and workspace plus the entitled product *before* applying search filters and pagination. It returns `{ items, next_cursor }`.
4. `v2/shared/` defines the shared contracts; `v2/tests/` checks scoped behavior. See [[CODEBASE|Codebase map]].

A client-supplied ID or `product` parameter is not authorization. PostgreSQL via Hyperdrive is the intended production store; the local/test path and checked-in configuration are not deployment evidence.

## First authenticated call (only when provisioned)

An authorized signed-in user must already have an API key, organization membership, a configured API deployment and product entitlement. Inject `HARVY_API_KEY` and `HARVY_ORGANIZATION_ID` through an approved secret mechanism; do not paste values into source, shell history, screenshots or URLs. No demo key or public sign-up is promised.

```sh
curl --fail-with-body --silent --show-error \
  -H "x-api-key: $HARVY_API_KEY" \
  -H "x-harvy-organization-id: $HARVY_ORGANIZATION_ID" \
  https://harvy.dev/api/v1/context
```

This returns `allowedProducts` and `capabilities`. If `Newsk` and `events.view` are present, try [[API_EXAMPLES|reading events]]. A browser with a valid session instead sends same-origin credentials and selects an active organization; an API key requires the organization header. A missing provisioned API can return an error rather than example data.

## Where next?

- [[AUTH|Authentication and authorization]]: keys, sessions, roles, and scope.
- [[API_EXAMPLES|API examples]]: read, page, inspect evidence and safely update.
- [[TUTORIAL|Build an integration]]: a complete poller script and production checklist.
- [[API_ENDPOINTS|API endpoints]] and [[API_REFERENCE|API reference]]: the route contracts.
- [[QUERY_GUIDE|Query guide]]: analytics queries over what you ingest.
- [[DEVELOPER_STANDARDS|Developer standards]]: conventions and review checklist.
- [[STATUS|Implementation status]]: local proof versus live proof.
