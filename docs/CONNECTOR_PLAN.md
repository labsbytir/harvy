# Harvy v2 API and connector adoption plan

This is the connector execution plan for the [master plan](PLAN.md). Harvy is one ontology and one system. Ontoly is the raw dataset product; Civic, Tower, Ops, and Newsk are modes. Every external API, download, crawl, scrape, search, transformation, and ingestion connector runs in **Automation**. n8n schedules and observes internal Automation jobs. Every connector requires the approved Webshare proxy route; Spider Cloud Unlimited is required for crawl/scrape/link discovery. No mode gets a separate connector infrastructure stack.

## Complete candidate sources now in this repository

| Input | Location | Meaning |
|---|---|---|
| OpenTIR source inventory | [CONNECTOR-CANDIDATES.md](CONNECTOR-CANDIDATES.md) | Source-by-source inventory, including publisher/API locations, initial scopes, and access notes. Historical candidates, not implemented connectors. |
| Prior Harvy manifest | [`v2/catalog/reference/harvy-upstream-manifest.json`](../v2/catalog/reference/harvy-upstream-manifest.json) | Prior connector/source definitions and metadata. Reference snapshot only. |
| Prior Harvy scopes | [`v2/catalog/reference/harvy-connector-scopes.json`](../v2/catalog/reference/harvy-connector-scopes.json) | Streams, requested scopes, portals, bulk sources, named connectors, and references. Reference snapshot only. |
| Civic source directory | [`v2/catalog/reference/civic-source-catalog.json`](../v2/catalog/reference/civic-source-catalog.json) | Seven Civic source-directory entries. Reference snapshot only. |

The files overlap and mix implemented adapters, source scopes, bulk datasets, and references. The OpenTIR inventory's heading says 150 upstream records/149 IDs, while the master plan records a later local 147-entry/146-ID snapshot. **Neither is the combined denominator.** Freeze a deduplicated canonical ledger from all four inputs before claiming the user's 50% adoption target. The ledger must show source-file origin and aliases so no candidate disappears silently.

## Priority order

1. **CourtListener bulk downloads** ([issue #28](https://github.com/labsbytir/harvy/issues/28)): confirm bulk access and current snapshot; resumable, integrity-checked transfer; raw file and manifest in `harvy-raw`; normalized records in `harvy-artifacts`; HarvyDex IDs and original court/case IDs; Basin catalog release for historical queries. CourtListener REST search/webhooks are separate follow-on operations, not substitutes for bulk import.
2. **News** ([Newsk issue #20](https://github.com/labsbytir/harvy/issues/20)): Media Cloud ([#26](https://github.com/labsbytir/harvy/issues/26)) and SocketNews ([#27](https://github.com/labsbytir/harvy/issues/27)) as approved news integrations; Spider Cloud Unlimited ([#8](https://github.com/labsbytir/harvy/issues/8)) for bounded public-page coverage and enrichment. No RSS or RSSHub dependency. Scope Facebook, X, and Reddit monitoring only after each platform's permitted access is established.
3. **Weather** ([issue #29](https://github.com/labsbytir/harvy/issues/29)): choose the first approved weather source from the inventory (e.g. NWS/NOAA), preserve units/location/valid time and provenance, and join context through the shared ontology. WeatherNext is a separate model/context integration, not the weather observation source.
4. **Remaining full catalog:** configure the best reusable adapter families across Civic, Tower, Ops, Newsk, and Ontoly after the first end-to-end path works. The 50% target applies to the deduplicated full legacy catalog, not a hand-picked shortlist.

## One connector contract

Each canonical ledger row must record: canonical ID; original IDs/paths; source publisher; source type (API, bulk, crawl, stream, directory/reference); access terms and allowed use; product modes served; query/geography/time scope; API/download operation; auth secret reference; Webshare egress verification; Spider mode when applicable; rate/concurrency limits; expected cadence; schema mapping; original source ID; HarvyDex ID strategy; raw/processed/query artifact paths; attribution; license/retention; owner; last verified time; run IDs; status; and exclusion reason. A directory/reference row is not an executable connector.

Status progression is `inventoried → mapped → runnable → live_verified → adopted`, with separate `blocked`, `failed`, and `excluded`. A source counts as adopted only after two bounded real runs, verified proxy path, normalized output with provenance, idempotent replay, authorized API/HQL read, UI evidence, health/freshness, and independent review. A JSON manifest, n8n template, or imported catalog row alone counts as zero adopted connectors.

The runtime path is: approved scope → Harvy `/api/v1/` or internal n8n trigger → canonical run registration → Automation connector → Webshare and (for crawling) Spider preflight → bounded source response → immutable R2 raw artifact → validated Ontoly/HarvyDex record and R2 processed artifact → optional Basin Iceberg/Parquet release → scoped HQL/API/UI. Keep provider credentials inside approved secret systems and outside n8n exports.

## Batch implementation

| Batch | Connector family | Initial source examples from inventory | Evidence required |
|---|---|---|---|
| A | Bulk snapshot | CourtListener first; later approved archive/open-data bulk sources | Resumable transfer, checksum, manifest, schema/count checks, original IDs, replay. |
| B | News API/search | Media Cloud, SocketNews; later GDELT if approved | Query scope, time window, source attribution, deduplication, coverage gaps. |
| C | Weather/event JSON | NWS/NOAA, USGS, GDACS, FEMA, NASA FIRMS as source-specific scopes | Units, geography, event time, freshness, rate bounds. |
| D | Government/civic API | Congress.gov, Regulations.gov, Legistar, selected CKAN/Socrata portals | Stable upstream IDs, pagination, jurisdiction, revisions, source terms. |
| E | Economics/business/research | EIA, BEA, World Bank, UN Data, OFAC/EU sanctions, approved corporate sources | Series/list version, units, release time, attribution, license. |
| F | Public-page crawl | Approved source pages through Spider Unlimited | Allowed targets, page caps, Webshare egress proof, extraction completeness. |
| G | Gated/social | Scoped Facebook, X, Reddit and other approved sources | Platform access/terms and scope, credential ownership, retention, quota. |

These are adapter families, not claims that every example is ready. Use the source-by-source inventory to build configurations, and record blocked access explicitly. Do not reintroduce Telegram, JudyRecords, Truth Social, RSS/RSSHub, or Cloudflare Search into the active plan. SAM.gov was un-excluded by direct user directive on 2026-10-30 (AGENTS.md updated); onboard via the Get Opportunities Public API with SAM_GOV_API_KEY and bounded verification. Do not count reference-only rows as connectors.

## Immediate repo work

1. Generate `v2/catalog/connector-ledger.json` from the four snapshots with stable IDs and source provenance; review duplicate aliases and exclusions. Freeze `N` and `T = ceil(N/2)` with a revision and publish the full list.
2. Implement shared connector manifest/schema and Python Automation adapter contract; build one real CourtListener bulk run and then Media Cloud/SocketNews news runs. Keep source-specific code in Automation.
3. Replace the untracked RSS n8n starter with inactive CourtListener/news/weather dispatch templates that call Automation, and verify them against the installed n8n version before activation.
4. Record per-source run evidence, then expand reusable families in batches. Report `adopted/N`, blocked reasons, and cost/latency daily. Never substitute candidate count or registration count for live adoption.

No external connector in this clean repo is currently live verified. The copied inventories are planning inputs, not deployed integrations.
