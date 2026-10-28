# Harvy web and analytics UI specification

Status: implementation specification, 2026-10-28. The canonical delivery sequence is PLAN.md. This clean repository contains a public website preview and a starter HarvyShell. The authenticated analytics screens are not implemented. Do not present the specification as shipped.

## 1. Product experience and visual direction

Harvy is a browser SaaS with one shared shell and four product contexts: Tower, Ops, Civic, and Newsk. Ontoly supplies the object model; HarvyDex supplies stable record IDs; HQL is the shared query contract. Analysis is the common interaction, with product-specific starting views. No desktop app or download CTA.

Take inspiration from Capy's clear hierarchy, large editorial headlines, short explanations, prominent live product demonstration, and visible work progress. Make Harvy's appearance its own: warm off-white canvas, deep ink text, teal primary action, restrained amber for pending/review, and red only for failure. Prefer genuine source cards and query results over decorative code screenshots. Public claims and usage metrics require evidence. Product UI is calm and information-dense; the public site is more spacious.

Design tokens, initially: ink #17212B, canvas #F8F7F4, surface #FFFFFF, border #D8DDD9, primary #086E68, primary-hover #075A55, warning #9A5A17, danger #B33B36, muted #5F6B72. Use MUI's theme as token authority and bridge its resolved values to Drizzle Cube's --dc-* CSS variables after checking the installed version. Use a readable sans-serif for UI, a restrained display face for public headings, and monospace only for IDs, HQL, timestamps, and code. Light/dark/system themes must preserve semantic status colors and contrast. Avoid unlicensed brand art or copying Capy's mascot and illustrations.

Responsive structure: desktop at 1200px+ uses a 248px product rail, 56-64px top bar, and flexible main area; tablet collapses the rail to icons; mobile uses a menu drawer and one content column. Analysis controls become a sheet on narrow screens. Dashboard tiles reflow without horizontal page scroll. Target WCAG 2.2 AA: keyboard path, visible focus, 44px touch targets where practical, text alternatives, chart data table fallback, labeled axes, status announcements, and reduced-motion support.

## 2. Public website

Routes: /, /product/newsk, /product/tower, /product/ops, /product/civic, /ontology, /security, /docs, /contact, /sign-in. Documentation can use Bulma on its separate site; the application and marketing UI use MUI with shared tokens. Better Auth owns sign-in flows.

Homepage sections in order:

1. Header: Harvy wordmark, Products menu, How it works, Documentation, Security, Sign in, and one Get a demo CTA.
2. Hero: concise newsroom-first promise, one sentence describing source-to-evidence workflow, CTA to request a demo, secondary See the workflow action. Display a real annotated Newsk preview with source, captured time, freshness, evidence, and a brief; clearly label fixture/demo data.
3. How it works: Monitor approved sources → connect observations in Ontoly → analyze in HQL → verify and hand off. Each step links to a product screen or documented sample.
4. Product cards: Newsk as the initial customer workflow; Tower, Ops, Civic as shared-context use cases. Each card names an outcome and one realistic screen.
5. Evidence and trust: source citations, coverage limitations, scoped access, provenance, and update times. Show verified capabilities only.
6. Short workflow walkthrough: monitor to event, event to query, query to evidence-backed brief. Offer a playable demo when it exists; otherwise show an honest static walkthrough.
7. CTA/footer: demo/contact, docs, legal, accessibility, status/support links.

Public elements: NavBar, ProductMenu, Hero, ProductPreview, WorkflowStep, ProductCard, EvidenceCard, CapabilityBadge, DemoNotice, CTA, Footer. Every marketing component has loading/error fallbacks only if it fetches live data. Do not place provider keys or connector internals in customer-facing copy.

## 3. Shared authenticated shell

HarvyShell is the visual frame. Add an authenticated bootstrap endpoint returning principal, tenant, workspace, allowed products, capability set, feature revision, Ontoly schema revision, HQL version, and safe service health. The server decides access; the UI may only use capability data to render affordances. Never derive tenant scope from a client-controlled route alone.

