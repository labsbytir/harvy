/**
 * Boston Crime Incident Reports Import Script
 * Downloads, processes, and imports Boston crime data into Harvy system
 */

import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { setTimeout } from 'node:timers/promises';

/**
 * Boston Crime Dataset Configuration
 */
const BOSTON_CRIME_CONFIG = {
  datasetId: 'boston-crime-incident-reports',
  source: 'Boston Police Department',
  sourceUrl: 'https://data.boston.gov/dataset/crime-incident-reports-august-2015-to-date-source-new-system',
  license: 'Open Data Commons Public Domain Dedication and License (PDDL)',
  coverage: 'June 2015 to Present',
  theme: 'Public Safety',
  
  // Available files
  files: {
    '2023-present': {
      url: 'https://data.boston.gov/dataset/6220d948-eae2-4e4b-8723-2dc8e67722a3/resource/b973d8cb-eeb2-4e7e-99da-c92938efc9c0/download/tmpf6fo0lp8.csv',
      filename: 'crime_incident_reports_2023_present.csv',
      year: '2023-Present',
      description: 'Crime Incident Reports - 2023 to Present'
    },
    '2022': {
      url: 'https://data.boston.gov/dataset/6220d948-eae2-4e4b-8723-2dc8e67722a3/resource/313e56df-6d77-49d2-9c49-ee411f10cf58/download/tmpdfeo3qy2.csv',
      filename: 'crime_incident_reports_2022.csv',
      year: '2022',
      description: 'Crime Incident Reports - 2022'
    },
    '2021': {
      url: 'https://data.boston.gov/dataset/6220d948-eae2-4e4b-8723-2dc8e67722a3/resource/f4495ee9-c42c-4019-82c1-d067f07e45d2/download/tmpfap3hfze.csv',
      filename: 'crime_incident_reports_2021.csv',
      year: '2021',
      description: 'Crime Incident Reports - 2021'
    },
    '2020': {
      url: 'https://data.boston.gov/dataset/6220d948-eae2-4e4b-8723-2dc8e67722a3/resource/be047094-85fe-4104-a480-4fa3d03f9623/download/tmpkd_w64k_.csv',
      filename: 'crime_incident_reports_2020.csv',
      year: '2020',
      description: 'Crime Incident Reports - 2020'
    },
    '2019': {
      url: 'https://data.boston.gov/dataset/6220d948-eae2-4e4b-8723-2dc8e67722a3/resource/34e0ae6b-8c94-4998-ae9e-1b51551fe9ba/download/tmp6w6ts2d7.csv',
      filename: 'crime_incident_reports_2019.csv',
      year: '2019',
      description: 'Crime Incident Reports - 2019'
    },
    '2018': {
      url: 'https://data.boston.gov/dataset/6220d948-eae2-4e4b-8723-2dc8e67722a3/resource/e86f8e38-a23c-4c1a-8455-c8f94210a8f1/download/tmpf_uzkqpk.csv',
      filename: 'crime_incident_reports_2018.csv',
      year: '2018',
      description: 'Crime Incident Reports - 2018'
    },
    '2017': {
      url: 'https://data.boston.gov/dataset/6220d948-eae2-4e4b-8723-2dc8e67722a3/resource/64ad0053-842c-459b-9833-ff53d568f2e3/download/tmp3apxsafn.csv',
      filename: 'crime_incident_reports_2017.csv',
      year: '2017',
      description: 'Crime Incident Reports - 2017'
    },
    '2016': {
      url: 'https://data.boston.gov/dataset/6220d948-eae2-4e4b-8723-2dc8e67722a3/resource/b6c4e2c3-7b1e-4f4a-b019-bef8c6a0e882/download/tmp3ochjtdc.csv',
      filename: 'crime_incident_reports_2016.csv',
      year: '2016',
      description: 'Crime Incident Reports - 2016'
    },
    '2015': {
      url: 'https://data.boston.gov/dataset/6220d948-eae2-4e4b-8723-2dc8e67722a3/resource/792031bf-b9bb-467c-b118-fe795befdf00/download/tmpzr3l5bxw.csv',
      filename: 'crime_incident_reports_2015.csv',
      year: '2015',
      description: 'Crime Incident Reports - 2015'
    }
  },
  
  // Column schema
  columns: [
    { name: 'INCIDENT_NUMBER', type: 'VARCHAR(50)', description: 'Unique identifier for each incident' },
    { name: 'OFFENSE_CODE', type: 'INTEGER', description: 'Numeric code for the offense type' },
    { name: 'OFFENSE_CODE_GROUP', type: 'VARCHAR(100)', description: 'Grouping of offense codes' },
    { name: 'OFFENSE_DESCRIPTION', type: 'TEXT', description: 'Human-readable description of the offense' },
    { name: 'DISTRICT', type: 'VARCHAR(10)', description: 'Police district where incident occurred' },
    { name: 'REPORTING_AREA', type: 'VARCHAR(50)', description: 'Reporting area code' },
    { name: 'SHOOTING', type: 'BOOLEAN', description: 'Binary flag indicating if incident involved a shooting' },
    { name: 'OCCURRED_ON_DATE', type: 'TIMESTAMP WITH TIME ZONE', description: 'Date and time when incident occurred' },
    { name: 'YEAR', type: 'INTEGER', description: 'Year of incident' },
    { name: 'MONTH', type: 'INTEGER', description: 'Month of incident (1-12)' },
    { name: 'DAY_OF_WEEK', type: 'VARCHAR(20)', description: 'Day of week' },
    { name: 'HOUR', type: 'INTEGER', description: 'Hour of day (0-23)' },
    { name: 'UCR_PART', type: 'VARCHAR(50)', description: 'Uniform Crime Reporting part classification' },
    { name: 'STREET', type: 'TEXT', description: 'Street address where incident occurred' },
    { name: 'Lat', type: 'FLOAT', description: 'Latitude coordinate' },
    { name: 'Long', type: 'FLOAT', description: 'Longitude coordinate' },
    { name: 'Location', type: 'TEXT', description: 'Geographic coordinates in format "(lat, long)"' }
  ]
};

