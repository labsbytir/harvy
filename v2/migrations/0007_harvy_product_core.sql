CREATE TABLE IF NOT EXISTS harvy_v2_workspaces (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE (tenant_id, id)
);

CREATE TABLE IF NOT EXISTS harvy_v2_product_entitlements (
    tenant_id TEXT NOT NULL,
    product TEXT NOT NULL CHECK (product IN ('Newsk', 'Tower', 'Ops', 'Civic')),
    enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
    revision INTEGER NOT NULL DEFAULT 1,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (tenant_id, product)
);

CREATE TABLE IF NOT EXISTS harvy_v2_sources (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    connector_id TEXT NOT NULL,
    product TEXT NOT NULL CHECK (product IN ('Newsk', 'Tower', 'Ops', 'Civic')),
    publisher TEXT NOT NULL,
    label TEXT NOT NULL,
    target_url TEXT NOT NULL,
    source_scope_id TEXT NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('scrape', 'crawl', 'links', 'api')),
    max_pages INTEGER NOT NULL DEFAULT 1 CHECK (max_pages BETWEEN 1 AND 100),
    config_revision TEXT NOT NULL DEFAULT '1',
    enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE (tenant_id, workspace_id, id),
    UNIQUE (tenant_id, workspace_id, product, id),
    FOREIGN KEY (tenant_id, workspace_id) REFERENCES harvy_v2_workspaces(tenant_id, id)
);
CREATE INDEX IF NOT EXISTS harvy_v2_sources_scope ON harvy_v2_sources(tenant_id, workspace_id, product, enabled, label);

CREATE TABLE IF NOT EXISTS harvy_v2_runs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    product TEXT NOT NULL CHECK (product IN ('Newsk', 'Tower', 'Ops', 'Civic')),
    source_id TEXT NOT NULL,
    source_scope_id TEXT NOT NULL,
    config_revision TEXT NOT NULL,
    source_snapshot_json TEXT NOT NULL,
    requested_by TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'partial', 'failed', 'cancelled')),
    trace_id TEXT NOT NULL,
    error_code TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE (tenant_id, workspace_id, id),
    UNIQUE (tenant_id, workspace_id, idempotency_key),
    FOREIGN KEY (tenant_id, workspace_id, product, source_id) REFERENCES harvy_v2_sources(tenant_id, workspace_id, product, id),
    FOREIGN KEY (tenant_id, workspace_id) REFERENCES harvy_v2_workspaces(tenant_id, id)
);
CREATE INDEX IF NOT EXISTS harvy_v2_runs_scope_time ON harvy_v2_runs(tenant_id, workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS harvy_v2_events (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    product TEXT NOT NULL CHECK (product IN ('Newsk', 'Tower', 'Ops', 'Civic')),
    title TEXT NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'saved', 'closed')),
    first_seen_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE (tenant_id, workspace_id, id),
    UNIQUE (tenant_id, workspace_id, product, id),
    FOREIGN KEY (tenant_id, workspace_id) REFERENCES harvy_v2_workspaces(tenant_id, id)
);
CREATE INDEX IF NOT EXISTS harvy_v2_events_scope_time ON harvy_v2_events(tenant_id, workspace_id, product, last_seen_at DESC, id);

CREATE TABLE IF NOT EXISTS harvy_v2_artifact_manifests (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    run_id TEXT NOT NULL,
    source_scope_id TEXT NOT NULL,
    stage TEXT NOT NULL CHECK (stage IN ('raw', 'processed')),
    storage_uri TEXT NOT NULL,
    sha256 TEXT NOT NULL,
    byte_count INTEGER NOT NULL CHECK (byte_count >= 0),
    capture_time TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE (tenant_id, workspace_id, id),
    FOREIGN KEY (tenant_id, workspace_id, run_id) REFERENCES harvy_v2_runs(tenant_id, workspace_id, id),
    FOREIGN KEY (tenant_id, workspace_id) REFERENCES harvy_v2_workspaces(tenant_id, id)
);
CREATE INDEX IF NOT EXISTS harvy_v2_artifacts_scope_run ON harvy_v2_artifact_manifests(tenant_id, workspace_id, run_id, stage);

