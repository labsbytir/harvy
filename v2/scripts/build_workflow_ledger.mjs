#!/usr/bin/env node
// Builds the frozen canonical workflow ledger from the four source inventories
// named in docs/CONNECTOR_PLAN.md ("Complete candidate sources now in this
// repository"). The ledger is the single denominator for adoption reporting:
// no other file may claim an "adopted/N" figure.
//
// Usage:
//   node v2/scripts/build_workflow_ledger.mjs          # write the ledger
//   node v2/scripts/build_workflow_ledger.mjs --check  # fail if the committed ledger drifted
//   node v2/scripts/build_workflow_ledger.mjs --dump   # print a review table to stdout

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

export const LEDGER_REVISION = '2026-10-30.1';
export const LEDGER_PATH = 'v2/catalog/workflow-ledger.json';

const INPUTS = [
  { id: 'candidates', kind: 'markdown-inventory', path: 'docs/CONNECTOR-CANDIDATES.md' },
  { id: 'upstream', kind: 'upstream-manifest', path: 'v2/catalog/reference/harvy-upstream-manifest.json' },
  { id: 'scopes', kind: 'connector-scopes', path: 'v2/catalog/reference/harvy-connector-scopes.json' },
  { id: 'civic', kind: 'civic-directory', path: 'v2/catalog/reference/civic-source-catalog.json' },
];

// Policy state as of the AGENTS.md/directive record on 2026-10-30. Every entry is
// deliberate and visible in the ledger so nobody has to guess why a row is out
// of the denominator.
const POLICY = {
  revision: 'AGENTS.md + direct user directives, 2026-10-30',
  excluded: {
    judyrecords: 'Excluded by project policy (AGENTS.md). Do not reintroduce.',
    truth_social: 'Excluded by project policy (AGENTS.md). Do not reintroduce.',
    truthsocial: 'Excluded by project policy (AGENTS.md). Do not reintroduce.',
    rsshub_news: 'ROADMAP: RSS/RSSHub must not be reintroduced; Newsk uses Media Cloud/SocketNews/Spider.',
    rsshub_cyber: 'ROADMAP: RSS/RSSHub must not be reintroduced.',
    rsshub_disasters: 'ROADMAP: RSS/RSSHub must not be reintroduced.',
  },
  directive_approved: {
    telegram:
      "Approved 2026-10-30, scoped exactly to channels joined by the user's own approved app; no discovery, no member/profile harvesting, session material never stored in repo/logs/prompts.",
    'sam-gov':
      'Exclusion lifted 2026-10-30; onboard via the Get Opportunities Public API with SAM_GOV_API_KEY and bounded verification.',
    sam_gov:
      'Exclusion lifted 2026-10-30; pending SAM_GOV_API_KEY and bounded verification.',
  },
  held:
    'Gated/social, surveillance/location, or sensitive-personal-data sources stay in the denominator but are blocked from build until access, terms, quota, and retention are recorded.',
};

// Rows that are not executable workflows. A directory/reference row is not a
// workflow (docs/CONNECTOR_PLAN.md), so it is recorded but not counted.
const REFERENCES = new Set([
  'situation_watch',
  'sources_registry',
  'worldmonitor',
  'realtime_osint_roadmap',
  'owid_lc_reconcile',
  'owid_legal_use_summary',
  'owid_browser_semantic_search',
  'owid_cartograms',
  'owid_chartbook',
  'owid_tech_radar',
  'owid_page2_migrated',
]);

const PLACEHOLDERS = new Set(['example', 'no_public_api', 'civic_scraper_reference']);

// Gated or sensitive sources: still candidates, blocked from build until the
// named review is recorded.
const HELD = new Set([
  'facebook_graph',
  'reddit',
  'nostr_nip52',
  'live_tv_channels',
  'google_trends',
  'social_mention',
  'local_protest_map',
  'liveuamap',
  'dronestream',
  'osm_alpr',
  'openstreetmap_alpr_cameras_deflock',
  'deflock',
  'wigle',
  'wigle_public_stats',
  'shodan',
  'tfl_jamcams',
  'windy_webcams',
  'nyc_benefits_screening',
  'telegram',
]);

