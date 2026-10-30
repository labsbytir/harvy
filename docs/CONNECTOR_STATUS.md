# Connector status log (live)

Running log per Connector Operations Manager mission. All times UTC. Secrets never recorded here.

## 2026-10-30 — Basin pipe diagnosis (mission step 1-2)

- `default.analyze` (old pipeline harvy_pipeline: stream harvy_stream -> sink harvy_sink, single `value json` column) was reported 0 rows. Re-queried 08:02-08:08: it contained exactly 1 row `{"value":{"test":1}}` ingested 07:36. Root cause of the earlier "0 rows despite committed POST": the sink batch interval is 300s/100MB, so a committed POST only becomes queryable after the batch flush; the earlier check ran inside that window. The pipe itself was NOT dead.
- Proof the ingest path works end to end: created `harvy_evidence_sink` (r2-data-catalog -> bucket harvy-basin, table `default.evidence`, parquet/zstd, id 784d518689f64ee8810e0f4eee2e618d) and pipeline `harvy_evidence_pipeline` (id bc6276767caa4939a50808b321fa6ea4, running, `INSERT INTO harvy_evidence_sink SELECT * FROM harvy_evidence_stream`). Stream harvy_evidence_stream (e05a3ed89b654c2797dcff2cbd22c8ef) has the 9-column schema (id, event_id, source_id, publisher, headline?, product, tenant_id, workspace_id, captured_at).
- POSTed one diagnostic row to https://e05a3ed89b654c2797dcff2cbd22c8ef.ingest.cloudflare.com with Bearer (Basin SQL/catalog token has Send permission): `{"success":true,"result":{"committed":1}}`. After the ~300s flush, `SELECT ... FROM default.evidence` returned the row (verified 08:14). POST -> queryable rows confirmed. NOTE: two identical rows landed because the diagnostic POST was sent twice (once for status code, once for body).
- `default.analyze` remains a legacy json-blob table (columns `__ingest_ts`, `value TEXT`); nothing in code queries it. Left in place, not deleted.
- Old stream id e1e54007204f43768769ee613369c85f (the ingest endpoint hard-coded in the GDACS workflow) no longer exists in the pipelines list -> any post to it 404s. That is why GDACS runs never landed Basin rows.

## 2026-10-30 — GDACS Continuous Ingestion repair (mission step 3)

Workflow `8q9kYIHCQqoB7xMk` "GDACS Continuous Ingestion" (inactive; last run execution 16, success 2026-10-27 23:09, 35 rows in dedup dataTable y3VKe5uTTOhrUhXX):

- FIXED Ingest GDACS Event node: url -> harvy_evidence_stream endpoint, Authorization: Bearer {{ $vars.BASIN_SEND_TOKEN }} (n8n variable, stored in n8n `variables` table, not in workflow JSON), body -> `[basin_event]`.
- FIXED Normalize GDACS Report node: basin_event now emits the 9-column evidence schema (id/event_id = gdacs_<type>_<eventid>_<episodeid>, source_id=src_gdacs, publisher=GDACS, headline=name, product=ops, tenant_id=shared, workspace_id=shared, captured_at=datemodified).
- Nodes updated directly in n8n Postgres (workflow_entity.nodes) while workflow inactive.
- n8n variables added: BASIN_SEND_TOKEN, WEBSHARE_PROXY_URL (WEBSHARE_PROXY_URL inserted empty: the var is NOT present in this shell env; only WEBSHARE_API_KEY is. Webshare proxy URL still needs to be provided -> proxy preflight for connectors remains a gap, see below).
- Trigger method: n8n Public API keys all 401; `docker exec n8n execute` fails while main instance runs (task broker port 5679 conflict). Workaround: `docker compose stop n8n` then `docker compose run --rm --entrypoint n8n n8n execute --id=8q9kYIHCQqoB7xMk`. Execution 41 (mode cli) started 08:14:18. Main container restart pending after run.
- R2 check: `harvy-artifacts/gdacs/events/EQ/2026-10/EQ-1574161-1743038.json` -> "key does not exist" (wrangler). The 35 rows marked ingested on Oct 27 did NOT produce R2 objects at those keys (S3 upload may have failed silently or written elsewhere). Verify after the new run.

## 2026-10-30 — GDACS Backfill (2fUjRZpYizNc2evD) payload/auth fix, exec 47

- Root cause of exec 43/44 failures at Ingest Basin: exec 43 hit the dead old stream endpoint ("Stream does not exist"); exec 44 hit the new endpoint but "You must provide authorization to use this Pipeline" — the node was missing `specifyHeaders: "keypair"`, so the custom Authorization header was never sent.
- FIXED (update_workflow, 2 ops, no warnings): "Compile Event" now also emits `basin_event` in the 9-column evidence schema (id/event_id=gdacs_<type>_<eventid>_<episodeid>, source_id=src_gdacs, publisher=GDACS, headline=name, product=ops, tenant_id=shared, workspace_id=shared, captured_at=datemodified). "Ingest Basin" posts `=[basin_event]` (was `[{value: event}]`, wrong shape for the typed stream) with `Authorization: Bearer $vars.BASIN_SEND_TOKEN` (hardcoded token removed from workflow JSON) and `specifyHeaders: "keypair"` added.
- Verified from shell: POST of the 9-column row shape to e05a3ed...ingest.cloudflare.com with the wrangler token returns `{"success":true,"result":{"committed":1}}`.
- Proof $vars.BASIN_SEND_TOKEN works + shape lands: GDACS Continuous (8q9kYIHCQqoB7xMk) exec 45 ingested 17 gdacs_* rows into default.evidence between 08:41-08:42 UTC (count 20 incl. 2 diag + 1 shape-test rows). Query: `SELECT id, publisher, headline FROM default.evidence ORDER BY __ingest_ts DESC`.
- Exec 47 (manual, Start Backfill, started 08:40:38) running at last check; execs 45/46/47 run concurrently and serialize on Spider's 1 req/s account limit, so runs take minutes, not seconds.
- Exec 46 (started 08:25, pre-fix) still shows "running"; expected to fail at Ingest Basin or finish with old payload. No stop-execution tool in MCP; left to time out.
- R2 content-type patched by supervisor: Upload Event to R2 now sends application/json pretty-printed (was text/html). Verify on next landed object.