CREATE TABLE IF NOT EXISTS harvy_v2_evidence (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    product TEXT NOT NULL CHECK (product IN ('Newsk', 'Tower', 'Ops', 'Civic')),
    event_id TEXT NOT NULL,
    source_id TEXT NOT NULL,
    source_url TEXT NOT NULL,
    publisher TEXT NOT NULL,
    headline TEXT NOT NULL,
    excerpt TEXT NOT NULL DEFAULT '',
    captured_at INTEGER NOT NULL,
    artifact_id TEXT,
    created_at INTEGER NOT NULL,
    UNIQUE (tenant_id, workspace_id, product, event_id, source_id, source_url, captured_at),
    FOREIGN KEY (tenant_id, workspace_id, product, event_id) REFERENCES harvy_v2_events(tenant_id, workspace_id, product, id),
    FOREIGN KEY (tenant_id, workspace_id, product, source_id) REFERENCES harvy_v2_sources(tenant_id, workspace_id, product, id),
    FOREIGN KEY (tenant_id, workspace_id, artifact_id) REFERENCES harvy_v2_artifact_manifests(tenant_id, workspace_id, id)
);
CREATE INDEX IF NOT EXISTS harvy_v2_evidence_event ON harvy_v2_evidence(tenant_id, workspace_id, event_id, captured_at DESC);

CREATE TABLE IF NOT EXISTS harvy_v2_stories (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    product TEXT NOT NULL DEFAULT 'Newsk' CHECK (product = 'Newsk'),
    owner_principal_id TEXT NOT NULL,
    event_id TEXT NOT NULL,
    title TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'handed_off', 'archived')),
    revision INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE (tenant_id, workspace_id, id),
    UNIQUE (tenant_id, workspace_id, product, id, event_id),
    FOREIGN KEY (tenant_id, workspace_id, product, event_id) REFERENCES harvy_v2_events(tenant_id, workspace_id, product, id),
    FOREIGN KEY (tenant_id, workspace_id) REFERENCES harvy_v2_workspaces(tenant_id, id)
);
CREATE INDEX IF NOT EXISTS harvy_v2_stories_scope ON harvy_v2_stories(tenant_id, workspace_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS harvy_v2_dashboards (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    owner_principal_id TEXT NOT NULL,
    product TEXT NOT NULL CHECK (product IN ('Newsk', 'Tower', 'Ops', 'Civic')),
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    config_json TEXT NOT NULL,
    schema_version INTEGER NOT NULL DEFAULT 1,
    hql_version INTEGER NOT NULL DEFAULT 1,
    visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'workspace')),
    revision INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    FOREIGN KEY (tenant_id, workspace_id) REFERENCES harvy_v2_workspaces(tenant_id, id)
);
CREATE INDEX IF NOT EXISTS harvy_v2_dashboards_scope ON harvy_v2_dashboards(tenant_id, workspace_id, deleted_at, updated_at DESC);


CREATE TABLE IF NOT EXISTS harvy_v2_briefs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    owner_principal_id TEXT NOT NULL,
    story_id TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    citations_json TEXT NOT NULL,
    revision INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (tenant_id, workspace_id, story_id) REFERENCES harvy_v2_stories(tenant_id, workspace_id, id),
    FOREIGN KEY (tenant_id, workspace_id) REFERENCES harvy_v2_workspaces(tenant_id, id)
);
CREATE INDEX IF NOT EXISTS harvy_v2_briefs_scope ON harvy_v2_briefs(tenant_id, workspace_id, updated_at DESC);


CREATE TABLE IF NOT EXISTS harvy_v2_ops_actions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    source_story_id TEXT,
    source_event_id TEXT NOT NULL,
    source_product TEXT NOT NULL CHECK (source_product IN ('Newsk', 'Tower', 'Civic')),
    created_by TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done', 'cancelled')),
    revision INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    CHECK ((source_story_id IS NULL AND source_product IN ('Tower', 'Civic')) OR (source_story_id IS NOT NULL AND source_product = 'Newsk')),
    UNIQUE (tenant_id, workspace_id, source_story_id),
    FOREIGN KEY (tenant_id, workspace_id, source_product, source_event_id) REFERENCES harvy_v2_events(tenant_id, workspace_id, product, id),
    FOREIGN KEY (tenant_id, workspace_id, source_product, source_story_id, source_event_id) REFERENCES harvy_v2_stories(tenant_id, workspace_id, product, id, event_id),
    FOREIGN KEY (tenant_id, workspace_id) REFERENCES harvy_v2_workspaces(tenant_id, id)
);
CREATE INDEX IF NOT EXISTS harvy_v2_ops_actions_scope ON harvy_v2_ops_actions(tenant_id, workspace_id, status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS harvy_v2_ops_actions_direct_event ON harvy_v2_ops_actions(tenant_id, workspace_id, source_product, source_event_id) WHERE source_story_id IS NULL;