/**
 * Boston Crime Importer
 */
export class BostonCrimeImporter {
  constructor(options = {}) {
    this.downloadDir = options.downloadDir || '/tmp/boston-crime';
    this.r2Bucket = options.r2Bucket || 'harvy-artifacts';
    this.r2Prefix = options.r2Prefix || 'boston-crime';
    this.databaseUrl = options.databaseUrl || process.env.DATABASE_URL;
    this.rateLimitDelay = options.rateLimitDelay || 1000;
    this.maxRetries = options.maxRetries || 3;
    this.timeout = options.timeout || 60000;
  }

  /**
   * Initialize directories
   */
  async initialize() {
    if (!existsSync(this.downloadDir)) {
      await mkdir(this.downloadDir, { recursive: true });
    }
    console.log(`✅ Initialized: ${this.downloadDir}`);
  }

  /**
   * Download a single file
   */
  async downloadFile(key, targetPath = null) {
    const fileConfig = BOSTON_CRIME_CONFIG.files[key];
    if (!fileConfig) {
      throw new Error(`Unknown file key: ${key}`);
    }

    const filename = targetPath || join(this.downloadDir, fileConfig.filename);
    
    console.log(`📥 Downloading: ${fileConfig.description}`);
    console.log(`   URL: ${fileConfig.url}`);
    console.log(`   Target: ${filename}`);

    let retryCount = 0;
    while (retryCount < this.maxRetries) {
      try {
        const response = await fetch(fileConfig.url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Harvy-Boston-Crime-Importer/1.0',
            'Accept': 'text/csv, application/octet-stream'
          },
          signal: AbortSignal.timeout(this.timeout)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentLength = response.headers.get('content-length');
        console.log(`   Size: ${contentLength ? this.formatBytes(parseInt(contentLength)) : 'Unknown'}`);

        // Ensure target directory exists
        const dir = dirname(filename);
        if (!existsSync(dir)) {
          await mkdir(dir, { recursive: true });
        }

        // Stream the response to a file
        const arrayBuffer = await response.arrayBuffer();
        await writeFile(filename, arrayBuffer);
        
        const stats = await this.getFileStats(filename);
        
        console.log(`✅ Downloaded: ${filename}`);
        console.log(`   Size: ${this.formatBytes(stats.size)}`);
        console.log(`   Lines: ${stats.lines}`);
        
        return {
          success: true,
          filename,
          url: fileConfig.url,
          year: fileConfig.year,
          size: stats.size,
          lines: stats.lines,
          records: stats.lines - 1 // Subtract header
        };

      } catch (error) {
        retryCount++;
        console.warn(`⚠️  Attempt ${retryCount} failed: ${error.message}`);
        
        if (retryCount >= this.maxRetries) {
          throw error;
        }
        
        await setTimeout(this.rateLimitDelay * retryCount);
      }
    }
  }