Global header: product switcher, tenant/workspace switcher, global search, freshness/run indicator, notifications, help, user menu. Left navigation is registry-driven and capability-filtered. Main header has title, concise description, breadcrumb, primary action, saved-view selector, and last-updated metadata. Right inspector is optional and resizable. Command palette searches allowed objects, saved views, dashboards, and actions; it never reveals denied items.

Shared elements and semantic tags: Shell, ProductSwitcher, WorkspaceSwitcher, SearchBox, ScopeChip, FeatureGate, Breadcrumbs, PageHeader, ActionBar, StatusBadge, FreshnessBadge, CoverageBadge, SourceCitation, EvidenceDrawer, RunProgress, EmptyState, ErrorState, PermissionState, ExportDialog, SaveDialog, ShareDialog, AuditLink, Toast, ConfirmDialog, and SupportLink. Register stable tags in one catalog (for example harvy.newsk.query.analysis-builder); do not invent tags in each screen. Tags support tests, telemetry, help text, and UI agents, but contain no private values.

All surfaces use explicit loading, ready, empty, stale, partial, error, denied, and unavailable states. A green connector run is distinct from a complete source result. An empty response shows requested source/time window and latest successful run. Stale/partial states show age, missing coverage, and a recovery action. Destructive and external actions use clear confirmation and server audit.

### Shared component register

Every registered element has a stable semantic tag, accessible name, owner, documented props/events, and a story or fixture for each relevant state. Use the tag form harvy.<product-or-global>.<surface>.<element>.<version> with a separate instance ID only for repeated records. Do not place tenant IDs, source URLs, or user text in tags. The registry maps tags to telemetry and automation selectors; product copy can change without breaking selectors.

| Element | Inputs and visible parts | Events and state rules |
|---|---|---|
| ProductSwitcher | allowed products, active product, product description | Navigate to last allowed route; deny unavailable product server-side. |
| WorkspaceSwitcher | allowed workspaces, active scope, role label | Invalidate scoped queries and saved-view cache before switching; announce new scope. |
| GlobalSearch | query, allowed object/result types, time bounds | Debounced, cancellable, keyboard results; never return denied items; open object/evidence route. |
| PageHeader/ActionBar | title, description, breadcrumbs, primary/secondary actions | Disable action on missing capability; explain why when possible; preserve focus after navigation. |
| StatusBadge/FreshnessBadge/CoverageBadge | run state, last success, expected cadence, covered sources/window | Status text and icon as well as color; links to run/coverage detail; stale threshold from source policy. |
| SourceCitation | publisher/source label, URL, capture time, artifact ID, rights, quote span | Open source safely; show provenance/limitations; no claim that source supports unobserved text. |
| EvidenceDrawer | object/event ID, observations, links, conflicts, raw artifact handles | Authorized fetch on open; focus trap; close restores trigger focus; per-item citation. |
| RunProgress | run ID, stage, counts, deadline, retry/partial reason | Poll/backoff or events; cancel only with permission; submitted and completed are distinct. |
| FeatureGate/PermissionState | capability, feature key, policy revision, explanation | Render denied/unavailable consistently; API still rejects unauthorized calls. |
| SaveDialog | title, description, scope, visibility, current revision | Validate; show conflict with reload/copy options; preserve unsaved input on error. |
| ShareDialog | audience, expiry, role, inherited source restrictions | Preview who gains access; server checks every tile/source; revoke and audit. |
| ExportDialog | format, row/byte estimate, scope, citation inclusion | Confirm bounded export; report async status and expiry; reauthorize artifact download. |
| Alert/Toast/ConfirmDialog | severity, action, correlation ID, dismiss policy | Errors have recovery action; no secret/raw provider response; high-impact action names its target. |
| Empty/Error/Stale/Partial panels | requested scope/time, last good data, coverage, reason | Specific retry or change-filter action; never silently replace stale data with fresh label. |
| QueryFilterBar | cube, fields, operators, values, time range, active chips | Validate types/operators; reset to authorized defaults; retain bounds through drill. |
| ChartCard | title, query, units, visualization, freshness, source coverage | Hover/focus detail; table equivalent; drill or evidence action; resize with layout. |
| RecordTable | allowed columns, server cursor/page, sort, selected row | Stable row IDs, keyboard navigation, bounded page size, scoped row drawer. |
| NotebookBlock | text/chart/table, generated-by, citations, status, revision | Edit/accept/reject; no uncited factual claim presented as verified. |

