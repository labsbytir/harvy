# Harvy connector candidates from OpenTIR

The cited `opentir-development/sources.yaml` revision returned 404 from the public repository endpoint when rechecked on 2026-10-29, so its original 150-record/149-ID count is not independently verified. This file currently has 147 numbered entries and 146 unique IDs: `entso_e_outages` appears twice, and numbers 61, 112, and 145 are absent without a recorded disposition. Treat this as a candidate reference, not an approved or implemented connector catalog; no entry here proves live verification or enablement.

## Harvy-wide connector scope

- Route third-party API, scraping, crawling, searching, and ingestion through **Automation**. Use Spider Cloud for applicable extraction and the required Webshare proxy for every connector, including API requests. Keep credentials in Harvy Secrets Store.
- Normalize results into Harvy's shared observation, event, entity, document, and evidence model. Preserve source identity, original source URL, retrieval time, attribution, terms/license, and provenance.
- Start with the narrowest useful collection: named collection/query, watchlist, time window, geographic boundary, threshold, or catalog metadata. Do not mirror a provider's complete dataset by default.
- Source-file tiers are upstream labels only; they do not mean Harvy has approved, implemented, or verified a connector.
- Before activation, record owner, data classes, allowed scope, terms/license, credential/proxy requirements, rate/retention limits, failure behavior, and validation plan in the connector catalog.

## Rollout scope

### Wave 1 — bounded pilots

Begin with public feeds and a few clearly bounded government/catalog APIs. Establish provenance, normalization, freshness, recovery, and source-health handling first.

- **Ontoly:** `gdelt` (bounded recent English articles/events); `usgs_earthquakes` (configured magnitude/time feeds); `gdacs` (active elevated alerts and bounded earthquake history); `nasa_firms` (daily global active-fire feed); `nws_tornadoes` and `noaa_spc` (active warnings/reports); `fema_openfema` (declarations and selected projects); `eia_open_data` (selected series); `opensky_live` (bounded flight-state snapshots after terms review); `worldbank_api` and `un_data` (metadata first, then configured indicators); `ofac_sdn` and `eu_sanctions` (official list snapshots and changes).
- **Civic / Ontoly:** `legistar_nyc` (public legislative records); `congress_gov` and `regulations_gov` (public bills, dockets, rules, document metadata); `ckan_portal` and `socrata_portal` (named portal pilots, catalog metadata); `wayback_cdx` (approved URL watchlists).

### Wave 2 — expand when a product workflow needs it

Add further hazard, climate, energy, outage, infrastructure, transit, procurement, archives, economic, conflict, and research sources after Wave 1 validates evidence and source-health handling. Prefer primary publishers when sources overlap.

### Hold for explicit source review

- **Surveillance/location exposure:** `osm_alpr`, `deflock`, `tfl_jamcams`, `windy_webcams`, `wigle_public_stats`, `shodan`, and bespoke utility outage maps. Limit to approved public-interest infrastructure use; do not create person-tracking workflows.
- **Social and user-generated content:** Reddit, Nostr, X/Twitter, RSSHub, live-TV listings, and news aggregators. Review platform terms, lawful collection, attribution, retention, and reliability. Civic community sources need administrator approval before collection.
- **Cyber/threat data:** AbuseIPDB, OTX, VirusTotal, crt.sh, Cloudflare Radar, and Shodan require a defensive use case, narrow query scope, credential/plan review, cost limits, and indicator-handling rules.
- **Commercial/tenant-specific:** preserve source-specific tenant boundaries. In particular, `poweroutage_us` is marked per-tenant-only in the source file; do not ingest it as shared data.
- **Sensitive personal data:** do not ingest NYC benefits-screening calls or resident-level equivalents. Microdata sources may be indexed as catalog metadata only until privacy, consent, license, and retention have separate review.
- **Unverified sources:** verify publisher identity, endpoint, terms, and data quality for opaque feeds and bespoke scrapes before implementation.

### Explicitly excluded by current project policy

Do not implement or activate Telegram, JudyRecords, Truth Social, or SAM.gov sources. The three SAM.gov records below remain in this historical candidate inventory only so exclusions are visible; they are not rollout candidates.

## Source-by-source connector catalog

Each item corresponds to one source record, including both configured `entso_e_outages` records. **Get** links the publisher site and API/download base from the YAML; a `catalog_endpoint` appears as a complete route when possible. **Initial scope** reproduces configured collection names and filters/endpoints. If none is configured, the entry calls for a bounded query or watchlist before implementation. Verify endpoint availability, terms, auth, rate limits, licenses, cadence, and retention with the publisher.

### 1. `energydata_info` — Energydata.info (CKAN)