// Semantic merges. Two IDs collapse only when they denote one publisher
// product. The rule matters: a generic adapter and a specific configured
// jurisdiction are different sources, so `legistar` and `legistar_nyc` stay
// apart, as do `poweroutage_us` and `usoutage` (different publishers) and the
// separate World Bank products (`worldbank_api`, `financesone`, `microdata_*`).
//   alias  — same publisher, same dataset, two IDs
//   scope  — one product, a narrower configured scope recorded under its own ID
//   portal — one generic adapter versus the portal list it is configured from
const MERGES = [
  { into: 'acled', from: ['acled_armed_conflict_location'], rule: 'alias', rationale: 'ACLED armed-conflict data is one source; the upstream record is a spec for the same API.' },
  { into: 'crt_sh', from: ['crt_sh_certificate_transparency'], rule: 'alias', rationale: 'Same crt.sh Certificate Transparency log queried through one endpoint.' },
  { into: 'data_gov', from: ['data_gov_apis', 'catalog_data_gov'], rule: 'alias', rationale: 'Data.gov publishes one catalog; the GSA oddata and catalog CKAN routes are access paths to it. docs/CONNECTOR_STATUS.md records the catalog CKAN API returning 404, so the surviving route is the one to verify.' },
  { into: 'energydata_info', from: ['energydata_info_ckan_md'], rule: 'alias', rationale: 'One CKAN portal recorded under two IDs.' },
  { into: 'iom_dtm', from: ['iom_displacement_tracking_matrix'], rule: 'alias', rationale: 'IOM Displacement Tracking Matrix is one product; DTM is the publisher name for it.' },
  { into: 'imf', from: ['imf_datamapper'], rule: 'alias', rationale: 'The IMF markdown entry already points at the DataMapper API; the upstream record names the same product.' },
  { into: 'maxmind', from: ['maxmind_geolite2'], rule: 'alias', rationale: 'GeoLite2 is the MaxMind dataset name, not a separate source.' },
  { into: 'ofac_sdn', from: ['ofac_specially_designated_nationals'], rule: 'alias', rationale: 'OFAC Specially Designated Nationals is the SDN list.' },
  { into: 'opensky', from: ['opensky_live'], rule: 'alias', rationale: 'One OpenSky state-vector API; "live" is the configured query, not a second source.' },
  { into: 'osm_alpr', from: ['openstreetmap_alpr_cameras_deflock'], rule: 'alias', rationale: 'The OSM ALPR-camera map and DeFlock read the same OpenStreetMap tags; DeFlock remains its own row as a separate service surface.' },
  { into: 'otx_alienvault', from: ['alienvault_otx_threat_intel'], rule: 'alias', rationale: 'AlienVault OTX is one threat-intel API.' },
  { into: 'ourworldindata', from: ['owid_data_api', 'owid_datasets'], rule: 'scope', rationale: 'OWID publishes one data API plus a dataset catalog backed by it; the two IDs are access modes of one publisher product.' },
  { into: 'tepco', from: ['tepco_outage'], rule: 'alias', rationale: 'Same TEPCO outage publication.' },
  { into: 'unhcr_refugees', from: ['unhcr_refugee_population_statistics'], rule: 'alias', rationale: 'UNHCR Refugee Data Finder is one API product.' },
  { into: 'unodc', from: ['unodc_dataportal'], rule: 'alias', rationale: 'UNODC data portal is one product.' },
  { into: 'wayback_cdx', from: ['internet_archive_wayback_machine'], rule: 'alias', rationale: 'Wayback CDX is the Internet Archive Wayback query interface.' },
  { into: 'worldbank_api', from: ['worldbank_open'], rule: 'alias', rationale: 'World Bank Open Data API v2 is one API; "open" names the dataset family.' },
  { into: 'ckan_generic', from: ['ckan_portal'], rule: 'portal', rationale: 'One generic CKAN adapter configured over many portals; the portal list is configuration, not a second workflow.' },
  { into: 'socrata', from: ['socrata_portal'], rule: 'portal', rationale: 'One generic Socrata adapter configured over many portals.' },
  { into: 'noaa_spc', from: ['noaa_spc_tornadoes'], rule: 'scope', rationale: 'NOAA Storm Prediction Center publishes the reports; "tornadoes" is a configured subset of the same product.' },
];

