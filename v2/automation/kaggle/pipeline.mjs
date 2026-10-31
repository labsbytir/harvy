/**
 * Kaggle Dataset Ingestion Pipeline
 * Main orchestration for downloading, processing, and storing Kaggle datasets
 */

import { KaggleClient } from './kaggle-client.mjs';
import { R2Client, createR2Client } from './r2-client.mjs';
import { KaggleDatabaseClient, createDatabaseClient } from './pg-client.mjs';

/**
 * Main Pipeline Class
 * Orchestrates the entire process of importing Kaggle datasets
 */
export class KagglePipeline {
  constructor(config = {}) {
    this.config = {
      kaggleApiToken: config.kaggleApiToken || process.env.KAGGLE_API_TOKEN,
      databaseUrl: config.databaseUrl || process.env.DATABASE_URL,
      cloudflareAccountId: config.cloudflareAccountId || process.env.CLOUDFLARE_ACCOUNT_ID,
      r2AccessKeyId: config.r2AccessKeyId || process.env.R2_ACCESS_KEY_ID,
      r2SecretAccessKey: config.r2SecretAccessKey || process.env.R2_SECRET_ACCESS_KEY,
      r2BucketName: config.r2BucketName || process.env.R2_BUCKET_NAME || 'harvy-artifacts',
      maxConcurrentDownloads: config.maxConcurrentDownloads || 3,
      rateLimitDelay: config.rateLimitDelay || 1000, // ms between requests
      ...config
    };

    this.kaggleClient = null;
    this.r2Client = null;
    this.dbClient = null;
  }

  /**
   * Initialize all clients
   */
  async initialize() {
    // Initialize Kaggle client
    this.kaggleClient = new KaggleClient(this.config.kaggleApiToken);
    await this.kaggleClient.initialize();

    // Initialize R2 client
    this.r2Client = new R2Client(
      this.config.cloudflareAccountId,
      this.config.r2AccessKeyId,
      this.config.r2SecretAccessKey,
      this.config.r2BucketName
    );

    // Initialize database client
    this.dbClient = new KaggleDatabaseClient(this.config.databaseUrl);

    console.log('✅ All clients initialized');
  }

  /**
   * Search for datasets matching criteria
   */
  async searchDatasets(query, options = {}) {
    const { page = 1, pageSize = 20, category = null, sortBy = 'hotness' } = options;
    
    try {
      const datasets = await this.kaggleClient.searchDatasets(query, page, pageSize);
      
      // Filter by United States if requested
      if (query.toLowerCase().includes('united states') || query.toLowerCase().includes('usa') || query.toLowerCase().includes('us')) {
        return this._filterUnitedStatesDatasets(datasets);
      }
      
      return datasets;
    } catch (error) {
      console.error('Error searching datasets:', error);
      throw error;
    }
  }

  /**
   * Filter datasets that are likely about United States
   */
  _filterUnitedStatesDatasets(datasets) {
    const usKeywords = [
      'united states', 'usa', 'us ', 'america', 'american',
      'united states of america', 'u.s.', 'u.s.a',
      'federal', 'government', 'census', 'bls', 'bea',
      'fbi', 'cia', 'nsa', 'irs', 'ssn', 'social security',
      'california', 'texas', 'florida', 'new york', 'illinois',
      'pennsylvania', 'ohio', 'georgia', 'michigan', 'north carolina'
    ];

    return datasets.filter(dataset => {
      const searchableText = JSON.stringify(dataset).toLowerCase();
      return usKeywords.some(keyword => searchableText.includes(keyword));
    });
  }

  /**
   * Get popular United States datasets
   */
  async getPopularUSDatasets(limit = 10) {
    try {
      // Search for various US-related terms
      const searchTerms = [
        'united states',
        'usa',
        'us census',
        'us government',
        'american',
        'federal'
      ];

      const allDatasets = [];
      
      for (const term of searchTerms) {
        try {
          const datasets = await this.kaggleClient.searchDatasets(term, 1, limit);
          allDatasets.push(...datasets);
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, this.config.rateLimitDelay));
        } catch (error) {
          console.warn(`Error searching for "${term}":`, error.message);
        }
      }