- **Get:** [publisher/site](https://energydata.info); API/download base: [https://energydata.info](https://energydata.info); catalog endpoint: [https://energydata.info/api/3/action/package_search](https://energydata.info/api/3/action/package_search).
- **Initial scope:** `ckan_root; query: ''; page_size: 100`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** Open energy data (CKAN 2.9). 1,191 packages.

### 2. `financesone` — World Bank FinancesOne (FONE)

- **Get:** [publisher/site](https://financesone.worldbank.org); API/download base: [https://datacatalogapi.worldbank.org/dexapps/fone](https://datacatalogapi.worldbank.org/dexapps/fone).
- **Initial scope:** `fone_datasets; asset_type: dataset`; `fone_views; asset_type: view`; `fone_visualizations; asset_type: visualization`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** World Bank project finances. 547+ assets, 290k+ rows.

### 3. `microdata_rtdi` — World Bank Microdata Catalog (RTDI)

- **Get:** [publisher/site](https://microdata.worldbank.org); API/download base: [https://microdata.worldbank.org/index.php/api](https://microdata.worldbank.org/index.php/api).
- **Initial scope:** `rtdi; collection_param: rtdi; page_size: 50`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** WBG microdata (RTDI). 109 studies.

### 4. `microdata_fcv` — World Bank Microdata Catalog (FCV)

- **Get:** [publisher/site](https://microdata.worldbank.org); API/download base: [https://microdata.worldbank.org/index.php/api](https://microdata.worldbank.org/index.php/api).
- **Initial scope:** `fcv; collection_param: fcv; page_size: 50`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** WBG microdata (FCV — fragile & conflict-affected). 1,503 studies.

### 5. `wayback_cdx` — Internet Archive Wayback Machine CDX

- **Get:** [publisher/site](https://web.archive.org); API/download base: [https://web.archive.org](https://web.archive.org).
- **Initial scope:** `watchlist; urls: []`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** Internet Archive's web snapshots. Tracked URLs in our watchlist.

### 6. `crt_sh` — crt.sh Certificate Transparency Logs

- **Get:** [publisher/site](https://crt.sh); API/download base: [https://crt.sh](https://crt.sh).
- **Initial scope:** `identity; identity: '%'`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** Certificate Transparency logs. Tracks new subdomains.

### 7. `abuseipdb` — AbuseIPDB IP Abuse Reports

- **Get:** [publisher/site](https://www.abuseipdb.com); API/download base: [https://api.abuseipdb.com/api/v2](https://api.abuseipdb.com/api/v2).
- **Initial scope:** `blacklist; confidence_minimum: 90`.
- **Access:** source file indicates key/auth requirement; setting(s): `ABUSEIPDB_API_KEY`. Store secrets in Harvy Secrets Store and confirm publisher requirements.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** IP abuse reports. 100k IPs/day on the free tier.

### 8. `otx_alienvault` — AlienVault OTX Threat-Intel Pulses

- **Get:** [publisher/site](https://otx.alienvault.com); API/download base: [https://otx.alienvault.com/api/v1](https://otx.alienvault.com/api/v1).
- **Initial scope:** `pulses_subscribed; modified_since_days: 7`.
- **Access:** source file indicates key/auth requirement; setting(s): `OTX_API_KEY`. Store secrets in Harvy Secrets Store and confirm publisher requirements.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** Threat-intel pulses (IOCs, actors, campaigns).

### 9. `virustotal` — VirusTotal File/URL/IP Reputation

- **Get:** [publisher/site](https://www.virustotal.com); API/download base: [https://www.virustotal.com/api/v3](https://www.virustotal.com/api/v3).
- **Initial scope:** `livehunt_notifications; enabled: false`.
- **Access:** source file indicates key/auth requirement; setting(s): `VIRUSTOTAL_API_KEY`. Store secrets in Harvy Secrets Store and confirm publisher requirements.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** File / URL / IP / domain reputation. 4 req/min free.

### 10. `shodan` — Shodan IoT/Host Search

- **Get:** [publisher/site](https://www.shodan.io); API/download base: [https://api.shodan.io](https://api.shodan.io).
- **Initial scope:** `asn_watchlist; asns: []`.
- **Access:** source file indicates key/auth requirement; setting(s): `SHODAN_API_KEY`. Store secrets in Harvy Secrets Store and confirm publisher requirements.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** IoT / host search. Free tier: 1 req/s, 100 results/query.

### 11. `cloudflare_radar` — Cloudflare Radar Internet Trends

- **Get:** [publisher/site](https://radar.cloudflare.com); API/download base: [https://api.cloudflare.com/client/v4/radar](https://api.cloudflare.com/client/v4/radar).
- **Initial scope:** `attacks_layer3; location: '*'`.
- **Access:** source file indicates key/auth requirement; setting(s): `CLOUDFLARE_API_TOKEN`. Store secrets in Harvy Secrets Store and confirm publisher requirements.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** Country-level internet traffic, attack, and adoption trends.

### 12. `opensky_live` — OpenSky Network Live ADS-B State Vectors

- **Get:** [publisher/site](https://opensky-network.org); API/download base: [https://opensky-network.org/api](https://opensky-network.org/api).
- **Initial scope:** `live_states; query: ''`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** Live ADS-B flight state vectors. ~10k flights in the air at any moment.

### 13. `gdelt` — GDELT 2.0 Global Events Database

- **Get:** [publisher/site](https://www.gdeltproject.org); API/download base: [https://api.gdeltproject.org/api/v2](https://api.gdeltproject.org/api/v2).
- **Initial scope:** `top_articles_en; query: sourcelang:english; timespan: 1day; max_articles: 250`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** GDELT 2.0 — global events, themes, tone. Updated every 15 min.

### 14. `wigle_public_stats` — WiGLE Public Site Statistics

- **Get:** [publisher/site](https://wigle.net); API/download base: [https://api.wigle.net/api/v2](https://api.wigle.net/api/v2).
- **Initial scope:** `site_stats`; `per_country`; `per_region; country: US`.
- **Access:** source file marks this public/no-auth; verify current terms and practical limits.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** WiGLE public site stats (totals, per-country, per-region). 5 calls/day, no auth.

### 15. `nasa_firms` — NASA FIRMS Active Fire Detection

- **Get:** [publisher/site](https://firms.modaps.eosdis.nasa.gov); API/download base: [https://firms.modaps.eosdis.nasa.gov/api](https://firms.modaps.eosdis.nasa.gov/api).
- **Initial scope:** `global_daily; area: world; sensors:; - MODIS_NRT; - VIIRS_SNPP_NRT; - VIIRS_NOAA20_NRT; - VIIRS_NOAA21_NRT; day_range: 1`.
- **Access:** source file indicates key/auth requirement; setting(s): `FIRMS_MAP_KEY`. Store secrets in Harvy Secrets Store and confirm publisher requirements.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** NASA satellite-detected active fires (MODIS + VIIRS). 5 sensors, global, free with MAP_KEY.

### 16. `usgs_earthquakes` — USGS Earthquake Hazards Program GeoJSON Feeds

- **Get:** [publisher/site](https://earthquake.usgs.gov); API/download base: [https://earthquake.usgs.gov/earthquakes/feed/v1.0](https://earthquake.usgs.gov/earthquakes/feed/v1.0).
- **Initial scope:** `all_day_m25; feed: all_day; min_magnitude: 2.5`; `all_week_m45; feed: all_week; min_magnitude: 4.5`.
- **Access:** source file marks this public/no-auth; verify current terms and practical limits.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** USGS Earthquake Hazards Program. 14 GeoJSON feeds (all_hour, all_day, 2.5_day, 4.5_week, etc.).

### 17. `gdacs` — GDACS Multi-Hazard Alerts (EC JRC / UN OCHA)

- **Get:** [publisher/site](https://www.gdacs.org); API/download base: [https://www.gdacs.org/gdacsapi/api](https://www.gdacs.org/gdacsapi/api).
- **Initial scope:** `all_orange_plus; days: 7; min_alert: Orange`; `earthquakes_only; eventtype: EQ; days: 30`.
- **Access:** source file marks this public/no-auth; verify current terms and practical limits.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** GDACS / EC JRC / UN OCHA. Real-time multi-hazard (EQ, TC, FL, VO, WF, DR). GeoJSON, no key.

### 18. `effis` — EFFIS European Forest Fire Information System

- **Get:** [publisher/site](https://effis.jrc.ec.europa.eu); API/download base: [https://ies-research.jrc.ec.europa.eu/firms/api](https://ies-research.jrc.ec.europa.eu/firms/api).
- **Initial scope:** `europe_daily; area: EUROPE; sensors:; - MODIS; - VIIRS_SNPP; - VIIRS_NOAA20; day_range: 1`.
- **Access:** source file indicates key/auth requirement; setting(s): `EFFIS_KEY`. Store secrets in Harvy Secrets Store and confirm publisher requirements.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** EFFIS / EC JRC. European fires at higher resolution than NASA FIRMS. Free with EFFIS key.

### 19. `gvp_weekly` — Smithsonian Global Volcanism Program Weekly Activity

- **Get:** [publisher/site](https://volcano.si.edu); API/download base: [https://volcano.si.edu](https://volcano.si.edu).
- **Initial scope:** No collection filter configured. Define a bounded metadata query, watchlist, or time/geography range before implementation..
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** Smithsonian GVP weekly activity reports (HTML scrape; no public API).

### 20. `nws_tornadoes` — NWS api.weather.gov + SPC Active Alerts

- **Get:** [publisher/site](https://api.weather.gov); API/download base: [https://api.weather.gov](https://api.weather.gov).
- **Initial scope:** `active_tornado_warnings; event: Tornado`.
- **Access:** source file marks this public/no-auth; verify current terms and practical limits.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** NWS api.weather.gov active alerts + SPC daily tornado CSVs. No key, US coverage.

### 21. `live_tv_channels` — YouTube Live TV Channels (International News)

- **Get:** [publisher/site](https://www.youtube.com); API/download base: [https://www.youtube.com/embed/live_stream](https://www.youtube.com/embed/live_stream).
- **Initial scope:** `channels; data_file: /data/live_tv_channels.json`.
- **Access:** source file marks this public/no-auth; verify current terms and practical limits.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** 29 international news channels via YouTube live embeds. Geocoded to broadcast HQ. See /data/live_tv_channels.json.

### 22. `harvard_ccc` — Harvard Crowd Counting Consortium (US Protests)

- **Get:** [publisher/site](https://dataverse.harvard.edu); API/download base: [https://dataverse.harvard.edu/api](https://dataverse.harvard.edu/api).
- **Initial scope:** `phase1_2017_2020; file_id: 10808404`; `phase2_2021_2024; file_id: 10822959`; `phase3_2025_plus; file_id: 14059539`.
- **Access:** source file marks this public/no-auth; verify current terms and practical limits.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** Harvard Crowd Counting Consortium. ~200k US protest events, all geocoded to town level. CC-BY 4.0. Primary academic.

### 23. `countlove` — Count Love US Protest Archive (2017-2021)

- **Get:** [publisher/site](https://countlove.org); API/download base: [https://countlove.org](https://countlove.org).
- **Initial scope:** `events; url: https://countlove.org/data/events.json`.
- **Access:** source file marks this public/no-auth; verify current terms and practical limits.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** Count Love archive (2017-2021). 38k US protests, all geocoded. CC-BY 4.0. Predecessor to the Harvard CCC; useful.

### 24. `osm_alpr` — OpenStreetMap ALPR Cameras (DeFlock-equivalent)

- **Get:** [publisher/site](https://www.openstreetmap.org); API/download base: [https://overpass-api.de/api/interpreter](https://overpass-api.de/api/interpreter).
- **Initial scope:** `us; iso2: US; timeout: 600`; `gb; iso2: GB; timeout: 300`; `ca; iso2: CA; timeout: 300`; `de; iso2: DE; timeout: 300`; `fr; iso2: FR; timeout: 300`; `au; iso2: AU; timeout: 300`.
- **Access:** source file marks this public/no-auth; verify current terms and practical limits.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** OSM-tagged ALPR cameras (Flock Safety + others). ~1,440 in NYC metro alone. Civil-liberties / surveillance infrastructure.

### 25. `nostr_nip52` — Nostr NIP-52 Calendar Events (Decentralized Protests)

- **Get:** [publisher/site](wss://relay.damus.io); API/download base: [wss://relay.damus.io](wss://relay.damus.io).
- **Initial scope:** `protest_tags; tags:; - protest; - march; - rally; - demonstration; - activism; - action; - blm; - climate; - palestine; - '5050'; - antifa; - resist; relays:; - wss://relay.damus.io; - wss://nos.lol; - wss://nostr.wine; - wss://nostr.mom; - wss://relay.nostr.band; kinds:; - 31922; - 31923; limit: 200`.
- **Access:** source file marks this public/no-auth; verify current terms and practical limits.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** NIP-52 calendar events from public Nostr relays (relay.damus.io, nos.lol, nostr.wine, etc.). Tagged 'protest',.

### 26. `civicus_monitor` — CIVICUS Monitor Civic-Space Ratings

- **Get:** [publisher/site](https://monitor.civicus.org); API/download base: [https://monitor.civicus.org](https://monitor.civicus.org).
- **Initial scope:** `rss_press_updates; endpoint: https://monitor.civicus.org/feed/; format: rss`; `country_ratings; endpoint: https://monitor.civicus.org/data/; format: html_scrape; years:; - 2018; - 2019; - 2020; - 2021; - 2022; - 2023; - 2024; - current`.
- **Access:** source file marks this public/no-auth; verify current terms and practical limits.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** CIVICUS Monitor. 5-tier civic-space rating (Open / Narrowed / Obstructed / Repressed / Closed) for 198 countries,.

### 27. `gtfs_de_fv` — gtfs.de Schienenfernverkehr (German Long-Distance Rail GTFS)

- **Get:** [publisher/site](https://download.gtfs.de/germany); API/download base: [https://download.gtfs.de/germany](https://download.gtfs.de/germany).
- **Initial scope:** `de_fv; endpoint: https://download.gtfs.de/germany/fv_free/latest.zip; file_format: gtfs_static; size_mb: 0.4`.
- **Access:** source file marks this public/no-auth; verify current terms and practical limits.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** 'gtfs.de Schienenfernverkehr. Long-distance rail Germany (ICE, IC, EC, EN, railJet, Night Trains). ~5.3K trips,.

### 28. `gtfs_de_nv` — gtfs.de Nahverkehr (German Local/Urban Transit GTFS)

- **Get:** [publisher/site](https://download.gtfs.de/germany); API/download base: [https://download.gtfs.de/germany](https://download.gtfs.de/germany).
- **Initial scope:** `de_nv; endpoint: https://download.gtfs.de/germany/nv_free/latest.zip; file_format: gtfs_static; size_mb: 272.0`.
- **Access:** source file marks this public/no-auth; verify current terms and practical limits.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** gtfs.de Nahverkehr. Complete local transit Germany (all buses, trams, U-Bahnen, S-Bahnen, ferries, funiculars).

### 29. `gtfs_de_rt` — gtfs.de GTFS-Realtime (27 German Transit Agencies)

- **Get:** [publisher/site](https://realtime.gtfs.de); API/download base: [https://realtime.gtfs.de](https://realtime.gtfs.de).
- **Initial scope:** `realtime_free; endpoint: https://realtime.gtfs.de/realtime-free.pb; file_format: gtfs_rt_protobuf`.
- **Access:** source file marks this public/no-auth; verify current terms and practical limits.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** 'gtfs.de GTFS-RT stream. TripUpdates + ServiceAlerts for 27 German transit agencies. Updated every 10s. CC BY-SA.

### 30. `legistar_nyc` — Granicus Legistar Web API — NYC Council

- **Get:** [publisher/site](https://legistar.council.nyc.gov); API/download base: [https://webapi.legistar.com/v1/nyc](https://webapi.legistar.com/v1/nyc).
- **Initial scope:** `bodies; endpoint: /Bodies; description: Committees + chambers (~25 committees + full City Council).`; `persons; endpoint: /Persons; description: Council members + staff.`; `matters; endpoint: /Matters; description: Bills, resolutions, motions, local laws. Filter by PassageDate / status / type.`; `events; endpoint: /Events; description: Meetings (Stated, Committee, Hearings). Filter by date range.`; `matter_histories; endpoint: /Matters/{MatterId}/Histories; description: Audit trail of each bill (introduced, committee, voted, enacted).`; `roll_calls; endpoint: /EventItems/{EventItemId}/RollCalls; description: Roll-call votes; join with /Votes for per-member yea/nay/abstain.`.
- **Access:** source file indicates key/auth requirement; setting(s): `LEGISTAR_NYC_TOKEN`. Store secrets in Harvy Secrets Store and confirm publisher requirements.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** "Granicus Legistar Web API — NYC Council. Bills, resolutions, motions, votes, council members, committees,\.

### 31. `nyc_benefits_screening` — NYC Benefits Screening API (ACCESS NYC)

- **Get:** [publisher/site](https://screeningapidocs.cityofnewyork.us); API/download base: [https://screeningapi.cityofnewyork.us](https://screeningapi.cityofnewyork.us).
- **Initial scope:** `program_catalog; endpoint: https://data.cityofnewyork.us/resource/2j8u-wtju.json; file_format: socrata_json`; `rules_engine; endpoint: https://raw.githubusercontent.com/NYCOpportunity/benefits-screening-rules/master/README.md; file_format: html_scrape`; `screening_calls; endpoint: https://screeningapi.cityofnewyork.us/screening; method: POST; requires_key: true; format: request_response; per_tenant_only: true`.
- **Access:** source file indicates key/auth requirement; setting(s): `NYC_BENEFITS_SCREENING_TOKEN`. Store secrets in Harvy Secrets Store and confirm publisher requirements.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** NYC Benefits Screening API (ACCESS NYC). 35+ Federal/State/Municipal benefits programs (SNAP, Cash Assistance,.

### 32. `nypl_publicdomain_bulk` — NYPL Public Domain Bulk Data (2016 CC0 Release)

- **Get:** [publisher/site](https://github.com/NYPL-publicdomain/data-and-utilities); API/download base: [https://raw.githubusercontent.com/NYPL-publicdomain/data-and-utilities/master](https://raw.githubusercontent.com/NYPL-publicdomain/data-and-utilities/master).
- **Initial scope:** `items_ndjson; endpoint: https://raw.githubusercontent.com/NYPL-publicdomain/data-and-utilities/master/items/*.json; file_format: ndjson`; `collections_ndjson; endpoint: https://raw.githubusercontent.com/NYPL-publicdomain/data-and-utilities/master/collections/*.json; file_format: ndjson`.
- **Access:** source file marks this public/no-auth; verify current terms and practical limits.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** NYPL Public Domain Bulk Data (2016 CC0 release, 187K items). Maps, photographs, manuscripts, sheet music, prints,.

### 33. `dpla_bulk` — Digital Public Library of America (DPLA) Bulk + API

- **Get:** [publisher/site](https://pro.dp.la); API/download base: [https://api.dp.la/v3](https://api.dp.la/v3).
- **Initial scope:** `nyp_ndjson; endpoint: https://bulk.dp.la/nyp.jsonl.gz; file_format: ndjson_gz; size_mb_estimate: 5000`; `dpla_api_nypl; endpoint: https://api.dp.la/v3/items; method: GET; file_format: json_paginated`.
- **Access:** source file marks this public/no-auth; verify current terms and practical limits.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** Digital Public Library of America (DPLA) bulk data + API. ~5M+ records from NYPL + Library of Congress + Smithsonian.

### 34. `odin` — ODIN — Outage Data Initiative Nationwide (ORNL/DOE)

- **Get:** [publisher/site](https://odin.ornl.gov); API/download base: [https://ornl.opendatasoft.com/api/explore/v2.1](https://ornl.opendatasoft.com/api/explore/v2.1).
- **Initial scope:** `public_realtime_county; endpoint: https://ornl.opendatasoft.com/api/explore/v2.1/catalog/datasets/odin-real-time-outages-county/records; file_format: json_paginated`; `subscriber_feed; endpoint: https://api.odin.ornl.gov/od/...; method: GET; file_format: cim_xml; requires_key: true; key_env: ODIN_API_TOKEN; per_tenant_only: false`.
- **Access:** source file marks this public/no-auth; verify current terms and practical limits.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** "ODIN — Outage Data Initiative Nationwide (ORNL + DOE). 47 US states, 47M+ customers, 155+ utilities. Per-county\.

### 35. `poweroutage_us` — PowerOutage.us Commercial Aggregator [PER-TENANT-ONLY]

- **Get:** [publisher/site](https://poweroutage.us); API/download base: [https://api.poweroutage.us/v1](https://api.poweroutage.us/v1).
- **Initial scope:** `api_national; endpoint: https://api.poweroutage.us/v1/national; method: GET; file_format: json; requires_key: true; key_env: POWEROUTAGE_US_API_KEY`; `api_state; endpoint: https://api.poweroutage.us/v1/states; method: GET; file_format: json; requires_key: true; key_env: POWEROUTAGE_US_API_KEY`; `api_county_geojson; endpoint: https://api.poweroutage.us/v1/geojson/counties; method: GET; file_format: geojson; requires_key: true; key_env: POWEROUTAGE_US_API_KEY`; `api_utility; endpoint: https://api.poweroutage.us/v1/utilities; method: GET; file_format: json; requires_key: true; key_env: POWEROUTAGE_US_API_KEY`.
- **Access:** source file indicates key/auth requirement; setting(s): `POWEROUTAGE_US_API_KEY`, `GET`. Store secrets in Harvy Secrets Store and confirm publisher requirements.
- **Tenant boundary:** per-tenant collection only; do not ingest as shared-source data.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** "PowerOutage.us — commercial aggregator. 96% US, 95% Canada, 89% UK coverage. 1,110+ utilities. REST +\.

### 36. `eagle_i` — EAGLE-I Historical US Outage Archive (ORNL 2014-2022)

- **Get:** [publisher/site](https://figshare.com/articles/dataset/The_Environment_for_Analysis_of_Geoocated_Energy_Information_s_Recorded_Electricity_Outages_2014-2022/24237376); API/download base: [https://openenergyhub.ornl.gov/api/explore/v2.1](https://openenergyhub.ornl.gov/api/explore/v2.1).
- **Initial scope:** `figshare_bulk_csv; endpoint: https://figshare.com/ndownloader/files/41264798; file_format: csv`.
- **Access:** source file marks this public/no-auth; verify current terms and practical limits.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** "EAGLE-I — Environment for Analysis of Geo-Located Energy Information (ORNL, 2014-2022). CC-BY 4.0 bulk\.

### 37. `doe_oe417` — DOE OE-417 Electric Emergency Incident Reports

- **Get:** [publisher/site](https://www.oe.netl.doe.gov/oe417_annual_summary.aspx); API/download base: [https://doe417.pnnl.gov](https://doe417.pnnl.gov).
- **Initial scope:** `annual_summary_excel; endpoint: https://www.oe.netl.doe.gov/oe417_annual_summary.aspx; file_format: xlsx`; `openenergyhub_mirror; endpoint: https://openenergyhub.ornl.gov/explore/dataset/oe-417-annual-summaries/; file_format: csv`.
- **Access:** source file marks this public/no-auth; verify current terms and practical limits.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** "DOE OE-417 — Electric Emergency Incident and Disturbance Report. Public domain (US Government work). Annual\.

### 38. `national_grid_uk_connected_data` — National Grid UK Connected Data Portal — Live Power Cuts

- **Get:** [publisher/site](https://connecteddata.nationalgrid.co.uk); API/download base: [https://connecteddata.nationalgrid.co.uk/api/3/action](https://connecteddata.nationalgrid.co.uk/api/3/action).
- **Initial scope:** `live_power_cuts; endpoint: https://connecteddata.nationalgrid.co.uk/api/3/action/datastore_search?resource_id=292f788f-4339-455b-8cc0-153e14509d4d; method: GET; file_format: ckan_json`; `live_detailed_power_cuts; endpoint: https://connecteddata.nationalgrid.co.uk/api/3/action/datastore_search?resource_id=a1365982-4e05-463c-8304-8323a2ba0ccd; method: GET; file_format: ckan_json`; `csv_bulk; endpoint: https://connecteddata.nationalgrid.co.uk/dataset/d6672e1e-c684-4cea-bb78-c7e5248b62a2/resource/292f788f-4339-455b-8cc0-153e14509d4d/download/power_outage_ext.csv; file_format: csv`.
- **Access:** source file marks this public/no-auth; verify current terms and practical limits.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** "National Grid UK Connected Data Portal — Live Power Cuts + Live Detailed Power Cuts. CKAN DataStore API,\.

### 39. `hydro_quebec_pannes` — Hydro-Qu\xE9bec Pannes en cours (Quebec Outages)

- **Get:** [publisher/site](https://donnees.hydroquebec.com/explore/dataset/pannes-interruptions/); API/download base: [https://pannes.hydroquebec.com/pannes/donnees/v3_0](https://pannes.hydroquebec.com/pannes/donnees/v3_0).
- **Initial scope:** `bisversion; endpoint: https://pannes.hydroquebec.com/pannes/donnees/v3_0/bisversion.json; file_format: json`; `bismarkers; endpoint: https://pannes.hydroquebec.com/pannes/donnees/v3_0/bismarkers{BIS_VERSION}.json; file_format: json`; `bispoly_kmz; endpoint: https://pannes.hydroquebec.com/pannes/donnees/v3_0/bispoly{BIS_VERSION}.kmz; file_format: kmz`; `aipversion; endpoint: https://pannes.hydroquebec.com/pannes/donnees/v3_0/aipversion.json; file_format: json`; `aipmarkers; endpoint: https://pannes.hydroquebec.com/pannes/donnees/v3_0/aipmarkers{AIP_VERSION}.json; file_format: json`; `aippoly_kmz; endpoint: https://pannes.hydroquebec.com/pannes/donnees/v3_0/aippoly{AIP_VERSION}.kmz; file_format: kmz`.
- **Access:** source file marks this public/no-auth; verify current terms and practical limits.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** "Hydro-Qu\xE9bec — Pannes en cours (Quebec power outages). Public REST API + KMZ polygons. 3-step pattern:\.

### 40. `entso_e_outages` — ENTSO-E Transparency Platform (European Grid)

- **Get:** [publisher/site](https://transparency.entsoe.eu); API/download base: [https://web-api.tp.entsoe.eu/api](https://web-api.tp.entsoe.eu/api).
- **Initial scope:** `generation_outages; endpoint: https://web-api.tp.entsoe.eu/api; method: GET; file_format: xml; requires_key: true; key_env: ENTSOE_SECURITY_TOKEN`; `transmission_outages; endpoint: https://web-api.tp.entsoe.eu/api; method: GET; file_format: xml; requires_key: true; key_env: ENTSOE_SECURITY_TOKEN`.
- **Access:** source file indicates key/auth requirement; setting(s): `ENTSOE_SECURITY_TOKEN`, `GET`. Store secrets in Harvy Secrets Store and confirm publisher requirements.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** "ENTSO-E Transparency Platform — European transmission outages + market data. All 61 EU bidding zones.\.

### 41. `aemo_outages` — AEMO NEMWeb (Australian Energy Market Operator)

- **Get:** [publisher/site](https://visualisations.aemo.com.au); API/download base: [https://visualisations.aemo.com.au/aemo/apps/api/report/5min](https://visualisations.aemo.com.au/aemo/apps/api/report/5min).
- **Initial scope:** `network_outage_detail; endpoint: http://nemweb.com.au/Reports/CURRENT/NETWORK_OUTAGEDETAIL_*.csv; file_format: csv`; `dispatch_regionsum; endpoint: http://nemweb.com.au/Reports/CURRENT/DISPATCHREGIONSUM_*.csv; file_format: csv`; `market_noticeboard; endpoint: http://nemweb.com.au/Reports/CURRENT/MARKET_NOTICEBOARD_*.csv; file_format: csv`.
- **Access:** source file marks this public/no-auth; verify current terms and practical limits.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** AEMO NEMWeb JSON API (REFACTORED 2026-09-05 from rolling-bulk CSV to JSON API). Australian Energy Market Operator.

### 42. `per_utility_outage_maps` — Per-Utility Outage Maps (US Bespoke Scrapes)

- **Get:** [publisher/site](https://outagemap.ny.nationalgridus.com/); API/download base: [https://outagemap.ny.nationalgridus.com/reports/](https://outagemap.ny.nationalgridus.com/reports/).
- **Initial scope:** `national_grid_ny; endpoint: https://outagemap.ny.nationalgridus.com/reports/30d77369-2b12-4c0d-867d-31b2e7a4f18a; file_format: html`; `duke_energy; endpoint: https://outagemap.duke-energy.com/#/home; file_format: arcgis_json`; `coned; endpoint: https://www.coned.com/en/outage-map; file_format: arcgis_json`; `pge; endpoint: https://www.pge.com/outages; file_format: mapbox_json`; `sce; endpoint: https://www.sce.com/outage-center; file_format: mapbox_json`; `fpl; endpoint: https://www.fpl.com/storm-center/outage-map.html; file_format: arcgis_json`; `georgia_power; endpoint: https://outagemap.georgiapower.com/; file_format: arcgis_json`; `oncor; endpoint: https://www.oncor.com/outage-map; file_format: mapbox_json`.
- **Access:** source file marks this public/no-auth; verify current terms and practical limits.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** "Per-utility outage maps — National Grid NY + Duke + PG&E + SCE + ConEd + 15+ others. No public APIs; each\.

### 43. `mobility_database` — Mobility Database (MobilityData) GTFS Catalog

- **Get:** [publisher/site](https://mobilitydatabase.org); API/download base: [https://api.mobilitydatabase.org/v1](https://api.mobilitydatabase.org/v1).
- **Initial scope:** `catalog_github; endpoint: https://raw.githubusercontent.com/MobilityData/mobility-database-catalogs/main/catalogs/*.json; file_format: ndjson`; `catalog_api; endpoint: https://api.mobilitydatabase.org/v1/feeds; method: GET; file_format: json_paginated`.
- **Access:** source file marks this public/no-auth; verify current terms and practical limits.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** Mobility Database (MobilityData). 6000+ GTFS/GTFS-RT/GBFS feeds, 99+ countries. CC0 metadata (per the GitHub.

### 44. `transitland` — Transitland (Interline) GTFS Aggregator

- **Get:** [publisher/site](https://www.transit.land); API/download base: [https://transit.land/api/v2](https://transit.land/api/v2).
- **Initial scope:** `feeds_csv; endpoint: https://www.transit.land/feeds.csv; file_format: csv`; `feeds_graphql; endpoint: https://transit.land/graphql; method: POST; file_format: graphql`.
- **Access:** source file marks this public/no-auth; verify current terms and practical limits.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** Transitland (Interline). Thousands of GTFS/GTFS-RT/GBFS/MDS feeds. GraphQL + REST + CSV bulk. Onestop ID system.

### 45. `wri_gppd` — WRI Global Power Plant Database v1.3.0

- **Get:** [publisher/site](https://wri-rw.carto.com); API/download base: [https://wri-rw.carto.com/api/v2/sql](https://wri-rw.carto.com/api/v2/sql).
- **Initial scope:** `v130_zip; endpoint: https://datasets.wri.org/private-admin/dataset/53623dfd-3df6-4f15-a091-67457cdb571f/resource/66bcdacc-3d0e-46ad-9271-a5a76b1853d2/download/globalpowerplantdatabasev130.zip; method: GET; file_format: zip_csv`; `github_csv; endpoint: https://raw.githubusercontent.com/wri/global-power-plant-database/master/output_database/global_power_plant_database.csv; method: GET; file_format: csv`; `datasette_mirror; endpoint: https://datasette.io/global-power-plants.json?sql=; method: GET; file_format: json`.
- **Access:** source file marks this public/no-auth; verify current terms and practical limits.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** 'WRI Global Power Plant Database (REFACTORED 2026-09-05 from WRI datasets-portal ZIP to CartoDB SQL API at wri-rw.carto.com).

### 46. `gem_global_energy_monitor` — Global Energy Monitor (25 Open Energy Trackers)

- **Get:** [publisher/site](https://globalenergymonitor.org); API/download base: [https://api.globalenergymonitor.org](https://api.globalenergymonitor.org).
- **Initial scope:** `catalog_metadata; endpoint: https://api.globalenergymonitor.org/catalog/metadata; method: GET; file_format: json`; `coal_plants_csv; endpoint: https://globalenergymonitor.org/projects/global-coal-plant-tracker; method: GET; file_format: html_scrape_csv`; `oil_gas_plants_csv; endpoint: https://globalenergymonitor.org/projects/global-oil-gas-plant-tracker; method: GET; file_format: html_scrape_csv`; `wind_tracker_csv; endpoint: https://globalenergymonitor.org/projects/global-wind-power-tracker; method: GET; file_format: html_scrape_csv`; `solar_tracker_csv; endpoint: https://globalenergymonitor.org/projects/global-solar-power-tracker; method: GET; file_format: html_scrape_csv`; `hydro_tracker_csv; endpoint: https://globalenergymonitor.org/projects/global-hydropower-tracker; method: GET; file_format: html_scrape_csv`; `nuclear_tracker_csv; endpoint: https://globalenergymonitor.org/projects/global-nuclear-power-tracker; method: GET; file_format: html_scrape_csv`; `geothermal_tracker_csv; endpoint: https://globalenergymonitor.org/projects/global-geothermal-power-tracker; method: GET; file_format: html_scrape_csv`; `bioenergy_tracker_csv; endpoint: https://globalenergymonitor.org/projects/global-bioenergy-power-tracker; method: GET; file_format: html_scrape_csv`.
- **Access:** source file marks this public/no-auth; verify current terms and practical limits.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** "Global Energy Monitor (GEM) — 25 open energy trackers (coal, oil & gas, wind, solar, geothermal, bioenergy,\.

### 47. `openinframap` — Open Infrastructure Map (OSM Power Infrastructure)

- **Get:** [publisher/site](https://openinframap.org); API/download base: [https://overpass-api.de/api/interpreter](https://overpass-api.de/api/interpreter).
- **Initial scope:** `overpass_power_plants; endpoint: https://overpass-api.de/api/interpreter; method: POST; file_format: overpass_json`; `overpass_power_lines; endpoint: https://overpass-api.de/api/interpreter; method: POST; file_format: overpass_json`; `overpass_substations; endpoint: https://overpass-api.de/api/interpreter; method: POST; file_format: overpass_json`; `vector_tiles; endpoint: https://tiles.openinframap.org/{z}/{x}/{y}.pbf; method: GET; file_format: mvt`; `overpass_kumi_mirror; endpoint: https://overpass.kumi.systems/api/interpreter; method: POST; file_format: overpass_json`.
- **Access:** source file marks this public/no-auth; verify current terms and practical limits.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** "Open Infrastructure Map — global power infrastructure from OpenStreetMap. ODbL 1.0 (data) + MIT (code).\.

### 48. `wikidata_power_plants` — Wikidata — Global Power Infrastructure (SPARQL)

- **Get:** [publisher/site](https://www.wikidata.org); API/download base: [https://query.wikidata.org/sparql](https://query.wikidata.org/sparql).
- **Initial scope:** `sparql_power_plants; endpoint: https://query.wikidata.org/sparql; method: POST; file_format: sparql_json`; `rest_api_lookup; endpoint: https://www.wikidata.org/w/api.php; method: GET; file_format: json`; `bulk_dump; endpoint: https://dumps.wikimedia.org/wikidatawiki/entities/latest-all.json.gz; method: GET; file_format: gz_jsonl`.
- **Access:** source file marks this public/no-auth; verify current terms and practical limits.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** "Wikidata — global power infrastructure via SPARQL. CC0 1.0 (facts) + CC-BY-SA 4.0 (labels). QIDs: Q159719\.

### 49. `climate_trace` — Climate TRACE — Global Per-Asset Emissions Inventory

- **Get:** [publisher/site](https://climatetrace.org); API/download base: [https://climatetrace.org/inventory](https://climatetrace.org/inventory).
- **Initial scope:** `emissions_inventory; endpoint: https://climatetrace.org/data; method: GET; file_format: csv_gz`; `emissions_api; endpoint: https://climatetrace.org/inventory; method: GET; file_format: json`.
- **Access:** source file marks this public/no-auth; verify current terms and practical limits.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** "Climate TRACE (Tracking Real-time Atmospheric Carbon Emissions) — global per-asset emissions inventory.\.

### 50. `iom_dtm` — IOM Displacement Tracking Matrix (DTM)

- **Get:** [publisher/site](https://dtm.iom.int); API/download base: [https://dtm.iom.int/api](https://dtm.iom.int/api).
- **Initial scope:** `country_events; endpoint: https://dtm.iom.int/api/open/v1/event/country; method: GET; file_format: json_paginated`.
- **Access:** source file marks this public/no-auth; verify current terms and practical limits.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** "IOM Displacement Tracking Matrix (DTM) — the global standard for internal-displacement tracking. CC-BY\.

### 51. `unhcr_refugees` — UNHCR Refugee Population Statistics

- **Get:** [publisher/site](https://www.unhcr.org); API/download base: [https://api.unhcr.org/rsq/v1](https://api.unhcr.org/rsq/v1).
- **Initial scope:** `persons_of_concern; endpoint: https://api.unhcr.org/rsq/v1/population; method: GET; file_format: json_paginated`.
- **Access:** source file marks this public/no-auth; verify current terms and practical limits.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** "UNHCR Refugee Statistics (Refugee Data Finder + RSQ API) — persons of concern (refugees, asylum-seekers,\.

### 52. `ofac_sdn` — OFAC Specially Designated Nationals (SDN) List

- **Get:** [publisher/site](https://sanctionssearch.ofac.treas.gov); API/download base: [https://www.treasury.gov/ofac/downloads](https://www.treasury.gov/ofac/downloads).
- **Initial scope:** `sdn_xml; endpoint: https://www.treasury.gov/ofac/downloads/sdn.xml; method: GET; file_format: xml`; `sdn_advanced; endpoint: https://www.treasury.gov/ofac/downloads/sdn_advanced.xml; method: GET; file_format: xml`; `consolidated; endpoint: https://www.treasury.gov/ofac/downloads/consolidated/consolidated.xml; method: GET; file_format: xml`.
- **Access:** source file marks this public/no-auth; verify current terms and practical limits.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** "OFAC Specially Designated Nationals (SDN) List — US Treasury sanctions designations. Public domain (US\.

### 53. `eu_sanctions` — EU Consolidated Financial Sanctions List

- **Get:** [publisher/site](https://www.sanctionsmap.eu); API/download base: [https://webgate.ec.europa.eu/fsd/fsf/public/files](https://webgate.ec.europa.eu/fsd/fsf/public/files).
- **Initial scope:** `fsdl_full; endpoint: https://webgate.ec.europa.eu/fsd/fsf/public/files/cspfullsanlist_1_1.xml; method: GET; file_format: xml`; `fsdl_persons; endpoint: https://webgate.ec.europa.eu/fsd/fsf/public/files/csppersons_1_1.xml; method: GET; file_format: xml`; `fsdl_entities; endpoint: https://webgate.ec.europa.eu/fsd/fsf/public/files/cspentities_1_1.xml; method: GET; file_format: xml`.
- **Access:** source file marks this public/no-auth; verify current terms and practical limits.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** "EU Consolidated Financial Sanctions List — Council of the European Union. CC-BY 4.0. Updated daily. Free\.

### 54. `acled` — ACLED — Armed Conflict Location & Event Data Project

- **Get:** [publisher/site](https://acleddata.com); API/download base: [https://api.acleddata.com/acled/read](https://api.acleddata.com/acled/read).
- **Initial scope:** `events; endpoint: https://api.acleddata.com/acled/read; method: GET; file_format: json_paginated`.
- **Access:** source file indicates key/auth requirement; setting(s): `ACLED_API_KEY`. Store secrets in Harvy Secrets Store and confirm publisher requirements.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** "ACLED — Armed Conflict Location & Event Data Project. Academic license; widely cited. Per-event: date,\.

### 55. `eia_open_data` — U.S. EIA Open Data (Energy Information Administration)

- **Get:** [publisher/site](https://www.eia.gov); API/download base: [https://api.eia.gov/v2](https://api.eia.gov/v2).
- **Initial scope:** `electricity; endpoint: https://api.eia.gov/v2/electricity; method: GET; file_format: json_paginated`; `petroleum; endpoint: https://api.eia.gov/v2/petroleum; method: GET; file_format: json_paginated`; `natural_gas; endpoint: https://api.eia.gov/v2/natural-gas; method: GET; file_format: json_paginated`; `international; endpoint: https://api.eia.gov/v2/international; method: GET; file_format: json_paginated`.
- **Access:** source file indicates key/auth requirement; setting(s): `EIA_API_KEY`. Store secrets in Harvy Secrets Store and confirm publisher requirements.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** U.S. Energy Information Administration Open Data API (api.eia.gov/v2). Public domain (US Government work). 1.3M+.

### 56. `fema_openfema` — FEMA OpenFEMA API

- **Get:** [publisher/site](https://www.fema.gov/api/open/v2); API/download base: [https://www.fema.gov/api/open/v2](https://www.fema.gov/api/open/v2).
- **Initial scope:** `DisasterDeclarationsSummaries; endpoint: https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries`; `HazardMitigationAssistanceProjects; endpoint: https://www.fema.gov/api/open/v2/HazardMitigationAssistanceProjects`; `WebDisasterDeclarations; endpoint: https://www.fema.gov/api/open/v2/WebDisasterDeclarations`; `WebPublicAssistanceFundedProjects; endpoint: https://www.fema.gov/api/open/v2/WebPublicAssistanceFundedProjects`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** FEMA disaster declarations, individual assistance, hazard mitigation grants. Public Domain.

### 57. `mediacloud` — MediaCloud News Aggregation

- **Get:** [publisher/site](https://search.mediacloud.org); API/download base: [https://search.mediacloud.org/api](https://search.mediacloud.org/api).
- **Initial scope:** `story_counts; description: OSINT narrative tracking queries`; `stories; description: Recent stories for top queries`; `collections; description: Media source collections`.
- **Access:** source file indicates key/auth requirement; setting(s): `MEDIACLOUD_API_KEY`. Store secrets in Harvy Secrets Store and confirm publisher requirements.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** MediaCloud provides aggregated news search and analysis. Its Terms of Use describe the service as best suited to academic, nonprofit, and journalistic research, not as a commercial market/brand research tool; they prohibit selling, leasing, or sublicensing platform/API access and do not grant rights to third-party story content. Seek written clarification for any commercial SaaS integration and customer-facing outputs. See [MediaCloud Terms](https://www.mediacloud.org/legal/media-cloud-terms-of-use) and [FAQ](https://www.mediacloud.org/documentation/faqs).

### 58. `reddit` — Reddit OSINT Subreddits

- **Get:** [publisher/site](https://www.reddit.com); API/download base: [https://www.reddit.com](https://www.reddit.com).
- **Initial scope:** `subreddits; description: Hot and top posts from 14 OSINT subreddits`; `trending; description: Trending subreddits`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** Reddit OSINT subreddits (worldnews, geopolitics, osint, intelligence, cybersecurity). Public .json endpoints,.

### 59. `tfl_jamcams` — TfL JamCams (London CCTV)

- **Get:** [publisher/site](https://api.tfl.gov.uk); API/download base: [https://api.tfl.gov.uk/Place/Type/JamCam](https://api.tfl.gov.uk/Place/Type/JamCam).
- **Initial scope:** `jamcams; description: Individual camera metadata with image/video URLs`; `jamcams_bulk; description: Full camera dump for bulk analysis`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** "Transport for London JamCams — 1000+ live traffic cameras with JPEG snapshots and MJPEG streams. Open\.

### 60. `opencorporates` — OpenCorporates Global Corporate Registry

- **Get:** [publisher/site](https://opencorporates.com); API/download base: [https://api.opencorporates.com/v0.4](https://api.opencorporates.com/v0.4).
- **Initial scope:** `companies; description: Company search by jurisdiction and industry`; `jurisdictions; description: Jurisdiction metadata`.
- **Access:** source file indicates key/auth requirement; setting(s): `OPENCORPORATES_API_KEY`. Store secrets in Harvy Secrets Store and confirm publisher requirements.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** OpenCorporates — 200M+ companies across 140+ jurisdictions. Corporate registry search for OSINT investigations.

### 62. `rsshub_news` — RSSHub Global News Aggregator

- **Get:** [publisher/site](https://rsshub.app); API/download base: [https://rsshub.app](https://rsshub.app).
- **Initial scope:** `/google/news/topic/geopolitics; route: /google/news/topic/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx1YlY4U0FtVnVHZ0pWVXlnQVAB`; `/google/news/topic/world; route: /google/news/topic/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtVnVHZ0pWVXlnQVAB`; `/bbc/news; route: /bbc/news`; `/reuters/world; route: /reuters/world`; `/reddit/r/worldnews/hot; route: /reddit/r/worldnews/hot`; `/reddit/r/geopolitics/hot; route: /reddit/r/geopolitics/hot`.
- **Access:** source file indicates key/auth requirement; setting(s): `OSINT_RSSH`, `URL`, `KEY`. Store secrets in Harvy Secrets Store and confirm publisher requirements.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** Global news aggregation via RSSHub — Google News, BBC, Reuters, Reddit.

### 63. `rsshub_cyber` — RSSHub Cybersecurity & OSINT Feeds

- **Get:** [publisher/site](https://rsshub.app); API/download base: [https://rsshub.app](https://rsshub.app).
- **Initial scope:** `/reddit/r/cybersecurity/hot; route: /reddit/r/cybersecurity/hot`; `/reddit/r/osint/hot; route: /reddit/r/osint/hot`; `/threatpost; route: /threatpost`; `/bleepingcomputer; route: /bleepingcomputer`; `/krebsonsecurity; route: /krebsonsecurity`.
- **Access:** source file indicates key/auth requirement; setting(s): `OSINT_RSSH`, `URL`, `KEY`. Store secrets in Harvy Secrets Store and confirm publisher requirements.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** Cybersecurity news and OSINT community feeds via RSSHub.

### 64. `rsshub_disasters` — RSSHub Disasters & Weather Alerts

- **Get:** [publisher/site](https://rsshub.app); API/download base: [https://rsshub.app](https://rsshub.app).
- **Initial scope:** `/fema/disaster; route: /fema/disaster`; `/noaa/weather/alerts; route: /noaa/weather/alerts`.
- **Access:** source file indicates key/auth requirement; setting(s): `OSINT_RSSH`, `URL`, `KEY`. Store secrets in Harvy Secrets Store and confirm publisher requirements.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** Disaster declarations and severe weather alerts via RSSHub.

### 65. `x_congress_senate` — X/Twitter — US Senate (89 accounts)

- **Get:** [publisher/site](https://rsshub.app); API/download base: [https://rsshub.app](https://rsshub.app).
- **Initial scope:** `/twitter/user/SenDanSullivan; route: /twitter/user/SenDanSullivan`; `/twitter/user/LisaMurkowski; route: /twitter/user/LisaMurkowski`; `/twitter/user/SenKatieBritt; route: /twitter/user/SenKatieBritt`; `/twitter/user/SenTuberville; route: /twitter/user/SenTuberville`; `/twitter/user/JohnBoozman; route: /twitter/user/JohnBoozman`; `/twitter/user/SenTomCotton; route: /twitter/user/SenTomCotton`; `/twitter/user/SenMarkKelly; route: /twitter/user/SenMarkKelly`; `/twitter/user/RepRubenGallego; route: /twitter/user/RepRubenGallego`; `/twitter/user/SenAdamSchiff; route: /twitter/user/SenAdamSchiff`; `/twitter/user/SenAlexPadilla; route: /twitter/user/SenAlexPadilla`; `/twitter/user/SenatorHick; route: /twitter/user/SenatorHick`; `/twitter/user/SenatorBennet; route: /twitter/user/SenatorBennet`; `/twitter/user/SenMurphyOffice; route: /twitter/user/SenMurphyOffice`; `/twitter/user/SenBlumenthal; route: /twitter/user/SenBlumenthal`; `/twitter/user/ChrisCoons; route: /twitter/user/ChrisCoons`; `/twitter/user/SenLBR; route: /twitter/user/SenLBR`; `/twitter/user/SenRickScott; route: /twitter/user/SenRickScott`; `/twitter/user/SenOssoff; route: /twitter/user/SenOssoff`; `/twitter/user/SenatorWarnock; route: /twitter/user/SenatorWarnock`; `/twitter/user/SenBrianSchatz; route: /twitter/user/SenBrianSchatz`; `/twitter/user/MazieHirono; route: /twitter/user/MazieHirono`; `/twitter/user/ChuckGrassley; route: /twitter/user/ChuckGrassley`; `/twitter/user/SenJoniErnst; route: /twitter/user/SenJoniErnst`; `/twitter/user/SenatorRisch; route: /twitter/user/SenatorRisch`; `/twitter/user/MikeCrapo; route: /twitter/user/MikeCrapo`; `/twitter/user/SenatorDurbin; route: /twitter/user/SenatorDurbin`; `/twitter/user/SenDuckworth; route: /twitter/user/SenDuckworth`; `/twitter/user/RepJimBanks; route: /twitter/user/RepJimBanks`; `/twitter/user/SenToddYoung; route: /twitter/user/SenToddYoung`; `/twitter/user/JerryMoran; route: /twitter/user/JerryMoran`; `/twitter/user/SenatorMarshall; route: /twitter/user/SenatorMarshall`; `/twitter/user/McConnellPress; route: /twitter/user/McConnellPress`; `/twitter/user/SenRandPaul; route: /twitter/user/SenRandPaul`; `/twitter/user/SenBillCassidy; route: /twitter/user/SenBillCassidy`; `/twitter/user/SenJohnKennedy; route: /twitter/user/SenJohnKennedy`; `/twitter/user/SenMarkey; route: /twitter/user/SenMarkey`; `/twitter/user/SenWarren; route: /twitter/user/SenWarren`; `/twitter/user/ChrisVanHollen; route: /twitter/user/ChrisVanHollen`; `/twitter/user/SenAngusKing; route: /twitter/user/SenAngusKing`; `/twitter/user/SenatorCollins; route: /twitter/user/SenatorCollins`; `/twitter/user/RepSlotkin; route: /twitter/user/RepSlotkin`; `/twitter/user/SenGaryPeters; route: /twitter/user/SenGaryPeters`; `/twitter/user/SenAmyKlobuchar; route: /twitter/user/SenAmyKlobuchar`; `/twitter/user/SenTinaSmith; route: /twitter/user/SenTinaSmith`; `/twitter/user/SenEricSchmitt; route: /twitter/user/SenEricSchmitt`; `/twitter/user/SenHawleyPress; route: /twitter/user/SenHawleyPress`; `/twitter/user/SenHydeSmith; route: /twitter/user/SenHydeSmith`; `/twitter/user/SenatorWicker; route: /twitter/user/SenatorWicker`; `/twitter/user/SteveDaines; route: /twitter/user/SteveDaines`; `/twitter/user/RepTedBudd; route: /twitter/user/RepTedBudd`; `/twitter/user/SenThomTillis; route: /twitter/user/SenThomTillis`; `/twitter/user/SenJohnHoeven; route: /twitter/user/SenJohnHoeven`; `/twitter/user/SenKevinCramer; route: /twitter/user/SenKevinCramer`; `/twitter/user/SenatorFischer; route: /twitter/user/SenatorFischer`; `/twitter/user/SenatorRicketts; route: /twitter/user/SenatorRicketts`; `/twitter/user/SenatorShaheen; route: /twitter/user/SenatorShaheen`; `/twitter/user/SenatorHassan; route: /twitter/user/SenatorHassan`; `/twitter/user/SenBooker; route: /twitter/user/SenBooker`; `/twitter/user/SenatorLujan; route: /twitter/user/SenatorLujan`; `/twitter/user/MartinHeinrich; route: /twitter/user/MartinHeinrich`; `/twitter/user/SenCortezMasto; route: /twitter/user/SenCortezMasto`; `/twitter/user/SenJackyRosen; route: /twitter/user/SenJackyRosen`; `/twitter/user/SenSchumer; route: /twitter/user/SenSchumer`; `/twitter/user/GillibrandNY; route: /twitter/user/GillibrandNY`; `/twitter/user/berniemoreno; route: /twitter/user/berniemoreno`; `/twitter/user/SenatorLankford; route: /twitter/user/SenatorLankford`; `/twitter/user/SenJeffMerkley; route: /twitter/user/SenJeffMerkley`; `/twitter/user/RonWyden; route: /twitter/user/RonWyden`; `/twitter/user/SenJackReed; route: /twitter/user/SenJackReed`; `/twitter/user/SenWhitehouse; route: /twitter/user/SenWhitehouse`; `/twitter/user/SenatorTimScott; route: /twitter/user/SenatorTimScott`; `/twitter/user/SenJohnThune; route: /twitter/user/SenJohnThune`; `/twitter/user/SenatorRounds; route: /twitter/user/SenatorRounds`; `/twitter/user/SenatorHagerty; route: /twitter/user/SenatorHagerty`; `/twitter/user/MarshaBlackburn; route: /twitter/user/MarshaBlackburn`; `/twitter/user/JohnCornyn; route: /twitter/user/JohnCornyn`; `/twitter/user/SenTedCruz; route: /twitter/user/SenTedCruz`; `/twitter/user/RepJohnCurtis; route: /twitter/user/RepJohnCurtis`; `/twitter/user/SenMikeLee; route: /twitter/user/SenMikeLee`; `/twitter/user/MarkWarner; route: /twitter/user/MarkWarner`; `/twitter/user/SenSanders; route: /twitter/user/SenSanders`; `/twitter/user/PeterWelch; route: /twitter/user/PeterWelch`; `/twitter/user/SenatorCantwell; route: /twitter/user/SenatorCantwell`; `/twitter/user/PattyMurray; route: /twitter/user/PattyMurray`; `/twitter/user/SenRonJohnson; route: /twitter/user/SenRonJohnson`; `/twitter/user/SenatorBaldwin; route: /twitter/user/SenatorBaldwin`; `/twitter/user/SenCapito; route: /twitter/user/SenCapito`; `/twitter/user/SenLummis; route: /twitter/user/SenLummis`; `/twitter/user/SenJohnBarrasso; route: /twitter/user/SenJohnBarrasso`.
- **Access:** source file indicates key/auth requirement; setting(s): `OSINT_RSSH`, `URL`, `KEY`. Store secrets in Harvy Secrets Store and confirm publisher requirements.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** All 89 current US Senators with official Twitter/X accounts.

### 66. `x_federal_heads` — X/Twitter — Federal Government Heads (32 accounts)

- **Get:** [publisher/site](https://rsshub.app); API/download base: [https://rsshub.app](https://rsshub.app).
- **Initial scope:** `/twitter/user/realDonaldTrump; route: /twitter/user/realDonaldTrump`; `/twitter/user/VP; route: /twitter/user/VP`; `/twitter/user/marcorubio; route: /twitter/user/marcorubio`; `/twitter/user/SecScottBessent; route: /twitter/user/SecScottBessent`; `/twitter/user/PeteHegseth; route: /twitter/user/PeteHegseth`; `/twitter/user/PamBondi; route: /twitter/user/PamBondi`; `/twitter/user/DougBurgum; route: /twitter/user/DougBurgum`; `/twitter/user/BrookeLRollins; route: /twitter/user/BrookeLRollins`; `/twitter/user/howardlutnick; route: /twitter/user/howardlutnick`; `/twitter/user/LChavezDeRemer; route: /twitter/user/LChavezDeRemer`; `/twitter/user/RobertKennedyJr; route: /twitter/user/RobertKennedyJr`; `/twitter/user/SecretaryTurner; route: /twitter/user/SecretaryTurner`; `/twitter/user/SeanDuffyWI; route: /twitter/user/SeanDuffyWI`; `/twitter/user/ChrisWright_; route: /twitter/user/ChrisWright_`; `/twitter/user/Linda_McMahon; route: /twitter/user/Linda_McMahon`; `/twitter/user/RepDougCollins; route: /twitter/user/RepDougCollins`; `/twitter/user/KristiNoem; route: /twitter/user/KristiNoem`; `/twitter/user/KashPatel; route: /twitter/user/KashPatel`; `/twitter/user/DCIDirector; route: /twitter/user/DCIDirector`; `/twitter/user/TulsiGabbard; route: /twitter/user/TulsiGabbard`; `/twitter/user/RepLeeZeldin; route: /twitter/user/RepLeeZeldin`; `/twitter/user/VivekGRamaswamy; route: /twitter/user/VivekGRamaswamy`; `/twitter/user/elonmusk; route: /twitter/user/elonmusk`; `/twitter/user/SpeakerJohnson; route: /twitter/user/SpeakerJohnson`; `/twitter/user/SteveScalise; route: /twitter/user/SteveScalise`; `/twitter/user/SenJohnThune; route: /twitter/user/SenJohnThune`; `/twitter/user/SenSchumer; route: /twitter/user/SenSchumer`; `/twitter/user/RepJeffries; route: /twitter/user/RepJeffries`.
- **Access:** source file indicates key/auth requirement; setting(s): `OSINT_RSSH`, `URL`, `KEY`. Store secrets in Harvy Secrets Store and confirm publisher requirements.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** Federal government heads — President, Cabinet, agency directors. Trump admin (119th Congress).

### 67. `x_federal_agencies` — X/Twitter — Federal Agencies (50 accounts)

- **Get:** [publisher/site](https://rsshub.app); API/download base: [https://rsshub.app](https://rsshub.app).
- **Initial scope:** `/twitter/user/WhiteHouse; route: /twitter/user/WhiteHouse`; `/twitter/user/POTUS; route: /twitter/user/POTUS`; `/twitter/user/DeptofDefense; route: /twitter/user/DeptofDefense`; `/twitter/user/USArmy; route: /twitter/user/USArmy`; `/twitter/user/USNavy; route: /twitter/user/USNavy`; `/twitter/user/USAirForce; route: /twitter/user/USAirForce`; `/twitter/user/USMC; route: /twitter/user/USMC`; `/twitter/user/SpaceForceDoD; route: /twitter/user/SpaceForceDoD`; `/twitter/user/USCG; route: /twitter/user/USCG`; `/twitter/user/CIA; route: /twitter/user/CIA`; `/twitter/user/FBI; route: /twitter/user/FBI`; `/twitter/user/NSAGov; route: /twitter/user/NSAGov`; `/twitter/user/DIA; route: /twitter/user/DIA`; `/twitter/user/StateDept; route: /twitter/user/StateDept`; `/twitter/user/USAID; route: /twitter/user/USAID`; `/twitter/user/DHSgov; route: /twitter/user/DHSgov`; `/twitter/user/CBP; route: /twitter/user/CBP`; `/twitter/user/ICEgov; route: /twitter/user/ICEgov`; `/twitter/user/SecretService; route: /twitter/user/SecretService`; `/twitter/user/fema; route: /twitter/user/fema`; `/twitter/user/CISAgov; route: /twitter/user/CISAgov`; `/twitter/user/TheJusticeDept; route: /twitter/user/TheJusticeDept`; `/twitter/user/DEAHQ; route: /twitter/user/DEAHQ`; `/twitter/user/ATFHQ; route: /twitter/user/ATFHQ`; `/twitter/user/USTreasury; route: /twitter/user/USTreasury`; `/twitter/user/IRSnews; route: /twitter/user/IRSnews`; `/twitter/user/SECGov; route: /twitter/user/SECGov`; `/twitter/user/federalreserve; route: /twitter/user/federalreserve`; `/twitter/user/FTC; route: /twitter/user/FTC`; `/twitter/user/NASA; route: /twitter/user/NASA`; `/twitter/user/NOAA; route: /twitter/user/NOAA`; `/twitter/user/NWS; route: /twitter/user/NWS`; `/twitter/user/CDCgov; route: /twitter/user/CDCgov`; `/twitter/user/NIH; route: /twitter/user/NIH`; `/twitter/user/US_FDA; route: /twitter/user/US_FDA`; `/twitter/user/EPA; route: /twitter/user/EPA`; `/twitter/user/NASA; route: /twitter/user/NASA`; `/twitter/user/Interior; route: /twitter/user/Interior`; `/twitter/user/NationalParkService; route: /twitter/user/NationalParkService`; `/twitter/user/USGS; route: /twitter/user/USGS`; `/twitter/user/DeptVetAffairs; route: /twitter/user/DeptVetAffairs`; `/twitter/user/SocialSecurity; route: /twitter/user/SocialSecurity`; `/twitter/user/usedgov; route: /twitter/user/usedgov`; `/twitter/user/LaborDept; route: /twitter/user/LaborDept`; `/twitter/user/CommerceGov; route: /twitter/user/CommerceGov`; `/twitter/user/ABORDEnergy; route: /twitter/user/ABORDEnergy`; `/twitter/user/ABORDDOT; route: /twitter/user/ABORDDOT`; `/twitter/user/FAANews; route: /twitter/user/FAANews`; `/twitter/user/NTSB; route: /twitter/user/NTSB`; `/twitter/user/NHTSAgov; route: /twitter/user/NHTSAgov`; `/twitter/user/US_FDA; route: /twitter/user/US_FDA`.
- **Access:** source file indicates key/auth requirement; setting(s): `OSINT_RSSH`, `URL`, `KEY`. Store secrets in Harvy Secrets Store and confirm publisher requirements.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** Official accounts for federal agencies — DOD, FBI, CIA, DHS, NASA, FEMA, etc.

### 68. `x_congress_house_northeast` — X/Twitter — US House (Northeast) (73 accounts)

- **Get:** [publisher/site](https://rsshub.app); API/download base: [https://rsshub.app](https://rsshub.app).
- **Initial scope:** `/twitter/user/RepJahanaHayes; route: /twitter/user/RepJahanaHayes`; `/twitter/user/jahimes; route: /twitter/user/jahimes`; `/twitter/user/RepJoeCourtney; route: /twitter/user/RepJoeCourtney`; `/twitter/user/RepJohnLarson; route: /twitter/user/RepJohnLarson`; `/twitter/user/RosaDeLauro; route: /twitter/user/RosaDeLauro`; `/twitter/user/RepPressley; route: /twitter/user/RepPressley`; `/twitter/user/RepAuchincloss; route: /twitter/user/RepAuchincloss`; `/twitter/user/RepMcGovern; route: /twitter/user/RepMcGovern`; `/twitter/user/RepKClark; route: /twitter/user/RepKClark`; `/twitter/user/RepLoriTrahan; route: /twitter/user/RepLoriTrahan`; `/twitter/user/RepRichardNeal; route: /twitter/user/RepRichardNeal`; `/twitter/user/RepMoulton; route: /twitter/user/RepMoulton`; `/twitter/user/RepStephenLynch; route: /twitter/user/RepStephenLynch`; `/twitter/user/USRepKeating; route: /twitter/user/USRepKeating`; `/twitter/user/ChelliePingree; route: /twitter/user/ChelliePingree`; `/twitter/user/RepGolden; route: /twitter/user/RepGolden`; `/twitter/user/RepChrisPappas; route: /twitter/user/RepChrisPappas`; `/twitter/user/RepGoodlander; route: /twitter/user/RepGoodlander`; `/twitter/user/RepBonnie; route: /twitter/user/RepBonnie`; `/twitter/user/DonaldNorcross; route: /twitter/user/DonaldNorcross`; `/twitter/user/FrankPallone; route: /twitter/user/FrankPallone`; `/twitter/user/RepHerbConaway; route: /twitter/user/RepHerbConaway`; `/twitter/user/Congressman_JVD; route: /twitter/user/Congressman_JVD`; `/twitter/user/RepJoshG; route: /twitter/user/RepJoshG`; `/twitter/user/RepLaMonica; route: /twitter/user/RepLaMonica`; `/twitter/user/caohouse; route: /twitter/user/caohouse`; `/twitter/user/RepMenendez; route: /twitter/user/RepMenendez`; `/twitter/user/CongressmanKean; route: /twitter/user/CongressmanKean`; `/twitter/user/RepEspaillat; route: /twitter/user/RepEspaillat`; `/twitter/user/RepAOC; route: /twitter/user/RepAOC`; `/twitter/user/RepGarbarino; route: /twitter/user/RepGarbarino`; `/twitter/user/RepTenney; route: /twitter/user/RepTenney`; `/twitter/user/RepDanGoldman; route: /twitter/user/RepDanGoldman`; `/twitter/user/RepStefanik; route: /twitter/user/RepStefanik`; `/twitter/user/RepGLatimer; route: /twitter/user/RepGLatimer`; `/twitter/user/RepGraceMeng; route: /twitter/user/RepGraceMeng`; `/twitter/user/RepGregoryMeeks; route: /twitter/user/RepGregoryMeeks`; `/twitter/user/RepJeffries; route: /twitter/user/RepJeffries`; `/twitter/user/RepJerryNadler; route: /twitter/user/RepJerryNadler`; `/twitter/user/JohnMannionNY22; route: /twitter/user/JohnMannionNY22`; `/twitter/user/RepJoeMorelle; route: /twitter/user/RepJoeMorelle`; `/twitter/user/RepLauraGillen; route: /twitter/user/RepLauraGillen`; `/twitter/user/RepMikeLawler; route: /twitter/user/RepMikeLawler`; `/twitter/user/RepLangworthy; route: /twitter/user/RepLangworthy`; `/twitter/user/RepLaLota; route: /twitter/user/RepLaLota`; `/twitter/user/RepMalliotakis; route: /twitter/user/RepMalliotakis`; `/twitter/user/NydiaVelazquez; route: /twitter/user/NydiaVelazquez`; `/twitter/user/RepPatRyanNY; route: /twitter/user/RepPatRyanNY`; `/twitter/user/RepPaulTonko; route: /twitter/user/RepPaulTonko`; `/twitter/user/RepRitchie; route: /twitter/user/RepRitchie`; `/twitter/user/reptomsuozzi; route: /twitter/user/reptomsuozzi`; `/twitter/user/reptimkennedy; route: /twitter/user/reptimkennedy`; `/twitter/user/RepYvetteClarke; route: /twitter/user/RepYvetteClarke`; `/twitter/user/CongBoyle; route: /twitter/user/CongBoyle`; `/twitter/user/RepBrianFitz; route: /twitter/user/RepBrianFitz`; `/twitter/user/RepDeluzio; route: /twitter/user/RepDeluzio`; `/twitter/user/RepHoulahan; route: /twitter/user/RepHoulahan`; `/twitter/user/RepMeuser; route: /twitter/user/RepMeuser`; `/twitter/user/RepDwightEvans; route: /twitter/user/RepDwightEvans`; `/twitter/user/CongressmanGT; route: /twitter/user/CongressmanGT`; `/twitter/user/GReschenthaler; route: /twitter/user/GReschenthaler`; `/twitter/user/RepJohnJoyce; route: /twitter/user/RepJohnJoyce`; `/twitter/user/RepSmucker; route: /twitter/user/RepSmucker`; `/twitter/user/RepDean; route: /twitter/user/RepDean`; `/twitter/user/RepMGS; route: /twitter/user/RepMGS`; `/twitter/user/MikeKellyPA; route: /twitter/user/MikeKellyPA`; `/twitter/user/RepBresnahan; route: /twitter/user/RepBresnahan`; `/twitter/user/RepMackenzie; route: /twitter/user/RepMackenzie`; `/twitter/user/RepScottPerry; route: /twitter/user/RepScottPerry`; `/twitter/user/RepSummerLee; route: /twitter/user/RepSummerLee`; `/twitter/user/RepGabeAmo; route: /twitter/user/RepGabeAmo`; `/twitter/user/Rep_Magaziner; route: /twitter/user/Rep_Magaziner`; `/twitter/user/RepBeccaB; route: /twitter/user/RepBeccaB`.
- **Access:** source file indicates key/auth requirement; setting(s): `OSINT_RSSH`, `URL`, `KEY`. Store secrets in Harvy Secrets Store and confirm publisher requirements.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** US House Representatives (northeast) — 73 members with Twitter/X.

### 69. `x_congress_house_southeast` — X/Twitter — US House (Southeast) (114 accounts)

- **Get:** [publisher/site](https://rsshub.app); API/download base: [https://rsshub.app](https://rsshub.app).
- **Initial scope:** `/twitter/user/RepBarryMoore; route: /twitter/user/RepBarryMoore`; `/twitter/user/RepDaleStrong; route: /twitter/user/RepDaleStrong`; `/twitter/user/USRepGaryPalmer; route: /twitter/user/USRepGaryPalmer`; `/twitter/user/RepMikeRogersAL; route: /twitter/user/RepMikeRogersAL`; `/twitter/user/Robert_Aderholt; route: /twitter/user/Robert_Aderholt`; `/twitter/user/repscfigures; route: /twitter/user/repscfigures`; `/twitter/user/RepTerriSewell; route: /twitter/user/RepTerriSewell`; `/twitter/user/RepWesterman; route: /twitter/user/RepWesterman`; `/twitter/user/RepRickCrawford; route: /twitter/user/RepRickCrawford`; `/twitter/user/RepFrenchHill; route: /twitter/user/RepFrenchHill`; `/twitter/user/Rep_SteveWomack; route: /twitter/user/Rep_SteveWomack`; `/twitter/user/EleanorNorton; route: /twitter/user/EleanorNorton`; `/twitter/user/RepAaronBean; route: /twitter/user/RepAaronBean`; `/twitter/user/RepLuna; route: /twitter/user/RepLuna`; `/twitter/user/RepBrianMast; route: /twitter/user/RepBrianMast`; `/twitter/user/RepDonaldsPress; route: /twitter/user/RepDonaldsPress`; `/twitter/user/RepFranklin; route: /twitter/user/RepFranklin`; `/twitter/user/RepCarlos; route: /twitter/user/RepCarlos`; `/twitter/user/RepMillsPress; route: /twitter/user/RepMillsPress`; `/twitter/user/RepWebster; route: /twitter/user/RepWebster`; `/twitter/user/RepDarrenSoto; route: /twitter/user/RepDarrenSoto`; `/twitter/user/RepDWStweets; route: /twitter/user/RepDWStweets`; `/twitter/user/RepWilson; route: /twitter/user/RepWilson`; `/twitter/user/RepGusBilirakis; route: /twitter/user/RepGusBilirakis`; `/twitter/user/RepMoskowitz; route: /twitter/user/RepMoskowitz`; `/twitter/user/RepRutherfordFL; route: /twitter/user/RepRutherfordFL`; `/twitter/user/RepKatCammack; route: /twitter/user/RepKatCammack`; `/twitter/user/USRepKCastor; route: /twitter/user/USRepKCastor`; `/twitter/user/RepLaurelLee; route: /twitter/user/RepLaurelLee`; `/twitter/user/RepLoisFrankel; route: /twitter/user/RepLoisFrankel`; `/twitter/user/RepMariaSalazar; route: /twitter/user/RepMariaSalazar`; `/twitter/user/MarioDB; route: /twitter/user/MarioDB`; `/twitter/user/RepMaxwellFrost; route: /twitter/user/RepMaxwellFrost`; `/twitter/user/repharidopolos; route: /twitter/user/repharidopolos`; `/twitter/user/DrNealDunnFL2; route: /twitter/user/DrNealDunnFL2`; `/twitter/user/VernBuchanan; route: /twitter/user/VernBuchanan`; `/twitter/user/RepGregSteube; route: /twitter/user/RepGregSteube`; `/twitter/user/Rep_Clyde; route: /twitter/user/Rep_Clyde`; `/twitter/user/AustinScottGA08; route: /twitter/user/AustinScottGA08`; `/twitter/user/RepLoudermilk; route: /twitter/user/RepLoudermilk`; `/twitter/user/RepBrianJack; route: /twitter/user/RepBrianJack`; `/twitter/user/RepBuddyCarter; route: /twitter/user/RepBuddyCarter`; `/twitter/user/RepHankJohnson; route: /twitter/user/RepHankJohnson`; `/twitter/user/RepLucyMcBath; route: /twitter/user/RepLucyMcBath`; `/twitter/user/RepMikeCollins; route: /twitter/user/RepMikeCollins`; `/twitter/user/RepNikema; route: /twitter/user/RepNikema`; `/twitter/user/RepMcCormick; route: /twitter/user/RepMcCormick`; `/twitter/user/RepRickAllen; route: /twitter/user/RepRickAllen`; `/twitter/user/SanfordBishop; route: /twitter/user/SanfordBishop`; `/twitter/user/RepGuthrie; route: /twitter/user/RepGuthrie`; `/twitter/user/RepAndyBarr; route: /twitter/user/RepAndyBarr`; `/twitter/user/RepHalRogers; route: /twitter/user/RepHalRogers`; `/twitter/user/RepJamesComer; route: /twitter/user/RepJamesComer`; `/twitter/user/RepMcGarvey; route: /twitter/user/RepMcGarvey`; `/twitter/user/RepThomasMassie; route: /twitter/user/RepThomasMassie`; `/twitter/user/RepClayHiggins; route: /twitter/user/RepClayHiggins`; `/twitter/user/repfields; route: /twitter/user/repfields`; `/twitter/user/RepJuliaLetlow; route: /twitter/user/RepJuliaLetlow`; `/twitter/user/RepMikeJohnson; route: /twitter/user/RepMikeJohnson`; `/twitter/user/SteveScalise; route: /twitter/user/SteveScalise`; `/twitter/user/RepTroyCarter; route: /twitter/user/RepTroyCarter`; `/twitter/user/RepAndyHarrisMD; route: /twitter/user/RepAndyHarrisMD`; `/twitter/user/RepAprilDelaney; route: /twitter/user/RepAprilDelaney`; `/twitter/user/RepGlennIvey; route: /twitter/user/RepGlennIvey`; `/twitter/user/RepRaskin; route: /twitter/user/RepRaskin`; `/twitter/user/RepJohnnyO; route: /twitter/user/RepJohnnyO`; `/twitter/user/RepKweisiMfume; route: /twitter/user/RepKweisiMfume`; `/twitter/user/repsarahelfreth; route: /twitter/user/repsarahelfreth`; `/twitter/user/RepStenyHoyer; route: /twitter/user/RepStenyHoyer`; `/twitter/user/BennieGThompson; route: /twitter/user/BennieGThompson`; `/twitter/user/RepMichaelGuest; route: /twitter/user/RepMichaelGuest`; `/twitter/user/RepEzell; route: /twitter/user/RepEzell`; `/twitter/user/RepTrentKelly; route: /twitter/user/RepTrentKelly`; `/twitter/user/RepMcDowell; route: /twitter/user/RepMcDowell`; `/twitter/user/RepAdams; route: /twitter/user/RepAdams`; `/twitter/user/RepKnott; route: /twitter/user/RepKnott`; `/twitter/user/RepEdwards; route: /twitter/user/RepEdwards`; `/twitter/user/RepDavidRouzer; route: /twitter/user/RepDavidRouzer`; `/twitter/user/RepDeborahRoss; route: /twitter/user/RepDeborahRoss`; `/twitter/user/RepDonDavis; route: /twitter/user/RepDonDavis`; `/twitter/user/RepGregMurphy; route: /twitter/user/RepGregMurphy`; `/twitter/user/RepMarkHarrisNC; route: /twitter/user/RepMarkHarrisNC`; `/twitter/user/RepPatHarrigan; route: /twitter/user/RepPatHarrigan`; `/twitter/user/RepRichHudson; route: /twitter/user/RepRichHudson`; `/twitter/user/RepTimMooreNC; route: /twitter/user/RepTimMooreNC`; `/twitter/user/ValerieFoushee; route: /twitter/user/ValerieFoushee`; `/twitter/user/VirginiaFoxx; route: /twitter/user/VirginiaFoxx`; `/twitter/user/RepJamesClyburn; route: /twitter/user/RepJamesClyburn`; `/twitter/user/RepJoeWilson; route: /twitter/user/RepJoeWilson`; `/twitter/user/RepNancyMace; route: /twitter/user/RepNancyMace`; `/twitter/user/RepRalphNorman; route: /twitter/user/RepRalphNorman`; `/twitter/user/RepRussellFry; route: /twitter/user/RepRussellFry`; `/twitter/user/repsheribiggs; route: /twitter/user/repsheribiggs`; `/twitter/user/RepTimmons; route: /twitter/user/RepTimmons`; `/twitter/user/repogles; route: /twitter/user/repogles`; `/twitter/user/RepChuck; route: /twitter/user/RepChuck`; `/twitter/user/RepDavidKustoff; route: /twitter/user/RepDavidKustoff`; `/twitter/user/RepHarshbarger; route: /twitter/user/RepHarshbarger`; `/twitter/user/RepJohnRose; route: /twitter/user/RepJohnRose`; `/twitter/user/DesJarlaisTN04; route: /twitter/user/DesJarlaisTN04`; `/twitter/user/RepCohen; route: /twitter/user/RepCohen`; `/twitter/user/RepTimBurchett; route: /twitter/user/RepTimBurchett`; `/twitter/user/RepBenCline; route: /twitter/user/RepBenCline`; `/twitter/user/RepDonBeyer; route: /twitter/user/RepDonBeyer`; `/twitter/user/RepVindman; route: /twitter/user/RepVindman`; `/twitter/user/RepMGriffith; route: /twitter/user/RepMGriffith`; `/twitter/user/RepJenKiggans; route: /twitter/user/RepJenKiggans`; `/twitter/user/RepMcClellan; route: /twitter/user/RepMcClellan`; `/twitter/user/RepJohnMcGuire; route: /twitter/user/RepJohnMcGuire`; `/twitter/user/BobbyScott; route: /twitter/user/BobbyScott`; `/twitter/user/RobWittman; route: /twitter/user/RobWittman`; `/twitter/user/RepSuhas; route: /twitter/user/RepSuhas`; `/twitter/user/RepCarolMiller; route: /twitter/user/RepCarolMiller`; `/twitter/user/RepRileyMoore; route: /twitter/user/RepRileyMoore`.
- **Access:** source file indicates key/auth requirement; setting(s): `OSINT_RSSH`, `URL`, `KEY`. Store secrets in Harvy Secrets Store and confirm publisher requirements.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** US House Representatives (southeast) — 114 members with Twitter/X.

### 70. `x_congress_house_midwest` — X/Twitter — US House (Midwest) (88 accounts)

- **Get:** [publisher/site](https://rsshub.app); API/download base: [https://rsshub.app](https://rsshub.app).
- **Initial scope:** `/twitter/user/RepAshleyHinson; route: /twitter/user/RepAshleyHinson`; `/twitter/user/RepMMM; route: /twitter/user/RepMMM`; `/twitter/user/RepFeenstra; route: /twitter/user/RepFeenstra`; `/twitter/user/ZachNunn; route: /twitter/user/ZachNunn`; `/twitter/user/RepBillFoster; route: /twitter/user/RepBillFoster`; `/twitter/user/RepSchneider; route: /twitter/user/RepSchneider`; `/twitter/user/RepDannyDavis; route: /twitter/user/RepDannyDavis`; `/twitter/user/RepLaHood; route: /twitter/user/RepLaHood`; `/twitter/user/repdeliaramirez; route: /twitter/user/repdeliaramirez`; `/twitter/user/RepEricSorensen; route: /twitter/user/RepEricSorensen`; `/twitter/user/JanSchakowsky; route: /twitter/user/JanSchakowsky`; `/twitter/user/RepChuyGarcia; route: /twitter/user/RepChuyGarcia`; `/twitter/user/RepUnderwood; route: /twitter/user/RepUnderwood`; `/twitter/user/RepMaryMiller; route: /twitter/user/RepMaryMiller`; `/twitter/user/RepBost; route: /twitter/user/RepBost`; `/twitter/user/RepMikeQuigley; route: /twitter/user/RepMikeQuigley`; `/twitter/user/RepNikkiB; route: /twitter/user/RepNikkiB`; `/twitter/user/CongressmanRaja; route: /twitter/user/CongressmanRaja`; `/twitter/user/RepRobinKelly; route: /twitter/user/RepRobinKelly`; `/twitter/user/RepCasten; route: /twitter/user/RepCasten`; `/twitter/user/RepAndreCarson; route: /twitter/user/RepAndreCarson`; `/twitter/user/RepHouchin; route: /twitter/user/RepHouchin`; `/twitter/user/RepMrvan; route: /twitter/user/RepMrvan`; `/twitter/user/RepJimBaird; route: /twitter/user/RepJimBaird`; `/twitter/user/repshreve; route: /twitter/user/repshreve`; `/twitter/user/RepStutzman; route: /twitter/user/RepStutzman`; `/twitter/user/RepRudyYakym; route: /twitter/user/RepRudyYakym`; `/twitter/user/RepSpartz; route: /twitter/user/RepSpartz`; `/twitter/user/repderekschmidt; route: /twitter/user/repderekschmidt`; `/twitter/user/RepRonEstes; route: /twitter/user/RepRonEstes`; `/twitter/user/RepDavids; route: /twitter/user/RepDavids`; `/twitter/user/RepMann; route: /twitter/user/RepMann`; `/twitter/user/RepHuizenga; route: /twitter/user/RepHuizenga`; `/twitter/user/RepDebDingell; route: /twitter/user/RepDebDingell`; `/twitter/user/RepHaleyStevens; route: /twitter/user/RepHaleyStevens`; `/twitter/user/RepScholten; route: /twitter/user/RepScholten`; `/twitter/user/RepJackBergman; route: /twitter/user/RepJackBergman`; `/twitter/user/RepJames; route: /twitter/user/RepJames`; `/twitter/user/RepMoolenaar; route: /twitter/user/RepMoolenaar`; `/twitter/user/repkmr; route: /twitter/user/repkmr`; `/twitter/user/RepLisaMcClain; route: /twitter/user/RepLisaMcClain`; `/twitter/user/RepRashida; route: /twitter/user/RepRashida`; `/twitter/user/RepShriThanedar; route: /twitter/user/RepShriThanedar`; `/twitter/user/RepWalberg; route: /twitter/user/RepWalberg`; `/twitter/user/reptombarrett; route: /twitter/user/reptombarrett`; `/twitter/user/RepAngieCraig; route: /twitter/user/RepAngieCraig`; `/twitter/user/BettyMcCollum04; route: /twitter/user/BettyMcCollum04`; `/twitter/user/RepFinstad; route: /twitter/user/RepFinstad`; `/twitter/user/Ilhan; route: /twitter/user/Ilhan`; `/twitter/user/kellymorrisonmn; route: /twitter/user/kellymorrisonmn`; `/twitter/user/RepFischbach; route: /twitter/user/RepFischbach`; `/twitter/user/RepPeteStauber; route: /twitter/user/RepPeteStauber`; `/twitter/user/RepTomEmmer; route: /twitter/user/RepTomEmmer`; `/twitter/user/RepAnnWagner; route: /twitter/user/RepAnnWagner`; `/twitter/user/RepCleaver; route: /twitter/user/RepCleaver`; `/twitter/user/RepEricBurlison; route: /twitter/user/RepEricBurlison`; `/twitter/user/RepJasonSmith; route: /twitter/user/RepJasonSmith`; `/twitter/user/RepMarkAlford; route: /twitter/user/RepMarkAlford`; `/twitter/user/RepBobOnder; route: /twitter/user/RepBobOnder`; `/twitter/user/RepSamGraves; route: /twitter/user/RepSamGraves`; `/twitter/user/RepWesleyBellMO; route: /twitter/user/RepWesleyBellMO`; `/twitter/user/RepFedorchak; route: /twitter/user/RepFedorchak`; `/twitter/user/RepAdrianSmith; route: /twitter/user/RepAdrianSmith`; `/twitter/user/RepDonBacon; route: /twitter/user/RepDonBacon`; `/twitter/user/USRepMikeFlood; route: /twitter/user/USRepMikeFlood`; `/twitter/user/RepDaveJoyce; route: /twitter/user/RepDaveJoyce`; `/twitter/user/RepDaveTaylor; route: /twitter/user/RepDaveTaylor`; `/twitter/user/RepEmiliaSykes; route: /twitter/user/RepEmiliaSykes`; `/twitter/user/repgreglandsman; route: /twitter/user/repgreglandsman`; `/twitter/user/Jim_Jordan; route: /twitter/user/Jim_Jordan`; `/twitter/user/RepBeatty; route: /twitter/user/RepBeatty`; `/twitter/user/RepMarcyKaptur; route: /twitter/user/RepMarcyKaptur`; `/twitter/user/repmaxmiller; route: /twitter/user/repmaxmiller`; `/twitter/user/RepMikeTurner; route: /twitter/user/RepMikeTurner`; `/twitter/user/RepMikeCarey; route: /twitter/user/RepMikeCarey`; `/twitter/user/BobLatta; route: /twitter/user/BobLatta`; `/twitter/user/RepShontelBrown; route: /twitter/user/RepShontelBrown`; `/twitter/user/RepBalderson; route: /twitter/user/RepBalderson`; `/twitter/user/WarrenDavidson; route: /twitter/user/WarrenDavidson`; `/twitter/user/RepDustyJohnson; route: /twitter/user/RepDustyJohnson`; `/twitter/user/RepBryanSteil; route: /twitter/user/RepBryanSteil`; `/twitter/user/RepVanOrden; route: /twitter/user/RepVanOrden`; `/twitter/user/RepGrothman; route: /twitter/user/RepGrothman`; `/twitter/user/RepGwenMoore; route: /twitter/user/RepGwenMoore`; `/twitter/user/RepMarkPocan; route: /twitter/user/RepMarkPocan`; `/twitter/user/RepFitzgerald; route: /twitter/user/RepFitzgerald`; `/twitter/user/RepTiffany; route: /twitter/user/RepTiffany`; `/twitter/user/RepTonyWied; route: /twitter/user/RepTonyWied`.
- **Access:** source file indicates key/auth requirement; setting(s): `OSINT_RSSH`, `URL`, `KEY`. Store secrets in Harvy Secrets Store and confirm publisher requirements.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** US House Representatives (midwest) — 88 members with Twitter/X.

### 71. `x_congress_house_west` — X/Twitter — US House (West) (136 accounts)

- **Get:** [publisher/site](https://rsshub.app); API/download base: [https://rsshub.app](https://rsshub.app).
- **Initial scope:** `/twitter/user/repnickbegich; route: /twitter/user/repnickbegich`; `/twitter/user/RepAndyBiggsAZ; route: /twitter/user/RepAndyBiggsAZ`; `/twitter/user/RepDavid; route: /twitter/user/RepDavid`; `/twitter/user/RepEliCrane; route: /twitter/user/RepEliCrane`; `/twitter/user/RepGregStanton; route: /twitter/user/RepGregStanton`; `/twitter/user/RepCiscomani; route: /twitter/user/RepCiscomani`; `/twitter/user/RepGosar; route: /twitter/user/RepGosar`; `/twitter/user/RepYassAnsari; route: /twitter/user/RepYassAnsari`; `/twitter/user/RepAdamGrayCA; route: /twitter/user/RepAdamGrayCA`; `/twitter/user/RepBera; route: /twitter/user/RepBera`; `/twitter/user/BradSherman; route: /twitter/user/BradSherman`; `/twitter/user/repdarrellissa; route: /twitter/user/repdarrellissa`; `/twitter/user/RepDavidValadao; route: /twitter/user/RepDavidValadao`; `/twitter/user/DorisMatsui; route: /twitter/user/DorisMatsui`; `/twitter/user/Rep_Whitesides; route: /twitter/user/Rep_Whitesides`; `/twitter/user/RepLouCorrea; route: /twitter/user/RepLouCorrea`; `/twitter/user/RepHuffman; route: /twitter/user/RepHuffman`; `/twitter/user/JayObernolte; route: /twitter/user/JayObernolte`; `/twitter/user/RepJimCosta; route: /twitter/user/RepJimCosta`; `/twitter/user/RepJimmyGomez; route: /twitter/user/RepJimmyGomez`; `/twitter/user/RepJimmyPanetta; route: /twitter/user/RepJimmyPanetta`; `/twitter/user/RepGaramendi; route: /twitter/user/RepGaramendi`; `/twitter/user/RepJoshHarder; route: /twitter/user/RepJoshHarder`; `/twitter/user/RepJuanVargas; route: /twitter/user/RepJuanVargas`; `/twitter/user/RepJudyChu; route: /twitter/user/RepJudyChu`; `/twitter/user/RepBrownley; route: /twitter/user/RepBrownley`; `/twitter/user/KenCalvert; route: /twitter/user/KenCalvert`; `/twitter/user/RepKiley; route: /twitter/user/RepKiley`; `/twitter/user/RepKevinMullin; route: /twitter/user/RepKevinMullin`; `/twitter/user/RepLSimon; route: /twitter/user/RepLSimon`; `/twitter/user/RepFriedmanCA; route: /twitter/user/RepFriedmanCA`; `/twitter/user/RepLindaSanchez; route: /twitter/user/RepLindaSanchez`; `/twitter/user/RepLuzRivas; route: /twitter/user/RepLuzRivas`; `/twitter/user/RepDeSaulnier; route: /twitter/user/RepDeSaulnier`; `/twitter/user/RepMarkTakano; route: /twitter/user/RepMarkTakano`; `/twitter/user/RepMaxineWaters; route: /twitter/user/RepMaxineWaters`; `/twitter/user/RepMikeLevin; route: /twitter/user/RepMikeLevin`; `/twitter/user/RepThompson; route: /twitter/user/RepThompson`; `/twitter/user/SpeakerPelosi; route: /twitter/user/SpeakerPelosi`; `/twitter/user/RepBarragan; route: /twitter/user/RepBarragan`; `/twitter/user/NormaJTorres; route: /twitter/user/NormaJTorres`; `/twitter/user/RepPeteAguilar; route: /twitter/user/RepPeteAguilar`; `/twitter/user/RepRaulRuizMD; route: /twitter/user/RepRaulRuizMD`; `/twitter/user/RepRoKhanna; route: /twitter/user/RepRoKhanna`; `/twitter/user/RepRobertGarcia; route: /twitter/user/RepRobertGarcia`; `/twitter/user/RepCarbajal; route: /twitter/user/RepCarbajal`; `/twitter/user/repliccardo; route: /twitter/user/repliccardo`; `/twitter/user/RepSaraJacobs; route: /twitter/user/RepSaraJacobs`; `/twitter/user/RepScottPeters; route: /twitter/user/RepScottPeters`; `/twitter/user/RepKamlagerDove; route: /twitter/user/RepKamlagerDove`; `/twitter/user/RepTedLieu; route: /twitter/user/RepTedLieu`; `/twitter/user/RepMcClintock; route: /twitter/user/RepMcClintock`; `/twitter/user/RepVinceFong; route: /twitter/user/RepVinceFong`; `/twitter/user/RepYoungKim; route: /twitter/user/RepYoungKim`; `/twitter/user/RepZoeLofgren; route: /twitter/user/RepZoeLofgren`; `/twitter/user/reppettersen; route: /twitter/user/reppettersen`; `/twitter/user/RepDianaDeGette; route: /twitter/user/RepDianaDeGette`; `/twitter/user/repgabeevans; route: /twitter/user/repgabeevans`; `/twitter/user/RepJasonCrow; route: /twitter/user/RepJasonCrow`; `/twitter/user/RepJeffCrank; route: /twitter/user/RepJeffCrank`; `/twitter/user/RepJeffHurd; route: /twitter/user/RepJeffHurd`; `/twitter/user/RepJoeNeguse; route: /twitter/user/RepJoeNeguse`; `/twitter/user/RepBoebert; route: /twitter/user/RepBoebert`; `/twitter/user/RepEdCase; route: /twitter/user/RepEdCase`; `/twitter/user/RepJillTokuda; route: /twitter/user/RepJillTokuda`; `/twitter/user/CongMikeSimpson; route: /twitter/user/CongMikeSimpson`; `/twitter/user/RepRussFulcher; route: /twitter/user/RepRussFulcher`; `/twitter/user/RepRyanZinke; route: /twitter/user/RepRyanZinke`; `/twitter/user/reptroydowning; route: /twitter/user/reptroydowning`; `/twitter/user/RepGabeVasquez; route: /twitter/user/RepGabeVasquez`; `/twitter/user/Rep_Stansbury; route: /twitter/user/Rep_Stansbury`; `/twitter/user/RepTeresaLF; route: /twitter/user/RepTeresaLF`; `/twitter/user/RepDinaTitus; route: /twitter/user/RepDinaTitus`; `/twitter/user/MarkAmodeiNV2; route: /twitter/user/MarkAmodeiNV2`; `/twitter/user/RepHorsford; route: /twitter/user/RepHorsford`; `/twitter/user/RepSusieLee; route: /twitter/user/RepSusieLee`; `/twitter/user/RepFrankLucas; route: /twitter/user/RepFrankLucas`; `/twitter/user/repbrecheen; route: /twitter/user/repbrecheen`; `/twitter/user/repkevinhern; route: /twitter/user/repkevinhern`; `/twitter/user/RepBice; route: /twitter/user/RepBice`; `/twitter/user/TomColeOK04; route: /twitter/user/TomColeOK04`; `/twitter/user/repsalinas; route: /twitter/user/repsalinas`; `/twitter/user/RepBentz; route: /twitter/user/RepBentz`; `/twitter/user/RepBynum; route: /twitter/user/RepBynum`; `/twitter/user/RepDexterOR; route: /twitter/user/RepDexterOR`; `/twitter/user/RepBonamici; route: /twitter/user/RepBonamici`; `/twitter/user/repvalhoyle; route: /twitter/user/repvalhoyle`; `/twitter/user/RepAlGreen; route: /twitter/user/RepAlGreen`; `/twitter/user/RepPfluger; route: /twitter/user/RepPfluger`; `/twitter/user/RepBethVanDuyne; route: /twitter/user/RepBethVanDuyne`; `/twitter/user/repbrandongill; route: /twitter/user/repbrandongill`; `/twitter/user/RepBrianBabin; route: /twitter/user/RepBrianBabin`; `/twitter/user/RepChipRoy; route: /twitter/user/RepChipRoy`; `/twitter/user/RepCraigGoldman; route: /twitter/user/RepCraigGoldman`; `/twitter/user/RepDanCrenshaw; route: /twitter/user/RepDanCrenshaw`; `/twitter/user/RepCasar; route: /twitter/user/RepCasar`; `/twitter/user/RepCuellar; route: /twitter/user/RepCuellar`; `/twitter/user/RepEllzey; route: /twitter/user/RepEllzey`; `/twitter/user/RepJasmine; route: /twitter/user/RepJasmine`; `/twitter/user/JoaquinCastrotx; route: /twitter/user/JoaquinCastrotx`; `/twitter/user/RepArrington; route: /twitter/user/RepArrington`; `/twitter/user/JudgeCarter; route: /twitter/user/JudgeCarter`; `/twitter/user/RepJulieJohnson; route: /twitter/user/RepJulieJohnson`; `/twitter/user/repkeithself; route: /twitter/user/repkeithself`; `/twitter/user/RepFletcher; route: /twitter/user/RepFletcher`; `/twitter/user/RepLloydDoggett; route: /twitter/user/RepLloydDoggett`; `/twitter/user/RepVeasey; route: /twitter/user/RepVeasey`; `/twitter/user/RepCloudTX; route: /twitter/user/RepCloudTX`; `/twitter/user/RepMcCaul; route: /twitter/user/RepMcCaul`; `/twitter/user/RepLuttrell; route: /twitter/user/RepLuttrell`; `/twitter/user/RepMonicaDLC; route: /twitter/user/RepMonicaDLC`; `/twitter/user/RepNateMoran; route: /twitter/user/RepNateMoran`; `/twitter/user/RepPatFallon; route: /twitter/user/RepPatFallon`; `/twitter/user/PeteSessions; route: /twitter/user/PeteSessions`; `/twitter/user/TXRandy14; route: /twitter/user/TXRandy14`; `/twitter/user/RepRWilliams; route: /twitter/user/RepRWilliams`; `/twitter/user/RepRonnyJackson; route: /twitter/user/RepRonnyJackson`; `/twitter/user/RepSylviaGarcia; route: /twitter/user/RepSylviaGarcia`; `/twitter/user/RepTroyNehls; route: /twitter/user/RepTroyNehls`; `/twitter/user/RepEscobar; route: /twitter/user/RepEscobar`; `/twitter/user/RepGonzalez; route: /twitter/user/RepGonzalez`; `/twitter/user/RepWesleyHunt; route: /twitter/user/RepWesleyHunt`; `/twitter/user/RepBlakeMoore; route: /twitter/user/RepBlakeMoore`; `/twitter/user/RepMaloyUtah; route: /twitter/user/RepMaloyUtah`; `/twitter/user/RepBurgessOwens; route: /twitter/user/RepBurgessOwens`; `/twitter/user/repmikekennedy; route: /twitter/user/repmikekennedy`; `/twitter/user/RepAdamSmith; route: /twitter/user/RepAdamSmith`; `/twitter/user/RepNewhouse; route: /twitter/user/RepNewhouse`; `/twitter/user/RepKimSchrier; route: /twitter/user/RepKimSchrier`; `/twitter/user/RepMGP; route: /twitter/user/RepMGP`; `/twitter/user/RepStricklandWA; route: /twitter/user/RepStricklandWA`; `/twitter/user/repbaumgartner; route: /twitter/user/repbaumgartner`; `/twitter/user/RepJayapal; route: /twitter/user/RepJayapal`; `/twitter/user/RepRickLarsen; route: /twitter/user/RepRickLarsen`; `/twitter/user/RepDelBene; route: /twitter/user/RepDelBene`; `/twitter/user/RepHageman; route: /twitter/user/RepHageman`.
- **Access:** source file indicates key/auth requirement; setting(s): `OSINT_RSSH`, `URL`, `KEY`. Store secrets in Harvy Secrets Store and confirm publisher requirements.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** US House Representatives (west) — 136 members with Twitter/X.

### 72. `x_gov_uk` — X/Twitter — United Kingdom Government (23 accounts)

- **Get:** [publisher/site](https://rsshub.app); API/download base: [https://rsshub.app](https://rsshub.app).
- **Initial scope:** `/twitter/user/Keir_Starmer; route: /twitter/user/Keir_Starmer`; `/twitter/user/AngelaRayner; route: /twitter/user/AngelaRayner`; `/twitter/user/RachelReevesMP; route: /twitter/user/RachelReevesMP`; `/twitter/user/DavidLammy; route: /twitter/user/DavidLammy`; `/twitter/user/YvetteCooperMP; route: /twitter/user/YvetteCooperMP`; `/twitter/user/JohnHealey_MP; route: /twitter/user/JohnHealey_MP`; `/twitter/user/WesStreeting; route: /twitter/user/WesStreeting`; `/twitter/user/bphillipsonMP; route: /twitter/user/bphillipsonMP`; `/twitter/user/Ed_Miliband; route: /twitter/user/Ed_Miliband`; `/twitter/user/ShabanaMahmood; route: /twitter/user/ShabanaMahmood`; `/twitter/user/lisanandy; route: /twitter/user/lisanandy`; `/twitter/user/JReynoldsMP; route: /twitter/user/JReynoldsMP`; `/twitter/user/LizKendall; route: /twitter/user/LizKendall`; `/twitter/user/SteveReedMP; route: /twitter/user/SteveReedMP`; `/twitter/user/LouHaigh; route: /twitter/user/LouHaigh`; `/twitter/user/PatMcFaddenMP; route: /twitter/user/PatMcFaddenMP`; `/twitter/user/LucyMPowell; route: /twitter/user/LucyMPowell`; `/twitter/user/RishiSunak; route: /twitter/user/RishiSunak`; `/twitter/user/KemiBadenoch; route: /twitter/user/KemiBadenoch`; `/twitter/user/CommonsSpeaker; route: /twitter/user/CommonsSpeaker`; `/twitter/user/HouseofCommons; route: /twitter/user/HouseofCommons`; `/twitter/user/UKHouseofLords; route: /twitter/user/UKHouseofLords`; `/twitter/user/UKParliament; route: /twitter/user/UKParliament`.
- **Access:** source file indicates key/auth requirement; setting(s): `OSINT_RSSH`, `URL`, `KEY`. Store secrets in Harvy Secrets Store and confirm publisher requirements.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** United Kingdom government officials — executive, cabinet, parliament leadership.

### 73. `x_agencies_uk` — X/Twitter — United Kingdom Agencies (22 accounts)

- **Get:** [publisher/site](https://rsshub.app); API/download base: [https://rsshub.app](https://rsshub.app).
- **Initial scope:** `/twitter/user/10DowningStreet; route: /twitter/user/10DowningStreet`; `/twitter/user/hmtreasury; route: /twitter/user/hmtreasury`; `/twitter/user/FCDOgovUK; route: /twitter/user/FCDOgovUK`; `/twitter/user/ukhomeoffice; route: /twitter/user/ukhomeoffice`; `/twitter/user/DefenceHQ; route: /twitter/user/DefenceHQ`; `/twitter/user/BritishArmy; route: /twitter/user/BritishArmy`; `/twitter/user/RoyalNavy; route: /twitter/user/RoyalNavy`; `/twitter/user/RoyalAirForce; route: /twitter/user/RoyalAirForce`; `/twitter/user/MI5; route: /twitter/user/MI5`; `/twitter/user/SIS; route: /twitter/user/SIS`; `/twitter/user/GCHQ; route: /twitter/user/GCHQ`; `/twitter/user/NHSEngland; route: /twitter/user/NHSEngland`; `/twitter/user/MetPoliceUK; route: /twitter/user/MetPoliceUK`; `/twitter/user/NCA_UK; route: /twitter/user/NCA_UK`; `/twitter/user/cabinetofficeuk; route: /twitter/user/cabinetofficeuk`; `/twitter/user/educationgovuk; route: /twitter/user/educationgovuk`; `/twitter/user/NHS; route: /twitter/user/NHS`; `/twitter/user/UKCivilService; route: /twitter/user/UKCivilService`; `/twitter/user/GOVUK; route: /twitter/user/GOVUK`; `/twitter/user/BBCNews; route: /twitter/user/BBCNews`; `/twitter/user/BBCBreaking; route: /twitter/user/BBCBreaking`; `/twitter/user/SkyNews; route: /twitter/user/SkyNews`.
- **Access:** source file indicates key/auth requirement; setting(s): `OSINT_RSSH`, `URL`, `KEY`. Store secrets in Harvy Secrets Store and confirm publisher requirements.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** United Kingdom government agencies — defense, intelligence, law enforcement, health, etc.

### 74. `x_gov_scotland` — X/Twitter — Scotland Government (15 accounts)

- **Get:** [publisher/site](https://rsshub.app); API/download base: [https://rsshub.app](https://rsshub.app).
- **Initial scope:** `/twitter/user/JohnSwinney; route: /twitter/user/JohnSwinney`; `/twitter/user/KateForbesMSP; route: /twitter/user/KateForbesMSP`; `/twitter/user/SRobisonSNP; route: /twitter/user/SRobisonSNP`; `/twitter/user/JennyGilruth; route: /twitter/user/JennyGilruth`; `/twitter/user/neilgrayMSP; route: /twitter/user/neilgrayMSP`; `/twitter/user/MairiGougeon; route: /twitter/user/MairiGougeon`; `/twitter/user/AngusRobertson; route: /twitter/user/AngusRobertson`; `/twitter/user/FionaHyslopMSP; route: /twitter/user/FionaHyslopMSP`; `/twitter/user/S_A_Somerville; route: /twitter/user/S_A_Somerville`; `/twitter/user/ScotParl; route: /twitter/user/ScotParl`; `/twitter/user/scotgov; route: /twitter/user/scotgov`; `/twitter/user/RussellFindlay1; route: /twitter/user/RussellFindlay1`; `/twitter/user/AnasSarwar; route: /twitter/user/AnasSarwar`; `/twitter/user/agcolehamilton; route: /twitter/user/agcolehamilton`; `/twitter/user/lornaslater; route: /twitter/user/lornaslater`.
- **Access:** source file indicates key/auth requirement; setting(s): `OSINT_RSSH`, `URL`, `KEY`. Store secrets in Harvy Secrets Store and confirm publisher requirements.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** Scotland government officials — executive, cabinet, parliament leadership.

### 75. `x_agencies_scotland` — X/Twitter — Scotland Agencies (6 accounts)

- **Get:** [publisher/site](https://rsshub.app); API/download base: [https://rsshub.app](https://rsshub.app).
- **Initial scope:** `/twitter/user/PoliceScotland; route: /twitter/user/PoliceScotland`; `/twitter/user/NHSNSScotland; route: /twitter/user/NHSNSScotland`; `/twitter/user/fire_scot; route: /twitter/user/fire_scot`; `/twitter/user/ScotGovEdu; route: /twitter/user/ScotGovEdu`; `/twitter/user/TransportScot; route: /twitter/user/TransportScot`; `/twitter/user/VisitScotland; route: /twitter/user/VisitScotland`.
- **Access:** source file indicates key/auth requirement; setting(s): `OSINT_RSSH`, `URL`, `KEY`. Store secrets in Harvy Secrets Store and confirm publisher requirements.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** Scotland government agencies — defense, intelligence, law enforcement, health, etc.

### 76. `x_gov_canada` — X/Twitter — Canada Government (18 accounts)

- **Get:** [publisher/site](https://rsshub.app); API/download base: [https://rsshub.app](https://rsshub.app).
- **Initial scope:** `/twitter/user/MarkJCarney; route: /twitter/user/MarkJCarney`; `/twitter/user/cafreeland; route: /twitter/user/cafreeland`; `/twitter/user/melaniejoly; route: /twitter/user/melaniejoly`; `/twitter/user/BillBlair; route: /twitter/user/BillBlair`; `/twitter/user/DLeBlancNB; route: /twitter/user/DLeBlancNB`; `/twitter/user/SeanFraserMP; route: /twitter/user/SeanFraserMP`; `/twitter/user/markholland; route: /twitter/user/markholland`; `/twitter/user/FP_Champagne; route: /twitter/user/FP_Champagne`; `/twitter/user/AnitaAnandMP; route: /twitter/user/AnitaAnandMP`; `/twitter/user/JonathanWNV; route: /twitter/user/JonathanWNV`; `/twitter/user/s_guilbeault; route: /twitter/user/s_guilbeault`; `/twitter/user/MarcMillerVM; route: /twitter/user/MarcMillerVM`; `/twitter/user/OurCommons; route: /twitter/user/OurCommons`; `/twitter/user/SenateCA; route: /twitter/user/SenateCA`; `/twitter/user/ParlCA; route: /twitter/user/ParlCA`; `/twitter/user/PierrePoilievre; route: /twitter/user/PierrePoilievre`; `/twitter/user/theJagmeetSingh; route: /twitter/user/theJagmeetSingh`; `/twitter/user/yfblanchet; route: /twitter/user/yfblanchet`.
- **Access:** source file indicates key/auth requirement; setting(s): `OSINT_RSSH`, `URL`, `KEY`. Store secrets in Harvy Secrets Store and confirm publisher requirements.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** Canada government officials — executive, cabinet, parliament leadership.

### 77. `x_agencies_canada` — X/Twitter — Canada Agencies (17 accounts)

- **Get:** [publisher/site](https://rsshub.app); API/download base: [https://rsshub.app](https://rsshub.app).
- **Initial scope:** `/twitter/user/PMCanada; route: /twitter/user/PMCanada`; `/twitter/user/CanadianForces; route: /twitter/user/CanadianForces`; `/twitter/user/CanadianArmy; route: /twitter/user/CanadianArmy`; `/twitter/user/RoyalCanNavy; route: /twitter/user/RoyalCanNavy`; `/twitter/user/RCAF_ARC; route: /twitter/user/RCAF_ARC`; `/twitter/user/RCMPGRCPOL; route: /twitter/user/RCMPGRCPOL`; `/twitter/user/SCRS_CSIS; route: /twitter/user/SCRS_CSIS`; `/twitter/user/CanadaFP; route: /twitter/user/CanadaFP`; `/twitter/user/GovCanHealth; route: /twitter/user/GovCanHealth`; `/twitter/user/Safety_Canada; route: /twitter/user/Safety_Canada`; `/twitter/user/CanRevAgency; route: /twitter/user/CanRevAgency`; `/twitter/user/bankofcanada; route: /twitter/user/bankofcanada`; `/twitter/user/StatCan_eng; route: /twitter/user/StatCan_eng`; `/twitter/user/environmentca; route: /twitter/user/environmentca`; `/twitter/user/Transport_gc; route: /twitter/user/Transport_gc`; `/twitter/user/CBCNews; route: /twitter/user/CBCNews`; `/twitter/user/CTVNews; route: /twitter/user/CTVNews`.
- **Access:** source file indicates key/auth requirement; setting(s): `OSINT_RSSH`, `URL`, `KEY`. Store secrets in Harvy Secrets Store and confirm publisher requirements.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** Canada government agencies — defense, intelligence, law enforcement, health, etc.

### 78. `x_gov_germany` — X/Twitter — Germany Government (20 accounts)

- **Get:** [publisher/site](https://rsshub.app); API/download base: [https://rsshub.app](https://rsshub.app).
- **Initial scope:** `/twitter/user/_FriedrichMerz; route: /twitter/user/_FriedrichMerz`; `/twitter/user/RobertHabeck; route: /twitter/user/RobertHabeck`; `/twitter/user/ABaerbock; route: /twitter/user/ABaerbock`; `/twitter/user/BorisPistorius; route: /twitter/user/BorisPistorius`; `/twitter/user/NancyFaeser; route: /twitter/user/NancyFaeser`; `/twitter/user/c_lindner; route: /twitter/user/c_lindner`; `/twitter/user/MarcoBuschmann; route: /twitter/user/MarcoBuschmann`; `/twitter/user/Karl_Lauterbach; route: /twitter/user/Karl_Lauterbach`; `/twitter/user/hubertus_heil; route: /twitter/user/hubertus_heil`; `/twitter/user/cem_oezdemir; route: /twitter/user/cem_oezdemir`; `/twitter/user/Wissing; route: /twitter/user/Wissing`; `/twitter/user/SteffiLemke; route: /twitter/user/SteffiLemke`; `/twitter/user/laboraborepaul; route: /twitter/user/laboraborepaul`; `/twitter/user/SvenjaSchulze68; route: /twitter/user/SvenjaSchulze68`; `/twitter/user/BMFSKJ; route: /twitter/user/BMFSKJ`; `/twitter/user/Bundestag; route: /twitter/user/Bundestag`; `/twitter/user/BRegierung; route: /twitter/user/BRegierung`; `/twitter/user/Alice_Weidel; route: /twitter/user/Alice_Weidel`; `/twitter/user/SWagenknecht; route: /twitter/user/SWagenknecht`; `/twitter/user/Janine_Wissler; route: /twitter/user/Janine_Wissler`.
- **Access:** source file indicates key/auth requirement; setting(s): `OSINT_RSSH`, `URL`, `KEY`. Store secrets in Harvy Secrets Store and confirm publisher requirements.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** Germany government officials — executive, cabinet, parliament leadership.

### 79. `x_agencies_germany` — X/Twitter — Germany Agencies (14 accounts)

- **Get:** [publisher/site](https://rsshub.app); API/download base: [https://rsshub.app](https://rsshub.app).
- **Initial scope:** `/twitter/user/Bundeswehr; route: /twitter/user/Bundeswehr`; `/twitter/user/Heer; route: /twitter/user/Heer`; `/twitter/user/Marine; route: /twitter/user/Marine`; `/twitter/user/Bw_Luftwaffe; route: /twitter/user/Bw_Luftwaffe`; `/twitter/user/BND; route: /twitter/user/BND`; `/twitter/user/BPolizei; route: /twitter/user/BPolizei`; `/twitter/user/BKA; route: /twitter/user/BKA`; `/twitter/user/Diplo; route: /twitter/user/Diplo`; `/twitter/user/BMF; route: /twitter/user/BMF`; `/twitter/user/Bundesbank; route: /twitter/user/Bundesbank`; `/twitter/user/Dwetterdienst; route: /twitter/user/Dwetterdienst`; `/twitter/user/RKI; route: /twitter/user/RKI`; `/twitter/user/Wnews; route: /twitter/user/Wnews`; `/twitter/user/Tagesschau; route: /twitter/user/Tagesschau`.
- **Access:** source file indicates key/auth requirement; setting(s): `OSINT_RSSH`, `URL`, `KEY`. Store secrets in Harvy Secrets Store and confirm publisher requirements.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** Germany government agencies — defense, intelligence, law enforcement, health, etc.

### 80. `x_gov_mexico` — X/Twitter — Mexico Government (11 accounts)

- **Get:** [publisher/site](https://rsshub.app); API/download base: [https://rsshub.app](https://rsshub.app).
- **Initial scope:** `/twitter/user/Claudiashein; route: /twitter/user/Claudiashein`; `/twitter/user/jrdelafuente; route: /twitter/user/jrdelafuente`; `/twitter/user/rosaicelarod; route: /twitter/user/rosaicelarod`; `/twitter/user/RRamirezdelaO; route: /twitter/user/RRamirezdelaO`; `/twitter/user/LuisCresencioS; route: /twitter/user/LuisCresencioS`; `/twitter/user/almaborada_naval; route: /twitter/user/almaborada_naval`; `/twitter/user/OHarfuch; route: /twitter/user/OHarfuch`; `/twitter/user/m_ebrard; route: /twitter/user/m_ebrard`; `/twitter/user/senaboradomexico; route: /twitter/user/senaboradomexico`; `/twitter/user/Mx_Diputados; route: /twitter/user/Mx_Diputados`; `/twitter/user/GobiernoMX; route: /twitter/user/GobiernoMX`.
- **Access:** source file indicates key/auth requirement; setting(s): `OSINT_RSSH`, `URL`, `KEY`. Store secrets in Harvy Secrets Store and confirm publisher requirements.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** Mexico government officials — executive, cabinet, parliament leadership.

### 81. `x_agencies_mexico` — X/Twitter — Mexico Agencies (11 accounts)

- **Get:** [publisher/site](https://rsshub.app); API/download base: [https://rsshub.app](https://rsshub.app).
- **Initial scope:** `/twitter/user/PresidenciaMX; route: /twitter/user/PresidenciaMX`; `/twitter/user/SEDENAmx; route: /twitter/user/SEDENAmx`; `/twitter/user/SEMAR_mx; route: /twitter/user/SEMAR_mx`; `/twitter/user/GN_MEXICO; route: /twitter/user/GN_MEXICO`; `/twitter/user/SRE_mx; route: /twitter/user/SRE_mx`; `/twitter/user/IMSS_Bienestar; route: /twitter/user/IMSS_Bienestar`; `/twitter/user/ISSSTE; route: /twitter/user/ISSSTE`; `/twitter/user/CONAGUA; route: /twitter/user/CONAGUA`; `/twitter/user/CENAPRED; route: /twitter/user/CENAPRED`; `/twitter/user/SSPCMexico; route: /twitter/user/SSPCMexico`; `/twitter/user/FGRMexico; route: /twitter/user/FGRMexico`.
- **Access:** source file indicates key/auth requirement; setting(s): `OSINT_RSSH`, `URL`, `KEY`. Store secrets in Harvy Secrets Store and confirm publisher requirements.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** Mexico government agencies — defense, intelligence, law enforcement, health, etc.

### 82. `x_gov_nz` — X/Twitter — New Zealand Government (13 accounts)

- **Get:** [publisher/site](https://rsshub.app); API/download base: [https://rsshub.app](https://rsshub.app).
- **Initial scope:** `/twitter/user/chrisluxonmp; route: /twitter/user/chrisluxonmp`; `/twitter/user/winstonpeters; route: /twitter/user/winstonpeters`; `/twitter/user/NicolaWillisMP; route: /twitter/user/NicolaWillisMP`; `/twitter/user/JudithCollinsMP; route: /twitter/user/JudithCollinsMP`; `/twitter/user/MarkMitchellMP; route: /twitter/user/MarkMitchellMP`; `/twitter/user/chrisbishopmp; route: /twitter/user/chrisbishopmp`; `/twitter/user/DrShaneReti; route: /twitter/user/DrShaneReti`; `/twitter/user/EricaStanfordMP; route: /twitter/user/EricaStanfordMP`; `/twitter/user/NZParliament; route: /twitter/user/NZParliament`; `/twitter/user/govtnz; route: /twitter/user/govtnz`; `/twitter/user/chrishipkins; route: /twitter/user/chrishipkins`; `/twitter/user/ChloeSwarbrick; route: /twitter/user/ChloeSwarbrick`; `/twitter/user/Rawiri_Waititi; route: /twitter/user/Rawiri_Waititi`.
- **Access:** source file indicates key/auth requirement; setting(s): `OSINT_RSSH`, `URL`, `KEY`. Store secrets in Harvy Secrets Store and confirm publisher requirements.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** New Zealand government officials — executive, cabinet, parliament leadership.

### 83. `x_agencies_nz` — X/Twitter — New Zealand Agencies (10 accounts)

- **Get:** [publisher/site](https://rsshub.app); API/download base: [https://rsshub.app](https://rsshub.app).
- **Initial scope:** `/twitter/user/NZDefenceForce; route: /twitter/user/NZDefenceForce`; `/twitter/user/NZArmy; route: /twitter/user/NZArmy`; `/twitter/user/NZPolice; route: /twitter/user/NZPolice`; `/twitter/user/MFATNZ; route: /twitter/user/MFATNZ`; `/twitter/user/ABORDHealthNZ; route: /twitter/user/ABORDHealthNZ`; `/twitter/user/MetService; route: /twitter/user/MetService`; `/twitter/user/GNS_Science; route: /twitter/user/GNS_Science`; `/twitter/user/NZTA; route: /twitter/user/NZTA`; `/twitter/user/NZMorningReport; route: /twitter/user/NZMorningReport`; `/twitter/user/1NewsNZ; route: /twitter/user/1NewsNZ`.
- **Access:** source file indicates key/auth requirement; setting(s): `OSINT_RSSH`, `URL`, `KEY`. Store secrets in Harvy Secrets Store and confirm publisher requirements.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** New Zealand government agencies — defense, intelligence, law enforcement, health, etc.

### 84. `x_gov_ireland` — X/Twitter — Ireland Government (13 accounts)

- **Get:** [publisher/site](https://rsshub.app); API/download base: [https://rsshub.app](https://rsshub.app).
- **Initial scope:** `/twitter/user/SimonHarrisTD; route: /twitter/user/SimonHarrisTD`; `/twitter/user/MichealMartinTD; route: /twitter/user/MichealMartinTD`; `/twitter/user/jackfchambers; route: /twitter/user/jackfchambers`; `/twitter/user/simoncoveney; route: /twitter/user/simoncoveney`; `/twitter/user/HMcEntee; route: /twitter/user/HMcEntee`; `/twitter/user/DonnellyStephen; route: /twitter/user/DonnellyStephen`; `/twitter/user/NormaFoleyTD; route: /twitter/user/NormaFoleyTD`; `/twitter/user/EamonRyan; route: /twitter/user/EamonRyan`; `/twitter/user/DarraghOBrienTD; route: /twitter/user/DarraghOBrienTD`; `/twitter/user/OireachtasNews; route: /twitter/user/OireachtasNews`; `/twitter/user/PresidentIRL; route: /twitter/user/PresidentIRL`; `/twitter/user/MaryLouMcDonald; route: /twitter/user/MaryLouMcDonald`; `/twitter/user/ivanabacik; route: /twitter/user/ivanabacik`.
- **Access:** source file indicates key/auth requirement; setting(s): `OSINT_RSSH`, `URL`, `KEY`. Store secrets in Harvy Secrets Store and confirm publisher requirements.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** Ireland government officials — executive, cabinet, parliament leadership.

### 85. `x_agencies_ireland` — X/Twitter — Ireland Agencies (8 accounts)

- **Get:** [publisher/site](https://rsshub.app); API/download base: [https://rsshub.app](https://rsshub.app).
- **Initial scope:** `/twitter/user/defaborseire; route: /twitter/user/defaborseire`; `/twitter/user/GardaInfo; route: /twitter/user/GardaInfo`; `/twitter/user/dfaborfa; route: /twitter/user/dfaborfa`; `/twitter/user/HSELive; route: /twitter/user/HSELive`; `/twitter/user/Metabor\xC9ireann; route: "/twitter/user/Metabor\xC9ireann"`; `/twitter/user/rtenews; route: /twitter/user/rtenews`; `/twitter/user/IrishTimes; route: /twitter/user/IrishTimes`; `/twitter/user/thejournal_ie; route: /twitter/user/thejournal_ie`.
- **Access:** source file indicates key/auth requirement; setting(s): `OSINT_RSSH`, `URL`, `KEY`. Store secrets in Harvy Secrets Store and confirm publisher requirements.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** Ireland government agencies — defense, intelligence, law enforcement, health, etc.

### 86. `dronestream` — Dronestream (Drone Strikes)

- **Get:** [publisher/site](https://api.dronestre.am); API/download base: [https://api.dronestre.am](https://api.dronestre.am).
- **Initial scope:** `strikes; endpoint: /data`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** Bureau of Investigative Journalism drone strike data. Pakistan, Yemen, Somalia, Afghanistan.

### 87. `etherscan` — Etherscan (Ethereum)

- **Get:** [publisher/site](https://api.etherscan.io); API/download base: [https://api.etherscan.io/api](https://api.etherscan.io/api).
- **Initial scope:** `stats`; `accounts`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** Ethereum mainnet snapshots: supply, gas, blocks, top accounts.

### 88. `bea` — Bureau of Economic Analysis (BEA)

- **Get:** [publisher/site](https://apps.bea.gov); API/download base: [https://apps.bea.gov/api](https://apps.bea.gov/api).
- **Initial scope:** `catalog`; `parameters`; `nipa`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** Bureau of Economic Analysis: GDP, trade, industry data.

### 89. `blockchair` — Blockchair (Blockchain)

- **Get:** [publisher/site](https://api.blockchair.com); API/download base: [https://api.blockchair.com](https://api.blockchair.com).
- **Initial scope:** `chain_stats`; `watchlist`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** Multi-chain blockchain analytics. 15+ chains, OFAC watchlist monitoring.

### 90. `dbpedia` — DBpedia (Wikipedia Structured)

- **Get:** [publisher/site](https://dbpedia.org); API/download base: [https://dbpedia.org/sparql](https://dbpedia.org/sparql).
- **Initial scope:** `sparql`; `lookup`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** Structured Wikipedia data: cities, conflicts, nuclear facilities via SPARQL.

### 91. `fivethirtyeight` — FiveThirtyEight Data

- **Get:** [publisher/site](https://github.com/fivethirtyeight/data); API/download base: [https://api.github.com/repos/fivethirtyeight/data](https://api.github.com/repos/fivethirtyeight/data).
- **Initial scope:** `datasets`; `catalog`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** FiveThirtyEight data journalism datasets: elections, polls, ideology.

### 92. `geops` — GeOps Transit Tracker

- **Get:** [publisher/site](https://api.geops.io); API/download base: [https://api.geops.io/tracker-http/v1](https://api.geops.io/tracker-http/v1).
- **Initial scope:** `transit`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** Real-time public transit vehicle positions worldwide.

### 93. `google_trends` — Google Trends

- **Get:** [publisher/site](https://trends.google.com); API/download base: [https://rsshub.app](https://rsshub.app).
- **Initial scope:** `trending_daily`; `trending_realtime`; `hot_searches`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** Google Trends trending searches and hot topics via RSSHub.

### 94. `hrw` — Human Rights Watch

- **Get:** [publisher/site](https://www.hrw.org); API/download base: [https://rsshub.app](https://rsshub.app).
- **Initial scope:** `reports`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** Human Rights Watch news and reports via RSSHub.

### 95. `amnesty` — Amnesty International

- **Get:** [publisher/site](https://www.amnesty.org); API/download base: [https://rsshub.app](https://rsshub.app).
- **Initial scope:** `news`; `crises`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** Amnesty International news, crises, and campaigns via RSSHub.

### 96. `imf` — IMF DataMapper

- **Get:** [publisher/site](https://www.imf.org/external/datamapper); API/download base: [https://www.imf.org/external/datamapper/api/v1](https://www.imf.org/external/datamapper/api/v1).
- **Initial scope:** `catalog`; `indicators`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** IMF World Economic Outlook: GDP, inflation, debt for 190+ countries.

### 97. `nasa_earthdata` — NASA Earthdata

- **Get:** [publisher/site](https://earthdata.nasa.gov); API/download base: [https://cmr.earthdata.nasa.gov/search](https://cmr.earthdata.nasa.gov/search).
- **Initial scope:** `collections`; `granules`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** NASA CMR: wildfire, flood, hurricane, drought, nightlight datasets.

### 98. `liveuamap` — Liveuamap (Conflict Maps)

- **Get:** [publisher/site](https://api.liveuamap.com); API/download base: [https://api.liveuamap.com](https://api.liveuamap.com).
- **Initial scope:** `events_ukraine`; `events_syria`; `events_sudan`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 3 (upstream label only; not Harvy approval).
- **Source note:** Liveuamap conflict event markers. Paid API key required.

### 99. `maxmind` — MaxMind GeoLite2

- **Get:** [publisher/site](https://www.maxmind.com); API/download base: [https://download.maxmind.com](https://download.maxmind.com).
- **Initial scope:** `databases`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** MaxMind GeoLite2 IP geolocation, ASN, country databases.

### 100. `openaddresses` — OpenAddresses

- **Get:** [publisher/site](https://openaddresses.io); API/download base: [https://batch.openaddresses.io](https://batch.openaddresses.io).
- **Initial scope:** `catalog`; `runs`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** OpenAddresses: largest open address database, 700M+ addresses.

### 101. `opendata_soft` — OpenData Soft Portals

- **Get:** [publisher/site](https://opendata.soft); API/download base: [https://data.education.gouv.fr/api/explore/v2.1](https://data.education.gouv.fr/api/explore/v2.1).
- **Initial scope:** `portal_data_gov_fr`; `portal_data_paris`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** OpenDataSoft portals: French government, Paris, Lyon, Nantes open data.

### 102. `openflights` — OpenFlights

- **Get:** [publisher/site](https://github.com/jpatokal/openflights); API/download base: [https://raw.githubusercontent.com/jpatokal/openflights/master/data](https://raw.githubusercontent.com/jpatokal/openflights/master/data).
- **Initial scope:** `airports`; `airlines`; `routes`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** OpenFlights: airports, airlines, and routes data.

### 103. `openrailwaymap` — OpenRailwayMap

- **Get:** [publisher/site](https://www.openrailwaymap.org); API/download base: [https://overpass-api.de/api/interpreter](https://overpass-api.de/api/interpreter).
- **Initial scope:** `railway`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** OpenRailwayMap: railway infrastructure via Overpass API.

### 104. `arcgis_hub` — ArcGIS Hub

- **Get:** [publisher/site](https://hub.arcgis.com); API/download base: [https://opendata.arcgis.com/api/v3](https://opendata.arcgis.com/api/v3).
- **Initial scope:** `search`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** ArcGIS Hub: emergency mgmt, hazards, infrastructure, census data.

### 105. `socrata` — Socrata Open Data

- **Get:** [publisher/site](https://www.opendatanetwork.com); API/download base: [https://api.us.socrata.com/api/catalog/v1](https://api.us.socrata.com/api/catalog/v1).
- **Initial scope:** `search`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** Socrata open data: CDC, NASA, NYC, SF, Chicago, LA, Seattle portals.

### 106. `worldbank_open` — World Bank Open Data

- **Get:** [publisher/site](https://data.worldbank.org); API/download base: [https://api.worldbank.org/v2](https://api.worldbank.org/v2).
- **Initial scope:** `indicators`; `catalog`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** World Bank Open Data: 16,000+ indicators, 200+ countries.

### 107. `unodc` — UNODC Data Portal

- **Get:** [publisher/site](https://dataunodc.un.org); API/download base: [https://dataunodc.un.org/data](https://dataunodc.un.org/data).
- **Initial scope:** `intentional_homicide`; `trafficking_persons`; `drug_seizures`; `prison_population`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** UNODC: homicides, trafficking, drug seizures, prison populations.

### 108. `usoutage` — USOutage.com

- **Get:** [publisher/site](https://www.usoutage.com); API/download base: [https://www.usoutage.com](https://www.usoutage.com).
- **Initial scope:** `national`; `state`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** USOutage.com: US power outage tracking by state.

### 109. `tepco` — TEPCO Outage Data

- **Get:** [publisher/site](https://www.tepco.co.jp); API/download base: [https://tepco-ep-webapi.cs-platform.com](https://tepco-ep-webapi.cs-platform.com).
- **Initial scope:** `outage_list`; `power_usage`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** TEPCO: Tokyo Electric Power outage and usage data.

### 110. `smithsonian_gvp` — Smithsonian GVP (Volcanoes)

- **Get:** [publisher/site](https://volcano.si.edu); API/download base: [https://volcano.si.edu](https://volcano.si.edu).
- **Initial scope:** `eruptions`; `bulletin`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** Smithsonian Global Volcanism Program: eruptions, bulletins.

### 111. `overture_maps` — Overture Maps

- **Get:** [publisher/site](https://data.overturemaps.org); API/download base: [https://data.overturemaps.org](https://data.overturemaps.org).
- **Initial scope:** `catalog`; `assets`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** Overture Maps: places, buildings, transportation, addresses.

### 113. `social_mention` — Social Mention

- **Get:** [publisher/site](https://www.socialmention.com); API/download base: [https://www.socialmention.com](https://www.socialmention.com).
- **Initial scope:** `search`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 3 (upstream label only; not Harvy approval).
- **Source note:** Social Mention: social media search aggregator for crisis terms.

### 114. `transitwiki` — Transitwiki

- **Get:** [publisher/site](https://transitwiki.transitcenter.org); API/download base: [https://transitwiki.transitcenter.org/api.php](https://transitwiki.transitcenter.org/api.php).
- **Initial scope:** `wiki`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 3 (upstream label only; not Harvy approval).
- **Source note:** Transitwiki: transit agency data and GTFS feed discovery.

### 115. `travic` — Travic (Transit Viz)

- **Get:** [publisher/site](https://travic.ch); API/download base: [https://travic.ch](https://travic.ch).
- **Initial scope:** `catalog`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** Travic: transit vehicle visualization, network catalog.

### 116. `noaa_ncei` — NOAA NCEI (Climate/Weather)

- **Get:** [publisher/site](https://www.ncdc.noaa.gov); API/download base: [https://www.ncdc.noaa.gov/cdo-web/api/v2](https://www.ncdc.noaa.gov/cdo-web/api/v2).
- **Initial scope:** `datasets`; `events`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** NOAA NCEI: weather, climate, storm events, billion-dollar disasters.

### 117. `noaa_spc` — NOAA SPC (Severe Weather)

- **Get:** [publisher/site](https://www.spc.noaa.gov); API/download base: [https://www.spc.noaa.gov](https://www.spc.noaa.gov).
- **Initial scope:** `watches`; `reports`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** NOAA SPC: tornado watches, severe thunderstorm reports.

### 118. `un_comtrade` — UN Comtrade (Trade)

- **Get:** [publisher/site](https://comtradeapi.un.org); API/download base: [https://comtradeapi.un.org](https://comtradeapi.un.org).
- **Initial scope:** `flows`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** UN Comtrade: international trade statistics.

### 119. `who_gho` — WHO GHO (Health)

- **Get:** [publisher/site](https://ghoapi.azureedge.net); API/download base: [https://ghoapi.azureedge.net/api](https://ghoapi.azureedge.net/api).
- **Initial scope:** `indicators`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** WHO Global Health Observatory: health indicators for 194 countries.

### 120. `overpass_api` — Overpass API (OSM)

- **Get:** [publisher/site](https://overpass-api.de); API/download base: [https://overpass-api.de/api/interpreter](https://overpass-api.de/api/interpreter).
- **Initial scope:** `queries`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** Overpass API: OSM queries for infrastructure, boundaries, POIs.

### 121. `data_gov` — Data.gov

- **Get:** [publisher/site](https://data.gov); API/download base: [https://api.gsa.gov/oddata/data.gov/v3](https://api.gsa.gov/oddata/data.gov/v3).
- **Initial scope:** `datasets`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** Data.gov: US federal open data catalog.

### 122. `entso_e_outages` — ENTSO-E Electricity Outage Notifications

- **Get:** [publisher/site](https://transparency.entsoe.eu); API/download base: [https://transparency.entsoe.eu/api](https://transparency.entsoe.eu/api).
- **Initial scope:** `outage_notifications; document_type: A80`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** European electricity outage data from ENTSO-E Transparency Platform.

### 123. `deflock` — Deflock — Flock Camera Dashboard

- **Get:** [publisher/site](https://deflock.me); API/download base: [https://deflock.me/api](https://deflock.me/api).
- **Initial scope:** `cameras; endpoint: /cameras`; `stats; endpoint: /stats`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** Community-maintained dashboard of Flock Safety ALPR camera locations. JSON API.

### 124. `gadm` — GADM — Global Administrative Areas

- **Get:** [publisher/site](https://gadm.org); API/download base: [https://geodata.ucdavis.edu/gadm/gadm4.1/json](https://geodata.ucdavis.edu/gadm/gadm4.1/json).
- **Initial scope:** `country_boundaries; countries:; - USA; - GBR; - DEU; - MEX; - CAN; - FRA; - JPN; - AUS`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** Global Administrative Areas database. GeoJSON country boundaries.

### 125. `google_public_data` — Google Public Data Explorer

- **Get:** [publisher/site](https://www.gstatic.com/publicdata); API/download base: [https://www.gstatic.com/publicdata](https://www.gstatic.com/publicdata).
- **Initial scope:** `catalog; endpoint: /datasets.json`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 3 (upstream label only; not Harvy approval).
- **Source note:** Google Public Data Explorer dataset catalog.

### 126. `local_protest_map` — Local Protest Map (ACLED)

- **Get:** [publisher/site](https://api.acleddata.com); API/download base: [https://api.acleddata.com](https://api.acleddata.com).
- **Initial scope:** `protests; event_type: Protests; limit: 500`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** Crowdsourced protest event tracking via ACLED API.

### 127. `traintrackr` — TrainTrackr — Rail Tracking

- **Get:** [publisher/site](https://api.amtrak.com); API/download base: [https://api.amtrak.com/v1](https://api.amtrak.com/v1).
- **Initial scope:** `trains; endpoint: /trains`; `gtfs_feeds; fallback_url: https://api.transit.land/feeds`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** Real-time rail and train tracking data. Amtrak API + GTFS-RT fallback.

### 128. `data_gov_apis` — Data.gov APIs

- **Get:** [publisher/site](https://catalog.data.gov); API/download base: [https://catalog.data.gov/api/3/action](https://catalog.data.gov/api/3/action).
- **Initial scope:** `datasets; endpoint: /package_search; rows: 100`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** U.S. government open data portal. CKAN API with thousands of datasets.

### 129. `congress_gov` — Congress.gov API

- **Get:** [publisher/site](https://api.congress.gov/v3); API/download base: [https://api.congress.gov/v3](https://api.congress.gov/v3).
- **Initial scope:** `bills; endpoint: /bill`; `amendments; endpoint: /amendment`; `committees; endpoint: /committee`; `hearings; endpoint: /hearing`; `nominations; endpoint: /nomination`; `treaties; endpoint: /treaty`; `congressional_record; endpoint: /congressional-record`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** US Congress bills, amendments, committees, hearings, nominations, treaties. Free API key.

### 130. `regulations_gov` — Regulations.gov API

- **Get:** [publisher/site](https://api.regulations.gov/v4); API/download base: [https://api.regulations.gov/v4](https://api.regulations.gov/v4).
- **Initial scope:** `documents; endpoint: /documents`; `dockets; endpoint: /dockets`; `comments; endpoint: /comments`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** US federal rulemaking, documents, dockets, and public comments. Free API key.

### 131. `sam_contract_awards` — SAM.gov Contract Awards

- **Get:** [publisher/site](https://api.sam.gov/contract-awards/v2); API/download base: [https://api.sam.gov/contract-awards/v2](https://api.sam.gov/contract-awards/v2).
- **Initial scope:** `awards; endpoint: /awards`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** US federal contract award data from SAM.gov. Free API key.

### 132. `sam_entity` — SAM.gov Entity Management

- **Get:** [publisher/site](https://api.sam.gov/entity-information/v3); API/download base: [https://api.sam.gov/entity-information/v3](https://api.sam.gov/entity-information/v3).
- **Initial scope:** `entities; endpoint: /entities`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** SAM.gov registered entity information and validation. Free API key.

### 133. `sam_subawards` — SAM.gov Subaward Reporting

- **Get:** [publisher/site](https://api.sam.gov/subaward/v3); API/download base: [https://api.sam.gov/subaward/v3](https://api.sam.gov/subaward/v3).
- **Initial scope:** `subawards; endpoint: /subawards`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** US federal subaward and subcontract reporting data. Free API key.

### 134. `gsa_ratequeryhhg` — GSA HHG Rate Query

- **Get:** [publisher/site](https://api.gsa.gov/travel/transportation/tmss/v2); API/download base: [https://api.gsa.gov/travel/transportation/tmss/v2](https://api.gsa.gov/travel/transportation/tmss/v2).
- **Initial scope:** `hhg_rates; endpoint: /ratequeryhhg`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** GSA household goods moving rates for federal employees. DEMO_KEY works.

### 135. `catalog_data_gov` — Data.gov Catalog API

- **Get:** [publisher/site](https://catalog.data.gov); API/download base: [https://catalog.data.gov/api/3/action](https://catalog.data.gov/api/3/action).
- **Initial scope:** `emergency_search; queries: emergency,disaster,hurricane,earthquake,flood,wildfire,power outage,infrastructure`; `trending; endpoint: /recently_changed_packages_activity_list`; `groups; endpoint: /group_list`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** Data.gov CKAN catalog — 300K+ datasets, news-driven keyword search for emergencies and disasters.

### 136. `ckan_portal` — Universal CKAN Portal (34+ countries)

- **Get:** [publisher/site](https://data.gov.au); API/download base: [https://data.gov.au/api/3/action](https://data.gov.au/api/3/action).
- **Initial scope:** `recently_changed; endpoint: /recently_changed_packages_activity_list`; `package_search; endpoint: /package_search; rows: 100`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** Universal CKAN fetcher — 34+ international portals (Australia, Brazil, Canada, France, Germany, India, Japan, UK, etc.).

### 137. `socrata_portal` — Universal Socrata Portal (30+ US portals)

- **Get:** [publisher/site](https://data.ca.gov); API/download base: [https://data.ca.gov/api/views](https://data.ca.gov/api/views).
- **Initial scope:** `views; endpoint: /api/views`; `data; endpoint: /resource`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** Universal Socrata fetcher — 30+ US state/city portals (California, Colorado, DC, Illinois, New York, Texas, etc.).

### 138. `worldbank_api` — World Bank Open Data API

- **Get:** [publisher/site](https://api.worldbank.org/v2); API/download base: [https://api.worldbank.org/v2](https://api.worldbank.org/v2).
- **Initial scope:** `indicators; endpoint: /indicator`; `countries; endpoint: /country`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** World Bank — 200+ countries, 16K+ indicators (GDP, population, CO2, military, etc.). No auth.

### 139. `un_data` — UN Data API

- **Get:** [publisher/site](https://data.un.org/ws/rest); API/download base: [https://data.un.org/ws/rest](https://data.un.org/ws/rest).
- **Initial scope:** `dataflows; endpoint: /dataflow`; `data; endpoint: /data`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** UN statistical dataflows (UNESCO, population, FAO, World Bank). SDMX-based, no auth.

### 140. `trove_archive` — TROVE Australian Web Archive

- **Get:** [publisher/site](https://trove.nla.gov.au); API/download base: [https://trove.nla.gov.au/api/v3](https://trove.nla.gov.au/api/v3).
- **Initial scope:** `articles; zone: article`; `books; zone: book`; `pictures; zone: picture`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** TROVE — Australian Web Archive (National Library of Australia). Free API key.

### 141. `archive_it` — Archive-it CDX API

- **Get:** [publisher/site](https://partner.archive-it.org); API/download base: [https://partner.archive-it.org/cdx/search/cdx](https://partner.archive-it.org/cdx/search/cdx).
- **Initial scope:** `captures; endpoint: /cdx/search/cdx`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** Archive-it Wayback Index CDX Server. Free, no auth.

### 142. `uk_web_archive` — UK Web Archive

- **Get:** [publisher/site](https://www.webarchive.org.uk); API/download base: [https://www.webarchive.org.uk/mementos/search/json](https://www.webarchive.org.uk/mementos/search/json).
- **Initial scope:** `captures; endpoint: /mementos/search/json`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** UK Web Archive (British Library). Free, no auth.

### 143. `arquivo_pt` — Arquivo.pt Portuguese Web Archive

- **Get:** [publisher/site](https://arquivo.pt); API/download base: [https://arquivo.pt/textsearch](https://arquivo.pt/textsearch).
- **Initial scope:** `search; endpoint: /textsearch`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** Arquivo.pt — Portuguese Web Archive. Full-text search, free, no auth.

### 144. `loc_archive` — Library of Congress API

- **Get:** [publisher/site](https://www.loc.gov); API/download base: [https://www.loc.gov/apis](https://www.loc.gov/apis).
- **Initial scope:** `maps; type: maps`; `newspapers; type: newspapers`; `photos; type: photos`; `audio; type: audio`; `manuscripts; type: manuscripts`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** Library of Congress — digital collections (maps, newspapers, photos, audio, manuscripts). Free, no auth.

### 146. `windy_webcams` — Windy Webcams Live

- **Get:** [publisher/site](https://api.windy.com); API/download base: [https://api.windy.com/webcams/api/v3](https://api.windy.com/webcams/api/v3).
- **Initial scope:** `traffic_cams; category: traffic`; `weather_cams; category: weather`; `airport_cams; category: airport`; `beach_cams; category: beach`; `city_cams; category: city`.
- **Access:** source file indicates key/auth requirement; setting(s): `WINDY_API_KEY`. Store secrets in Harvy Secrets Store and confirm publisher requirements.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** Windy Webcams — live snapshots worldwide. Free tier 1000 calls/day.

### 147. `aviationstack` — AviationStack Flight Data

- **Get:** [publisher/site](https://aviationstack.com); API/download base: [http://api.aviationstack.com/v1](http://api.aviationstack.com/v1).
- **Initial scope:** `flights; endpoint: /flights`; `airports; endpoint: /airports`; `airlines; endpoint: /airlines`.
- **Access:** source file indicates key/auth requirement; setting(s): `AVIATIONSTACK_API_KEY`. Store secrets in Harvy Secrets Store and confirm publisher requirements.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** AviationStack — real-time flight tracking. Free tier 100 req/month.

### 148. `aviationapi` — AviationAPI FAA Data

- **Get:** [publisher/site](https://api.aviationapi.com); API/download base: [https://api.aviationapi.com/v1](https://api.aviationapi.com/v1).
- **Initial scope:** `airports`; `charts`; `weather`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** AviationAPI — FAA charts, airport info, weather. Free, no auth.

### 149. `facha_api` — FachaAPI Aircraft & Positions

- **Get:** [publisher/site](https://api.facha.dev); API/download base: [https://api.facha.dev/v1](https://api.facha.dev/v1).
- **Initial scope:** `aircraft`; `flights`; `positions`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 1 (upstream label only; not Harvy approval).
- **Source note:** FachaAPI — aircraft details and live positioning. Free, no auth.

### 150. `pic_image_search` — PIC Image Search

- **Get:** [publisher/site](https://pic-image-search.kituin.fun); API/download base: [https://pic-image-search.kituin.fun/api](https://pic-image-search.kituin.fun/api).
- **Initial scope:** `reverse_search; search_type: reverse`; `forward_search; search_type: forward`.
- **Access:** verify anonymous/API-key requirements and terms with publisher.
- **Source-file tier:** 2 (upstream label only; not Harvy approval).
- **Source note:** PIC Image Search — reverse/forward image search aggregator. Free, no auth.

## Source-file cleanup notes

The YAML repeats `entso_e_outages`; resolve that duplicate before using it as an import manifest. The `example` and `no_public_api` entries are placeholders, not active upstream sources. Records such as `realtime_osint_roadmap`, `owid_lc_reconcile`, `owid_legal_use_summary`, `owid_browser_semantic_search`, `owid_cartograms`, `owid_chartbook`, and `owid_tech_radar` should be reviewed as processing/research artifacts rather than automatically implemented as connectors.
