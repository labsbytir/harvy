# Harvy architecture guidance

This file records the user's authoritative direction for the Harvy SaaS integration. It takes precedence over architecture claims in source repositories when they conflict.

The detailed repository engineering standard is maintained in [harvy-platform/docs/DEVELOPMENT.md](harvy-platform/docs/DEVELOPMENT.md), with implementation/adoption tracked in that repository's [single plan](harvy-platform/docs/PLAN.md). It defines repository/agent contribution rules, expandable source and database ownership, raw/processed/query artifacts, streaming uploads, universal configuration, secrets, API/HQL/CLI/OpenAPI/MCP, feature/tenant permissions, AI routing/safety, documentation discovery, and token optimization. OpenChamber is the mandated engineering coordination environment; Spider Cloud and Webshare preflight is mandatory before crawling. These are requirements; see the adoption status for enforcement that remains to be built.

## Product structure

- **Harvy** is the SaaS ecosystem.
- **Ontoly** is the shared, operational ontology at the foundation of every product and use case. It models real-world entities, properties, relationships, evidence, actions, functions, and governance.
- **Tower** is Harvy's global intelligence product, built on Ontoly.
- **Ops** is Harvy's business product, built on Ontoly.
- **Civic** is Harvy's civic product line, built on Ontoly.
- **Newsk** is an add-on desk for Media & News that combines Tower, Ops, and Civic and includes all paths across them.
- **HarvyDex** assigns and manages a global UUID for every record in Harvy.
- **HQL** is the shared query protocol across Harvy products and product lines.

## Product integration rules

- The existing OpenTIR frontend is discarded. Do not carry it into Harvy or treat it as the target frontend.
- The API surface to consider from OpenTIR is `api/v1/` only. Do not assume other API routes or frontend-specific APIs are part of the integration.
- Call data-source integrations **connectors**, not fetchers.
- Harvy does not use ClickHouse.
- Harvy does not use Cloudflare Search.
- Harvy is web SaaS only; do not include OpenTIR's Tauri desktop app or desktop packaging.

## Harvy platform

Harvy uses Cloudflare services, including:

- Workers
- Workers KV
- Basin
- Containers
- Queues
- Workflows
- Email Service for transactional email
- R2
- D1
- K2 Streams
- Secrets Store
- Hyperdrive as the preferred database connectivity layer for Workers
- Better Auth as the existing Harvy authentication foundation

Use these as the platform vocabulary and target architecture when evaluating the codebases. Do not reintroduce products explicitly excluded above.

## Frontend

Use React with MUI as Harvy's preferred frontend component system. Build Harvy's visual identity through a shared theme and reusable components; use MUI's production-ready React components as the base UI toolkit.

Assign every reusable and user-facing UI element a stable, globally unique semantic element tag. Keep tag definitions in a shared registry and use them consistently across Tower, Ops, Civic, and Newsk. Tags should support design-system traceability, accessibility review, product analytics, support diagnostics, and UI automation without exposing user data. Feature availability is decided by the feature-flag and entitlement manager, not by the tag itself.

Provide a Harvy-managed feature-flag and entitlement service for controlling feature access by product, plan, organization, user, environment, and rollout cohort. It should support server-enforced checks, safe client visibility, gradual rollout, explicit overrides, audit history, and fail-safe defaults. Better Auth remains the identity, session, organization, and authorization foundation; it can provide principals and role/permission checks but is not itself a feature-flag manager. Integrate feature decisions with Better Auth identity and organization context while keeping the flag registry and evaluation policy in Harvy.

Use Bulma for the Harvy documentation site. Keep this scoped to documentation pages; the main SaaS application uses React and MUI.

Use Formbricks for Harvy forms and surveys, integrated with Harvy accounts and workflows. Its Community Edition is self-hosted under AGPLv3; confirm license compatibility and hosting/data boundaries before selecting a deployment or embedding it in Harvy.

Use Drizzle Cube as the core analysis and query interface/framework for HQL. Its semantic query model and React analysis components provide the user-facing query builder and analytics experience over Ontoly. HQL remains Harvy's shared query protocol; Drizzle Cube is the framework/interface used to author and execute those queries.

Use Protomaps as Harvy's maps engine. Its mapping stack includes PMTiles archives, tools for creating and serving tile data, and an OpenStreetMap-based basemap. Select the rendering library and tile hosting arrangement to fit Harvy's frontend and Cloudflare platform.

Use Reagraph for interactive network-graph visualization in the React application. It renders Ontoly objects and links for exploration; Ontoly remains the source of graph semantics, evidence, and permissions.

Use Video.js as Harvy's video player framework. Use the YouTube Data API key for YouTube search and metadata integrations; keep it server-side in Cloudflare Secrets Store and account for API quota. Use an appropriate Video.js YouTube integration for playback. Video.js handles playback/UI; the YouTube API provides data and discovery.

Use Google DeepMind WeatherNext as Harvy's weather forecasting model family. Treat the open repository as research/model code, not a hosted forecast API. Decide whether Automation has suitable accelerator capacity for inference or whether Harvy should consume an available WeatherNext forecast feed. Keep forecast model/version, initialization time, valid time, resolution, and uncertainty/probability metadata attached to resulting Ontoly records. Review model and input-data licenses before distribution or production use.

Use Open-Detector as a candidate model for AI-writing-style analysis on academic text, running the Python/PyTorch BERT model through Automation. Its scope is stylometric classification, not verification of factual accuracy, citation authenticity, or hallucinations. Treat output as an uncertain signal with model/version and provenance; do not present a detector score as proof of AI authorship or misconduct. Validate performance on Harvy's intended content and languages before production use.

## External processing server

Harvy currently has one external server, named **Automation**. It connects to third-party APIs and handles:

- scraping
- mining
- crawling
- searching
- transforming
- ingestion for external APIs