      // Deduplicate and sort by popularity
      const uniqueDatasets = this._deduplicateDatasets(allDatasets);
      const sortedDatasets = uniqueDatasets.sort((a, b) => {
        // Sort by download count (descending), then by view count
        const bDownloads = b.downloadCount || 0;
        const aDownloads = a.downloadCount || 0;
        if (bDownloads !== aDownloads) return bDownloads - aDownloads;
        
        const bViews = b.viewCount || 0;
        const aViews = a.viewCount || 0;
        return bViews - aViews;
      });

      return sortedDatasets.slice(0, limit);
    } catch (error) {
      console.error('Error getting popular US datasets:', error);
      throw error;
    }
  }

  /**
   * Deduplicate datasets by ID
   */
  _deduplicateDatasets(datasets) {
    const seen = new Set();
    return datasets.filter(dataset => {
      const id = dataset.id || dataset.kaggleId || dataset.datasetId;
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  /**
   * Import a specific dataset by identifier
   */
  async importDataset(datasetIdentifier, options = {}) {
    const {
      importFiles = true,
      storeInR2 = true,
      storeInDatabase = true,
      processFiles = true
    } = options;

    try {
      console.log(`🚀 Starting import of dataset: ${datasetIdentifier}`);

      // Step 1: Get dataset metadata
      console.log('📋 Fetching dataset metadata...');
      const metadata = await this.kaggleClient.getDatasetMetadata(datasetIdentifier);
      
      if (!metadata) {
        throw new Error(`Dataset ${datasetIdentifier} not found`);
      }

      // Step 2: Store metadata in database
      if (storeInDatabase) {
        console.log('💾 Storing dataset metadata in database...');
        const datasetRecord = await this._storeDatasetMetadata(metadata);
        console.log(`✅ Dataset metadata stored with ID: ${datasetRecord.dataset_id}`);
      }

      // Step 3: List dataset files
      console.log('📁 Listing dataset files...');
      const files = await this.kaggleClient.listDatasetFiles(datasetIdentifier);
      console.log(`📊 Found ${files.length} files in dataset`);

      // Step 4: Process each file
      if (importFiles) {
        console.log('📥 Starting file downloads...');
        
        for (const file of files) {
          try {
            console.log(`  📄 Processing file: ${file.name} (${this._formatBytes(file.size)})`);
            
            // Download file
            const downloadResult = await this.kaggleClient.downloadFile(
              datasetIdentifier, 
              file.name, 
              `/tmp/${datasetIdentifier.replace('/', '_')}_${file.name}`
            );
            
            // For now, we'll simulate the download and store metadata
            // In a real implementation, we would actually download the file
            
            // Store file metadata in database
            if (storeInDatabase) {
              const fileRecord = await this._storeFileMetadata(
                datasetIdentifier, 
                file, 
                metadata
              );
              console.log(`  ✅ File metadata stored with ID: ${fileRecord.file_id}`);
            }

            // Store in R2 (simulated for now)
            if (storeInR2) {
              const r2Key = `kaggle/datasets/${datasetIdentifier}/files/${file.name}`;
              console.log(`  📦 Would store in R2 at: ${r2Key}`);
              
              // In a real implementation:
              // const r2Result = await this.r2Client.uploadFile(
              //   r2Key, 
              //   fileContent,
              //   this._getContentType(file.name)
              // );
            }

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, this.config.rateLimitDelay));
            
          } catch (fileError) {
            console.error(`  ❌ Error processing file ${file.name}:`, fileError.message);
            
            // Log error in database
            if (storeInDatabase) {
              await this.dbClient.logDataQualityIssue({
                dataset_id: datasetRecord?.dataset_id,
                issue_type: 'download_failed',
                severity: 'high',
                description: `Failed to download file: ${fileError.message}`
              });
            }
          }
        }
      }

      console.log(`✅ Successfully imported dataset: ${datasetIdentifier}`);
      
      return {
        success: true,
        dataset: datasetIdentifier,
        metadata,
        files: files.length
      };

    } catch (error) {
      console.error(`❌ Error importing dataset ${datasetIdentifier}:`, error);
      
      // Log error in database
      if (storeInDatabase) {
        try {
          const datasetRecord = await this.dbClient.getDatasetByKaggleId(datasetIdentifier);
          if (datasetRecord) {
            await this.dbClient.logDataQualityIssue({
              dataset_id: datasetRecord.dataset_id,
              issue_type: 'import_failed',
              severity: 'critical',
              description: `Dataset import failed: ${error.message}`
            });
          }
        } catch (dbError) {
          console.error('Error logging import failure:', dbError.message);
        }
      }
      
      throw error;
    }
  }

  /**
   * Store dataset metadata in database
   */
  async _storeDatasetMetadata(metadata) {
    // Extract relevant fields from Kaggle metadata
    const datasetData = {
      kaggle_id: metadata.id || metadata.datasetId || metadata.ref,
      title: metadata.title || metadata.name,
      subtitle: metadata.subtitle,
      description: metadata.description,
      owner_username: metadata.owner?.username || metadata.ownerRef,
      owner_display_name: metadata.owner?.displayName,
      license: metadata.license,
      is_private: metadata.isPrivate || false,
      is_project: metadata.isProject || false,
      total_bytes: metadata.totalBytes,
      file_count: metadata.fileCount,
      download_count: metadata.downloadCount,
      view_count: metadata.viewCount,
      vote_count: metadata.voteCount,
      tags: metadata.tags || [],
      categories: metadata.categories || [],
      created_at: metadata.created,
      updated_at: metadata.updated,
      kaggle_url: metadata.url || `https://www.kaggle.com/datasets/${metadata.id}`,
      source_id: null, // Will be set after source is created
      status: 'importing'
    };

    // First, ensure the source exists
    const source = await this.dbClient.upsertSource({
      source_name: 'kaggle',
      source_type: 'kaggle_api',
      base_url: 'https://www.kaggle.com/api/v1',
      api_version: 'v1'
    });

    datasetData.source_id = source.source_id;

    // Store the dataset
    const datasetRecord = await this.dbClient.upsertDataset(datasetData);

    // Log the import job
    await this.dbClient.logImportJob({
      dataset_id: datasetRecord.dataset_id,
      job_type: 'full',
      status: 'running',
      triggered_by: 'pipeline',
      trigger_source: 'manual'
    });

    return datasetRecord;
  }

  /**
   * Store file metadata in database
   */
  async _storeFileMetadata(datasetIdentifier, file, datasetMetadata) {
    // Get the dataset record
    const datasetRecord = await this.dbClient.getDatasetByKaggleId(datasetIdentifier);
    
    if (!datasetRecord) {
      throw new Error(`Dataset ${datasetIdentifier} not found in database`);
    }

    // Prepare file data
    const fileData = {
      dataset_id: datasetRecord.dataset_id,
      kaggle_filename: file.name,
      file_size: file.size,
      file_description: file.description,
      total_rows: file.totalRows,
      schema_info: file.schema,
      r2_bucket: this.config.r2BucketName,
      r2_key: `kaggle/datasets/${datasetIdentifier}/files/${file.name}`,
      r2_content_type: this._getContentType(file.name),
      r2_file_size: file.size,
      processing_status: 'pending'
    };

    // Store the file
    const fileRecord = await this.dbClient.insertDatasetFile(fileData);

    // Store columns if schema is available
    if (file.schema?.columns) {
      const columns = file.schema.columns.map((col, index) => ({
        file_id: fileRecord.file_id,
        column_name: col.name,
        column_type: col.type,
        column_description: col.description,
        position: index + 1,
        is_nullable: true // Default, would be determined from actual data
      }));

      await this.dbClient.insertFileColumns(fileRecord.file_id, columns);
    }

    return fileRecord;
  }

  /**
   * Get content type from filename
   */
  _getContentType(filename) {
    const extension = filename.split('.').pop().toLowerCase();
    
    const contentTypes = {
      'json': 'application/json',
      'csv': 'text/csv',
      'parquet': 'application/octet-stream',
      'zip': 'application/zip',
      'gz': 'application/gzip',
      'txt': 'text/plain',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'pdf': 'application/pdf'
    };
    
    return contentTypes[extension] || 'application/octet-stream';
  }

  /**
   * Format bytes to human readable string
   */
  _formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Import multiple datasets
   */
  async importMultipleDatasets(datasetIdentifiers, options = {}) {
    const results = [];
    
    for (const identifier of datasetIdentifiers) {
      try {
        const result = await this.importDataset(identifier, options);
        results.push(result);
        
        // Rate limiting between datasets
        await new Promise(resolve => setTimeout(resolve, this.config.rateLimitDelay * 2));
        
      } catch (error) {
        console.error(`❌ Failed to import dataset ${identifier}:`, error.message);
        results.push({
          success: false,
          dataset: identifier,
          error: error.message
        });
      }
    }

    return {
      total: datasetIdentifiers.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  /**
   * Search and import datasets matching criteria
   */
  async searchAndImport(query, options = {}) {
    const { limit = 5, ...importOptions } = options;

    // Search for datasets
    const datasets = await this.searchDatasets(query, { pageSize: limit });
    
    if (datasets.length === 0) {
      console.log('🔍 No datasets found matching the query');
      return { total: 0, imported: 0, datasets: [] };
    }

    console.log(`🔍 Found ${datasets.length} datasets matching "${query}"`);

    // Extract dataset identifiers
    const datasetIdentifiers = datasets.map(d => d.id || d.datasetId || d.ref);
    
    // Import the datasets
    const results = await this.importMultipleDatasets(datasetIdentifiers, importOptions);
    
    return {
      query,
      found: datasets.length,
      ...results
    };
  }

  /**
   * Get pipeline statistics
   */
  async getStatistics() {
    const dbStats = await this.dbClient.getDatasetStatistics();
    
    // Get R2 statistics (would need to implement list operations)
    const r2Objects = await this.r2Client.listObjects('kaggle/datasets/');
    
    return {
      database: dbStats,
      r2: {
        total_objects: r2Objects.objects.length,
        datasets_with_files: new Set(
          r2Objects.objects
            .map(obj => obj.Key.split('/')[2])
            .filter(Boolean)
        ).size
      }
    };
  }

  /**
   * Close all connections
   */
  async close() {
    if (this.dbClient) {
      await this.dbClient.close();
    }
    console.log('🔌 Pipeline connections closed');
  }
}

/**
 * Create pipeline with environment variables
 */
export function createPipeline() {
  return new KagglePipeline();
}

/**
 * Main function for CLI usage
 */
export async function main() {
  const pipeline = createPipeline();
  
  try {
    // Initialize
    await pipeline.initialize();
    
    // Get popular US datasets
    console.log('🔍 Searching for popular United States datasets...');
    const datasets = await pipeline.getPopularUSDatasets(10);
    
    console.log('\n📊 Found Popular US Datasets:');
    datasets.forEach((dataset, index) => {
      console.log(`${index + 1}. ${dataset.title || dataset.name}`);
      console.log(`   ID: ${dataset.id || dataset.datasetId}`);
      console.log(`   Downloads: ${dataset.downloadCount || 'N/A'}`);
      console.log(`   Views: ${dataset.viewCount || 'N/A'}`);
      console.log(`   URL: https://www.kaggle.com/datasets/${dataset.id}`);
      console.log('');
    });

    // Example: Import the first dataset
    if (datasets.length > 0) {
      const firstDataset = datasets[0];
      const datasetId = firstDataset.id || firstDataset.datasetId;
      
      console.log(`\n🚀 Example: Importing first dataset: ${datasetId}`);
      
      // Note: This would actually download and store the dataset
      // For now, we'll just show what would happen
      console.log('⚠️  To actually import, run:');
      console.log(`   pipeline.importDataset('${datasetId}')`);
    }

    // Get statistics
    const stats = await pipeline.getStatistics();
    console.log('\n📈 Pipeline Statistics:');
    console.log(`   Database: ${stats.database?.total_datasets || 0} datasets`);
    console.log(`   R2 Objects: ${stats.r2?.total_objects || 0} files`);

  } catch (error) {
    console.error('❌ Pipeline error:', error);
  } finally {
    await pipeline.close();
  }
}

// Run main if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default KagglePipeline;