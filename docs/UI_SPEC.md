# Harvy web and analytics UI specification

Status: implementation specification, 2026-10-29. The canonical delivery sequence is ROADMAP.md. The repository now has a public preview, Better Auth client integration, authenticated Newsk feed/story flow, explicit Harvy-admin-managed product grants, shared product event/evidence and analytics views, and an Ops handoff queue. These are local implementations, not deployed customer screens; product grants, sources, routes, R2 bindings, and the VPS n8n webhook/workflows remain unconfigured or unverified. Do not present the full specification as shipped.

## 1. Product experience and visual direction

Harvy is a browser SaaS with one shared shell and four product contexts: Tower, Ops, Civic, and Newsk. Ontoly supplies the object model; HarvyDex supplies stable record IDs; HQL is the shared query contract. Analysis is the common interaction, with product-specific starting views. No desktop app or download CTA.

Use a clear hierarchy, large editorial headlines, short explanations, a prominent live product demonstration, and visible work progress. Make Harvy's appearance distinct: warm off-white canvas, deep ink text, teal primary action, restrained amber for pending/review, and red only for failure. Prefer genuine source cards and query results over decorative code screenshots. Public claims and usage metrics require evidence. Product UI is calm and information-dense; the public site is more spacious.

Design tokens, initially: ink #17212B, canvas #F8F7F4, surface #FFFFFF, border #D8DDD9, primary #086E68, primary-hover #075A55, warning #9A5A17, danger #B33B36, muted #5F6B72. Use MUI's theme as token authority and bridge its resolved values to Drizzle Cube's --dc-* CSS variables after checking the installed version. Use a readable sans-serif for UI, a restrained display face for public headings, and monospace only for IDs, HQL, timestamps, and code. Light/dark/system themes must preserve semantic status colors and contrast. Keep Harvy's visual identity original; do not use unlicensed third-party brand art or mascots.

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

Public elements: NavBar, ProductMenu, Hero, ProductPreview, WorkflowStep, ProductCard, EvidenceCard, CapabilityBadge, DemoNotice, CTA, Footer. Every marketing component has loading/error fallbacks only if it fetches live data. Do not place provider keys or workflow internals in customer-facing copy.

## 3. Shared authenticated shell

HarvyShell is the visual frame. Add an authenticated bootstrap endpoint returning principal, tenant, workspace, allowed products, capability set, feature revision, Ontoly schema revision, HQL version, and safe service health. The server decides access; the UI may only use capability data to render affordances. Never derive tenant scope from a client-controlled route alone.

Global header: product switcher, tenant/workspace switcher, global search, freshness/run indicator, notifications, help, user menu. Left navigation is registry-driven and capability-filtered. Main header has title, concise description, breadcrumb, primary action, saved-view selector, and last-updated metadata. Right inspector is optional and resizable. Command palette searches allowed objects, saved views, dashboards, and actions; it never reveals denied items.

Shared elements and semantic tags: Shell, ProductSwitcher, WorkspaceSwitcher, SearchBox, ScopeChip, FeatureGate, Breadcrumbs, PageHeader, ActionBar, StatusBadge, FreshnessBadge, CoverageBadge, SourceCitation, EvidenceDrawer, RunProgress, EmptyState, ErrorState, PermissionState, SaveDialog, ShareDialog, AuditLink, Toast, ConfirmDialog, and SupportLink. Customer data is view-only: do not add download/export affordances or expose raw object handles. Register stable tags in one catalog (for example harvy.newsk.query.analysis-builder); do not invent tags in each screen. Tags support tests, telemetry, help text, and UI agents, but contain no private values.

All surfaces use explicit loading, ready, empty, stale, partial, error, denied, and unavailable states. A green workflow run is distinct from a complete source result. An empty response shows requested source/time window and latest successful run. Stale/partial states show age, missing coverage, and a recovery action. Destructive and external actions use clear confirmation and server audit.

### Shared component register

Every registered element has a stable semantic tag, accessible name, owner, documented props/events, and a story or fixture for each relevant state. Use the tag form harvy.<product-or-global>.<surface>.<element>.<version> with a separate instance ID only for repeated records. Do not place tenant IDs, source URLs, or user text in tags. The registry maps tags to telemetry and automation selectors; product copy can change without breaking selectors.