  /**
   * Get file statistics
   */
  async getFileStats(filename) {
    const stats = await this.statFile(filename);
    const lines = await this.countLines(filename);
    
    return {
      size: stats.size,
      lines: lines
    };
  }

  /**
   * Get file info (simplified for now)
   */
  async statFile(filename) {
    // In a real implementation, we'd use fs.stat
    // For now, we'll estimate based on file content
    const content = await readFile(filename, 'utf-8');
    return {
      size: content.length
    };
  }

  /**
   * Count lines in a file
   */
  async countLines(filename) {
    const content = await readFile(filename, 'utf-8');
    return content.split('\n').length;
  }

  /**
   * Download all files
   */
  async downloadAll(years = null) {
    const keysToDownload = years 
      ? years.map(y => String(y))
      : Object.keys(BOSTON_CRIME_CONFIG.files);
    
    const results = [];
    
    for (const key of keysToDownload) {
      try {
        const result = await this.downloadFile(key);
        results.push(result);
        
        // Rate limiting
        await setTimeout(this.rateLimitDelay);
        
      } catch (error) {
        console.error(`❌ Failed to download ${key}: ${error.message}`);
        results.push({
          success: false,
          key,
          error: error.message
        });
      }
    }
    
    return {
      total: keysToDownload.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
      totalRecords: results.filter(r => r.success).reduce((sum, r) => sum + (r.records || 0), 0),
      totalSize: results.filter(r => r.success).reduce((sum, r) => sum + (r.size || 0), 0)
    };
  }

  /**
   * Generate PostgreSQL schema
   */
  generatePostgreSQLSchema() {
    return `-- Boston Crime Incident Reports Database Schema
-- Generated by Harvy Boston Crime Importer

CREATE TABLE IF NOT EXISTS boston_crime_incidents (
    id BIGSERIAL PRIMARY KEY,
    incident_number VARCHAR(50) UNIQUE,
    offense_code INTEGER,
    offense_code_group VARCHAR(100),
    offense_description TEXT,
    district VARCHAR(10),
    reporting_area VARCHAR(50),
    shooting BOOLEAN,
    occurred_on_date TIMESTAMP WITH TIME ZONE,
    year INTEGER,
    month INTEGER,
    day_of_week VARCHAR(20),
    hour INTEGER,
    ucr_part VARCHAR(50),
    street TEXT,
    lat FLOAT,
    long FLOAT,
    location TEXT,
    
    -- Metadata
    source_file VARCHAR(255),
    imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for performance
    INDEX idx_boston_crime_incident_number (incident_number),
    INDEX idx_boston_crime_offense_code (offense_code),
    INDEX idx_boston_crime_district (district),
    INDEX idx_boston_crime_occurred_on_date (occurred_on_date),
    INDEX idx_boston_crime_year (year),
    INDEX idx_boston_crime_month (month),
    INDEX idx_boston_crime_day_of_week (day_of_week),
    INDEX idx_boston_crime_hour (hour),
    INDEX idx_boston_crime_shooting (shooting),
    INDEX idx_boston_crime_lat_long (lat, long)
);

-- Create a materialized view for common queries
CREATE MATERIALIZED VIEW IF NOT EXISTS boston_crime_summary AS
SELECT 
    year,
    month,
    day_of_week,
    hour,
    district,
    offense_code,
    offense_description,
    COUNT(*) as incident_count,
    SUM(CASE WHEN shooting THEN 1 ELSE 0 END) as shooting_count
FROM boston_crime_incidents
GROUP BY year, month, day_of_week, hour, district, offense_code, offense_description;

-- Create a function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_boston_crime_summary()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW boston_crime_summary;
END;
$$ LANGUAGE plpgsql;

-- Create a view for geographic analysis
CREATE OR REPLACE VIEW boston_crime_geographic AS
SELECT 
    district,
    lat,
    long,
    COUNT(*) as incident_count,
    STRING_AGG(DISTINCT offense_description, ', ') as offense_types
FROM boston_crime_incidents
WHERE lat IS NOT NULL AND long IS NOT NULL
GROUP BY district, lat, long
HAVING COUNT(*) > 1;
`;
  }

