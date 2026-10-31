/**
 * Boston Crime Incident Reports Downloader
 * Downloads and processes crime data from data.boston.gov
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { setTimeout } from 'node:timers/promises';

/**
 * Boston Crime Dataset Configuration
 */
const BOSTON_CRIME_DATASETS = {
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
  },
  'field-explanation': {
    url: 'https://data.boston.gov/dataset/6220d948-eae2-4e4b-8723-2dc8e67722a3/resource/9c30453a-fefa-4fe0-b51a-5fc09b0f4655/download/rmscrimeincidentfieldexplanation.xlsx',
    filename: 'rms_crime_incident_field_explanation.xlsx',
    year: 'Reference',
    description: 'Field Explanation Guide'
  },
  'offense-codes': {
    url: 'https://data.boston.gov/dataset/6220d948-eae2-4e4b-8723-2dc8e67722a3/resource/3aeccf51-a231-4555-ba21-74572b4c33d6/download/rmsoffensecodes.xlsx',
    filename: 'rms_offense_codes.xlsx',
    year: 'Reference',
    description: 'Offense Codes Reference'
  }
};

/**
 * Boston Crime Downloader Class
 */
export class BostonCrimeDownloader {
  constructor(options = {}) {
    this.downloadDir = options.downloadDir || '/tmp/boston-crime';
    this.rateLimitDelay = options.rateLimitDelay || 1000; // 1 second between downloads
    this.maxRetries = options.maxRetries || 3;
    this.timeout = options.timeout || 30000; // 30 seconds
  }

  /**
   * Initialize download directory
   */
  async initialize() {
    if (!existsSync(this.downloadDir)) {
      await mkdir(this.downloadDir, { recursive: true });
    }
    console.log(`✅ Download directory: ${this.downloadDir}`);
  }

  /**
   * Download a single file
   */
  async downloadFile(key, targetPath = null) {
    const dataset = BOSTON_CRIME_DATASETS[key];
    if (!dataset) {
      throw new Error(`Unknown dataset key: ${key}`);
    }

    const filename = targetPath || join(this.downloadDir, dataset.filename);
    
    console.log(`📥 Downloading: ${dataset.description}`);
    console.log(`   URL: ${dataset.url}`);
    console.log(`   Target: ${filename}`);

    let retryCount = 0;
    while (retryCount < this.maxRetries) {
      try {
        const response = await fetch(dataset.url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Harvy-Boston-Crime-Downloader/1.0',
            'Accept': 'text/csv, application/octet-stream'
          },
          signal: AbortSignal.timeout(this.timeout)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        const contentLength = response.headers.get('content-length');
        
        console.log(`   Content-Type: ${contentType}`);
        console.log(`   Size: ${contentLength ? this.formatBytes(parseInt(contentLength)) : 'Unknown'}`);

        // Ensure target directory exists
        const dir = dirname(filename);
        if (!existsSync(dir)) {
          await mkdir(dir, { recursive: true });
        }

        // Stream the response to a file
        const fileStream = await writeFile(filename, await response.arrayBuffer());
        
        console.log(`✅ Downloaded: ${filename}`);
        
        return {
          success: true,
          filename,
          url: dataset.url,
          year: dataset.year,
          size: contentLength ? parseInt(contentLength) : null,
          contentType
        };

      } catch (error) {
        retryCount++;
        console.warn(`⚠️  Attempt ${retryCount} failed: ${error.message}`);
        
        if (retryCount >= this.maxRetries) {
          throw error;
        }
        
        // Exponential backoff
        await setTimeout(this.rateLimitDelay * retryCount);
      }
    }
  }

