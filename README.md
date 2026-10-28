# Harvy

Harvy is a new web SaaS for source-grounded intelligence and operations. Ontoly is the shared ontology. Tower, Ops, Civic, and Newsk are product contexts; Tower includes a business intelligence desk. HarvyDex provides stable UUIDs, HQL is the shared query contract, and Automation owns connectors and external source access.

This is a clean repository seed. It contains the canonical plan, engineering and UI specifications, an inactive n8n starter, the first typed Automation run contract, focused tests, and an original responsive website preview. The preview uses illustrative content and no live customer data. Authentication, product API, Automation endpoint, persistence, and connectors are still to be built.

## Start here

- [Single master plan](docs/PLAN.md)
- [Engineering standard](docs/DEVELOPMENT.md)
- [UI and Drizzle Cube specification](docs/UI_SPEC.md)
- [Build-agent handoff prompt](docs/BUILD_AGENT_PROMPT.md)
- [n8n starter and proposed Automation API](v2/workflows/README.md)

## Local development

Install Node.js 24 and run:

    npm ci
    npm run dev

Run the current automated checks:

    npm run check:local

The check command typechecks the shared code and web app, runs the Automation contract tests, and builds the website preview. CI runs the same command. Live source, tenancy, and deployment checks remain future gates; a green local check does not imply a working SaaS.

Old code and guides remain in the separately moved legacy repository. Port a module only after checking its ownership, scope, source access, tests, and compatibility with this architecture. Do not import the old supervisor or generated frontend.