| Element | Inputs and visible parts | Events and state rules |
|---|---|---|
| ProductSwitcher | allowed products, active product, product description | Navigate to last allowed route; deny unavailable product server-side. |
| WorkspaceSwitcher | allowed workspaces, active scope, role label | Invalidate scoped queries and saved-view cache before switching; announce new scope. |
| GlobalSearch | query, allowed object/result types, current date bounds | Implemented for scoped events, evidence text, stories, visible dashboards, and Ops actions; evidence results return metadata only and open the scoped parent event. Requests are debounced/cancellable with MUI keyboard selection. Independent time controls remain pending. |
| PageHeader/ActionBar | title, description, breadcrumbs, primary/secondary actions | Disable action on missing capability; explain why when possible; preserve focus after navigation. |
| StatusBadge/FreshnessBadge/CoverageBadge | run state, last success, expected cadence, covered sources/window | Status text and icon as well as color; links to run/coverage detail; stale threshold from source policy. |
| SourceCitation | publisher/source label, URL, capture time, artifact ID, rights, quote span | Open source safely; show provenance/limitations; no claim that source supports unobserved text. |
| EvidenceDrawer | object/event ID, observations, links, conflicts, source citation metadata | Authorized in-app fetch on open; never expose raw R2 handles; focus trap; close restores trigger focus; per-item citation. |
| RunProgress | run ID, stage, counts, deadline, retry/partial reason | Same-key retry for ambiguous submission; terminal retry creates a new linked run; no cancel affordance until n8n acknowledges cancellation. Submitted and completed are distinct. |
| FeatureGate/PermissionState | capability, feature key, policy revision, explanation | Render denied/unavailable consistently; API still rejects unauthorized calls. |
| SaveDialog | title, description, scope, visibility, current revision | Validate; show conflict with reload/copy options; preserve unsaved input on error. |
| ShareDialog | audience, expiry, role, inherited source restrictions | Preview who gains access; server checks every tile/source; revoke and audit. |
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
| Newsk Home | Notice a developing item and verify it | Monitored source list, event feed, source/time/keyword/status filters, evidence panel, saved story, cited extractive brief | Local first slice; no live sources |
| Tower Business Desk | Track a market, company, competitor, sector, or risk topic | Product-scoped event/evidence feed, HQL analytics, saved source/time/keyword watchlists, and evidence-backed Ops handoff are available; entity watchlists/comparisons, scored signals, and intelligence briefs remain | Partial shared surface; no live sources |
| Civic Monitoring | Follow civic and legislative events | Product-scoped approved-source feed, evidence, bounded filters, shared analytics, and evidence-backed Ops handoff | Partial shared surface; legislative domain views and live workflows pending |
| Monitor setup | Define a scoped source watch | Only pre-approved source rows are visible; tenant owners/admins can pause/resume with revision checks and audit. Source drafting/approval, terms/coverage editor, cadence, and preview are not exposed. | Fixed configuration and safe state controls only |
| Event detail | Trace an emerging event | Source citations, event status, self-assignment, activity history, brief action, and Tower/Civic handoff | Duplicate/contradiction flags, teammate selection, generic object links, and source-claim corrections remain |
| Analysis Workbench | Build a bounded HQL-backed query | Drizzle Cube dashboard, ungrouped DataBrowser, and searchable Events/Evidence schema explorer over product-scoped cubes; bounded HQL API | Local tools exist; richer query authoring, drill-to-evidence, and live-source validation pending |
| Dashboards | Read and compose saved views | Product-scoped dashboard CRUD, private/workspace visibility, revision-checked edits/deletes, bounded Drizzle Cube config validation, a distinct saved-filter schema, and metadata-only lifecycle audit | Local sharing, validation, and SQLite integration tests; data export is prohibited and deployed storage remains |
| Data Browser | Inspect scoped records | Drizzle Cube ungrouped record table, product-scoped filters, and bounded HQL execution | Local tools exist; evidence drill-through and live-source validation pending |
| Schema Explorer | Understand analytical cubes | Searchable cube/field metadata and relationship details | Local tools exist; visual ERD and selected-field handoff pending |
| Notebook | Ask and assemble grounded analysis | Prompt/chat panel, text/chart blocks, citations, budget/status, save as dashboard | Later, requires server agent |
| Ontoly object | Examine a canonical event record | Event type, stable HarvyDex UUID, observed range, linked source observations and provenance | Partial event view; generic object relationships and source-claim correction history remain unimplemented; workflow status/assignment activity is available |
| Ops/Admin | Manage runs and access | Product-scoped run list plus Newsk story and Tower/Civic event handoffs into an action queue with revision-checked status updates exist locally; tenant admins can pause/resume only pre-approved monitors; Harvy-admin-only entitlement controls and a bounded metadata-only audit view cover product access, monitor state, and dashboard lifecycle. Same-key retry is available for unconfirmed dispatches; source drafting/approval, workflow registry editing, linked terminal retry, cancellation, and live health remain. | Partial operator surface; no live sources or hosted admin console |

