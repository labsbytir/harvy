CREATE UNIQUE INDEX IF NOT EXISTS harvy_v2_evidence_scope_id
ON harvy_v2_evidence(tenant_id, workspace_id, product, id);

CREATE TABLE IF NOT EXISTS harvy_v2_entities (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    product TEXT NOT NULL CHECK (product IN ('Newsk', 'Tower', 'Civic')),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('person', 'organization', 'place', 'asset', 'public_body', 'other')),
    display_name TEXT NOT NULL CHECK (length(trim(display_name)) BETWEEN 1 AND 200),
    description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 2000),
    revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE (tenant_id, workspace_id, product, id),
    FOREIGN KEY (tenant_id, workspace_id) REFERENCES harvy_v2_workspaces(tenant_id, id)
);
CREATE INDEX IF NOT EXISTS harvy_v2_entities_scope_name
ON harvy_v2_entities(tenant_id, workspace_id, product, display_name);

CREATE TABLE IF NOT EXISTS harvy_v2_investigations (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    product TEXT NOT NULL CHECK (product IN ('Newsk', 'Tower', 'Civic')),
    title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 240),
    summary TEXT NOT NULL DEFAULT '' CHECK (length(summary) <= 2000),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE (tenant_id, workspace_id, product, id),
    FOREIGN KEY (tenant_id, workspace_id) REFERENCES harvy_v2_workspaces(tenant_id, id)
);
CREATE INDEX IF NOT EXISTS harvy_v2_investigations_scope_updated
ON harvy_v2_investigations(tenant_id, workspace_id, product, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS harvy_v2_relationships (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    product TEXT NOT NULL CHECK (product IN ('Newsk', 'Tower', 'Civic')),
    from_entity_id TEXT NOT NULL,
    to_entity_id TEXT NOT NULL,
    relationship_type TEXT NOT NULL CHECK (length(trim(relationship_type)) BETWEEN 1 AND 80),
    interpretation TEXT NOT NULL CHECK (interpretation IN ('observed', 'inferred', 'disputed')),
    evidence_id TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '' CHECK (length(notes) <= 2000),
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE (tenant_id, workspace_id, product, id),
    CHECK (from_entity_id != to_entity_id),
    FOREIGN KEY (tenant_id, workspace_id, product, from_entity_id)
        REFERENCES harvy_v2_entities(tenant_id, workspace_id, product, id),
    FOREIGN KEY (tenant_id, workspace_id, product, to_entity_id)
        REFERENCES harvy_v2_entities(tenant_id, workspace_id, product, id),
    FOREIGN KEY (tenant_id, workspace_id, product, evidence_id)
        REFERENCES harvy_v2_evidence(tenant_id, workspace_id, product, id)
);
CREATE INDEX IF NOT EXISTS harvy_v2_relationships_scope
ON harvy_v2_relationships(tenant_id, workspace_id, product, created_at DESC);

CREATE TABLE IF NOT EXISTS harvy_v2_investigation_items (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    product TEXT NOT NULL CHECK (product IN ('Newsk', 'Tower', 'Civic')),
    investigation_id TEXT NOT NULL,
    item_kind TEXT NOT NULL CHECK (item_kind IN ('note', 'event', 'evidence', 'entity', 'relationship')),
    target_event_id TEXT,
    target_evidence_id TEXT,
    target_entity_id TEXT,
    target_relationship_id TEXT,
    title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 240),
    note TEXT NOT NULL DEFAULT '' CHECK (length(note) <= 5000),
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE (tenant_id, workspace_id, product, investigation_id, id),
    CHECK (
        (item_kind = 'note' AND target_event_id IS NULL AND target_evidence_id IS NULL AND target_entity_id IS NULL AND target_relationship_id IS NULL) OR
        (item_kind = 'event' AND target_event_id IS NOT NULL AND target_evidence_id IS NULL AND target_entity_id IS NULL AND target_relationship_id IS NULL) OR
        (item_kind = 'evidence' AND target_event_id IS NULL AND target_evidence_id IS NOT NULL AND target_entity_id IS NULL AND target_relationship_id IS NULL) OR
        (item_kind = 'entity' AND target_event_id IS NULL AND target_evidence_id IS NULL AND target_entity_id IS NOT NULL AND target_relationship_id IS NULL) OR
        (item_kind = 'relationship' AND target_event_id IS NULL AND target_evidence_id IS NULL AND target_entity_id IS NULL AND target_relationship_id IS NOT NULL)
    ),
    FOREIGN KEY (tenant_id, workspace_id, product, investigation_id)
        REFERENCES harvy_v2_investigations(tenant_id, workspace_id, product, id),
    FOREIGN KEY (tenant_id, workspace_id, product, target_event_id)
        REFERENCES harvy_v2_events(tenant_id, workspace_id, product, id),
    FOREIGN KEY (tenant_id, workspace_id, product, target_evidence_id)
        REFERENCES harvy_v2_evidence(tenant_id, workspace_id, product, id),
    FOREIGN KEY (tenant_id, workspace_id, product, target_entity_id)
        REFERENCES harvy_v2_entities(tenant_id, workspace_id, product, id),
    FOREIGN KEY (tenant_id, workspace_id, product, target_relationship_id)
        REFERENCES harvy_v2_relationships(tenant_id, workspace_id, product, id)
);
CREATE INDEX IF NOT EXISTS harvy_v2_investigation_items_scope
ON harvy_v2_investigation_items(tenant_id, workspace_id, product, investigation_id, created_at DESC);