Component API shape: each asynchronous component receives an authorized context and an operation ID, not raw credentials. It emits typed intent events; the shared API client performs the request and returns a typed result with trace, scope, snapshot/freshness, and safe error. Components never call Automation, Spider, Webshare, R2, or Drizzle SQL directly from the browser.

## 4. Screen inventory and user tasks

| Screen | Primary task | Required elements | MVP status |
|---|---|---|---|
| Newsk Home | Notice a developing item and verify it | Beat/time selector, monitored source status, event feed, coverage/freshness chips, evidence panel, save brief | First customer slice |
| Tower Business Desk | Track a market, company, competitor, sector, or risk topic | Business watchlists, entity/event timeline, signal strength and coverage, comparison cards, HQL analyses, evidence-backed intelligence brief, handoff to Ops | Defined product mode; build after Newsk core |
| Monitor setup | Define a scoped source watch | Source allowlist picker, terms/coverage notice, target scope, cadence/bounds, preview, pause/resume | First fixed configuration only |
| Event detail | Trace an emerging event | Timeline, object/link references, source citations, duplicate/contradiction flags, assignment, brief action | Minimum evidence view |
| Analysis Workbench | Build a bounded HQL-backed query | Cube chooser, metrics/dimensions/filters, time range, preview, visualization picker, save/share/export | First query mode |
| Dashboards | Read and compose saved views | Dashboard list, grid, filter bar, edit/save/revert, freshness/source metadata, share policy | One saved dashboard MVP |
| Data Browser | Inspect scoped records | Cube list, filters, sortable table, column picker, pagination, record/evidence drawer | Later or gated |
| Schema Explorer | Understand analytical cubes | Searchable cube ERD, field details, joins, selected-field handoff to builder | Later or gated |
| Notebook | Ask and assemble grounded analysis | Prompt/chat panel, text/chart blocks, citations, budget/status, save as dashboard | Later, requires server agent |
| Ontoly object | Examine a canonical record | Type, HarvyDex ID, properties, observations, links, provenance, correction history | Read-only MVP |
| Ops/Admin | Manage runs and access | Connector/run registry, retry/cancel, feature flags, role grants, audit, health | Operator-only minimum |

Tower, Ops, Civic, and Newsk can define landing presets, field labels, and allowed actions. They use the same underlying Shell, Analysis Workbench, dashboard, browser, evidence, and identity components. Product-specific components must consume registered object and query contracts, not bypass the shared API.

Tower's business mode is a view within the Tower product, not a replacement for Ops. A user chooses a business watchlist and time/geography, sees emerging market or competitor signals with source coverage and confidence, opens the relevant Ontoly objects and evidence, compares entities or periods in HQL, and saves an attributed intelligence brief. An authorized handoff creates an Ops action or monitor with a link to the Tower analysis; the operational task remains owned by Ops. The mode must distinguish observed facts, derived signals, analyst judgments, and AI suggestions. No business-impact score appears without its metric definition, inputs, and date.

## 5. Drizzle Cube integration map