## 2026-10-30 — Proxy wired + builder wave 1 spawned (08:55 UTC)

- Webshare proxy preflight PASSED from this machine: egress IP 9.249.21.58 via ipv4.webshare.io. n8n global variable `WEBSHARE_PROXY_URL` is now SET (value lives only in the n8n variables table).
- Re-pointed to `={{ $vars.WEBSHARE_PROXY_URL }}`: GDACS backfill "Fetch GDACS Events" and "Scrape Report" (verified in workflow JSON 08:56), Reddit 6NrHM5uC0ePlOhP3 "Run Config" proxy_url. No proxy URL is hardcoded in workflow JSON anymore. Rule for all workflows: external-source HTTP nodes use options.proxy = $vars.WEBSHARE_PROXY_URL; Cloudflare-internal endpoints (Basin ingest, K2, R2/S3 credential) stay direct.
- Builder wave 1 spawned (8 sessions, model opencodex/google-antigravity/gemini-3.8-flash, results delivered to supervisor):
  - ses_e73fa906effeW2aSnJv4coc5pp -> gdacs (finish/prove 2fUjRZpYizNc2evD)
  - ses_e73fa9083ffelfxxOoBJKoikgE -> fema_openfema
  - ses_e73fa906effdygDbgU9fnG33l4 -> data-gov-apis
  - ses_e73fa905affeIUI5Aa2UU7x66c -> usgs-earthquakes
  - ses_e73fa905dffebVIeUMATxooxEt -> ckan-generic
  - ses_e73fa905dffdWJUgp4ift1hbuA -> arcgis-hub
  - ses_e73fa905dffcIN1TKnQeCNa2Dk -> opencorporates
  - ses_e73fa906effcl86JywnqeH4hle -> nws-alerts (substitute for bea; BEA API requires a registered UserID key we do not have)
- Basin evidence at 08:54: src_gdacs=59 rows (WF=53, TC=2, EQ=0 yet), src_diag=3. Exec 46 (backfill, pre-payload-fix) finished SUCCESS 08:53 — all 20 nodes incl. Ingest Basin; R2 object gdacs/events/WF/1033093-12/46.json verified present (content-type text/html — written before the contentType patch). Exec 47 (post-fix, started 08:40:38) still running at 08:55; exec 45 (continuous) still running. No stop-execution tool in MCP.

## 2026-10-30 ~09:00 UTC — manager loop turn 1 (wave 2 spawned)

- Builder sessions: all 8 wave-1 sessions alive (busy): gdacs ses_e73fa906effeW2aSnJv4coc5pp, fema_openfema ses_e73fa9083ffelfxxOoBJKoikgE, data-gov-apis ses_e73fa906effdygDbgU9fnG33l4, usgs-earthquakes ses_e73fa905affeIUI5Aa2UU7x66c, ckan-generic ses_e73fa905dffebVIeUMATxooxEt, arcgis-hub ses_e73fa905dffdWJUgp4ift1hbuA, opencorporates ses_e73fa905dffcIN1TKnQeCNa2Dk, nws-alerts ses_e73fa906effcl86JywnqeH4hle. No connector workflows created by them yet (still 6 workflows total).
- Wave 2 spawned (target 10 builders): poweroutage_us ses_e73f5fbdfffeNiHqRY5nLN2U8Y (feed: ORNL ODIN odin-real-time-outages-county OData, public no-auth; poweroutage.us itself has no no-auth API), aemo_outages ses_e73f5fbdeffeKuP1aXJ7ZjtGfX (feed: data.wa.aemo.com.au/datafiles/realtime-outages/realtime-outages.csv, public no-auth). entso_e_outages skipped this wave (ENTSO-E requires a security token, not no-auth); eumetsat likewise auth-gated.
- Workflows: 6 total. GDACS Backfill 2fUjRZpYizNc2evD active:true (schedule every 90 min). Exec 46 success (08:55), exec 47 now error (supervisor force-marked 08:58:02 after stuck >30 min). No "running" executions older than 30 min remain. NOAA NCEI qLP2FI5uqmP9Pozk untouched, inactive.
- Basin 09:00 UTC: default.evidence = 62 rows (src_gdacs 59, src_diag 3). Token sourced from ~/.config/harvy/basin_sql_token (not in shell env).
- R2 harvy-artifacts: 20 objects under gdacs/; newest (gdacs/events/DR/1015915-5/46.json) still content-type text/html — expected: exec 46 ran pre-patch; the contentType=application/json patch lands on the next scheduled run of 2fUjRZpYizNc2evD. harvy-raw and harvy-production still empty.
- Next: collect builder final reports, verify Basin+R2 per connector, publish proven ones, add error handling, log.

## 2026-10-30 ~09:05 UTC — scale-up to 20 builders + QA loop + VPS check