Tower, Ops, Civic, and Newsk can define landing presets, field labels, and allowed actions. They use the same underlying Shell, Analysis Workbench, dashboard, browser, evidence, and identity components. Product-specific components must consume registered object and query contracts, not bypass the shared API.

Tower's business mode is a view within the Tower product, not a replacement for Ops. A user chooses a business watchlist and time/geography, sees emerging market or competitor signals with source coverage and confidence, opens the relevant Ontoly objects and evidence, compares entities or periods in HQL, and saves an attributed intelligence brief. An authorized handoff creates an Ops action or monitor with a link to the Tower analysis; the operational task remains owned by Ops. The mode must distinguish observed facts, derived signals, analyst judgments, and AI suggestions. No business-impact score appears without its metric definition, inputs, and date.

## 5. Drizzle Cube integration map

The repository pins drizzle-cube 0.12.2 and mounts `CubeProvider`/`AnalyticsDashboard` on `/api/v1/cube`. The installed client/server exports and types were inspected; a local compile, build, and D1-shaped semantic-layer test pass. The API registers Events and Evidence cubes, filters them by authenticated tenant/workspace and one explicitly entitled product, and maps a bounded HQL v1 subset to those cubes. It rejects unknown members/operators, raw SQL, unbounded limits, and missing product scope. XLSX and dashboard import/export features are explicitly disabled, and dashboard config validation rejects feature overrides. Nivo 0.99.0 was restored from the prior Harvy stack because the pinned library's heatmap chunk requires it. The analytics screen is lazy-loaded; unused library export code still contributes to a lazy build chunk. The former checkout's `/api/v2/cube` is reference only.

| Client capability | Harvy UI specification | Integration rule |
|---|---|---|
| React client / CubeProvider | One provider per authenticated analytics area; scoped API client with short-lived auth context, aborts, trace ID, and safe error mapping. | Do not put tenant ID or static API key in a query URL as authority. |
| AnalysisBuilder | Query composer with allowed cube, metrics, breakdowns, filters, time range, sort, preview, visualization, saved analysis, and shareable link. | Server validates metadata, permission, row/time/cost limits; URL contains no secret or private result. Start with supported query mode; multi-query/funnel require verified server support. |
| DataBrowser | Authorized row browser with cube sidebar, filter bar, sort, resize/column visibility, server pagination, and record inspector. | Ungrouped queries are bounded and scoped; expose only allowed fields and a maximum page size. |
| DashboardGrid / composable pieces | MUI toolbar, Drizzle Cube grid/filter/modals/store, tile library, edit/save/revert, layout mode, responsive behavior. | Use composable API for Harvy toolbar only if installed version supports it; preserve edit/save state machine. |
| Persistence | Save named DashboardConfig revisions with owner, scope, schema/HQL versions, layout, filters, private/workspace visibility, and optimistic revision. | Harvy implements /api/v1/dashboards CRUD with bounded config validation; owners can share read-only to their workspace, and the Harvy-admin feed exposes metadata-only lifecycle history, never config contents. Thumbnail is optional R2 artifact, never base64 in DB. |
| Charts | Start with KPI, table, bar, line/area, pie where useful; add scatter, heatmap, funnel, Sankey only when data shape and accessible fallback exist. | Each tile shows title, units, timeframe, sample count, updated time, source coverage, citation/action menu. Avoid pie for many categories. |
| Chart plugins | Register Harvy custom charts through CubeProvider customCharts after confirming ChartDefinition/ChartTypeConfig support. Candidate plugins: source coverage matrix and event timeline. | Namespaced type, declared field drop zones and display options, lazy loading for heavy code, empty/missing-axis states, keyboard/table equivalent, bounded data, drill click event, visual test. No chart may execute arbitrary SQL. |
| SchemaVisualization | Show cube ERD, field search, joins, selected fields, and add-to-analysis action. | This is analytical schema, distinct from Ontoly object graph in Reagraph; optional peer dependencies and bundle size checked before enablement. |
| Drill-down | Time, configured hierarchy, and underlying-detail drill with menu and breadcrumb. | Every drill reauthorizes query and scope; bounds persist; breadcrumb and back action restore exact query. Evidence detail opens a scoped drawer. |
| AgenticNotebook | Chat + text/chart canvas with source-linked blocks, save/share, agent status, and cost budget. | Requires Harvy server-side AI route and tool allowlist; prompt injection and query bounds enforced; no browser key; AI output remains a proposed analysis until verified. |
| Theming | Map MUI palette/typography/density to Drizzle Cube --dc-* variables; support light/dark/system. | One source of truth and visual regression at all breakpoints. |
| Hooks | Use documented query/meta hooks for custom tiles, refresh, loading, and error states. | Central wrapper applies auth, cancellation, retries, query limits, telemetry; avoid each screen inventing network behavior. |
| Scaling | Stable cube names and versioned semantic definitions; selective imports, bounded queries, measured caching, and demand-driven aggregates. | Tenant-scoped cache keys and authorization; only introduce pre-aggregation or Basin-backed query path after measured need. |