The new repository pins drizzle-cube 0.12.2 but has not mounted its analytics client. The former checkout had a CubeProvider/AnalyticsDashboard implementation against a legacy /api/v2/cube route; use it only as reviewed reference. Public documentation may describe APIs that differ from this pinned package. Before implementing each item, inspect installed exports/types, lockfile, release notes, and a minimal compile; record verified API names and version in the PR. New product operations belong under /api/v1 through a controlled adapter. HQL remains Harvy's external query language; a typed server adapter maps the supported HQL subset to approved cube queries. Reject unsupported operations explicitly.

| Client capability | Harvy UI specification | Integration rule |
|---|---|---|
| React client / CubeProvider | One provider per authenticated analytics area; scoped API client with short-lived auth context, aborts, trace ID, and safe error mapping. | Do not put tenant ID or static API key in a query URL as authority. |
| AnalysisBuilder | Query composer with allowed cube, metrics, breakdowns, filters, time range, sort, preview, visualization, saved analysis, and shareable link. | Server validates metadata, permission, row/time/cost limits; URL contains no secret or private result. Start with supported query mode; multi-query/funnel require verified server support. |
| DataBrowser | Authorized row browser with cube sidebar, filter bar, sort, resize/column visibility, server pagination, and record inspector. | Ungrouped queries are bounded and scoped; expose only allowed fields and a maximum page size. |
| DashboardGrid / composable pieces | MUI toolbar, Drizzle Cube grid/filter/modals/store, tile library, edit/save/revert, layout mode, responsive behavior. | Use composable API for Harvy toolbar only if installed version supports it; preserve edit/save state machine. |
| Persistence | Save named DashboardConfig revisions with owner, scope, schema/HQL versions, layout, filters, share policy, and optimistic revision. | Harvy implements /api/v1/dashboards CRUD and audit. Thumbnail is optional R2 artifact, never base64 in DB. Validate config on read/write. |
| Charts | Start with KPI, table, bar, line/area, pie where useful; add scatter, heatmap, funnel, Sankey only when data shape and accessible fallback exist. | Each tile shows title, units, timeframe, sample count, updated time, source coverage, citation/action menu. Avoid pie for many categories. |
| Chart plugins | Register Harvy custom charts through CubeProvider customCharts after confirming ChartDefinition/ChartTypeConfig support. Candidate plugins: source coverage matrix and event timeline. | Namespaced type, declared field drop zones and display options, lazy loading for heavy code, empty/missing-axis states, keyboard/table equivalent, bounded data, drill click event, visual test. No chart may execute arbitrary SQL. |
| SchemaVisualization | Show cube ERD, field search, joins, selected fields, and add-to-analysis action. | This is analytical schema, distinct from Ontoly object graph in Reagraph; optional peer dependencies and bundle size checked before enablement. |
| Drill-down | Time, configured hierarchy, and underlying-detail drill with menu and breadcrumb. | Every drill reauthorizes query and scope; bounds persist; breadcrumb and back action restore exact query. Evidence detail opens a scoped drawer. |
| AgenticNotebook | Chat + text/chart canvas with source-linked blocks, save/share, agent status, and cost budget. | Requires Harvy server-side AI route and tool allowlist; prompt injection and query bounds enforced; no browser key; AI output remains a proposed analysis until verified. |
| Theming | Map MUI palette/typography/density to Drizzle Cube --dc-* variables; support light/dark/system. | One source of truth and visual regression at all breakpoints. |
| Hooks | Use documented query/meta hooks for custom tiles, refresh, loading, and error states. | Central wrapper applies auth, cancellation, retries, query limits, telemetry; avoid each screen inventing network behavior. |
| Scaling | Stable cube names and versioned semantic definitions; selective imports, bounded queries, measured caching, and demand-driven aggregates. | Tenant-scoped cache keys and authorization; only introduce pre-aggregation or Basin-backed query path after measured need. |