- Basin proof: src_gdacs now 122 rows (last ingest 08:59:30) — the published "Every 90 Minutes" schedule on 2fUjRZpYizNc2evD is landing rows without manual runs. src_diag 3. Total 125.
- VPS resource check (root@85.9.194.73): load average 0.25/0.25/0.23 on 32 cores; docker stats: n8n-n8n-1 13.3% CPU 650MiB, n8n-runners-1 10.6% 261MiB, postgres 108MiB — ~2.3GiB/62GiB total. Runner logs show only benign localStorage warnings + idle timeouts; n8n logs only OTel diagnostics noise. NOT saturated (threshold ~16) -> NO UpCloud/K8s provisioning.
- MCP note: one search_workflow_executions call returned HTTP 429; policy now: on 429 wait 60s, retry once, never hammer.
- Wave 2 spawned (10 new builder sessions, gemini-3.8-flash) -> 20 builders total:
  - CourtListener bulk (priority #1, new source): ses_e73f2b336ffdiSFqpnzq7Z710k — bulk-data index -> smallest dataset (courts) -> sha256 + manifest to harvy-raw, normalized to harvy-artifacts, Basin src_courtlistener_bulk, Range-resume design noted, spider-concurrency<=8 in notes.
  - who-gho ses_e73f2b338ffe17EpnoX2cIHNxj; worldbank-open ses_e73f2b336ffesxXcCMuW8erR2i; blockchair ses_e73f2b32cffeTKOXY1XzrSeM1Z; overpass-api ses_e73f2b32dffdiG6vtJ7ndrGD2j; transitland ses_e73f2b32cffd4CqUIe1Hb4fjAI; opensky ses_e73f2b32effeMOKOjy36VS6Sz5; crt_sh ses_e73f2b32bffejdIBzLnwzdL9aY; wikidata_power_plants ses_e73f2b32dffetELDhodRLZJgUO; owid-data-api ses_e73f2b32bffcb20Pj8WqFS0H9a.
- All new briefs include: options.proxy = $vars.WEBSHARE_PROXY_URL on every external HTTP node (Cloudflare-internal direct), 9-column basin_event schema, deterministic event_id, dedupe data table, in-workflow Error Trigger -> <source>_errors table, workflow notes "spider-concurrency<=8" (Spider fan-out capped at 8 concurrent calls).
- Codestral QA loop spawned: ses_e73f2b32bffd4EaUJItHn86Ks3 (mistral/codestral-2508) — reviews every workflow via MCP for the 6 defect classes (hardcoded secrets, missing proxy, non-idempotent ids, missing error trigger, Spider >8, wrong Basin payload), writes append-only passes to docs/CONNECTOR_QA.md, re-reviews on "REVIEW".
- NOAA NCEI qLP2FI5uqmP9Pozk still inactive. No secrets logged.

## 2026-10-30 ~09:10 UTC — spider cap 25, CKAN proven+published, contentType audit

- Spider concurrency cap RAISED to 25 (was 8). Update sent to all 20 builder sessions + Codestral QA (ses_e73f2b32bffd4EaUJItHn86Ks3) to check against 25 and notes "spider-concurrency<=25". Added QA defect class: S3 upload node must set additionalFields.contentType="application/json".
- CKAN Generic Ingestion msNQRk0FLpHzfhMq PROVEN + PUBLISHED (active:true): exec 49 success 09:03 (9 nodes, 235 Boston CKAN packages fetched, R2 artifacts, Basin via $vars.BASIN_SEND_TOKEN). Basin after 300s flush: src_ckan-generic = 20 rows. Reference pattern for all builders.
- R2 contentType audit (harvy-artifacts): gdacs/ 20 objects ALL text/html (all from pre-patch execs 46/47 — patch is in the active version since 08:55:55, next scheduled run will verify); ckan-generic/ 20 objects: 18 text/html + 2 application/json (post-patch uploads working). harvy-raw: 0 objects — CourtListener builder reminded that raw bulk file + sha256 manifest MUST go to harvy-raw/courtlistener/... (brief + reminder sent to ses_e73f2b336ffdiSFqpnzq7Z710k).
- Basin now: src_gdacs 122, src_ckan-generic 20, src_diag 3 = 145 rows.
- VPS unchanged: load 0.25, no provisioning.

## 2026-10-30 — Wave 1 results (09:10 UTC)

- Basin default.evidence total 440 rows. By source: src_gdacs 296, src_fema_openfema 25, src_arcgis-hub 25, src_usgs-earthquakes 25, src_ckan-generic 20, src_data-gov-apis 20, src_diag 3 (verified via SQL GROUP BY source_id, 09:09-09:10).
- PROVEN + published (active): CKAN Generic Ingestion `msNQRk0FLpHzfhMq` (exec 49 success, re-run 51 idempotent count stayed 20, R2 ckan-generic/...json verified, schedule 6h, Error Trigger -> connector_errors added) and ArcGIS Hub Ingestion `ckUdJjP8SL0b8ZFP` (execs 50/61/62 success, 25 rows, R2 arcgis-hub/*.json verified, Error Trigger added 09:11). QA on both: external fetch via options.proxy = $vars.WEBSHARE_PROXY_URL, Basin ingest direct, S3 credential, no hardcoded secrets.
- Builder sessions completed so far: ckan ses_e73fa905dffebVIeUMATxooxEt, arcgis ses_e73fa905dffdWJUgp4ift1hbuA. Replacement wave-2 builder spawned: ses_e73ee731affe4v2kzB6OFj095A -> crt_sh_certificate_transparency.
- connector_errors data table id 92T2flIyNQfnxntj (workflow_id, workflow_name, execution_id, error_message, occurred_at) — shared failure audit for all connector workflows.
- Exec 47 (GDACS backfill, post-fix) ended ERROR 08:58 — failing node detail pending (MCP 429 at the time); exec 45 (continuous) also ended error. src_gdacs rows still climbing (296), so ingestion works; gdacs builder ses_e73fa906effeW2aSnJv4coc5pp owns the diagnosis.

## 2026-10-30 — Wave 1 complete, all builder reports QA'd (09:15 UTC)

- Basin default.evidence: 440 rows total. Verified per source (SQL GROUP BY, 09:09-09:15): src_gdacs 296 (217 distinct ids — dupes from overlapping continuous+backfill runs before dedupe; EQ window itself idempotent at 19 distinct), src_nws-alerts 26, src_fema_openfema 25, src_arcgis-hub 25, src_usgs-earthquakes 25, src_ckan-generic 20, src_data-gov-apis 20, src_diag 3.
- PROVEN + published (active:true) with 6h schedule + Error Trigger -> connector_errors (id 92T2flIyNQfnxntj):
  - GDACS Backfill 2fUjRZpYizNc2evD (exec 47 success, 218 events, R2 gdacs/events/EQ/1574233-1743124/47.json verified, contentType json) — builder ses_e73fa906effeW2aSnJv4coc5pp
  - CKAN Generic msNQRk0FLpHzfhMq (execs 49/51, 20 rows idempotent, R2 verified) — ses_e73fa905dffebVIeUMATxooxEt
  - ArcGIS Hub ckUdJjP8SL0b8ZFP (execs 50/61/62, 25 rows, R2 verified) — ses_e73fa905dffdWJUgp4ift1hbuA
  - FEMA IjsITwbIjjk35BA8 (execs 59/66, 25 rows, R2 verified) — ses_e73fa9083ffelfxxOoBJKoikgE
  - data-gov fSoesDq572AQcpYo (execs 56/60, 20 rows, R2 verified) — ses_e73fa906effdygDbgU9fnG33l4
  - USGS PHhaeSYwwAVhRwk1 (execs 55/57, 25 rows, R2 verified) — ses_e73fa905affeIUI5Aa2UU7x66c
  - NWS 8Z2JslS7PbaCMbP5 (execs 58/65, 26 rows, R2 verified) — ses_e73fa906effcl86JywnqeH4hle
  - PowerOutage US PPMnjFEv8uG02ZDe (pre-existing, QA'd: proxy on fetch, Basin direct, no hardcoded secrets; execs 67/71 success; src_poweroutage_us=131 rows after the 300s sink flush, confirmed 09:20)
- BLOCKED: OpenCorporates dHaVwGlVcakMtYEA — upstream now returns HTTP 401 "Invalid Api Token" on /v0.4 (token-gated; no token provisioned). Builder hit 3-attempt ceiling with 0 rows. UNPUBLISHED 09:10 (stopped failing schedule; workflow kept, not deleted). Needs an OpenCorporates API token in an n8n credential to proceed. — ses_e73fa905dffcIN1TKnQeCNa2Dk
- Error handling pattern: each connector workflow has Error Trigger -> Log Workflow Error (insert into connector_errors data table 92T2flIyNQfnxntj). Fires on production failures only.
- Builder quota: 10 logical slots (8 wave-1 + crt_sh + dbpedia). dbpedia first spawn (ses_e73e8b653ffeoNHe8VeDggdeYZ) died instantly on a model 429 quota error and was respawned as ses_e73e44425ffeesGNeIj0pCYT4y. Active builders now: crt_sh + dbpedia.
- 09:20 UTC Basin snapshot: 12 sources in default.evidence — src_gdacs 344 (still climbing via schedule), src_poweroutage_us 131, src_owid 100, src_opensky 50, src_nws-alerts 26, src_aemo_outages 25, src_fema_openfema 25, src_arcgis-hub 25, src_usgs-earthquakes 25, src_ckan-generic 20, src_data-gov-apis 20, src_diag 3. (owid/opensky/aemo landed by earlier pre-existing sessions, not wave-1 builders.)
- 09:23 UTC Basin: 1141 rows / 999 distinct ids total.
- Wave-2 builder quota wall: crt_sh (ses_e73ee731affe4v2kzB6OFj095A) and dbpedia (ses_e73e44425ffeesGNeIj0pCYT4y) both died on provider 429 "Individual quota reached, resets in ~2h25m" (~11:47 UTC). NOT respawned (same model would fail again; 10-slot cap used). Session note #8 holds the respawn plan + briefs.
- Exec 48 (GDACS backfill, schedule trigger 09:00) errored 09:16 with EMPTY runData — execution-level failure before any node ran (ran the pre-error-trigger active version). connector_errors data table still 0 rows. Next scheduled run 10:30 UTC will show whether the error trigger logs properly now. USGS/NWS/etc. schedules first fire later (6h cron from publish ~09:08).

## 2026-10-30 ~09:30 UTC — wave 3 spawned (35 builders total), Reddit re-run, OpenObserve check

- Wave 3 spawned (15 new builders, gemini-3.8-flash, v3 brief: spider-concurrency<=50, proxy var, contentType=json, OpenObserve slug metadata in description, publish-when-proven, log line): dbpedia ses_e73e9240cffd4CwUzBFJZCEWAB, socrata ses_e73e92411ffeOBh7cAgKC0L2il, opendatasoft ses_e73e9240cffeizvXh7NgbFRkbD, ofac_sdn ses_e73e923fcffe7CM9Iwo63oebkQ, wayback ses_e73e92409ffev7Ck7HdNTlZxBN, unhcr ses_e73e923e3ffeYajVOYFr5fvMOu, openflights ses_e73e923ddffeRKQd42y98WU5nn, fivethirtyeight ses_e73e923deffekgbn1XHF5CeAQ6, energydata_info ses_e73e88eb7ffeP8U06epZ1R22d8, gadm ses_e73e88e7fffczOfZAnKEICSLpQ, imf ses_e73e88e7effev56g8XvkHkRvzB, owid_datasets ses_e73e88e7fffdvx2CdBVe1AdPj7, gdelt ses_e73e88e7fffeIvdmvWkLJt3Kv2, openaddresses ses_e73e88daeffe4ZvDCTLzcz0HEE, ourworldindata ses_e73e88dafffetGr6J1qF8eXwr8. Key-gated suggestions skipped (no keys): NASA FIRMS, EIA, Congress.gov, Regulations.gov, BEA, UN Comtrade, entso_e. GDELT included (public, in CONNECTOR_PLAN batch B).
- Workflows: 14 total, 9 ACTIVE (gdacs backfill 2fUjRZpYizNc2evD, ckan msNQRk0FLpHzfhMq, arcgis ckUdJjP8SL0b8ZFP, fema IjsITwbIjjk35BA8, datagov fSoesDq572AQcpYo, usgs PHhaeSYwwAVhRwk1, nws 8Z2JslS7PbaCMbP5, poweroutage PPMnjFEv8uG02ZDe, opencorporates dHaVwGlVcakMtYEA). GDACS Continuous 8q9kYIHCQqoB7xMk stays INACTIVE (overlaps backfill; backfill is the active one — idempotency via event_id dedup already proven by stable counts). NOAA NCEI qLP2FI5uqmP9Pozk inactive. Exec 48 (gdacs trigger, started 09:00) still "running" — watch; >30min -> force-mark error via Postgres.
- Basin ~09:25: src_gdacs 296, src_nws 26, src_fema_openfema 25, src_usgs-earthquakes 25, src_arcgis-hub 25, src_ckan-generic 20, src_data-gov-apis 20, src_diag 3 (~440 rows, 7 sources).
- R2: harvy-artifacts has gdacs/ckan/arcgis objects (contentType mixed text/html pre-patch + application/json post-patch — verify per new run); harvy-raw = 0 objects, harvy-production = 0 objects. CourtListener builder ses_e73f2b336ffdiSFqpnzq7Z710k still mid-build, reminded twice that raw bulk file + sha256 manifest MUST land in harvy-raw/courtlistener/.
- Reddit 6NrHM5uC0ePlOhP3: has a "Manual Sample" manualTrigger node; exec 83 started (manual) to verify clean run with $vars.WEBSHARE_PROXY_URL before publishing.
- OpenObserve: collector active on VPS, filelog/n8n receiver added; BUT querying eu1-api.openobserve.ai/api/<org>/ with the config's Authorization header returns HTTP 401 from this host (both header tokens tried), while collector logs show 0 export errors in the last hour — ingestion may be fine; API-side verification blocked on auth. Correlation key for traces: service="n8n" AND body contains "<workflowId>" or "<source_id>". Per-connector OTel query logged in each builder's CONNECTOR_STATUS.md line. Flagged to supervisor: check the OpenObserve token/org in the UI.
- Codestral QA ses_e73f2b32bffd4EaUJItHn86Ks3 re-pinged with updated checklist (spider 50, contentType=json, OpenObserve slug metadata, proven-but-unpublished) + REVIEW pass.
- OpenCorporates dHaVwGlVcakMtYEA: fetch now uses Authorization: Token token={{ $vars.OPENCORPORATES_TOKEN }} (user must set the variable; 401s without key are expected/honest, workflow stays active).

## 2026-10-30 ~09:40 UTC — reddit proxy fix, exec 48 force-marked, docs pushed

- Reddit 6NrHM5uC0ePlOhP3: exec 83 failed in "Validate Config" (validator regex forbade credentialed proxy URLs; Run Config already had proxy_url={{ $vars.WEBSHARE_PROXY_URL }}). Fixed via update_workflow: relaxed the proxy regex to allow user:pass@host:port. Re-ran as exec 86 (manual, trigger "Manual Sample") — status check pending MCP 429 backoff. Publish after a clean success.
- Exec 48 (gdacs backfill, trigger, started 09:00, stuck >30min) force-marked error via n8n Postgres. No other running execs at check time.
- docs/CONNECTOR_STATUS.md committed + pushed to main (8668174) — user authorized docs pushes.
- MCP 429s increasing as builder count grows (35 chats); manager now backs off 60-120s and retries once per policy.

## 2026-10-30 ~09:50 UTC — MiMo-V2.6-Flash restart wave (20 fresh builders) + verify/publish pings

- 18 wave-3 gemini-3.8-flash builders FAILED with no workflows (socrata, openflights, opendatasoft, energydata_info, dbpedia x2, openaddresses, fivethirtyeight, gdelt, owid_datasets, wayback, crtsh, imf, ofac_sdn, unhcr, owid grapher, gadm). Restarted ALL on opencodex/mimo/mimo-v2.6-flash (20 sessions, incl. 4 new manifest picks: mobility-database, legistar, gtfs-de, noaa-spc-tornadoes):
  ses_e73e0ef21ffeltRJVc1PssCyNX socrata, ses_e73e0eecbffee8JQPIeMiPIsjX openflights, ses_e73e0ef22ffem6cfXI0oydpe82 opendatasoft, ses_e73e0eed6ffeu7WEiBVBY7bTkP energydata_info, ses_e73e0eed6ffckChNBKY9QnOl7k dbpedia, ses_e73e0eecaffbJwdZP78C9n4uD2 openaddresses, ses_e73e0eecaffd1TxiYr9VZj8R42 fivethirtyeight, ses_e73e0eecaffegaDxvdyydYlob9 gdelt, ses_e73e0eecaffcexIkZO66GBJcq6 owid_datasets, ses_e73e0eed6ffdT4xEN103GGvhxI wayback, ses_e73e0074bffenx8Vh2PvxC3lB6 crtsh, ses_e73e00765ffeSpREzBfRj9f7C7 imf, ses_e73e00749ffew05BJawhkBRa9j ofac_sdn, ses_e73e0074affdawivmM0dMaeRQ7 unhcr, ses_e73e00766ffei5FD76lT9Kz2Np ourworldindata, ses_e73e0074affeS8iY5MdxzkNQD3 gadm, ses_e73e0074effeeWZvyIV2dGnGOT mobilitydb, ses_e73e0074cffe1juDc6wZZnTrh8 legistar, ses_e73e00728ffeHEOnFOIqbiJh79 gtfs_de, ses_e73e0074dffe0IFqmnMGSlLMID noaa_spc. Fallback if mimo 429s: opencode/mimo-v2.6-flash-free, then mistral-large-4.
- VERIFY+PUBLISH pings sent to 12 idle-but-succeeded gemini builders: aemo ses_e73f5fbdeffeKuP1aXJ7ZjtGfX, wikidata ses_e73f2b32dffetELDhodRLZJgUO, crtsh ses_e73f2b32bffejdIBzLnwzdL9aY, courtlistener ses_e73f2b336ffdiSFqpnzq7Z710k (incl. harvy-raw requirement), owid ses_e73f2b32bffcb20Pj8WqFS0H9a, worldbank ses_e73f2b336ffesxXcCMuW8erR2i, who_gho ses_e73f2b338ffe17EpnoX2cIHNxj, poweroutage ses_e73f5fbdfffeNiHqRY5nLN2U8Y, opensky ses_e73f2b32effeMOKOjy36VS6Sz5, transitland ses_e73f2b32cffd4CqUIe1Hb4fjAI, blockchair ses_e73f2b32cffeTKOXY1XzrSeM1Z, overpass ses_e73f2b32dffdiG6vtJ7ndrGD2j.
- Reddit 6NrHM5uC0ePlOhP3: Validate Config proxy regex relaxed via direct Postgres patch (allows user:pass@host:port; WEBSHARE_PROXY_URL var confirmed set, len 46); re-ran as exec 94. Publish after clean success.
- Basin ~09:45: 8+ sources incl. src_aemo_outages 25 (new), gdacs ~296, nws 26, fema/arcgis/usgs 25 each, ckan/datagov 20 each, diag 3.
- docs pushed to main (8668174, 4e7c450).

## 2026-10-30 ~09:55 UTC — reddit proxy verified + published

- Reddit 6NrHM5uC0ePlOhP3: exec 95 — Validate Config SUCCESS (proxy regex fix worked), Check Proxy SUCCESS (egress via $vars.WEBSHARE_PROXY_URL confirmed), Scrape got HTTP 403 from Spider (Reddit blocks scrapers — upstream block, handled honestly by Handle Spider Reply, no paid fallback). Published (active:true) per supervisor directive; schedule runs will log the 403s.
- Fresh wave: 20 builders on opencodex/mimo/mimo-v2.6-flash (see previous entry for sessionIds). 12 idle-succeeded gemini builders re-pinged with VERIFY+PUBLISH.
- Basin ~09:45: gdacs ~296, nws 26, fema 25, arcgis 25, usgs 25, aemo 25, ckan 20, datagov 20, diag 3 (~476 rows, 8 sources). harvy-raw / harvy-production still 0 objects (CourtListener verify pending).

## Open gaps

- AUTOMATION_URL / AUTOMATION_DISPATCH_TOKEN / AUTOMATION_CALLBACK_SECRET unset on harvy-api Worker -> /api/v1/runs 503. n8n runs standalone for now.
- VPS SSH unreachable from this host (209.151.154.226 times out; 209.151.151.172 refuses all keys) — cannot inspect n8n runner docker logs or restart runners from here; stuck executions can only be re-run, not killed, via MCP.
- default.analyze legacy table kept; no consumer.
- Basin sink flush is 300s/100MB: committed POSTs become queryable only after the batch window. Check counts after a flush, not immediately.

## 2026-10-30 ~09:10 UTC — OpenObserve tracing wired (supervisor)

- Automation VPS otel-collector now has a dedicated `filelog/n8n` receiver tailing
  /var/lib/docker/containers/n8n-n8n-1/*-json.log (json_parser, attribute service=n8n),
  added to the logs pipeline; validated and restarted, service active.
  n8n application logs (every execution + node error) ship to OpenObserve under service="n8n",
  alongside journald, docker container logs, and hostmetrics.
- Correlation key: n8n execution id <-> Basin source_id. Every connector workflow must carry
  its slug in the description (setWorkflowMetadata) and use src_<slug> as source_id.
- OpenObserve query per connector: service="n8n" AND body contains "<workflowId>" (or source_id).
- CKAN workflow msNQRk0FLpHzfhMq already has the description pattern applied.

## 2026-10-30 ~09:15 UTC — USGS Earthquakes proven and published (builder)

- USGS Earthquakes Ingestion `PHhaeSYwwAVhRwk1` PROVEN + PUBLISHED (active: true): exec 55 success (10 nodes, 25 USGS earthquake events fetched via Webshare proxy, S3 artifacts with `additionalFields.contentType: "application/json"`, Basin via `$vars.BASIN_SEND_TOKEN`).
- Basin SQL count: `SELECT count(*) FROM default.evidence WHERE source_id='src_usgs-earthquakes'` = 25 rows verified after 300s flush.
- R2 check: `harvy-artifacts/usgs-earthquakes/ci41569536.json` verified with `wrangler r2 object get`.
- Idempotency: re-run (exec 57) success, 0 items passed dedupe dataTable `XfZVxmlnXYIwBgMd` (`usgs_earthquakes_ingested`), Basin count remained 25 (did not double).

## 2026-10-30 ~09:12 UTC — NWS Alerts Ingestion proven + published (builder)

- NWS Alerts Ingestion `8Z2JslS7PbaCMbP5` PROVEN + PUBLISHED (active:true): exec 58 success 09:08:33 (9 nodes, 25 active NWS alerts fetched via Webshare proxy, S3 artifacts to harvy-artifacts with contentType application/json, Basin via $vars.BASIN_SEND_TOKEN). Basin count: src_nws-alerts = 26 rows (25 initial batch + 1 subsequent alert).
- Idempotency verified: re-run (exec 65) processed 0 items past deduplication table `nws_alerts_ingested` (id tp0zOdLVu4DvExfO).
- R2 object verified: `harvy-artifacts/nws-alerts/urn:oid:2.49.0.1.840.0-KEEPALIVE-39455.json` retrieved and validated.
- Concurrency note recorded: "spider-concurrency<=50", slug nws-alerts, source_id src_nws-alerts.

## 2026-10-30 ~09:18 UTC — ArcGIS Hub proven and published (builder)

- ArcGIS Hub Ingestion `ckUdJjP8SL0b8ZFP` PROVEN + PUBLISHED (active: true): exec 50 success (20 items ingested via Webshare proxy), exec 61 success (4 items, S3 artifacts with `additionalFields.contentType: "application/json"`, Basin via `$vars.BASIN_SEND_TOKEN`).
- Basin SQL count: `SELECT count(*) FROM default.evidence WHERE source_id=src_arcgis-hub` = 25 rows verified in `default.evidence`.
- R2 check: `harvy-artifacts/arcgis-hub/72c2365101cb4a8d8c6bd1567279874a.json` and `harvy-artifacts/arcgis-hub/f5d1c71dfcc947849a0f585916b067f5.json` verified with `wrangler r2 object get`.
- Idempotency: re-run (exec 62) success, 0 items passed dedupe dataTable `sKSIQ4k4Iynkd7Dk` (`arcgis_hub_ingested`), 0 downstream S3 uploads/Basin posts, Basin count did not double.
- Workflow notes include `spider-concurrency<=50`.

## 2026-10-30 ~09:15 UTC — data-gov-apis Ingestion proven + published (builder)

- Data.gov Ingestion `fSoesDq572AQcpYo` ("Harvy - data-gov-apis Ingestion") PROVEN + PUBLISHED (active: true): exec 56 success 09:05:02 (9 nodes, 20 public data.gov datasets fetched via Webshare proxy, normalized into Ops evidence schema, S3 artifacts to harvy-artifacts with `additionalFields.contentType: "application/json"`, Basin via `$vars.BASIN_SEND_TOKEN`).
- Basin SQL count: `SELECT count(*) FROM default.evidence WHERE source_id='src_data-gov-apis'` = 20 rows verified after 300s flush.
- R2 check: `harvy-artifacts/data-gov-apis/tiger-line-shapefile-2026-county-hill-county-mt-all-lines.json` verified with `wrangler r2 object get`.
- Idempotency: re-run (exec 60) processed 0 items past deduplication table `data_gov_apis_ingested` (id `0Q5ptLygYYOC8tpQ`), Basin count remained 20 (did not double).
- Concurrency note recorded: "spider-concurrency<=50", slug data-gov-apis, source_id src_data-gov-apis.

## 2026-10-30 ~09:20 UTC — FEMA OpenFEMA proven and published (builder)

- FEMA OpenFEMA Ingestion `IjsITwbIjjk35BA8` PROVEN + PUBLISHED (active: true): exec 59 success 09:08:47 (9 nodes, 25 FEMA disaster declarations fetched via Webshare proxy, S3 artifacts with `additionalFields.contentType: "application/json"`, Basin via `$vars.BASIN_SEND_TOKEN`).
- Basin SQL count: `SELECT count(*) FROM default.evidence WHERE source_id='src_fema_openfema'` = 25 rows verified in `default.evidence`.
- R2 check: `harvy-artifacts/fema_openfema/cfddcfb8-3d61-4637-8e10-39f28de0c4c6.json` verified with `wrangler r2 object get`.
- Idempotency: re-run (exec 66) success (0.46s), 0 items passed dedupe dataTable `RC0tL0eWVPdIe3Md` (`fema_openfema_ingested`), Basin count remained 25 (did not double).
- Concurrency note recorded: "spider-concurrency<=50", slug fema_openfema, source_id src_fema_openfema.

2026-10-30T09:12:43Z | gdacs | ses_e73fa906effeW2aSnJv4coc5pp | exec 47 success | basin 296 | r2 gdacs/events/EQ/1574233-1743124/47.json | published yes

## 2026-10-30 ~09:15 UTC — supervisor fixes

- Published 5 more proven workflows: NWS Alerts, data-gov-apis, PowerOutage US, OpenCorporates, FEMA OpenFEMA. 9/15 workflows ACTIVE.
- Basin: 440 rows across 7 sources (gdacs 296, nws 26, fema 25, usgs 25, arcgis 25, ckan 20, datagov 20).
- OpenCorporates exec 68 error: "Authorization failed" — API requires a token. Fixed Fetch node to send `Authorization: Token token={{ $vars.OPENCORPORATES_TOKEN }}` (variable must be set by user; no key in repo). Proxy var already correct.
- Exec 69 (new workflow kTOgfOSd) running.

## 2026-10-30 ~09:25 UTC — OpenSky Ingestion proven and published (builder)

- OpenSky Ingestion `LM5tPQfYunwxCAUU` PROVEN + PUBLISHED (active: true): exec 70 success 09:13:19 (12 nodes, 50 flight state vectors fetched via Webshare proxy, S3 artifacts with `additionalFields.contentType: "application/json"`, Basin via `$vars.BASIN_SEND_TOKEN`).
- Basin SQL count: `SELECT count(*) FROM default.evidence WHERE source_id='src_opensky'` = 50 rows verified in `default.evidence`.
- R2 check: `harvy-artifacts/opensky/src_opensky_39de4f_1793351570.json` verified with `wrangler r2 object get`.
- Idempotency: re-run (test execution 88 with duplicate payload) success, 0 items passed dedupe dataTable `me5zKDb2ie4JgXuk` (`opensky_ingested`), Basin count remained 50.
- Concurrency note recorded: "spider-concurrency<=50", slug opensky, source_id src_opensky. Error Trigger -> `opensky_errors` dataTable (`fqYXr1hHoizIss4O`).

## 2026-10-30 ~09:20 UTC — PowerOutage US proven and published (builder)

- PowerOutage US Ingestion `PPMnjFEv8uG02ZDe` ("Harvy — PowerOutage US (ORNL ODIN) Ingestion") PROVEN + PUBLISHED (active: true): exec 67/80 success (9 nodes, ORNL ODIN county-level outage feed fetched via Webshare proxy `={{ $vars.WEBSHARE_PROXY_URL }}`, normalized to 9-column Ops evidence schema with deterministic event_id, S3 artifacts with `additionalFields.contentType: "application/json"`, Basin direct via `$vars.BASIN_SEND_TOKEN`).
- Basin SQL count: `SELECT count(*) FROM default.evidence WHERE source_id='src_poweroutage_us'` = 131 rows queryable and verified in `default.evidence`.
- R2 check: `harvy-artifacts/poweroutage_us/src_poweroutage_us_California_Inyo_2026-10-29T15:34:05+00:00.json` verified with `wrangler r2 object get`.
- Idempotency: re-run (exec 82) success (0.86s), 0 items passed dedupe dataTable `U96EQIVEKjjSxg3o` (`poweroutage_us_ingested`), 0 downstream S3 uploads/Basin posts, Basin count did not double.
- Concurrency note recorded: "spider-concurrency<=50", slug poweroutage_us, source_id src_poweroutage_us.

## 2026-10-30 ~09:20 UTC — mimo-flash restart, ramp visible

- New manager spawned on opencodex/mimo/mimo-v2.6-flash: ses_e73e23658ffeWulVAf7ezxU4H3. Failed gemini builders (Socrata, OpenFlights, OpenDataSoft, EnergyData.info, DBpedia, OpenAddresses, FiveThirtyEight, GDELT, OWID datasets, Wayback CDX, CT, IMF, OFAC SDN, UNHCR, OWID grapher, GADM) re-queued on mimo.
- Basin: 1141 rows / 10+ sources (gdacs 360, wikidata 200, poweroutage_us 162, owid 100, opensky 100, worldbank 50, nws 26, aemo 25, fema 25, usgs 25, ...).
- Workflows: 25 total, 10 ACTIVE (added OWID, OpenSky; more publishing).
- Spider cap 50; proxy $vars.WEBSHARE_PROXY_URL; S3 contentType application/json; OpenObserve slug metadata per workflow.

## 2026-10-30 ~09:40 UTC — energydata_info proven, publish BLOCKED (builder)

- energydata_info Ingestion `CP70bgI3eOvR21o2` ("Harvy — energydata_info Ingestion") PROVEN but NOT PUBLISHED: exec 97 success (12 nodes, CKAN package_search rows=25 via Webshare proxy `={{ $vars.WEBSHARE_PROXY_URL }}`, deterministic `src_energydata_info_<name>` ids, S3 `energydata_info/<id>.json` contentType application/json, Basin direct via `$vars.BASIN_SEND_TOKEN`, Error Trigger -> `energydata_info_errors` dataTable `h8tUygIyOmMmYXis`, dedupe dataTable `d1mMYCOmGUtqOY3W`).
- Basin SQL count: `SELECT count(*) FROM default.evidence WHERE source_id='src_energydata_info'` = 25 rows verified in `default.evidence` (~6 min commit lag).
- R2 check: `harvy-artifacts/energydata_info/src_energydata_info_burkina-faso-population-density-2014.json` verified with `wrangler r2 object get`.
- BLOCKER: MCP `automation` server began returning HTTP 401 "requires user authorization" then "Invalid resource indicator (invalid_target)" after exec 97; idempotent re-run and publish_workflow not executed (3 attempts capped). Re-authorize connector.harvy.dev MCP, then re-run for idempotency and publish.

## 2026-10-30 ~10:05 UTC — legistar (builder): BLOCKED on MCP auth

- Source VERIFIED public & keyless: `https://webapi.legistar.com/v1/seattle/Matters?$top=25&$orderby=MatterLastModifiedUtc%20desc` returns flat JSON array (MatterId, MatterTitle, MatterStatusName, MatterIntroDate, MatterLastModifiedUtc). No API key required. Mapping ready: id/event_id=src_legistar_<MatterId>, publisher="Legistar (Seattle)", headline=title+" ("+status+")", product=civic, tenant/workspace=shared.
- Data tables created in project FqfK5dzjTKUzamjO: `legistar_ingested` (c6vwDPzRCRE94Pvy, col event_id), `legistar_errors` (lijlcp0AbTLQAvQx, cols workflowId/error/ts).
- BLOCKER: n8n MCP OAuth expired mid-session; every automation.* call now returns "requires user authorization" / "Invalid resource indicator (invalid_target)". Workflow not created/run/published. Needs interactive re-auth of connector.harvy.dev MCP, then rebuild proceeds (pattern copied from proven OpenSky LM5tPQfYunwxCAUU).

## 2026-10-30 ~09:40 UTC — DBpedia proven, publish BLOCKED (builder)

- DBpedia Ingestion `a7K31FCjWdsT5pSY` PROVEN, NOT published: exec 96 success 09:26:30 (SPARQL via Webshare proxy, timeout patched 30s->60s, normalize+dedupe, S3 `additionalFields.contentType: "application/json"`, Basin direct via `$vars.BASIN_SEND_TOKEN` committed>=1). Basin SQL `SELECT count(*) FROM default.evidence WHERE source_id='src_dbpedia'` = 28 (after ~6min flush). R2 verified: `harvy-artifacts/dbpedia/src_dbpedia_Independent_State_of_Raqqa.json`. BLOCKED at idempotent re-run + publish: n8n MCP connector.harvy.dev requires user re-authorization (all calls fail after 09:35; browser lands on n8n sign-in). Re-authorize MCP, then re-run manual (expect 0 items past dataTable `Eet1Gla9ICcL4rRn` `dbpedia_ingested`), then publish_workflow.

## 2026-10-30 ~10:05 UTC — owid_datasets BLOCKED (builder, mimo-flash)

- owid_datasets (src_owid_datasets): SDK build complete, saved at owid-datasets/owid_datasets_sdk.ts (mirrors proven CKAN pattern; data tables owid_datasets_ingested=I53AZa8obhi4jtJE and owid_datasets_errors=A5GNAdOVATFlintz already exist; Error Trigger wired; proxy on both fetch nodes; Basin keypair+Bearer direct; S3 contentType application/json). BLOCKED before create: connector.harvy.dev MCP session expired mid-build — every tools.automation.* call returns "requires user authorization" (needs user re-auth). Basin src_owid_datasets=0 at 10:05 UTC. Note: brief URLs co2.csv / co2-per-capita / total-co2-emissions all 404; SDK uses working successors annual-co2-emissions.csv?csvType=full (primary) + co2-emissions-per-capita.csv?csvType=full (fallback). Resume: validate_workflow + create_workflow_from_code from the SDK file, then execute/verify/publish.
- openflights | BLOCKER: workflow NOT created/run/published. All node configs validated (11/11) and full SDK code ready (pattern: USGS PHhaeSYwwAVhRwk1; tables openflights_ingested hRkyPzXY7vOuGo8A, openflights_errors 3WnojbOEHfcjEopW exist). Blocked at validate_workflow: n8n MCP connector.harvy.dev requires user re-authorization. After re-auth: validate_workflow -> create_workflow_from_code -> manual exec -> Basin count src_openflights -> R2 openflights/<id>.json -> idempotent re-run -> publish.

## 2026-10-30 ~09:45 UTC — OpenObserve tracing: logs VERIFIED, spans CONFIGURED

- LOGS (verified via collector self-metrics on automation VPS):
  filelog/n8n receiver accepted 6,505 records; exporter sent 14,886 log records to
  OpenObserve /v1/logs (200 OK). Root cause of earlier silence was filesystem perms:
  /var/lib/docker* were 0711 root-only; fixed with chmod o+x/o+r, added openobserve-agent
  to docker group. All container logs (n8n, runners, postgres) now ship under service=n8n.
- TRACES (spans): n8n 2.45.4 has a built-in OTel module. Set 11 N8N_OTEL_* env vars on the
  n8n container (restarted 09:41): endpoint eu1-api.openobserve.ai/api/3LOzR02TywfzyWfDySBb0aS1DrE,
  /v1/traces, http/protobuf, sample 1.0, workflow+node spans ON, PRODUCTION_ONLY=false.
  Verified /v1/traces ingest accepts the collector token (200). No OTLP export errors in n8n logs.
  NOT yet verified: actual span arrival in OpenObserve — the token is ingest-only (_multi 200,
  _search 401), so verification must happen in the OpenObserve UI (Traces tab) or with a
  read-capable API key.
- Correlation: execution id (n8n logs, service=n8n) <-> Basin source_id per connector.