Dashboard document minimum: HarvyDex UUID id; tenant_id; workspace_id; owner_principal_id; product; title; description; config_json; schema_version; hql_version; feature_revision; visibility; revision; created_at; updated_at; deleted_at. The API returns an ETag/revision and rejects stale updates with a conflict response. A private dashboard never becomes public because its tile references a shared object. Sharing reauthorizes every underlying query. Customer data has no export/download path; HQL responses exist only to render authorized in-app views.

## 6. Component contracts and behavior

Each tool registration has id, semantic tag, owning product, required capability, feature key, input/output schema, supported media, cost bounds, owner, and telemetry name. ToolContext has principal, tenant/workspace, permissions, feature revision, HQL/Ontoly versions, trace, locale/timezone. ToolOutput has data or authorized artifact handles, provenance, source coverage, updated time, query/snapshot ID, and safe error. The UI must not import another product's private store or credentials.

Query tiles include an accessible in-app table view; they do not offer data downloads. Maps use Protomaps, relation graphs Reagraph, video Video.js, and Formbricks where approved; these appear as registered tool surfaces in the same shell, not assumed Drizzle Cube chart types. YouTube playback/metadata requires the approved API integration and rights/attribution. Empty, error, permission, offline, expired session, and rate-limited behavior have distinct copy and actions.

Interaction rules: keyboard Escape closes drawers/modals; unsaved edits prompt before leaving; filters preserve URL state only when safe; long queries show progress/cancel; refresh shows last-success time and does not erase a still-useful prior result; charts never imply complete coverage when source runs are partial. Use skeletons for loading, not fake numbers. Telemetry events use semantic tags and operation IDs with redacted properties.

## 7. Build and acceptance order

1. Inventory pinned Drizzle Cube APIs and review the former graph screen as a reference. **Done locally:** installed types inspected and web/API compile/build verified.
2. Establish MUI tokens, semantic tags, responsive shell, and signed-in bootstrap. **Partial locally:** Better Auth client and org selection exist; live two-tenant denial and keyboard/mobile journey are not verified.
3. Wire one Newsk end-to-end source and one bounded AnalysisBuilder query through the Harvy API/HQL adapter. **Partial locally:** bounded event/evidence query and UI exist; Automation/source/R2 are unconfigured, so no live path or partial/stale ingest journey is verified.
4. Persist one dashboard with server validation, revision conflict handling, and safe reloading. **Partial locally:** scoped CRUD/revisions, reload, bounded config validation, and SQLite migration/API integration tests pass locally; chart-to-evidence drill and deployed storage remain.
5. Add DataBrowser and schema exploration from registered cube metadata. **Done locally:** both use the same tenant/product-scoped CubeProvider; drill-down and custom chart plugins remain.
6. Add notebooks, richer visualizations, sharing, maps/graphs/media after the underlying access, source, and AI contracts pass. Do not add customer-data export.

Minimum acceptance for each screen: correct scope denial, feature denial, loading/empty/stale/partial/error, keyboard focus, mobile width, source citation, bounded query, saved-state recovery, and no console errors. Verify actual browser behavior with two tenants and real permitted source data before customer release. Unit/contract tests cover permission and serialization; component tests cover state transitions; browser tests cover one editor journey and a denied-tenant journey; visual checks cover desktop/mobile and light/dark. Record screenshots and exact commands in the PR.

## Sources reviewed

- Drizzle Cube client overview: https://www.drizzle-cube.dev/client/
- Analysis Builder: https://www.drizzle-cube.dev/client/analysis-builder/
- Data Browser: https://www.drizzle-cube.dev/client/data-browser/
- Composable dashboards: https://www.drizzle-cube.dev/client/composable-dashboards/
- Dashboard persistence: https://www.drizzle-cube.dev/client/dashboard-persistence/
- Charts and plugins: https://www.drizzle-cube.dev/client/charts/ and https://www.drizzle-cube.dev/client/chart-plugins/
- Schema visualization and drill-down: https://www.drizzle-cube.dev/client/schema-visualization/ and https://www.drizzle-cube.dev/client/drill-down/
- Agent notebooks, theming, hooks, scaling: https://www.drizzle-cube.dev/client/agent-notebooks/ ; https://www.drizzle-cube.dev/client/theming/ ; https://www.drizzle-cube.dev/client/hooks/ ; https://www.drizzle-cube.dev/getting-started/scaling/
