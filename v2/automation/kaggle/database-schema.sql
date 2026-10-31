-- Kaggle Datasets Database Schema for Harvy
-- This schema supports both raw data storage in R2 and structured metadata in PostgreSQL

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Dataset Sources Table
CREATE TABLE IF NOT EXISTS kaggle_sources (
    source_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_name VARCHAR(255) NOT NULL,
    source_type VARCHAR(50) NOT NULL DEFAULT 'kaggle',
    base_url VARCHAR(500),
    api_version VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Datasets Metadata Table
CREATE TABLE IF NOT EXISTS kaggle_datasets (
    dataset_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kaggle_id VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'username/dataset-name'
    title VARCHAR(500) NOT NULL,
    subtitle TEXT,
    description TEXT,
    owner_username VARCHAR(255),
    owner_display_name VARCHAR(255),
    license VARCHAR(255),
    is_private BOOLEAN DEFAULT false,
    is_project BOOLEAN DEFAULT false,
    total_bytes BIGINT,
    file_count INTEGER,
    download_count INTEGER,
    view_count INTEGER,
    vote_count INTEGER,
    tags TEXT[], -- Array of tags
    categories TEXT[], -- Array of categories
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    kaggle_url VARCHAR(500),
    
    -- Provenance tracking
    imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    imported_by VARCHAR(255),
    source_version VARCHAR(50),
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, importing, completed, failed
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_error TEXT,
    
    -- Foreign key to source
    source_id UUID REFERENCES kaggle_sources(source_id)
);

-- Dataset Files Table
CREATE TABLE IF NOT EXISTS kaggle_dataset_files (
    file_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID NOT NULL REFERENCES kaggle_datasets(dataset_id) ON DELETE CASCADE,
    kaggle_filename VARCHAR(500) NOT NULL,
    file_size BIGINT,
    file_description TEXT,
    total_rows INTEGER,
    
    -- File schema information (for structured files)
    schema_info JSONB,
    
    -- R2 Storage Information
    r2_bucket VARCHAR(255),
    r2_key VARCHAR(1000),
    r2_etag VARCHAR(100),
    r2_content_type VARCHAR(255),
    r2_file_size BIGINT,
    
    -- Processing status
    processing_status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
    processed_at TIMESTAMP WITH TIME ZONE,
    processing_error TEXT,
    
    -- Data quality metrics
    row_count INTEGER,
    column_count INTEGER,
    sample_data JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dataset File Columns (for structured data)
CREATE TABLE IF NOT EXISTS kaggle_file_columns (
    column_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID NOT NULL REFERENCES kaggle_dataset_files(file_id) ON DELETE CASCADE,
    column_name VARCHAR(255) NOT NULL,
    column_type VARCHAR(100),
    column_description TEXT,
    position INTEGER,
    is_nullable BOOLEAN,
    sample_values TEXT[],
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dataset Versions/History
CREATE TABLE IF NOT EXISTS kaggle_dataset_versions (
    version_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID NOT NULL REFERENCES kaggle_datasets(dataset_id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    version_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255),
    
    -- Snapshot of metadata at this version
    metadata_snapshot JSONB
);

-- Import Jobs Tracking
CREATE TABLE IF NOT EXISTS kaggle_import_jobs (
    job_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID REFERENCES kaggle_datasets(dataset_id),
    job_type VARCHAR(50) NOT NULL, -- full, incremental, metadata_only
    status VARCHAR(50) NOT NULL, -- pending, running, completed, failed
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    
    -- Job statistics
    files_processed INTEGER DEFAULT 0,
    bytes_processed BIGINT DEFAULT 0,
    rows_processed INTEGER DEFAULT 0,
    
    -- Provenance
    triggered_by VARCHAR(255),
    trigger_source VARCHAR(100), -- api, scheduled, manual
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Job Files (tracking which files were processed in each job)
CREATE TABLE IF NOT EXISTS kaggle_job_files (
    job_file_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES kaggle_import_jobs(job_id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES kaggle_dataset_files(file_id),
    status VARCHAR(50) NOT NULL, -- pending, processing, completed, failed
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data Quality Issues
CREATE TABLE IF NOT EXISTS kaggle_data_quality_issues (
    issue_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID REFERENCES kaggle_datasets(dataset_id) ON DELETE CASCADE,
    file_id UUID REFERENCES kaggle_dataset_files(file_id) ON DELETE CASCADE,
    issue_type VARCHAR(100) NOT NULL, -- missing_data, duplicate_rows, invalid_format, etc.
    severity VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    description TEXT NOT NULL,
    affected_rows INTEGER,
    affected_columns TEXT[],
    
    status VARCHAR(50) DEFAULT 'open', -- open, resolved, ignored
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR(255),
    resolution_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_kaggle_datasets_kaggle_id ON kaggle_datasets(kaggle_id);
CREATE INDEX IF NOT EXISTS idx_kaggle_datasets_status ON kaggle_datasets(status);
CREATE INDEX IF NOT EXISTS idx_kaggle_datasets_owner ON kaggle_datasets(owner_username);
CREATE INDEX IF NOT EXISTS idx_kaggle_datasets_tags ON kaggle_datasets USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_kaggle_datasets_categories ON kaggle_datasets USING GIN(categories);

CREATE INDEX IF NOT EXISTS idx_kaggle_dataset_files_dataset_id ON kaggle_dataset_files(dataset_id);
CREATE INDEX IF NOT EXISTS idx_kaggle_dataset_files_r2_key ON kaggle_dataset_files(r2_key);
CREATE INDEX IF NOT EXISTS idx_kaggle_dataset_files_processing_status ON kaggle_dataset_files(processing_status);

CREATE INDEX IF NOT EXISTS idx_kaggle_import_jobs_dataset_id ON kaggle_import_jobs(dataset_id);
CREATE INDEX IF NOT EXISTS idx_kaggle_import_jobs_status ON kaggle_import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_kaggle_import_jobs_started_at ON kaggle_import_jobs(started_at);

CREATE INDEX IF NOT EXISTS idx_kaggle_data_quality_issues_dataset_id ON kaggle_data_quality_issues(dataset_id);
CREATE INDEX IF NOT EXISTS idx_kaggle_data_quality_issues_status ON kaggle_data_quality_issues(status);
CREATE INDEX IF NOT EXISTS idx_kaggle_data_quality_issues_severity ON kaggle_data_quality_issues(severity);

-- Views for common queries

-- View for dataset overview with file counts
CREATE OR REPLACE VIEW kaggle_datasets_overview AS
SELECT 
    d.dataset_id,
    d.kaggle_id,
    d.title,
    d.subtitle,
    d.description,
    d.owner_display_name,
    d.license,
    d.total_bytes,
    d.file_count,
    d.download_count,
    d.view_count,
    d.vote_count,
    d.tags,
    d.categories,
    d.created_at as dataset_created_at,
    d.updated_at as dataset_updated_at,
    d.imported_at,
    d.status as import_status,
    COUNT(f.file_id) as imported_file_count,
    SUM(CASE WHEN f.processing_status = 'completed' THEN 1 ELSE 0 END) as processed_file_count,
    MAX(j.started_at) as last_import_job_started
FROM kaggle_datasets d
LEFT JOIN kaggle_dataset_files f ON d.dataset_id = f.dataset_id
LEFT JOIN kaggle_import_jobs j ON d.dataset_id = j.dataset_id
GROUP BY d.dataset_id;

-- View for recent import jobs
CREATE OR REPLACE VIEW kaggle_recent_imports AS
SELECT 
    j.job_id,
    j.dataset_id,
    d.kaggle_id,
    d.title,
    j.job_type,
    j.status,
    j.started_at,
    j.completed_at,
    j.files_processed,
    j.bytes_processed,
    j.rows_processed,
    j.error_message,
    j.triggered_by,
    j.trigger_source
FROM kaggle_import_jobs j
JOIN kaggle_datasets d ON j.dataset_id = d.dataset_id
ORDER BY j.started_at DESC
LIMIT 100;

-- View for data quality summary
CREATE OR REPLACE VIEW kaggle_data_quality_summary AS
SELECT 
    d.dataset_id,
    d.kaggle_id,
    d.title,
    COUNT(i.issue_id) as total_issues,
    COUNT(CASE WHEN i.severity = 'critical' THEN 1 END) as critical_issues,
    COUNT(CASE WHEN i.severity = 'high' THEN 1 END) as high_issues,
    COUNT(CASE WHEN i.status = 'open' THEN 1 END) as open_issues,
    MAX(i.created_at) as latest_issue
FROM kaggle_datasets d
LEFT JOIN kaggle_data_quality_issues i ON d.dataset_id = i.dataset_id
GROUP BY d.dataset_id;

-- Function to update dataset status
CREATE OR REPLACE FUNCTION update_kaggle_dataset_status(
    p_dataset_id UUID,
    p_status VARCHAR(50),
    p_error_message TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    UPDATE kaggle_datasets 
    SET 
        status = p_status,
        last_sync_at = NOW(),
        sync_error = p_error_message
    WHERE dataset_id = p_dataset_id;
END;
$$ LANGUAGE plpgsql;

-- Function to log import job
CREATE OR REPLACE FUNCTION log_kaggle_import_job(
    p_dataset_id UUID,
    p_job_type VARCHAR(50),
    p_status VARCHAR(50),
    p_triggered_by VARCHAR(255),
    p_trigger_source VARCHAR(100)
) RETURNS UUID AS $$
DECLARE
    v_job_id UUID;
BEGIN
    INSERT INTO kaggle_import_jobs (
        dataset_id, job_type, status, triggered_by, trigger_source
    ) VALUES (
        p_dataset_id, p_job_type, p_status, p_triggered_by, p_trigger_source
    ) RETURNING job_id INTO v_job_id;
    
    RETURN v_job_id;
END;
$$ LANGUAGE plpgsql;