  /**
   * Download all crime datasets
   */
  async downloadAll(years = null) {
    const keysToDownload = years 
      ? years.map(y => String(y))
      : Object.keys(BOSTON_CRIME_DATASETS).filter(k => k !== 'field-explanation' && k !== 'offense-codes');
    
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
      results
    };
  }

  /**
   * Download reference files
   */
  async downloadReferenceFiles() {
    const referenceKeys = ['field-explanation', 'offense-codes'];
    const results = [];
    
    for (const key of referenceKeys) {
      try {
        const result = await this.downloadFile(key);
        results.push(result);
        await setTimeout(this.rateLimitDelay);
      } catch (error) {
        console.error(`❌ Failed to download reference ${key}: ${error.message}`);
        results.push({
          success: false,
          key,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * Get dataset metadata
   */
  getDatasetMetadata() {
    return {
      source: 'Boston Police Department',
      dataset: 'Crime Incident Reports (August 2015 - To Date)',
      license: 'Open Data Commons Public Domain Dedication and License (PDDL)',
      coverage: 'June 2015 to Present',
      updateFrequency: 'Regular updates',
      provider: 'Department of Innovation and Technology',
      location: 'Boston, MA',
      theme: 'Public Safety',
      description: 'Crime incident reports provided by Boston Police Department (BPD) to document the initial details surrounding an incident to which BPD officers respond. This dataset contains records from the new crime incident report system, which includes a reduced set of fields focused on capturing the type of incident as well as when and where it occurred.',
      database: 'Mark43 RMS Database (launched September 2019)',
      exclusion: 'Data that falls under MGL ch.41 s.98f',
      availableFiles: Object.values(BOSTON_CRIME_DATASETS)
        .filter(d => d.year !== 'Reference')
        .map(d => ({
          year: d.year,
          filename: d.filename,
          url: d.url,
          description: d.description
        }))
    };
  }

  /**
   * Get field information (from the field explanation file)
   */
  async getFieldInformation() {
    const fieldExplanationUrl = BOSTON_CRIME_DATASETS['field-explanation'].url;
    
    try {
      const response = await fetch(fieldExplanationUrl, {
        headers: {
          'User-Agent': 'Harvy-Boston-Crime-Downloader/1.0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch field explanation: ${response.status}`);
      }
      
      // For now, return the URL - in a real implementation, we'd parse the XLSX
      return {
        fieldExplanationUrl,
        note: 'Field explanation is in XLSX format. Use a library like xlsx to parse it.'
      };
    } catch (error) {
      console.warn('Could not fetch field explanation:', error.message);
      return null;
    }
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
   * List available datasets
   */
  listAvailableDatasets() {
    console.log('\n📊 Available Boston Crime Incident Reports Datasets:\n');
    console.log('='.repeat(80));
    
    Object.entries(BOSTON_CRIME_DATASETS).forEach(([key, dataset]) => {
      const type = dataset.year === 'Reference' ? '📋 Reference' : '📄 Data';
      console.log(`${type} ${key.padEnd(20)} | ${dataset.year.padEnd(15)} | ${dataset.description}`);
    });
    
    console.log('='.repeat(80));
    console.log(`\n📥 Total: ${Object.keys(BOSTON_CRIME_DATASETS).length} files available`);
  }
}

/**
 * Main function
 */
async function main() {
  const downloader = new BostonCrimeDownloader({
    downloadDir: '/tmp/boston-crime-data'
  });
  
  try {
    await downloader.initialize();
    
    // List available datasets
    downloader.listAvailableDatasets();
    
    // Get metadata
    const metadata = downloader.getDatasetMetadata();
    console.log('\n📋 Dataset Metadata:');
    console.log(`   Source: ${metadata.source}`);
    console.log(`   Coverage: ${metadata.coverage}`);
    console.log(`   License: ${metadata.license}`);
    console.log(`   Theme: ${metadata.theme}`);
    
    // Download example (2023-present)
    console.log('\n🚀 Example: Downloading 2023-Present data...');
    const result = await downloader.downloadFile('2023-present');
    
    if (result.success) {
      console.log(`\n✅ Successfully downloaded: ${result.filename}`);
      console.log(`   Size: ${result.size ? downloader.formatBytes(result.size) : 'Unknown'}`);
    }
    
    // Show how to download all
    console.log('\n💡 To download all datasets, run:');
    console.log('   await downloader.downloadAll();');
    
    // Show how to download specific years
    console.log('\n💡 To download specific years, run:');
    console.log('   await downloader.downloadAll([2023, 2022, 2021]);');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run main if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default BostonCrimeDownloader;

// Export the dataset configuration for reference
export { BOSTON_CRIME_DATASETS };