// Sources whose only recorded access path is policy-excluded. They stay in the
// denominator as gated candidates but cannot be built from the inventoried
// path until a permitted one is established.
const EXCLUDED_ACCESS_PATH = {
  rsshub:
    'The inventoried access path is RSSHub, which the roadmap excludes ("No RSS or RSSHub dependency"). The source stays a gated candidate and needs a permitted path before build.',
};

const RSSHUB_IDS = new Set([
  'rsshub_news',
  'rsshub_cyber',
  'rsshub_disasters',
]);

export function normalizeId(raw) {
  return String(raw)
    .toLowerCase()
    .replace(/^(stream|reference|connector|source)\./, '')
    .replace(/[\s\-.]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

function parseCandidates(markdown) {
  const heading = /^### (\d+)\. `([^`]+)`(?:\s+—\s+(.*))?$/;
  const entries = [];
  let current = null;
  const push = () => {
    if (!current) return;
    const block = current.body.join('\n');
    const field = (name) => {
      const m = block.match(new RegExp(`^- \\*\\*${name}:\\*\\* (.*)$`, 'm'));
      return m ? m[1].trim() : null;
    };
    const get = field('Get');
    const urls = get ? [...get.matchAll(/\((https?:\/\/[^)]+)\)/g)].map((m) => m[1]) : [];
    const tier = field('Source-file tier');
    entries.push({
      number: Number(current.number),
      originalId: current.id,
      label: current.label || current.id,
      publisherUrl: urls[0] || null,
      sourceUrls: [...new Set(urls)],
      initialScope: field('Initial scope'),
      access: field('Access'),
      tier: tier ? Number.parseInt(tier, 10) : null,
      note: field('Source note'),
    });
  };
  for (const line of markdown.split('\n')) {
    const m = line.match(heading);
    if (m) {
      push();
      current = { number: m[1], id: m[2], label: (m[3] || '').trim(), body: [] };
      continue;
    }
    if (/^### /.test(line)) {
      push();
      current = null;
      continue;
    }
    if (current) current.body.push(line);
  }
  push();
  return entries;
}

function inferSourceType({ urls, scopeHint, kind }) {
  if (kind === 'directory') return ['directory', 'declared'];
  const full = (urls || []).filter(Boolean).join(' ').toLowerCase();
  const scope = (scopeHint || '').toLowerCase();
  let host = '';
  for (const u of urls || []) {
    try {
      host = new URL(u).hostname.toLowerCase();
      break;
    } catch {
      /* keep looking */
    }
  }
  if (host === 'rsshub.app' || host.endsWith('.rsshub.app')) return ['stream', 'inferred'];
  if (/(^|[/?&=])(feed|rss|atom)([/?&=]|$)/.test(full) || /\bfeed\b|format:\s*rss/.test(scope)) return ['stream', 'inferred'];
  if (/\.(csv|gz|zip|ndjson|parquet|dbf|shp)([?#]|$)/.test(full) || /bulk|download/.test(full)) return ['bulk', 'inferred'];
  if (/html_scrape|scrape|crawl/.test(scope)) return ['crawl', 'inferred'];
  if (/\/api\/|api\.|sparql|geoserver|arcgis\/rest|\/api[?#/]|\.json|\.geojson/.test(full) || /\bendpoint\b/.test(scope)) return ['api', 'inferred'];
  return ['unknown', 'unknown'];
}

function buildIndexes({ upstream, scopes }) {
  const families = new Map();
  const disposition = new Map();
  const upstreamStatus = new Map();
  for (const s of scopes.streams) {
    families.set(normalizeId(s.source_id), s.family);
    disposition.set(normalizeId(s.source_id), s.catalog_disposition);
  }
  for (const c of upstream.connectors) upstreamStatus.set(normalizeId(c.id), c.status);
  return { families, disposition, upstreamStatus };
}

function collectRawRows({ candidates, upstream, scopes, civic }) {
  const rows = [];
  for (const e of candidates) {
    rows.push({
      key: normalizeId(e.originalId),
      originalId: e.originalId,
      input: 'candidates',
      inputPath: `docs/CONNECTOR-CANDIDATES.md#${e.number}`,
      label: e.label,
      publisherUrl: e.publisherUrl,
      sourceUrls: e.sourceUrls,
      scopeHint: e.initialScope,
      access: e.access,
      tier: e.tier,
      note: e.note,
      kind: 'candidate',
    });
  }
  for (const c of upstream.connectors) {
    rows.push({
      key: normalizeId(c.id),
      originalId: c.id,
      input: 'upstream',
      inputPath: 'v2/catalog/reference/harvy-upstream-manifest.json#connectors',
      label: c.id,
      upstreamStatus: c.status,
      catalogUrl: c.source_spec || null,
      kind: 'candidate',
    });
  }
  for (const s of scopes.streams) {
    rows.push({
      key: normalizeId(s.source_id),
      originalId: s.id,
      input: 'scopes',
      inputPath: 'v2/catalog/reference/harvy-connector-scopes.json#streams',
      label: s.label || s.source_id,
      family: s.family || null,
      disposition: s.catalog_disposition || null,
      catalogUrl: s.source_specification_url || null,
      kind: 'candidate',
    });
  }
  for (const r of scopes.references) {
    rows.push({
      key: normalizeId(r.label || r.id),
      originalId: r.id,
      input: 'scopes',
      inputPath: 'v2/catalog/reference/harvy-connector-scopes.json#references',
      label: r.label || r.id,
      family: r.family || null,
      catalogUrl: r.source_catalog_url || null,
      kind: 'reference_only',
    });
  }
  for (const n of scopes.named_connectors) {
    rows.push({
      key: normalizeId(n.id),
      originalId: n.id,
      input: 'scopes',
      inputPath: 'v2/catalog/reference/harvy-connector-scopes.json#named_connectors',
      label: n.label || n.id,
      catalogUrl: n.source_catalog_url || n.api_documentation_url || null,
      sourceUrls: [n.api_documentation_url].filter(Boolean),
      directiveApproved: Boolean(n.excluded === false && n.directive_change),
      implementationStatus: n.implementation_status || null,
      kind: n.implementation_status && /reference_only/.test(n.implementation_status) ? 'reference_only' : 'candidate',
    });
  }
  for (const c of civic) {
    rows.push({
      key: normalizeId(c.key),
      originalId: c.key,
      input: 'civic',
      inputPath: 'v2/catalog/reference/civic-source-catalog.json',
      label: c.name,
      publisherUrl: c.url,
      sourceUrls: [c.url],
      civicRole: c.role,
      kind: 'directory',
    });
  }
  return rows;
}

function mergeIndex() {
  const index = new Map();
  for (const { into, from, rule, rationale } of MERGES) {
    for (const f of from) {
      index.set(normalizeId(f), { into: normalizeId(into), rule, rationale });
    }
  }
  return index;
}

export function buildLedger(root = fileURLToPath(new URL('../../', import.meta.url))) {
  const read = (p) => readFileSync(path.join(root, p), 'utf8');
  const candidatesMd = read(INPUTS[0].path);
  const upstream = JSON.parse(read(INPUTS[1].path));
  const scopes = JSON.parse(read(INPUTS[2].path));
  const civic = JSON.parse(read(INPUTS[3].path));

  const candidates = parseCandidates(candidatesMd);
  const { families, disposition, upstreamStatus } = buildIndexes({ upstream, scopes });
  const rawRows = collectRawRows({ candidates, upstream, scopes, civic });
  // The roadmap's documented 193-ID union covers three of the four inputs, with
  // the reference and named lists excluded because they are not streams.
  const unionBeforeAlias = new Set(
    collectRawRows({ candidates, upstream, scopes: { ...scopes, references: [], named_connectors: [] }, civic: [] }).map((r) => r.key),
  ).size;

  const merged = mergeIndex();
  const groups = new Map();
  for (const raw of rawRows) {
    const target = merged.get(raw.key);
    const key = target ? target.into : raw.key;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(raw);
  }

  const rows = [];
  for (const [key, group] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const primary = group.find((r) => r.input === 'candidates') || group[0];
    const aliases = [...new Set(group.map((r) => r.originalId))];
    const mergedFrom = [...new Set(group.map((r) => normalizeId(r.originalId)).filter((k) => k !== key))].sort();
    const provenance = group
      .map((r) => ({ input: r.input, original_id: r.originalId, path: r.inputPath }))
      .sort((a, b) => (a.input + a.original_id).localeCompare(b.input + b.original_id));

    const hasCandidateRecord = group.some((r) => r.kind === 'candidate');
    const hasReferenceRecord = group.some((r) => r.kind === 'reference_only');
    // A reference page that merely links to a real source does not demote that
    // source. Only an explicit artifact decision (REFERENCES) or a row with no
    // candidate record at all makes the row reference-only.
    const isReference = REFERENCES.has(key) || (!hasCandidateRecord && hasReferenceRecord);
    const isPlaceholder = PLACEHOLDERS.has(key);
    const isCivicDirectory = group.every((r) => r.kind === 'directory') && group.some((r) => r.civicRole);
    const exclusion = POLICY.excluded[key] || null;

    let kind = 'candidate';
    if (exclusion) kind = 'excluded';
    else if (isReference) kind = 'reference_only';
    else if (isPlaceholder) kind = 'placeholder';
    else if (isCivicDirectory) kind = 'directory';

    const sourceUrls = [...new Set(group.flatMap((r) => r.sourceUrls || []))];
    const accessPath = sourceUrls.some((u) => /rsshub\.app/.test(u)) ? 'rsshub' : null;
    const accessPathExcluded = Boolean(accessPath && EXCLUDED_ACCESS_PATH[accessPath]);
    const [sourceType, sourceTypeConfidence] = inferSourceType({
      urls: sourceUrls,
      scopeHint: primary.scopeHint,
      kind,
    });

    const reviewFlags = [];
    if (/_via$/.test(key)) reviewFlags.push('truncated-id: the source ID appears truncated in its origin file');
    if (/(^|_)(survey|roadmap|reconcile|seed)(_|$)/.test(key)) reviewFlags.push('artifact: name indicates a survey/roadmap/processing record rather than a source');
    if (disposition.get(key) === 'unclassified') reviewFlags.push('unclassified-disposition: the catalog holds no disposition for this row');
    if (REFERENCES.has(key) && hasCandidateRecord) reviewFlags.push('artifact-override: the CONNECTOR-CANDIDATES.md cleanup notes classify this ID as a research/processing artifact, so the upstream spec record does not make it a workflow');
    else if (hasCandidateRecord && hasReferenceRecord) reviewFlags.push('reference-conflict: the catalog lists a reference page and a source record for this ID; the source record wins and the reference page needs review');

    rows.push({
      id: key,
      label: primary.label,
      aliases: aliases.sort(),
      publisher: null,
      publisher_url: primary.publisherUrl || null,
      source_urls: sourceUrls,
      kind,
      source_type: sourceType,
      source_type_confidence: sourceTypeConfidence,
      family: primary.family || families.get(key) || null,
      catalog_disposition: disposition.get(key) || null,
      upstream_status: upstreamStatus.get(key) || null,
      scope_hint: primary.scopeHint || null,
      access_hint: primary.access || null,
      upstream_tier: primary.tier ?? null,
      civic_role: group.find((r) => r.civicRole)?.civicRole || null,
      directive_approved: group.some((r) => r.directiveApproved) || Boolean(POLICY.directive_approved[key]),
      access_path: accessPath,
      access_path_excluded: accessPath ? EXCLUDED_ACCESS_PATH[accessPath] || null : null,
      gate: exclusion ? null : HELD.has(key) || RSSHUB_IDS.has(key) || accessPathExcluded ? 'access_review' : null,
      status: 'inventoried',
      status_evidence: [],
      excluded: Boolean(exclusion),
      exclusion_reason: exclusion,
      merge: merged.has(group[0].key) || mergedFrom.length
        ? {
            rule: merged.get(group[0].key)?.rule || mergedFrom.map((m) => merged.get(m)?.rule).find(Boolean) || null,
            rationale: merged.get(group[0].key)?.rationale || mergedFrom.map((m) => merged.get(m)?.rationale).find(Boolean) || null,
          }
        : null,
      merged_from: mergedFrom,
      review_flags: reviewFlags,
      provenance,
      pending_fields: [
        'publisher',
        'modes',
        'access_terms',
        'auth_secret_ref',
        'rate_limits',
        'cadence',
        'schema_mapping',
        'attribution',
        'license',
        'owner',
        'last_verified_at',
      ],
    });
  }

  const counted = rows.filter((r) => r.kind === 'candidate');
  const n = counted.length;
  const duplicateIds = [...new Set(candidates.map((c) => normalizeId(c.originalId)).filter((k, i, a) => a.indexOf(k) !== i))];
  const excludedPath = counted.filter((r) => r.access_path_excluded);
  const gatedOnly = counted.filter((r) => r.gate === 'access_review' && !r.access_path_excluded);

  return {
    schema_version: 1,
    revision: LEDGER_REVISION,
    frozen_at: '2026-10-30',
    purpose:
      'Frozen denominator for connector adoption. A row here is an inventory entry, never a live workflow. Adoption evidence lives in docs/STATUS.md and docs/CONNECTOR_STATUS.md.',
    counting: {
      unit: 'canonical source',
      n,
      t: Math.ceil(n / 2),
      n_rule:
        'N counts rows with kind=candidate: executable-workflow candidates that are not excluded, reference-only, placeholders, or directories. Gated rows stay in N because the plan keeps them in the ledger until access is settled.',
      not_counted: ['excluded', 'reference_only', 'placeholder', 'directory'],
      row_total: rows.length,
      kind_counts: rows.reduce((acc, r) => ({ ...acc, [r.kind]: (acc[r.kind] || 0) + 1 }), {}),
      family_coverage: {
        mapped: counted.filter((r) => r.family).length,
        unmapped: counted.filter((r) => !r.family).length,
        note: 'Rows that exist only in the markdown inventory carry no catalog family. The roadmap requires counts by reusable family, so mapping these rows is part of inventoried → mapped.',
      },
      segments: {
        buildable_now: n - excludedPath.length - gatedOnly.length,
        gated_access_review: gatedOnly.length,
        blocked_excluded_access_path: excludedPath.length,
        note: 'N is the frozen denominator and includes gated rows on purpose. The segments show how much of N can be built before an access decision: the buildable_now figure is the near-term ceiling, not a revised N.',
      },
      note: 'T = ceil(N/2) is the adoption target under the user 50% requirement. A directory/reference row is not a workflow and cannot be adopted, so it is recorded but excluded from N.',
    },
    policy: POLICY,
    inputs: INPUTS.map((i) => ({ ...i, sha256: sha256(read(i.path)) })),
    input_record_counts: {
      candidates_entries: candidates.length,
      candidates_unique_ids: new Set(candidates.map((c) => normalizeId(c.originalId))).size,
      upstream_connectors: upstream.connectors.length,
      scope_streams: scopes.streams.length,
      scope_references: scopes.references.length,
      named_connectors: scopes.named_connectors.length,
      civic_sources: civic.length,
      normalized_union_before_alias_merge: unionBeforeAlias,
    },
    gaps: {
      missing_candidate_numbers: [61, 112, 145],
      duplicate_candidate_ids: duplicateIds,
      note: 'Numbers 61, 112, 145 are absent from CONNECTOR-CANDIDATES.md with no recorded disposition. entso_e_outages appears twice (entries 40 and 122) and is one row with both aliases.',
      pending_review: [
        'Every merge in MERGES is a judgement about publisher identity and needs reviewer sign-off before build order is derived from it.',
        'requested_scopes (53), data_portals (7), and bulk_data (3) are attributes, not counting units; they are indexed in scope_index rather than counted as rows.',
        'publisher, modes, access terms, secrets, limits, cadence, schema mapping, attribution, license, owner, and last-verified stay pending on every row until that row is mapped.',
      ],
    },
    scope_index: {
      requested_scopes: scopes.requested_scopes.map((s) => ({ id: s.id, label: s.label, family: s.family, source_type: s.source_type, status: s.status })),
      data_portals: scopes.data_portals.map((p) => ({ id: p.id, label: p.label, source_type: p.source_type, url: p.url })),
      bulk_data: scopes.bulk_data.map((b) => ({ id: b.id, label: b.label, source_type: b.source_type, status: b.status })),
    },
    normalization: {
      rule: 'lowercase; strip stream./reference./connector./source. prefix; collapse whitespace, dots, and hyphens to one underscore.',
      validated_against:
        'docs/ROADMAP.md records candidate/upstream=65, upstream/streams=95, candidate/streams=62, union=193. This generator reproduces all four values; v2/tests/workflow-ledger.test.mjs asserts them.',
    },
    rows,
  };
}

function main(argv) {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const ledger = buildLedger(root);
  const output = `${JSON.stringify(ledger, null, 2)}\n`;
  const target = path.join(root, LEDGER_PATH);

  if (argv.includes('--check')) {
    let existing = '';
    try {
      existing = readFileSync(target, 'utf8');
    } catch {
      console.error(`missing ${LEDGER_PATH}; run node v2/scripts/build_workflow_ledger.mjs`);
      process.exitCode = 1;
      return;
    }
    if (existing !== output) {
      console.error(`${LEDGER_PATH} is stale; regenerate with node v2/scripts/build_workflow_ledger.mjs`);
      process.exitCode = 1;
      return;
    }
    console.log(`${LEDGER_PATH} is current (revision ${ledger.revision}, N=${ledger.counting.n}, T=${ledger.counting.t})`);
    return;
  }

  if (argv.includes('--dump')) {
    const pad = (s, n) => String(s ?? '').padEnd(n).slice(0, n);
    console.log(`${pad('id', 38)} ${pad('kind', 14)} ${pad('type', 8)} ${pad('gate', 13)} family`);
    for (const row of ledger.rows) {
      console.log(`${pad(row.id, 38)} ${pad(row.kind, 14)} ${pad(row.source_type, 8)} ${pad(row.gate || '', 13)} ${row.family || ''}`);
    }
    const kinds = ledger.counting.kind_counts;
    console.log(`\nrows=${ledger.rows.length} N=${ledger.counting.n} T=${ledger.counting.t} ${JSON.stringify(kinds)}`);
    return;
  }

  writeFileSync(target, output);
  console.log(`wrote ${LEDGER_PATH}: ${ledger.rows.length} rows, N=${ledger.counting.n}, T=${ledger.counting.t}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2));
}