The existing n8n installation is an internal orchestration component of Automation. Follow the [uniform n8n standard](harvy-platform/docs/DEVELOPMENT.md#18-uniform-n8n-integration-standard): team-owned workflows coordinate bounded jobs through the same connector/run contracts, with one schedule owner, scoped credentials, idempotency, and verified Spider/Webshare preflight. Harvy owns tenant policy and canonical records; n8n is not a customer workflow builder or a separate source-ingestion system. The [five-day hackathon plan](harvy-platform/docs/PLAN.md#five-day-hackathon-2026-10-28-through-2026-11-01) takes delivery priority over broad platform migration this week while retaining the full-legacy-catalog 50% adoption target.

Automation uses Spider Cloud's API, including the Unlimited endpoint and AI endpoint. The Unlimited API exposes `/unlimited/scrape`, `/unlimited/crawl`, and `/unlimited/links` (aliases under `/v1/unlimited/...`); the user refers to these operationally as `/scrape`, `/scrawl`, and `/links`. Verify exact route/version against Spider's current docs when implementing. Spider's docs describe the route as `crawl` (not `scrawl`) and document concurrency limits and immediate `429` responses with `Retry-After` when capacity is full.

All connectors require a Webshare proxy. Treat proxy configuration and use as a connector requirement, including for third-party API access, and keep credentials in the configured secrets system rather than source code.

## Preferred implementation languages

Prioritize these languages, in order of project fit:

1. Python
2. TypeScript
3. Node.js

Use these for new Harvy code and connector implementations where practical.

Treat this server as the current execution environment for those workloads unless the user updates the architecture.

## Integration implications

- Review OpenTIR's `api/v1/` endpoints and the domain capabilities behind them as potential API/product features.
- Evaluate connectors independently from the discarded frontend.
- Map source-repository storage, queues, search, and ingestion assumptions onto Harvy's Cloudflare services and the external processing server.
- Route third-party API and web extraction work through Automation, using Spider Cloud and the required Webshare proxy for connectors.
- Treat repository documentation that names ClickHouse, Cloudflare Search, or fetchers as legacy/source-project context, not Harvy requirements.

## Ontoly foundation

Ontoly is the core model and operational layer for all Harvy use cases. Applications and product lines should work through this shared model rather than maintaining separate domain silos. The design inspiration is the ontology overview in [Palantir Foundry documentation](https://www.palantir.com/docs/foundry/ontology/overview): map data to real-world objects, properties, and links, and include governed actions and functions so the model can support operational workflows as well as analysis. Harvy should adopt the useful concepts, not assume Palantir's implementation or copy its product.

- **Object types** define kinds of real-world entities and their typed properties.
- **Link types** define relationships between entities and preserve their direction, meaning, and evidence.
- **Observations and evidence** preserve source-backed claims and their time, provenance, and uncertainty; they do not turn a source assertion into verified identity by default.
- **Actions** are governed, auditable changes or workflow submissions against ontology objects.
- **Functions** provide reusable business logic, derivations, and queries over ontology data.
- **Interfaces** define shared capabilities or shapes across compatible object types.
- **Governance** defines authorization, visibility, validation, versioning, and review for objects, links, and actions.
- **Applications** such as Tower, Ops, Civic, and Newsk present use-case-specific workflows over the same Ontoly model.

HQL is the shared query protocol for applications to query Ontoly consistently. Drizzle Cube is the designated framework and user interface for analysis and query authoring within HQL. Its semantic layer should map to Ontoly's object types, relationships, measures, dimensions, and governed access context. HarvyDex provides stable global record identity across ingestors, object types, evidence, and product surfaces.

- Global situation map and globe with geospatial event exploration.
- News and event monitoring with search, filters, story views, and source attribution.
- Conflict, unrest, and positive-event tracking.
- Aviation and maritime monitoring, including aircraft, vessels, and AIS data.
- Military and space monitoring, including military flights, satellites, and GPS jamming.
- Markets and economic data, including stocks, commodities, trade, and prediction markets.
- Energy and infrastructure monitoring, including power outages and infrastructure signals.
- Environment and disaster monitoring, including climate, wildfire, earthquakes, and severe weather.
- Cyber, supply-chain, and company signals.
- Research and data discovery, including source catalogs and connector-backed search.
- AI-assisted search and answers with citations, implemented through Harvy's chosen services and Automation where appropriate; do not use Cloudflare Search.
- User accounts and API access, including passkeys, TOTP, recovery, and API tokens, subject to Harvy's product and security design.
- Configurable product workspaces for full, technology, finance, positive-events, and commodity monitoring; treat OpenTIR's variants as layout/product presets to evaluate, not separate desktop builds.
- Live television and broadcast monitoring, including a curated live-channel directory and supported stream playback; Newsk is the natural product surface, with shared source and media objects in Ontoly.
- Humanitarian and displacement monitoring as a distinct intelligence domain, linked to events, locations, and organizations with source and uncertainty context.
- Satellite imagery discovery and imagery-derived observations, kept distinct from existing satellite tracking and fire-detection signals.

## Civic product line

The following civic capabilities are part of Harvy's **Civic** product line. Integrate them into Harvy's web SaaS and Ontoly model. **Link tips are excluded.**

- Municipality directory with search, filters, detailed records, agency coverage, source provenance, and explicit coverage gaps.
- Civic source discovery for governments and related institutions, including police, fire, EMS, schools, and other civic organizations. Discovered sources remain candidates until reviewed or verified.
- Town website monitoring and change tracking for pages and documents such as agendas, minutes, notices, ordinances, budgets, bids, and calendars.
- Document search and evidence with municipality, source, capture date, hashes, citations, and storage-protection state.
- Shared municipal event calendars plus private per-user saved events; automated extraction and cross-source deduplication are capabilities to develop.
- YouTube/Vimeo video catalog with searchable metadata, municipal/channel associations, and supported in-app playback. Video downloading and processing are excluded.
- Community mapping for local subreddits and public Facebook groups, with evidence-backed validation and administrator approval before collection.
- Research capabilities: saved searches, map views, dashboards, investigations, watchlists, public-records requests, people and institution records, nonprofit data, comparisons, relationship graphs, and evidence verification.
- Accounts and collaboration: shared-data suggestions, organization controls, and privileged review workflows. Define Harvy's own roles and authorization model.
- Public finance and procurement: budgets and line items, debt, check registers, vendors, contracts, campaign contributions, grants, and bid analysis.
- Public accountability: meeting roll calls and attendance, appointments, payroll and pensions, licenses, ethics disclosures, lobbying, candidate filings, court appearances, and official contact records.
- Property and development: parcel ownership, assessments and taxes, redevelopment and PILOT agreements, zoning, auctions, housing obligations, and regulated licenses.
- Public safety and infrastructure: police and emergency-service data, civil-rights oversight, utilities, water quality and PFAS, Superfund sites, storms and FEMA activity, and emergency alerts.
- Schools, counties, and local institutions: education and district records, county-level agencies, and other public institutions connected to municipalities.
- Document intelligence: OCR, table extraction, redaction-aware handling, document diffs, and transcript-synchronized video evidence.
- Monitoring and publishing: source outage and link-rot detection, website technology changes, query digests, citation exports, chain-of-custody records, and storylines linking evidence over time.
- Nationwide records and benchmarking: state and federal sources, cross-municipality comparisons, and comparable measures with definitions and provenance.

Treat these as Civic capabilities to model through Ontoly rather than an instruction to copy another implementation. Apply Harvy's platform choices, including Automation for external processing and the required Webshare proxy for connectors. Keep implementation status explicit when planning or building each capability.

## Newsk newsroom intelligence

Newsk should turn selected social signals and other Ontoly evidence into a source-linked newsroom workflow. The main unit of work is a **story** with a timeline of claims, events, entities, locations, source observations, and editorial decisions; individual posts remain attributed evidence linked to that story.

### Initial scoped monitoring

Begin with monitors explicitly configured by a newsroom workspace:

- **Facebook:** selected Pages and specific public content only when the newsroom and Harvy have the required authorized API access. Do not assume broad public search, profile monitoring, or group monitoring is available.
- **X:** selected accounts, lists, keywords, and query rules using the official API endpoints available to Harvy's approved access plan. Record endpoint, query, quota, and coverage limits with each monitor.
- **Reddit:** selected subreddits and search scopes through approved Data API access. Because Harvy is a commercial SaaS, secure the required written commercial agreement before production access or display to customers.

Each monitor should store its owner/workspace, chosen source IDs and query, geography and time bounds where relevant, permitted data fields, schedule/latency target, provider limits, allowed use, retention/deletion rule, and current authorization status. Let workspace admins pause, edit, and remove monitors. Do not silently broaden a monitor's scope or impersonate users, evade rate limits, or use a proxy to bypass platform controls. The required Webshare proxy remains a connector requirement, subject to each provider's approved access method and terms; if an approved API path is incompatible with that requirement, treat the connector as blocked pending an authorized solution.

### Connector priorities for Newsk

The source catalogs in the original codebases are discovery inputs, not proof that a source is licensed, available, or implemented. The current Harvy connector catalog does not yet provide an operational Newsk news and social monitoring set. Build and verify these through Automation's Connectors, with source-specific access, Webshare proxy configuration, credentials, quotas, retention, and deletion behavior recorded before enabling them:

| Priority | Connector family | Newsk use | Notes and gates |
|---|---|---|---|
| 1 | Publisher RSS and official newsroom feeds | Reliable first-party article discovery for selected outlets and beats | Prefer direct publisher feeds over RSSHub routes. Confirm each publisher's terms, attribution, and permitted storage; ingest metadata and excerpts only as allowed. |
| 1 | GDELT | Broad international article and event discovery; useful for finding stories beyond a newsroom's watchlist | The existing source catalog suggests a bounded recent English query. Treat it as discovery and a coverage signal, not a complete or authoritative news archive; validate relevance, duplicates, language coverage, and latency. |
| 1 | Public agency, municipality, and civic sources | Press releases, emergency notices, meeting agendas, public records, and local developments | Reuse Civic's source coverage as newsroom beats: agencies, municipalities, schools, public meetings, and official pages. Prefer official APIs and feeds; use Spider Cloud extraction only for permitted public pages. |
| 1, gated | X, Facebook, and Reddit | Scoped account, Page, keyword, and subreddit monitoring | Implement separate connectors and entitlements. Use approved platform APIs and agreements only; no generic scraping or unofficial RSSHub proxy. Reddit commercial access must be contractually cleared before production. |
| 2 | YouTube Data API and curated live-channel directory | Discover live broadcasts and attach source-linked video references to stories | The source catalog lists 29 international channels, but those listings are candidates. Verify channel identity and availability; use supported embeds/playback and preserve the original source link rather than rehosting streams. |
| 2, contextual | USGS, NOAA/NWS, GDACS, NASA FIRMS, FEMA | Add verified event context to breaking-news stories (earthquakes, warnings, fires, disasters) | These are strong signal and corroboration sources, not article-feed replacements. Label source observations and event data separately from newsroom reporting. |
| Evaluate, gated | SocketNews | Possible low-latency international news stream with country/language channels and pre-extracted summaries, facts, entities, and topics | Its terms allow commercial integration but prohibit redistributing data in a way that substantially replicates SocketNews or creates a competing equivalent service based primarily on its data. Since Newsk is itself news monitoring, get written approval for the exact embedded SaaS use, customer display, retention, and onward use before production. It does not provide original articles, full text, or source links, and warns outputs can be incomplete or inaccurate; require independent citations and verification. Also confirm the Socket.IO stream can meet Harvy's required Webshare proxy path. |
| Hold pending written clarification | MediaCloud | Aggregate news search and narrative/attention analysis | Its terms allow lawful use but say the platform is designed for academic, nonprofit, and journalistic research, not as a commercial tool for market/brand research; users may not sell, lease, or sublicense platform/API access. Media Cloud does not grant rights to third-party story content. Ask MediaCloud about a commercial SaaS integration and customer-facing output before using it as a Harvy backend; it is better suited to research and aggregated discovery than an embedded content feed. |
| Hold / fallback | RSSHub | Feed normalization where a direct source feed is unavailable | It is an intermediary, and the catalog includes publisher and Reddit routes. Prefer direct publisher feeds and official platform APIs; validate RSSHub hosting, route stability, and terms before any limited use. |

Do not prioritize generic sentiment or social-mention connectors as source-of-record. They can be added later as derived analysis when inputs and methods are transparent. Every Newsk connector must expose coverage and freshness so a newsroom can tell which sources it actually checked and where the gaps are.

### Newsroom capabilities to add

- **Story desk:** group related posts, documents, videos, and events into persistent story records; show why evidence was grouped and let editors split or merge stories with an audit trail.
- **Breaking-news triage:** prioritize incoming items by configured topic, location, source, recency, and observed activity. Show the signal and rule that triggered each alert; let desks tune, snooze, and assign alerts.
- **Storyline timeline:** order source observations and event updates by published and captured time, distinguish the two, preserve edits/deletions where the platform permits, and flag gaps or contradictory timestamps.
- **Verification workspace:** compare claims across independent sources, retain exact citations and original links, label corroborated, disputed, unverified, and corrected claims, and keep editorial review separate from automated confidence signals.
- **Geographic desk:** map story locations and affected Ontoly objects with Protomaps; preserve geocoding confidence and avoid implying a precise location when the source is vague.
- **Media references:** attach allowed image, video, livestream, and transcript references to a story; use the existing Video.js direction for supported playback and preserve the source's attribution and link.
- **Assignment and handoff:** support desk ownership, assignment, internal notes, status, review history, and source-linked handoff between Tower, Civic, Ops, and Newsk users.
- **Briefings and query views:** save HQL views and create in-app shift briefs grouped by topic, region, source, or story status. Make every generated summary traceable to citations and require editorial review before publication.
- **Source health and coverage:** show monitor freshness, API quota, errors, known gaps, rate limits, and source-specific coverage; never label an incomplete feed as comprehensive.
- **Corrections and removal handling:** propagate permitted provider edits, deletions, access revocation, and retention deadlines through derived story views and caches, with auditable cleanup status.

### Shared Ontoly records

Model candidate shared types such as `NewsroomMonitor`, `SocialSource`, `SocialPost`, `Story`, `Claim`, `Evidence`, `EditorialAssignment`, `Alert`, and `MediaReference` in Ontoly. Social posts should preserve platform IDs as external identifiers and use HarvyDex for Harvy record identity. Keep original source text and provider payloads separate from derived summaries, translations, labels, and editorial notes. AI summarization, translation, or transformation is enabled only where the applicable source agreement allows it; do not use monitored social content to train models without explicit rights.

### Access and data-use gates

Treat each platform as a separate connector and entitlement. Meta describes unauthorized automated collection as a terms violation; Facebook monitoring must use an approved access path and applicable permissions, not generic scraping ([Meta: How We Combat Scraping](https://about.fb.com/news/2021/04/how-we-combat-scraping/amp/)). X API access depends on developer enrollment and endpoint access; record the current plan, quota, and costs before enabling a monitor ([X Developer Platform](https://developer.x.com/), [X API tools](https://developer.x.com/apitools/api?endpoint=%2F2%2Ftweets&method=get)). Reddit's current Data API and Developer Terms require a separate agreement for commercial use not expressly permitted, prohibit use beyond the approved scope, and restrict AI training absent permission ([Reddit Data API Terms](https://redditinc.com/policies/data-api-terms), [Reddit Developer Terms](https://redditinc.com/policies/developer-terms)). These terms can change, so verify them during connector onboarding and renewal.

Gate Facebook, X, and Reddit independently through Harvy's feature-flag and entitlement manager. A source can remain unavailable for a tenant or environment until access approval, credentials, product terms, rate limits, retention, attribution, and deletion behavior are recorded and verified. Reddit AI-derived summaries should remain disabled unless the required agreement expressly permits that use.

### Competitive review: gaps Newsk should address

Public evidence across these products is uneven: vendor pages describe intended capabilities, while several newer products have few independent reviews. Treat the observations below as design signals, not a representative market survey.

| Product or category | Publicly visible limitation signal | Newsk response |
|---|---|---|
| Quorum | Capterra reviewers mention deeper cross-platform collaboration becoming less intuitive, high cost, and promised capabilities not always matching delivery. The review sample is small. | Make collaboration and handoff native to story records; clearly label shipped, preview, and planned capability; make plan limits and source coverage visible. |
| Dataminr-style alerting | G2 feedback includes alerts that can be irrelevant or numerous and require filtering; other users value speed and accept high alert volume. | Deduplicate into story clusters, show why an alert fired, make user triage dispositions feed explainable tuning, and let desks set quiet periods and alert-volume controls. |
| Enterprise newsroom systems | A Google News Initiative review of Atex describes slow implementations, scaling difficulty, older architecture, and friction sharing content across publications. | Use modular Workers/Automation integrations, shared Ontoly story objects, reusable global UI tags, and open HQL/API handoffs; avoid a monolithic CMS replacement as Newsk's first release. |
| Real-time situation dashboards | Monitor the Situation discloses changing source delays, incomplete coverage, stale positions, and errors in AI summaries or inferred locations. | Put observed time, capture time, source delay, location precision, coverage status, and uncertainty on the story itself; never imply total coverage. |
| Editorial intelligence and verification | OSINT613's published method separates confirmed, reported, and assessed information, requires corroboration for confirmation, and documents corrections. | Provide explicit claim states, independent-source checks, attributable evidence, human review, and a visible correction history. |
| AI-generated monitoring and briefs | Marketing claims commonly emphasize automatic summaries/digests, while public feedback is sparse for newer products such as Cotera, MediaThrive, and MediaWatcher. Gartner lists only one MediaWatcher rating, describing a customizable dashboard alongside onboarding challenges, so it is too little evidence to generalize. | Keep generated summaries citation-first, easy to compare with source text, and editor-approved; do not equate a polished summary with verification. |
| Proactive signal detection | Galileo Signals is an AI observability product rather than a newsroom monitor, and its public page provides no newsroom customer-feedback sample. Its useful pattern is surfacing recurring, previously unseen patterns and learning from historical examples. | Apply that pattern to source-backed story anomalies and emerging narratives, with examples, confidence, review dispositions, and history visible to editors. |
| Integration-heavy newsroom platforms | Ring Publishing and Atex emphasize editorial workflow, permissions, multichannel publishing, and CMS integration. | Add assignment and approved export/CMS handoff after monitoring and verification work reliably; keep publishing controlled by newsroom policy and explicit approval. |

Prioritize these improvements for Newsk:

1. **Monitor setup that proves its scope:** a source-specific query builder, test/preview results, matched and excluded examples, source availability, quota/cost estimate, and an explicit statement of blind spots before activation.
2. **A low-noise story queue:** collapse reposts and duplicate coverage, distinguish new story from update, rank with visible reasons, and let journalists tune alerts without hiding unreviewed evidence.
3. **Evidence-led verification:** show which claims each source supports or contradicts, whether sources are genuinely independent, where a location/time was inferred, and what is still unknown.
4. **Shift-ready collaboration:** assignments, desk queues, saved HQL views, handoff notes, in-app alerts, and concise citation-linked briefings; keep source feeds, editorial notes, and publication decisions separate.
5. **Coverage and freshness accountability:** show last successful check, observed source lag, API limits, missing intervals, language/location coverage, and recovery status. Give admins a monitor-health view as well as the journalist-facing story view.
6. **Proactive story discovery:** detect meaningful cross-source changes and emerging topics beyond a user's exact query, but explain the pattern, confidence, and supporting records. Allow each newsroom to mute or promote a signal and inspect how the system learned from prior decisions.
7. **Interoperability before CMS replacement:** support source-linked exports and integrations with newsroom tools while leaving article authoring and publication in the newsroom's chosen CMS. Consider automated publishing only as a later, explicitly governed option.

Evidence reviewed: [Quorum News Monitoring](https://www.quorum.us/products/news-monitoring/) and [Capterra reviews](https://www.capterra.com/p/169973/Quorum/reviews/); [Dataminr for News](https://www.dataminr.com/products/dataminr-for-news/) and [G2 reviews](https://www.g2.com/products/dataminr/reviews); [Atex review by Google News Initiative](https://newsinitiative.withgoogle.com/cms-providers/atex/); [Monitor the Situation methodology and limitations](https://monitor-the-situation.com/about); [OSINT613 sourcing, verification, and correction method](https://www.osint613.com/methodology); [Ring Publishing newsroom efficiency](https://ringpublishing.com/solutions-by-use-case/newsroom-efficiency); [Cotera News Intelligence Monitor](https://cotera.co/solutions/ops/news-intelligence-monitor); [MediaThrive monitoring](https://mediathrive.com/product/monitoring); [MediaWatcher Gartner reviews](https://www.gartner.com/reviews/market/sentiment-analysis-tools/vendor/media-watcher); [Pubilot](https://pubilot.com/); [Galileo Signals](https://galileo.ai/signals); [Xberg documentation](https://docs.xberg.io/). Xberg is a content extraction/crawling toolkit, not a newsroom monitoring product; its relevant role is an optional Automation processing component, subject to the existing vendor and proxy requirements.

## Shared Ontoly and Civic platform capabilities

The following cross-cutting capabilities apply across Ontoly, Tower, Ops, Civic, Newsk, and future Harvy product lines. Preserve status distinctions between planned, implemented, and live-verified.

- **Common observation and event model:** Normalize incoming signals into shared records with time, location, source, evidence, and lifecycle status so product lines can correlate information.
- **Entity resolution and relationship graph:** Link people, places, organizations, companies, agencies, vessels, events, documents, and sources across domains. Preserve aliases, provenance, match confidence, and human review for uncertain matches.
- **Evidence lifecycle:** Track discovery, validation, corroboration, contradiction, review, correction, and version history while preserving original evidence and citations.
- **Temporal history:** Retain changes to entities, relationships, events, and sources so users can inspect what changed and what was known at a given time.
- **Cross-domain alerts:** Allow users to monitor topics, entities, locations, and sources, and notify them when related signals or meaningful changes appear.
- **Explainable scoring:** Where trust, risk, or confidence scores are used, show contributing evidence and rules, expose uncertainty, and retain score history.
- **Data quality and correction:** Support duplicate, stale, and incorrect-record review; preserve correction history and avoid silently replacing conflicting evidence.
- **Customer monitoring rules:** Let teams configure topics, locations, entities, and sources to monitor, with workspace-level sharing and access controls.
- **Shared geospatial services:** Reuse municipal and regional boundaries, geocoding, location matching, and map filters across Civic and Ontoly domains.
- **Document processing pipeline:** Provide file intake, preflight, bounded transfer, extraction, indexing, evidence linking, and verified storage state using Harvy's selected storage architecture.
- **Durable job coordination:** Support resumable collection and transformation through checkpoints, retries, leases, interruption recovery, and explicit partial/failure outcomes, coordinated across Automation and Harvy's Workers, Queues, Workflows, and K2 Streams.

## Data platform operations

Build internal operator capabilities for managing connectors, sources, and data quality:

- **Connector/source catalog:** Track connector and source ownership, supported data, credential requirements, proxy requirements, limitations, schedules, and health. All connectors must use the required Webshare proxy.
- **Run history and observability:** Show per-connector freshness, coverage, counts, status, error reasons, retries, and provider usage/cost where measurable. Distinguish measured, provider-reported, estimated, unavailable, and not-applicable values.
- **Review queues:** Route uncertain entity matches, conflicting claims, source changes, and data corrections for appropriate human review.
- **Replay and recovery:** Provide controlled replay and recovery for failed or interrupted ingestion and transformation jobs, preserving operation identity and audit history.
- **Retention and deletion:** Apply source terms, legal requirements, and customer settings to data retention and deletion, with auditable outcomes.
- **Storage verification:** For any configured multi-destination storage policy, track each destination independently and only report full protection after required copies are verified.

These operations and shared capabilities support Harvy's products. Ontoly is the shared foundation; Tower, Ops, Civic, and Newsk use it for their respective workflows.

## Internal engineering tools

- **Herdr** is a candidate internal tool for running and coordinating coding-agent terminal sessions across local and remote machines. It is developer infrastructure, not a Harvy SaaS runtime dependency. Its repository is Apache-2.0 licensed.

## Consolidation and preservation strategy

Treat Harvy's V2 platform as the runtime base, and bring forward the strongest domain models, source coverage, and workflows from the other codebases behind Harvy's shared Ontoly model. Port capabilities and validated contracts; do not combine the three repositories' competing runtimes or frontends.

| Source | Preserve or adapt | Do not carry forward as Harvy's target |
|---|---|---|
| Harvy V2 | Better Auth identity, existing React/MUI direction, connector run contracts, bounded Queue/Workflow execution, D1 run state, K2 lifecycle events, R2 evidence artifacts, Basin analytics, ontology/query modules, and explicit source registration. | Retired V1 paths and duplicate legacy application surfaces. HarvyDex and HQL are still target requirements; do not imply they are already fully implemented. |
| OpenTIR | The useful `api/v1/` response shapes and domain coverage: events/news, sources, search, markets, aviation, maritime, trust scoring, and source-health concepts. Convert the data and API contracts to Ontoly objects and HQL. | Its frontend/desktop app and its legacy storage, search, and ingestion topology. Keep its connector/source catalog as candidates until reviewed, licensed, and implemented through Automation. |
| Civic | Nationwide municipality and agency discovery; document/site monitoring; evidence and provenance; maps and map releases; civic research workflows; people, organizations, budgets, public records, and relationship graph capabilities; strong operational telemetry and recovery ideas. | A separate Civic runtime, a second identity system, the existing query-protocol name, direct source scraping in Workers, and Cloudflare Search bindings. Implement the valuable Civic workflows as Ontoly-backed Civic product surfaces. |

### Harvy target architecture

1. **One ontology and identity layer:** define shared object/link types, observations, evidence, actions, permissions, and temporal history. Give every record a HarvyDex UUID at the ingestion boundary and preserve source IDs as external identifiers.
2. **One ingestion boundary:** Automation owns third-party API access and web extraction. Its Connectors use the required Webshare proxy and Spider Cloud where applicable. Harvy Workers, Queues, and Workflows coordinate Harvy-side jobs and state; they do not become a second scraping system.
3. **One data path:** retain raw source captures and normalized evidence in R2; keep operational job and registration state in the appropriate database; emit lifecycle events to K2 Streams; use Basin for analytical telemetry and aggregate analysis. PostgreSQL through Hyperdrive is the transactional target; the hosting provider and migration from current direct D1 access still need implementation decisions. Database ownership, scope constraints, extension tables, and raw/processed/query stages follow the engineering standard.
4. **One query contract:** translate useful Civic query semantics and OpenTIR API filters into versioned HQL. Drizzle Cube is the analysis/query authoring UI; it must use Ontoly metadata and enforce the same permissions as APIs.
5. **One design system and entitlement path:** MUI components use stable global UI element tags. Better Auth supplies identity and organization context; Harvy's feature-flag manager evaluates product, plan, organization, user, environment, and rollout access on the server.
6. **Product surfaces share the foundation:** Tower, Ops, Civic, and Newsk are role- and use-case-specific views over Ontoly and HQL. Do not fork source records, identity, query semantics, or authorization by product line.

### Uniform component contract

Uniformity means shared contracts and operating rules, not identical product behavior. Tower, Ops, Civic, Newsk, and future products may have distinct workflows, but each component must connect through the same identity, ontology, API, event, query, UI, and operations contracts. A component that cannot satisfy these contracts remains an isolated prototype until an adapter or approved exception is defined.

| Contract area | Required shared rule | Allowed extension |
|---|---|---|
| Identity and tenancy | Every request and job carries an authenticated Harvy principal, organization/workspace, authorization context, environment, and correlation/trace ID. Enforce tenant boundaries server-side. | Product roles and scoped permissions can be added through the shared authorization model. |
| Component identity | Every deployable or reusable component has a stable namespaced ID, owner, purpose, lifecycle status, supported contract versions, dependencies, and operational contact. | Product-specific metadata may extend the manifest without changing shared fields. |
| Records and provenance | Every Harvy record receives a HarvyDex UUID. Shared Ontoly objects use registered types and links, with source IDs, tenant scope, observed/published times, provenance, and schema version where applicable. | Product domains may register new object/link types; they must reuse shared primitives and pass ontology review. |
| APIs | All product APIs use the versioned `api/v1/` surface, common auth and authorization middleware, common pagination/filter conventions, and a common error envelope. Breaking changes require a new version; additive changes remain backward-compatible. | Domain routes and request/response fields are allowed within the shared envelope and naming rules. |
| Connectors and jobs | Every connector is registered in Automation and declares its owner, source, permissions, secret references, required Webshare proxy, inputs, outputs, schedule/trigger, limits, retry/idempotency behavior, retention, health checks, and supported versions. Runs expose queued/running/succeeded/partial/failed/cancelled states and stable run IDs. | Source-specific adapters may add fields and transformations; they must emit the shared normalized records and run lifecycle. |
| Events and queues | Cross-component events use a versioned envelope with event ID, type, schema version, occurred/observed time, tenant, producer, trace ID, and payload reference. Consumers must be idempotent and tolerate retries, duplicates, and out-of-order delivery. | New event types can be registered without changing transport-level fields. |
| HQL and permissions | Product query UIs and APIs compile to versioned HQL over Ontoly metadata. Permission filtering and tenant scoping apply at execution, not only in the UI. | Product-specific query templates and semantic models may be added as registered HQL extensions. |
| UI and accessibility | Shared React/MUI theme, primitives, navigation patterns, accessibility behavior, and global semantic UI tags. Each tag is stable, namespaced, registered, and free of user data. | Product-specific screens compose shared primitives and add registered tags; do not fork common controls or theme tokens. |
| Feature access | Features are registered with stable keys and evaluated through the server-side entitlement/flag service using product, plan, tenant, user, environment, and rollout context. Client flags control presentation only. | New flags can add product-specific rollout rules but cannot bypass authorization. |
| Operations and data lifecycle | Components emit structured logs, metrics, traces, health/freshness/coverage state, and auditable lifecycle transitions. Data changes honor source terms, retention, correction, deletion, and tenant boundaries. | Domain-specific measures may be added alongside the common operational fields. |

#### 1. Register components and their contracts

The following requirements define the target standard. They are architecture decisions to implement; the registry, SDKs, and automated gates described here are not yet established by this document.

Maintain one version-controlled contract catalog in Harvy's runtime repository. It contains component manifests and the definitions of Ontoly types, actions, HQL capabilities, API operations, events, UI tags, permissions, and feature keys. Generate runtime registry views and documentation from this catalog. Product lines may organize their definitions in separate directories, but must use the same schema and registration process.

**Identity rules:** Each registry record has a HarvyDex UUID and a unique, immutable semantic key. Use `harvy.<scope>.<domain>.<name>` for keys; scopes include `platform`, `ontoly`, `automation`, `tower`, `ops`, `civic`, and `newsk`. Shared functionality belongs to its shared scope: for example, `harvy.automation.connector.gdelt` can serve several products. Product availability is declared separately from component ownership. Display labels may change; UUIDs and semantic keys are never recycled. A key identifies a definition, while a HarvyDex UUID identifies an individual persisted record. Source IDs remain external identifiers.

Every component manifest must declare:

| Manifest group | Required information |
|---|---|
| Identity | HarvyDex UUID, semantic key, kind, display name, purpose, accountable owner, code location, and consuming products. |
| Kind and runtime | Product module, domain module, API service, connector, job/workflow, UI component, or infrastructure adapter; execution environment and applicable conformance profiles. A reusable UI component need not be a separately deployed service. |
| Contracts | Manifest schema version, implementation version, provided/consumed contract IDs and version ranges, input/output schema references, and declared dependencies. |
| Access | Required permissions and feature keys, supported organization/workspace scopes, permitted service principals, and whether explicitly approved shared data is supported. |
| Data | Ontoly types read/written, authoritative write owner, source provenance, classification, retention/deletion policy references, and source-use restrictions where applicable. |
| Operations | Applicable runtime limits, timeouts, concurrency, retry policy, idempotency scope, checkpoints, health signals, operational owner, and recovery/rollback instructions. |
| Configuration | Typed configuration schema, defaults, environment overrides, and secret references. Secret values and tenant credentials never belong in the catalog. |
| Lifecycle | Candidate, preview, stable, deprecated, or retired; release artifact reference; evidence for conformance; replacement and deprecation dates where applicable. |

Use language-neutral schemas for exchanged data, with generated TypeScript types/clients and Python models/clients from the same definitions. JSON Schema is the baseline for payloads and configuration; OpenAPI describes HTTP operations using the same data definitions. Runtime validation is required at trust boundaries even when a generated client is used. Node.js is the runtime for TypeScript/JavaScript components where needed; it does not define a separate protocol.

Publish shared libraries for identity context, authorization integration, schema validation, HarvyDex, HQL, errors, telemetry, and connector execution. Keep domain rules in their owning modules. Dependency direction is product modules → shared domain/platform interfaces → infrastructure adapters. Shared modules must not import a product's implementation. Products interact with another domain through its declared actions, queries, or events; they do not write directly to its tables.

**Registration acceptance:** The component owner supplies the manifest and schemas; the owner of each affected shared contract reviews its semantics. Automated validation checks references, uniqueness, dependency compatibility, and completeness. Assign these responsibilities to named maintainers; one person may hold several roles. A candidate registration records intent and does not grant production access or prove implementation. Every deployed release must resolve to a specific accepted manifest and contract revision.

#### 2. Meet the shared contract

Apply requirements by component kind. An API or connector must enforce runtime security; a UI primitive must meet design and accessibility rules. Mark an inapplicable requirement explicitly with a reason rather than adding meaningless tenant fields or fabricated health metrics to every component. Reuse the same libraries and middleware wherever a requirement applies.

| Area | Concrete behavior required |
|---|---|
| Request and job context | Establish principal, organization, workspace where applicable, environment, request ID, trace ID, and delegated permissions from trusted authentication. Never trust caller-supplied tenant or role headers as authorization. Async jobs carry bounded delegation, and workers recheck current permission and entitlement before protected work. |
| Authorization and features | A feature is usable only when authorization, entitlement, rollout, and source access all allow it. Evaluate these conditions on the server for reads, actions, exports, subscriptions, and jobs. An unavailable evaluator cannot grant new access. Browser visibility is derived from the same decision and never substitutes for it. |
| HarvyDex and record ownership | Assign a UUID on first persistence and retain it through retries, product views, and migrations. Allocate a new UUID for a genuinely new persisted record. Declare uniqueness rules using source, external ID, record type, and scope where applicable. Re-ingesting the same source record must not silently create another entity. Entity merges preserve aliases and evidence with an audit trail. |
| Ontoly semantics | Register property types, units, allowed values, nullability, relationships, validation, and permitted actions. Separate a real-world object from an observation or claim about it. Preserve conflicting observations as attributed evidence; do not overwrite a fact merely because a later connector disagrees. |
| Time and change | Exchange timestamps in UTC with an explicit offset. Distinguish event time, publication time, observation time, and ingestion time; retain unknown values as unknown. Use record revisions for concurrent edits, reject stale updates with an explicit conflict, and record correction history subject to deletion requirements. |
| API behavior | Keep public product routes under `/api/v1/`. Publish request/response schemas, bounded page sizes, opaque cursors, deterministic sort/tie-breaking rules, and allowed filters. Use a common error shape containing `code`, safe `message`, `request_id`, `retryable`, and structured field details when applicable. Preserve appropriate HTTP status codes. Long-running operations return a run reference with status and cancellation operations. |
| Safe retries | Mutating operations that may be retried accept a scoped idempotency key. Store its association with the operation and payload fingerprint for a declared retention window. The same key and payload returns the existing result/run; the same key with different input produces a conflict. Expiry and replay behavior are documented. |
| Connector execution | Automation authenticates the job, validates configuration and source permissions, resolves secrets, applies the required Webshare proxy, and runs bounded work. Each run records a checkpoint, provider limits, counts, coverage, errors, and output references. Rate limits honor provider retry guidance. Permanent authorization/configuration failures require intervention rather than unlimited retries. |
| Event delivery | Events carry `event_id`, `event_type`, `schema_version`, `producer`, `occurred_at`, `recorded_at`, `trace_id`, `causation_id` where applicable, explicit access scope, and a validated payload or authorized payload reference. Deduplicate by event ID; use aggregate revision/sequence where order matters. Missing tenant information never implies globally shared data. |
| Durable state and events | A committed state change and its required event must remain recoverable together, using a transactional outbox or an equivalent durable handoff. Consumers acknowledge work after their effects are durable. Design for repeated delivery; do not claim exactly-once side effects from transport delivery alone. |
| HQL execution | Validate against registered Ontoly fields and actions, apply row/property permissions, bind parameters safely, and enforce time, row, and resource limits. Saved queries declare their HQL/ontology version dependencies. Cached results include tenant and permission context and are invalidated when access changes. |
| UI behavior | Use shared MUI tokens and components for spacing, typography, color, forms, navigation, and feedback. Specify loading, empty, stale, partial, error, and permission-denied states. Global UI tags identify semantic controls; repeated rendered instances use separate instance identifiers. Tags are not DOM IDs and contain no personal data. Support keyboard use, focus management, and accessible labels. |
| Operations | Propagate trace IDs from API to Automation and downstream jobs. Report latency, errors, throughput, queue lag, last success, and source freshness where relevant. Separate process health from successful collection. Redact secrets and sensitive payloads from logs. A zero-item successful check must be distinguishable from a failed check. |
| Data lifecycle | Carry source/use restrictions into derived records, caches, exports, and aggregates as applicable. Track deletion and correction propagation across stored copies and derived artifacts. Explicitly govern shared datasets and tenant-owned data; a common ontology does not imply universal data access. |

For connector runs, use `queued → running → succeeded | partial | failed | cancelled`. A retry remains an attempt within the same logical run and records its own attempt identity. `partial` means some outputs were durably committed and the run's declared scope was not completed. `succeeded` means the requested scope and required writes completed, not merely that the process exited without an exception. Cancellation is a request until the executor confirms it; report any work already committed. A replay of a terminal run creates a linked new run and preserves the prior outcome.

Use shared conformance suites to verify observable behavior rather than duplicating each component's implementation. Applicable checks include schema compatibility, cross-tenant denial, permission/flag enforcement, duplicate delivery, stale update conflicts, retry after interruption, partial results, retention propagation, and UI accessibility/states. Connector validation also covers the proxy path, provider limits, provenance, and source coverage. These are required engineering gates to build; documenting them does not mean they have passed.

**Release acceptance:** CI provides contract and applicable behavior evidence; the component owner supplies operating limits and recovery instructions; the release owner enables a bounded preview through the shared flag service. Stable release requires evidence that the preview meets declared success, freshness, and failure-handling criteria. Record the release, owner, contract revision, evidence, and rollback target. Exceptions must name a responsible owner, affected contracts, expiry, and remediation; tenant isolation and required authorization cannot be waived through a product flag.

#### 3. Extend components compatibly

Choose an extension point in this order: typed configuration for an existing capability; a new connector or adapter for another source; a registered Ontoly type/action or HQL capability for new semantics; a product workflow or UI composition; then a shared platform change when the earlier options cannot express the need. Extensions still satisfy the applicable registration and conformance requirements.

| Change | Compatibility rule |
|---|---|
| Optional field with unchanged meaning and defaults | May be a minor contract release if existing readers tolerate it and validation confirms old payloads still work. A field is not harmless merely because it is optional; assess privacy and authorization too. |
| New source connector or product screen | Register a new component and reuse current contracts. It need not change shared schema versions unless it introduces new semantics. |
| New enum member, event type, or error code | Check consumer handling of unknown values. Treat it as breaking where an existing consumer cannot safely handle it. |
| Required field, removed/renamed field, changed units, changed ID meaning, altered default behavior | Breaking contract change; provide a migration or adapter and explicit version negotiation. Never silently reinterpret existing stored data. |
| Changed permissions or entitlement meaning | Perform an access-impact review. Preserve least privilege, migrate affected assignments explicitly, and invalidate relevant sessions/caches as needed. |
| Database schema or storage implementation change | Keep public contracts stable where possible. Use additive schema migration and backfill before switching readers/writers; retain recovery until migration evidence permits retirement. |

Use semantic versions for contract packages: major for incompatible behavior, minor for compatible additions, patch for corrections that preserve documented behavior. Track implementation releases separately. A contract package major change does not automatically create a new public API path: preserve `/api/v1/` semantics using adapters, or record an explicit public API version decision before exposing a breaking route. Producers and consumers declare supported versions; reject unsupported versions clearly rather than guessing their meaning.

Every breaking change follows this sequence:

1. Identify impacted consumers, saved HQL queries, stored records, background jobs, integrations, and source obligations. Name the migration owner and measurable completion criteria.
2. Publish the replacement contract and mapping. Deploy support for both versions where necessary, with a stated compatibility window and removal date. Old in-flight jobs must finish safely or be explicitly migrated/cancelled.
3. Backfill or adapt data using checkpointed, idempotent work. Preserve HarvyDex identities and provenance. Compare results and permission behavior before switching traffic.
4. Enable a limited cohort with flags, observe the declared criteria, and expand only as evidence supports it. Reverting application code must remain compatible with already-written data; otherwise use a documented forward recovery plan.
5. Deprecate the old contract, notify affected consumers, and record migration progress. Retire it only after active consumers and in-flight work are accounted for, required history is preserved, and removal is approved by the accountable owner. Keep retired keys reserved.

For example, a Newsk historical-analysis capability would register an Automation connector for an approved Media Cloud integration, map permitted outputs into existing Ontoly evidence/observation types, expose research through HQL, and compose shared query and timeline UI components. It would declare its source-access gate and feature key, retain source URLs where supplied, and add a new ontology type only if the existing semantics cannot represent the output. Tower or Civic could then use the same connector and records subject to their permissions and source-use rights.

**Extension acceptance:** An extension ships when its new registrations are accepted, its supported consumers remain compatible, its source and access constraints are satisfied, and its release/migration evidence is recorded. Adoption of a new platform primitive additionally records why existing contracts are insufficient, its operating owner, dependency cost, and effect on current products.

### Migration order

1. Inventory source capabilities and classify each as implemented, bounded-verified, candidate, legacy, or excluded. Record source, license/terms, owner, proxy and secret needs, coverage, data shape, and verification evidence.
2. Freeze Harvy's shared contracts first: HarvyDex UUID rules, Ontoly object/link/evidence schemas, connector protocol, HQL versioning, identity/authorization context, global UI tags, and feature-flag evaluation.
3. Keep the existing V2 execution model where useful, then connect it to Automation through a narrow, authenticated job/connector interface. Avoid building parallel schedulers or source-specific logic into product Workers.
4. Map OpenTIR and Civic records into Ontoly incrementally, preserving source IDs, timestamps, citations, uncertainty, and original evidence. Add deduplication and entity resolution only with reviewable provenance.
5. Rebuild product queries and screens on HQL and the shared UI system. Release features through entitlements and flags; keep each feature's implementation status visible to operators.
6. Retire duplicate paths only after their data, users, schedules, and recovery procedures have been accounted for. Do not copy source code until its license and obligations are confirmed.

### Repository conflicts verified against current files

- Harvy's existing Worker configurations still bind D1 directly and do not configure Hyperdrive. The legacy supervisor config is outside the target architecture; the auth Worker remains relevant. The user's Hyperdrive-first direction therefore remains a migration requirement, not a current implementation claim.
- Civic defines a separate `cql/v1` protocol in `civontology/shared/query-spec.mjs`. Harvy's shared protocol is HQL, so retain useful query validation and safe-field allowlisting while adapting it to HQL.
- Civic's Worker config includes an `AI_SEARCH` binding in `civontology/wrangler.app.jsonc`. Harvy explicitly excludes Cloudflare Search, so do not port that binding or rely on it for Harvy search.
- Civic's Worker config owns browser and source-job infrastructure in `civontology/wrangler.app.jsonc`; the user has assigned scraping, crawling, searching, transformation, and external ingestion to Automation. Port source definitions and workflow requirements, then run external access through Automation.
- OpenTIR's source infrastructure and documentation include legacy fetcher terminology and storage/search systems that conflict with Harvy's connector vocabulary and Cloudflare/Automation boundaries. Only carry over the useful `api/v1/` product contracts and domain data after mapping them to the target architecture.
- Harvy V2 already has Better Auth and an ontology/query implementation (`harvy-platform/v2/auth/`, `harvy-platform/v2/ontology/`, and migration `0006_ontology_and_dashboards.sql`), but the repository does not yet establish HarvyDex as the global record identity or HQL as a complete shared protocol. Treat those as gaps to close, not reasons to introduce another ontology service.

OpenTIR is AGPL-3.0 licensed. The Civic source checkout has no root `LICENSE` file. Treat both repositories as feature references until code reuse rights and obligations are established; prefer independently implementing mapped behavior where licensing is unclear.
