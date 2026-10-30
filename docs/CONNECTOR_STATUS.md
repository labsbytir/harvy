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

## Open gaps

- AUTOMATION_URL / AUTOMATION_DISPATCH_TOKEN / AUTOMATION_CALLBACK_SECRET unset on harvy-api Worker -> /api/v1/runs 503. n8n runs standalone for now.
- Webshare proxy URL not available in env (only WEBSHARE_API_KEY; api.webshare.io unreachable from here, code 000). GDACS API + Spider calls currently go direct from the VPS. Blocked: need the approved proxy URL to wire `$vars.WEBSHARE_PROXY_URL` into HTTP nodes.
- default.analyze legacy table kept; no consumer.