Dashboard document minimum: HarvyDex UUID id; tenant_id; workspace_id; owner_principal_id; product; title; description; config_json; schema_version; hql_version; feature_revision; visibility; revision; created_at; updated_at; deleted_at. The API returns an ETag/revision and rejects stale updates with a conflict response. A private dashboard never becomes public because its tile references a shared object. Sharing and exports reauthorize every underlying query.

## 6. Component contracts and behavior

Each tool registration has id, semantic tag, owning product, required capability, feature key, input/output schema, supported media, cost bounds, owner, and telemetry name. ToolContext has principal, tenant/workspace, permissions, feature revision, HQL/Ontoly versions, trace, locale/timezone. ToolOutput has data or authorized artifact handles, provenance, source coverage, updated time, query/snapshot ID, and safe error. The UI must not import another product's private store or credentials.

Query tiles include an accessible table view and export of the current authorized result only. Maps use Protomaps, relation graphs Reagraph, video Video.js, and Formbricks where approved; these appear as registered tool surfaces in the same shell, not assumed Drizzle Cube chart types. YouTube playback/metadata requires the approved API integration and rights/attribution. Empty, error, permission, offline, expired session, and rate-limited behavior have distinct copy and actions.

Interaction rules: keyboard Escape closes drawers/modals; unsaved edits prompt before leaving; filters preserve URL state only when safe; long queries show progress/cancel; refresh shows last-success time and does not erase a still-useful prior result; charts never imply complete coverage when source runs are partial. Use skeletons for loading, not fake numbers. Telemetry events use semantic tags and operation IDs with redacted properties.

## 7. Build and acceptance order

1. Inventory pinned Drizzle Cube APIs and review the former graph screen as a reference. Capture the new website preview and compile baseline.
2. Establish MUI tokens, semantic tags, responsive shell, and signed-in bootstrap. Verify two-tenant denial and keyboard/mobile behavior before wiring private data.
3. Wire one Newsk end-to-end source and one bounded AnalysisBuilder query through the Harvy API/HQL adapter. Display provenance and partial/stale states.
4. Persist one dashboard with server validation, revision conflict handling, and safe reloading. Add table and KPI/chart tile with drill to evidence.
5. Add DataBrowser and schema explorer behind verified feature flags. Add custom chart plugin only after confirming installed API and a real user need.
6. Add notebooks, richer visualizations, sharing/export, maps/graphs/media after the underlying access, source, and AI contracts pass.

Minimum acceptance for each screen: correct scope denial, feature denial, loading/empty/stale/partial/error, keyboard focus, mobile width, source citation, bounded query, saved-state recovery, and no console errors. Verify actual browser behavior with two tenants and real permitted source data before customer release. Unit/contract tests cover permission and serialization; component tests cover state transitions; browser tests cover one editor journey and a denied-tenant journey; visual checks cover desktop/mobile and light/dark. Record screenshots and exact commands in the PR.

## Sources reviewed

- Capy homepage: https://capy.ai/ (visual inspiration only).
- Drizzle Cube client overview: https://www.drizzle-cube.dev/client/
- Analysis Builder: https://www.drizzle-cube.dev/client/analysis-builder/
- Data Browser: https://www.drizzle-cube.dev/client/data-browser/
- Composable dashboards: https://www.drizzle-cube.dev/client/composable-dashboards/
- Dashboard persistence: https://www.drizzle-cube.dev/client/dashboard-persistence/
- Charts and plugins: https://www.drizzle-cube.dev/client/charts/ and https://www.drizzle-cube.dev/client/chart-plugins/
- Schema visualization and drill-down: https://www.drizzle-cube.dev/client/schema-visualization/ and https://www.drizzle-cube.dev/client/drill-down/
- Agent notebooks, theming, hooks, scaling: https://www.drizzle-cube.dev/client/agent-notebooks/ ; https://www.drizzle-cube.dev/client/theming/ ; https://www.drizzle-cube.dev/client/hooks/ ; https://www.drizzle-cube.dev/getting-started/scaling/
