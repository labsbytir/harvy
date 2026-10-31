/**
 * PostgreSQL Client for Kaggle Dataset Storage
 * Handles database operations for storing and querying Kaggle dataset metadata
 */

import { PostgresDatabase } from '../../shared/sql-database.ts';

/**
 * Kaggle Database Client
 * Extends the base PostgreSQL database with Kaggle-specific operations
 */
export class KaggleDatabaseClient {
  constructor(connectionString) {
    this.db = new PostgresDatabase(connectionString);
  }

  /**
   * Initialize database schema
   */
  async initializeSchema() {
    // Read the schema SQL file
    // In a real implementation, we would read and execute the schema
    console.log('Database schema initialization would be implemented');
  }

  /**
   * Insert or update a Kaggle source
   */
  async upsertSource(sourceData) {
    const { source_name, source_type, base_url, api_version } = sourceData;
    
    const query = `
      INSERT INTO kaggle_sources (source_name, source_type, base_url, api_version)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (source_name) 
      DO UPDATE SET 
        source_type = EXCLUDED.source_type,
        base_url = EXCLUDED.base_url,
        api_version = EXCLUDED.api_version,
        updated_at = NOW()
      RETURNING *
    `;
    
    const stmt = this.db.prepare(query);
    const result = await stmt.bind(
      source_name,
      source_type,
      base_url,
      api_version
    ).first();
    
    return result;
  }

  /**
   * Insert or update a dataset
   */
  async upsertDataset(datasetData) {
    const {
      kaggle_id,
      title,
      subtitle,
      description,
      owner_username,
      owner_display_name,
      license,
      is_private,
      is_project,
      total_bytes,
      file_count,
      download_count,
      view_count,
      vote_count,
      tags,
      categories,
      created_at,
      updated_at,
      kaggle_url,
      source_id,
      status = 'pending'
    } = datasetData;
    
    const query = `
      INSERT INTO kaggle_datasets (
        kaggle_id, title, subtitle, description, owner_username, owner_display_name,
        license, is_private, is_project, total_bytes, file_count, download_count,
        view_count, vote_count, tags, categories, created_at, updated_at, kaggle_url,
        source_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      ON CONFLICT (kaggle_id)
      DO UPDATE SET
        title = EXCLUDED.title,
        subtitle = EXCLUDED.subtitle,
        description = EXCLUDED.description,
        owner_username = EXCLUDED.owner_username,
        owner_display_name = EXCLUDED.owner_display_name,
        license = EXCLUDED.license,
        is_private = EXCLUDED.is_private,
        is_project = EXCLUDED.is_project,
        total_bytes = EXCLUDED.total_bytes,
        file_count = EXCLUDED.file_count,
        download_count = EXCLUDED.download_count,
        view_count = EXCLUDED.view_count,
        vote_count = EXCLUDED.vote_count,
        tags = EXCLUDED.tags,
        categories = EXCLUDED.categories,
        updated_at = EXCLUDED.updated_at,
        kaggle_url = EXCLUDED.kaggle_url,
        status = EXCLUDED.status,
        last_sync_at = NOW()
      RETURNING *
    `;
    
    const stmt = this.db.prepare(query);
    const result = await stmt.bind(
      kaggle_id,
      title,
      subtitle,
      description,
      owner_username,
      owner_display_name,
      license,
      is_private,
      is_project,
      total_bytes,
      file_count,
      download_count,
      view_count,
      vote_count,
      tags,
      categories,
      created_at,
      updated_at,
      kaggle_url,
      source_id,
      status
    ).first();
    
    return result;
  }

  /**
   * Get dataset by Kaggle ID
   */
  async getDatasetByKaggleId(kaggleId) {
    const query = `SELECT * FROM kaggle_datasets WHERE kaggle_id = $1`;
    const stmt = this.db.prepare(query);
    return stmt.bind(kaggleId).first();
  }

