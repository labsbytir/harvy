#!/usr/bin/env node

/**
 * Harvy Kaggle Pipeline CLI
 * Command-line interface for managing Kaggle dataset imports
 */

import { createPipeline } from './pipeline.mjs';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

/**
 * CLI Commands
 */
const commands = {
  async search(args) {
    const pipeline = createPipeline();
    
    try {
      await pipeline.initialize();
      
      const query = args[0] || 'united states';
      const pageSize = parseInt(args[1]) || 10;
      
      console.log(`🔍 Searching for "${query}" (limit: ${pageSize})...`);
      
      const datasets = await pipeline.searchDatasets(query, { pageSize });
      
      if (datasets.length === 0) {
        console.log('❌ No datasets found');
        return;
      }
      
      console.log(`\n📊 Found ${datasets.length} datasets:\n`);
      
      datasets.forEach((dataset, index) => {
        console.log(`${index + 1}. ${dataset.title || dataset.name || 'Untitled'}`);
        console.log(`   ID: ${dataset.id || dataset.datasetId || 'N/A'}`);
        console.log(`   Downloads: ${dataset.downloadCount || 'N/A'}`);
        console.log(`   Views: ${dataset.viewCount || 'N/A'}`);
        console.log(`   Votes: ${dataset.voteCount || 'N/A'}`);
        console.log(`   URL: https://www.kaggle.com/datasets/${dataset.id || dataset.datasetId}`);
        console.log('');
      });
      
    } catch (error) {
      console.error('❌ Error:', error.message);
    } finally {
      await pipeline.close();
    }
  },

  async us(args) {
    const pipeline = createPipeline();
    
    try {
      await pipeline.initialize();
      
      const limit = parseInt(args[0]) || 10;
      
      console.log(`🔍 Finding popular United States datasets (limit: ${limit})...`);
      
      const datasets = await pipeline.getPopularUSDatasets(limit);
      
      if (datasets.length === 0) {
        console.log('❌ No US datasets found');
        return;
      }
      
      console.log(`\n📊 Popular United States Datasets:\n`);
      
      datasets.forEach((dataset, index) => {
        console.log(`${index + 1}. ${dataset.title || dataset.name || 'Untitled'}`);
        console.log(`   ID: ${dataset.id || dataset.datasetId || 'N/A'}`);
        console.log(`   Downloads: ${dataset.downloadCount || 'N/A'}`);
        console.log(`   Views: ${dataset.viewCount || 'N/A'}`);
        console.log(`   Votes: ${dataset.voteCount || 'N/A'}`);
        console.log(`   Tags: ${(dataset.tags || []).join(', ') || 'N/A'}`);
        console.log(`   URL: https://www.kaggle.com/datasets/${dataset.id || dataset.datasetId}`);
        console.log('');
      });
      
    } catch (error) {
      console.error('❌ Error:', error.message);
    } finally {
      await pipeline.close();
    }
  },

  async import(args) {
    const pipeline = createPipeline();
    
    try {
      await pipeline.initialize();
      
      if (args.length === 0) {
        console.log('❌ Usage: kaggle import <dataset-id> [dataset-id-2] [dataset-id-3]...');
        console.log('   Example: kaggle import username/dataset-name');
        return;
      }
      
      const datasetIds = args;
      
      console.log(`🚀 Importing ${datasetIds.length} dataset(s)...`);
      
      const result = await pipeline.importMultipleDatasets(datasetIds, {
        importFiles: true,
        storeInR2: true,
        storeInDatabase: true,
        processFiles: true
      });
      
      console.log(`\n✅ Import Summary:`);
      console.log(`   Total: ${result.total}`);
      console.log(`   Successful: ${result.successful}`);
      console.log(`   Failed: ${result.failed}`);
      
      if (result.failed > 0) {
        console.log('\n❌ Failed imports:');
        result.results
          .filter(r => !r.success)
          .forEach(r => {
            console.log(`   - ${r.dataset}: ${r.error}`);
          });
      }
      
    } catch (error) {
      console.error('❌ Error:', error.message);
    } finally {
      await pipeline.close();
    }
  },

  async list(args) {
    const pipeline = createPipeline();
    
    try {
      await pipeline.initialize();
      
      const status = args[0];
      
      let datasets;
      if (status) {
        console.log(`📋 Listing datasets with status "${status}"...`);
        datasets = await pipeline.dbClient.getDatasetsByStatus(status);
      } else {
        console.log('📋 Listing all imported datasets...');
        datasets = await pipeline.dbClient.getDatasetsByStatus('completed');
      }
      
      if (datasets.length === 0) {
        console.log('❌ No datasets found');
        return;
      }
      
      console.log(`\n📊 Found ${datasets.length} datasets:\n`);
      
      datasets.forEach((dataset, index) => {
        console.log(`${index + 1}. ${dataset.title}`);
        console.log(`   Kaggle ID: ${dataset.kaggle_id}`);
        console.log(`   Status: ${dataset.status}`);
        console.log(`   Imported: ${dataset.imported_at}`);
        console.log(`   Files: ${dataset.file_count}`);
        console.log('');
      });
      
    } catch (error) {
      console.error('❌ Error:', error.message);
    } finally {
      await pipeline.close();
    }
  },

  async stats(args) {
    const pipeline = createPipeline();
    
    try {
      await pipeline.initialize();
      
      console.log('📈 Getting pipeline statistics...');
      
      const stats = await pipeline.getStatistics();
      
      console.log('\n📊 Pipeline Statistics:\n');
      console.log('Database:');
      console.log(`   Total Datasets: ${stats.database?.total_datasets || 0}`);
      console.log(`   Completed: ${stats.database?.completed_datasets || 0}`);
      console.log(`   Failed: ${stats.database?.failed_datasets || 0}`);
      console.log(`   Pending: ${stats.database?.pending_datasets || 0}`);
      console.log(`   Total Files: ${stats.database?.total_files || 0}`);
      console.log(`   Total Bytes: ${stats.database?.total_bytes || 0}`);
      
      console.log('\nR2 Storage:');
      console.log(`   Total Objects: ${stats.r2?.total_objects || 0}`);
      console.log(`   Datasets with Files: ${stats.r2?.datasets_with_files || 0}`);
      
    } catch (error) {
      console.error('❌ Error:', error.message);
    } finally {
      await pipeline.close();
    }
  },

  async jobs(args) {
    const pipeline = createPipeline();
    
    try {
      await pipeline.initialize();
      
      const limit = parseInt(args[0]) || 10;
      
      console.log(`📋 Getting recent import jobs (limit: ${limit})...`);
      
      const jobs = await pipeline.dbClient.getRecentImportJobs(limit);
      
      if (jobs.length === 0) {
        console.log('❌ No import jobs found');
        return;
      }
      
      console.log(`\n📊 Recent Import Jobs:\n`);
      
      jobs.forEach((job, index) => {
        console.log(`${index + 1}. Job ${job.job_id}`);
        console.log(`   Dataset: ${job.title} (${job.kaggle_id})`);
        console.log(`   Type: ${job.job_type}`);
        console.log(`   Status: ${job.status}`);
        console.log(`   Started: ${job.started_at}`);
        console.log(`   Completed: ${job.completed_at || 'N/A'}`);
        console.log(`   Files Processed: ${job.files_processed || 0}`);
        console.log(`   Rows Processed: ${job.rows_processed || 0}`);
        if (job.error_message) {
          console.log(`   Error: ${job.error_message}`);
        }
        console.log('');
      });
      
    } catch (error) {
      console.error('❌ Error:', error.message);
    } finally {
      await pipeline.close();
    }
  },

  async help(args) {
    console.log(`
🎯 Harvy Kaggle Pipeline CLI

Usage: node cli.mjs <command> [args]

Commands:
  search <query> [limit]    Search for datasets (default: united states)
  us [limit]                Find popular United States datasets
  import <dataset-id>+      Import one or more datasets
  list [status]             List imported datasets (filter by status)
  stats                     Show pipeline statistics
  jobs [limit]              Show recent import jobs
  help                       Show this help message

Examples:
  # Search for US datasets
  node cli.mjs search "united states" 10

  # Find popular US datasets
  node cli.mjs us 5

  # Import a specific dataset
  node cli.mjs import username/dataset-name

  # Import multiple datasets
  node cli.mjs import dataset1 dataset2 dataset3

  # List all imported datasets
  node cli.mjs list

  # List datasets with specific status
  node cli.mjs list completed

  # Show pipeline statistics
  node cli.mjs stats

  # Show recent import jobs
  node cli.mjs jobs 5

Environment Variables:
  KAGGLE_API_TOKEN         Kaggle API token (required)
  DATABASE_URL              PostgreSQL connection string (required)
  CLOUDFLARE_ACCOUNT_ID    Cloudflare account ID (required)
  R2_ACCESS_KEY_ID         R2 access key (required)
  R2_SECRET_ACCESS_KEY     R2 secret key (required)
  R2_BUCKET_NAME           R2 bucket name (default: harvy-artifacts)

For more information, see README.md
`);
  }
};

