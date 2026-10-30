[![Harvy banner](docs/assets/harvy-github-banner.png)](https://docs.harvy.dev)

# Harvy

Harvy is a new web SaaS for source-grounded intelligence and operations. Ontoly is the shared ontology. Tower, Ops, Civic, and Newsk are product contexts; Tower includes a business intelligence desk. HarvyDex provides stable UUIDs, HQL is the shared query contract, and the user's VPS-hosted n8n workflows are Harvy's Automation system for approved external source access.

This is the clean V2 repository. It contains Better Auth integration, a tenant-scoped product API, Newsk story/brief flows, Tower/Civic event views, an Ops handoff queue, a Drizzle Cube analytics surface, inactive n8n control templates, and additive D1 migrations. The local preview contains no live customer data. Worker routes, migrations, R2 bindings, product grants, Automation/n8n connections, and approved source configurations are not deployed or verified.

## Start here

- [Single master plan](docs/PLAN.md)
- [Engineering standard](docs/DEVELOPMENT.md)
- [UI and Drizzle Cube specification](docs/UI_SPEC.md)
- [Build-agent handoff prompt](docs/BUILD_AGENT_PROMPT.md)
- [n8n control templates and Automation boundary](v2/workflows/README.md)
- [Documentation site hosting](docs/HOSTING.md) · [Published site](https://docs.harvy.dev)

## Local development

Install Node.js 24 and run:

    npm ci
    npm run dev

Run the current automated checks:

    npm run check:local

The check command typechecks the web/shared, API, Better Auth server/client code, runs contract/API/auth tests, and builds the web bundle. CI runs the same command. Live source, two-tenant deployment, egress, and recovery checks remain blocked on configuration; a green local check does not imply a deployed SaaS.

Old code and guides remain in the separately moved legacy repository. Port a module only after checking its ownership, scope, source access, tests, and compatibility with this architecture. Do not import the old supervisor or generated frontend.