  /**
   * Generate R2 upload commands
   */
  generateR2UploadCommands() {
    const commands = [];
    
    for (const [key, fileConfig] of Object.entries(BOSTON_CRIME_CONFIG.files)) {
      const localPath = join(this.downloadDir, fileConfig.filename);
      const r2Key = join(this.r2Prefix, 'raw', fileConfig.filename);
      
      commands.push({
        localPath,
        r2Key,
        contentType: 'text/csv',
        metadata: {
          'dataset': BOSTON_CRIME_CONFIG.datasetId,
          'source': BOSTON_CRIME_CONFIG.source,
          'year': fileConfig.year,
          'description': fileConfig.description,
          'license': BOSTON_CRIME_CONFIG.license
        }
      });
    }
    
    return commands;
  }

  /**
   * Generate import summary
   */
  generateImportSummary(results) {
    const totalRecords = results.reduce((sum, r) => sum + (r.records || 0), 0);
    const totalSize = results.reduce((sum, r) => sum + (r.size || 0), 0);
    
    return {
      dataset: BOSTON_CRIME_CONFIG.datasetId,
      source: BOSTON_CRIME_CONFIG.source,
      sourceUrl: BOSTON_CRIME_CONFIG.sourceUrl,
      license: BOSTON_CRIME_CONFIG.license,
      coverage: BOSTON_CRIME_CONFIG.coverage,
      
      importStats: {
        totalFiles: results.length,
        successfulFiles: results.filter(r => r.success).length,
        failedFiles: results.filter(r => !r.success).length,
        totalRecords,
        totalSize,
        totalSizeFormatted: this.formatBytes(totalSize)
      },
      
      files: results.map(r => ({
        year: r.year,
        filename: r.filename,
        records: r.records,
        size: r.size,
        sizeFormatted: this.formatBytes(r.size),
        success: r.success,
        error: r.error
      })),
      
      schema: BOSTON_CRIME_CONFIG.columns,
      
      r2Uploads: this.generateR2UploadCommands(),
      
      postgresqlSchema: this.generatePostgreSQLSchema()
    };
  }

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * List available files
   */
  listAvailableFiles() {
    console.log('\n📊 Available Boston Crime Incident Reports Files:\n');
    console.log('='.repeat(80));
    
    Object.entries(BOSTON_CRIME_CONFIG.files).forEach(([key, fileConfig]) => {
      console.log(`${key.padEnd(15)} | ${fileConfig.year.padEnd(15)} | ${fileConfig.description}`);
    });
    
    console.log('='.repeat(80));
    console.log(`\n📥 Total: ${Object.keys(BOSTON_CRIME_CONFIG.files).length} files available`);
  }
}

/**
 * Main function
 */
async function main() {
  const importer = new BostonCrimeImporter({
    downloadDir: '/tmp/boston-crime-data'
  });
  
  try {
    await importer.initialize();
    
    // List available files
    importer.listAvailableFiles();
    
    // Download a sample file (2023-present)
    console.log('\n🚀 Downloading 2023-Present data as example...\n');
    const result = await importer.downloadFile('2023-present');
    
    if (result.success) {
      console.log(`\n✅ Successfully downloaded: ${result.filename}`);
      console.log(`   Records: ${result.records.toLocaleString()}`);
      console.log(`   Size: ${result.sizeFormatted}`);
      
      // Generate schema
      console.log('\n📋 PostgreSQL Schema:');
      console.log(importer.generatePostgreSQLSchema());
      
      // Generate import summary
      const summary = importer.generateImportSummary([result]);
      console.log('\n📊 Import Summary:');
      console.log(JSON.stringify(summary.importStats, null, 2));
      
      // Show R2 upload commands
      console.log('\n📦 R2 Upload Commands:');
      const uploads = importer.generateR2UploadCommands();
      uploads.forEach(upload => {
        console.log(`   aws s3 cp ${upload.localPath} s3://${importer.r2Bucket}/${upload.r2Key}`);
      });
    }
    
    console.log('\n💡 To download all files, run:');
    console.log('   await importer.downloadAll();');
    
    console.log('\n💡 To download specific years, run:');
    console.log('   await importer.downloadAll(["2023-present", "2022", "2021"]);');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run main if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default BostonCrimeImporter;
export { BOSTON_CRIME_CONFIG };