  /**
   * Insert a dataset file
   */
  async insertDatasetFile(fileData) {
    const {
      dataset_id,
      kaggle_filename,
      file_size,
      file_description,
      total_rows,
      schema_info,
      r2_bucket,
      r2_key,
      r2_etag,
      r2_content_type,
      r2_file_size,
      processing_status = 'pending'
    } = fileData;
    
    const query = `
      INSERT INTO kaggle_dataset_files (
        dataset_id, kaggle_filename, file_size, file_description, total_rows,
        schema_info, r2_bucket, r2_key, r2_etag, r2_content_type, r2_file_size,
        processing_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    
    const stmt = this.db.prepare(query);
    const result = await stmt.bind(
      dataset_id,
      kaggle_filename,
      file_size,
      file_description,
      total_rows,
      schema_info,
      r2_bucket,
      r2_key,
      r2_etag,
      r2_content_type,
      r2_file_size,
      processing_status
    ).first();
    
    return result;
  }

  /**
   * Insert file columns
   */
  async insertFileColumns(fileId, columns) {
    const query = `
      INSERT INTO kaggle_file_columns (
        file_id, column_name, column_type, column_description, position, is_nullable
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (file_id, column_name)
      DO NOTHING
    `;
    
    const statements = columns.map(column => {
      const stmt = this.db.prepare(query);
      return stmt.bind(
        fileId,
        column.name,
        column.type,
        column.description,
        column.position,
        column.is_nullable
      );
    });
    
    await this.db.batch(statements);
  }

  /**
   * Log an import job
   */
  async logImportJob(jobData) {
    const {
      dataset_id,
      job_type,
      status,
      triggered_by,
      trigger_source,
      files_processed = 0,
      bytes_processed = 0,
      rows_processed = 0,
      error_message = null
    } = jobData;
    
    const query = `
      INSERT INTO kaggle_import_jobs (
        dataset_id, job_type, status, triggered_by, trigger_source,
        files_processed, bytes_processed, rows_processed, error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const stmt = this.db.prepare(query);
    const result = await stmt.bind(
      dataset_id,
      job_type,
      status,
      triggered_by,
      trigger_source,
      files_processed,
      bytes_processed,
      rows_processed,
      error_message
    ).first();
    
    return result;
  }

  /**
   * Update import job
   */
  async updateImportJob(jobId, updates) {
    const { status, completed_at, error_message, files_processed, bytes_processed, rows_processed } = updates;
    
    const query = `
      UPDATE kaggle_import_jobs 
      SET 
        status = COALESCE($1, status),
        completed_at = COALESCE($2, completed_at),
        error_message = COALESCE($3, error_message),
        files_processed = COALESCE($4, files_processed),
        bytes_processed = COALESCE($5, bytes_processed),
        rows_processed = COALESCE($6, rows_processed)
      WHERE job_id = $7
      RETURNING *
    `;
    
    const stmt = this.db.prepare(query);
    const result = await stmt.bind(
      status,
      completed_at,
      error_message,
      files_processed,
      bytes_processed,
      rows_processed,
      jobId
    ).first();
    
    return result;
  }

  /**
   * Update dataset file processing status
   */
  async updateFileProcessingStatus(fileId, status, errorMessage = null, rowCount = null, columnCount = null) {
    const query = `
      UPDATE kaggle_dataset_files 
      SET 
        processing_status = $1,
        processed_at = NOW(),
        processing_error = $2,
        row_count = COALESCE($3, row_count),
        column_count = COALESCE($4, column_count)
      WHERE file_id = $5
      RETURNING *
    `;
    
    const stmt = this.db.prepare(query);
    const result = await stmt.bind(
      status,
      errorMessage,
      rowCount,
      columnCount,
      fileId
    ).first();
    
    return result;
  }

  /**
   * Log data quality issue
   */
  async logDataQualityIssue(issueData) {
    const {
      dataset_id,
      file_id,
      issue_type,
      severity = 'medium',
      description,
      affected_rows,
      affected_columns
    } = issueData;
    
    const query = `
      INSERT INTO kaggle_data_quality_issues (
        dataset_id, file_id, issue_type, severity, description, affected_rows, affected_columns
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const stmt = this.db.prepare(query);
    const result = await stmt.bind(
      dataset_id,
      file_id,
      issue_type,
      severity,
      description,
      affected_rows,
      affected_columns
    ).first();
    
    return result;
  }

  /**
   * Get datasets by status
   */
  async getDatasetsByStatus(status) {
    const query = `SELECT * FROM kaggle_datasets WHERE status = $1 ORDER BY imported_at DESC`;
    const stmt = this.db.prepare(query);
    const result = await stmt.bind(status).all();
    return result.results;
  }

  /**
   * Get datasets by tags or categories
   */
  async searchDatasetsByTagsOrCategories(searchTerms) {
    const query = `
      SELECT * FROM kaggle_datasets 
      WHERE tags && $1 OR categories && $1
      ORDER BY vote_count DESC, download_count DESC
    `;
    const stmt = this.db.prepare(query);
    const result = await stmt.bind(searchTerms).all();
    return result.results;
  }

  /**
   * Get recent import jobs
   */
  async getRecentImportJobs(limit = 10) {
    const query = `
      SELECT j.*, d.kaggle_id, d.title 
      FROM kaggle_import_jobs j
      JOIN kaggle_datasets d ON j.dataset_id = d.dataset_id
      ORDER BY j.started_at DESC
      LIMIT $1
    `;
    const stmt = this.db.prepare(query);
    const result = await stmt.bind(limit).all();
    return result.results;
  }

  /**
   * Get dataset overview statistics
   */
  async getDatasetStatistics() {
    const query = `
      SELECT 
        COUNT(*) as total_datasets,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_datasets,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_datasets,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_datasets,
        SUM(file_count) as total_files,
        SUM(total_bytes) as total_bytes
      FROM kaggle_datasets
    `;
    
    const stmt = this.db.prepare(query);
    const result = await stmt.first();
    return result;
  }

  /**
   * Get files for a dataset
   */
  async getDatasetFiles(datasetId) {
    const query = `SELECT * FROM kaggle_dataset_files WHERE dataset_id = $1 ORDER BY kaggle_filename`;
    const stmt = this.db.prepare(query);
    const result = await stmt.bind(datasetId).all();
    return result.results;
  }

  /**
   * Get columns for a file
   */
  async getFileColumns(fileId) {
    const query = `SELECT * FROM kaggle_file_columns WHERE file_id = $1 ORDER BY position`;
    const stmt = this.db.prepare(query);
    const result = await stmt.bind(fileId).all();
    return result.results;
  }

  /**
   * Close database connection
   */
  async close() {
    await this.db.close();
  }
}

/**
 * Create database client with environment variables
 */
export function createDatabaseClient() {
  const connectionString = process.env.DATABASE_URL || 
    `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}`;
  
  return new KaggleDatabaseClient(connectionString);
}

export default KaggleDatabaseClient;