/**
 * Main CLI Function
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    commands.help([]);
    return;
  }
  
  const command = args[0].toLowerCase();
  const commandArgs = args.slice(1);
  
  // Load environment variables from .env file if it exists
  if (existsSync('.env')) {
    try {
      const envContent = await readFile('.env', 'utf-8');
      const lines = envContent.split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, value] = trimmed.split('=');
          if (key && value) {
            process.env[key.trim()] = value.trim();
          }
        }
      }
    } catch (error) {
      console.warn('⚠️  Could not load .env file:', error.message);
    }
  }
  
  // Check for required environment variables
  const requiredVars = ['KAGGLE_API_TOKEN', 'DATABASE_URL'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0 && command !== 'help') {
    console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
    console.error('   Set these in .env file or as environment variables');
    console.error('   See .env.example for template');
    process.exit(1);
  }
  
  // Execute command
  if (commands[command]) {
    try {
      await commands[command](commandArgs);
    } catch (error) {
      console.error('❌ Command failed:', error.message);
      process.exit(1);
    }
  } else {
    console.error(`❌ Unknown command: ${command}`);
    console.error('   Use "help" to see available commands');
    process.exit(1);
  }
}

// Run main
main().catch(error => {
  console.error('❌ CLI Error:', error.message);
  process.exit(1);
});