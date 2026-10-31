# Harvy Kaggle Dataset Ingestion Pipeline

This pipeline enables automated import of datasets from Kaggle into your Harvy system, storing raw data in Cloudflare R2 and structured metadata in PostgreSQL.

## Features

- **Kaggle API Integration**: Full access to Kaggle's dataset catalog
- **United States Focus**: Specialized filtering for US-related datasets
- **Dual Storage**: Raw files in R2, structured metadata in PostgreSQL
- **Provenance Tracking**: Complete audit trail for all imports
- **Error Handling**: Robust error logging and recovery
- **Rate Limiting**: Respects Kaggle's API limits
- **Workflow Integration**: Ready for n8n automation

## Prerequisites

### Kaggle API Access

1. **Get Kaggle API Token**:
   - Go to [Kaggle Account Settings](https://www.kaggle.com/account)
   - Scroll to "API" section
   - Click "Create New Token"
   - This will download `kaggle.json` with your credentials

2. **Set Environment Variable**:
   ```bash
   export KAGGLE_API_TOKEN=KGAT_your_api_token_here
   ```

### Database Configuration

You mentioned having PostgreSQL on UpCloud at `85.9.196.97`. Configure the connection:

```bash
# Option 1: Full connection string
export DATABASE_URL=postgresql://username:password@85.9.196.97:5432/database_name

# Option 2: Individual settings
export DB_HOST=85.9.196.97
export DB_PORT=5432
export DB_NAME=harvy
export DB_USER=username
export DB_PASSWORD=password
```

### Cloudflare R2 Configuration

For your `harvy-artifacts` bucket:

```bash
export CLOUDFLARE_ACCOUNT_ID=your_account_id
export R2_ACCESS_KEY_ID=your_access_key_id
export R2_SECRET_ACCESS_KEY=your_secret_access_key
export R2_BUCKET_NAME=harvy-artifacts
```

## Installation

```bash
# Navigate to the kaggle directory
cd /Users/pen/Desktop/harvy-new/v2/automation/kaggle

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your credentials
nano .env
```

## Usage

### 1. Search for United States Datasets

```bash
# Search for US datasets
node pipeline.mjs

# Or use the search method directly
node -e "
import { createPipeline } from './pipeline.mjs';
const pipeline = await createPipeline();
await pipeline.initialize();
const datasets = await pipeline.searchDatasets('united states', { pageSize: 10 });
console.log(datasets);
await pipeline.close();
"
```

### 2. Get Popular US Datasets

```bash
node -e "
import { createPipeline } from './pipeline.mjs';
const pipeline = await createPipeline();
await pipeline.initialize();
const datasets = await pipeline.getPopularUSDatasets(10);
console.log('Popular US Datasets:', datasets.map(d => d.title));
await pipeline.close();
"
```

### 3. Import a Specific Dataset

```bash
# Import by dataset identifier (format: username/dataset-name)
node -e "
import { createPipeline } from './pipeline.mjs';
const pipeline = await createPipeline();
await pipeline.initialize();

// Example: Import a popular US dataset
const result = await pipeline.importDataset('username/dataset-name', {
  importFiles: true,
  storeInR2: true,
  storeInDatabase: true
});

console.log('Import result:', result);
await pipeline.close();
"
```

### 4. Import Multiple Datasets

```bash
node -e "
import { createPipeline } from './pipeline.mjs';
const pipeline = await createPipeline();
await pipeline.initialize();

const datasets = ['dataset1', 'dataset2', 'dataset3'];
const result = await pipeline.importMultipleDatasets(datasets);

console.log('Import summary:', result);
await pipeline.close();
"
```

### 5. Search and Import in One Step

```bash
node -e "
import { createPipeline } from './pipeline.mjs';
const pipeline = await createPipeline();
await pipeline.initialize();

const result = await pipeline.searchAndImport('united states', {
  limit: 5,
  importFiles: true,
  storeInR2: true,
  storeInDatabase: true
});

console.log('Search and import result:', result);
await pipeline.close();
"
```

## Database Schema

The pipeline creates the following tables in PostgreSQL:

### Main Tables
- `kaggle_sources` - Source configuration
- `kaggle_datasets` - Dataset metadata
- `kaggle_dataset_files` - File information
- `kaggle_file_columns` - Column schemas
- `kaggle_import_jobs` - Import job tracking
- `kaggle_data_quality_issues` - Data quality tracking

### Views
- `kaggle_datasets_overview` - Dataset summary with counts
- `kaggle_recent_imports` - Recent import jobs
- `kaggle_data_quality_summary` - Quality metrics

## R2 Storage Structure

Files are stored in R2 with this structure:
```
kaggle/
  datasets/
    {dataset-identifier}/
      metadata.json          # Dataset metadata
      files/
        {filename.csv}        # Raw data files
        {filename.parquet}
        ...
```

## n8n Workflow Integration

The pipeline includes a ready-to-use n8n workflow:

1. **Import the workflow**: Copy `kaggle-ingestion.workflow.json` to your n8n instance
2. **Configure variables**: Set the required environment variables in n8n
3. **Activate**: Enable the workflow for scheduled or manual execution

### Workflow Features
- Daily scheduled dataset discovery
- Manual trigger for specific datasets
- Error handling and logging
- Provenance tracking

## Configuration Options

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `KAGGLE_API_TOKEN` | Yes | - | Kaggle API token |
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `CLOUDFLARE_ACCOUNT_ID` | Yes | - | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | Yes | - | R2 access key |
| `R2_SECRET_ACCESS_KEY` | Yes | - | R2 secret key |
| `R2_BUCKET_NAME` | No | `harvy-artifacts` | R2 bucket name |
| `MAX_CONCURRENT_DOWNLOADS` | No | 3 | Max concurrent downloads |
| `RATE_LIMIT_DELAY` | No | 1000 | Delay between requests (ms) |

### Pipeline Options

```javascript
const options = {
  importFiles: true,        // Download actual files
  storeInR2: true,          // Store files in R2
  storeInDatabase: true,    // Store metadata in DB
  processFiles: true,       // Process files (extract schema, etc.)
  maxConcurrentDownloads: 3, // Concurrent downloads
  rateLimitDelay: 1000      // Delay between requests (ms)
};
```

## Popular United States Datasets to Consider

Based on your request for US datasets, here are some popular options:

### Government & Public Data
- **US Census Data** - Population, demographics, economic data
- **FBI Crime Data** - Crime statistics across US cities
- **BLS Economic Data** - Employment, inflation, productivity
- **CDC Health Data** - Disease, mortality, health indicators
- **NOAA Climate Data** - Weather, climate, environmental data

### Economics & Finance
- **S&P 500 Stock Data** - Historical stock prices
- **US Housing Market** - Real estate and property data
- **Federal Reserve Economic Data** - Economic indicators
- **IRS Tax Data** - Tax statistics and filings

### Demographics & Social
- **US Census Bureau Datasets** - Comprehensive demographic data
- **American Community Survey** - Detailed population data
- **Voter Registration Data** - Election and voting patterns
- **Education Statistics** - School performance, enrollment data

### Health & COVID-19
- **Johns Hopkins COVID-19 Data** - Case counts, deaths, vaccinations
- **CDC COVID-19 Surveillance** - Testing, hospitalization data
- **US Health Insurance Data** - Coverage statistics

## Error Handling

The pipeline includes comprehensive error handling:

- **Rate limiting**: Automatic delays between requests
- **Retry logic**: Automatic retries for transient failures
- **Error logging**: All errors logged to database
- **Data quality**: Issues tracked in dedicated table
- **Provenance**: Complete audit trail for debugging

## Monitoring

### Check Pipeline Statistics

```bash
node -e "
import { createPipeline } from './pipeline.mjs';
const pipeline = await createPipeline();
await pipeline.initialize();
const stats = await pipeline.getStatistics();
console.log('Pipeline Stats:', stats);
await pipeline.close();
"
```

### Query Database Directly

```sql
-- Get import status
SELECT * FROM kaggle_datasets_overview;

-- Check recent imports
SELECT * FROM kaggle_recent_imports;

-- Find data quality issues
SELECT * FROM kaggle_data_quality_summary;

-- Get dataset details
SELECT * FROM kaggle_datasets WHERE kaggle_id = 'username/dataset-name';
```

## Security Considerations

1. **API Tokens**: Never commit to version control
2. **Database Credentials**: Use environment variables or secret management
3. **R2 Credentials**: Restrict permissions to only what's needed
4. **Rate Limiting**: Respect Kaggle's API limits (5-20 requests per second)
5. **Data Privacy**: Be aware of dataset licenses and usage restrictions

## Troubleshooting

### Common Issues

1. **Authentication Errors**:
   - Verify `KAGGLE_API_TOKEN` is correct
   - Check token hasn't expired
   - Ensure token has necessary permissions

2. **Database Connection Issues**:
   - Verify database is accessible from your environment
   - Check connection string format
   - Test connection manually

3. **R2 Access Issues**:
   - Verify Cloudflare account ID
   - Check R2 bucket exists
   - Ensure credentials have proper permissions

4. **Rate Limiting**:
   - Increase `RATE_LIMIT_DELAY` if getting rate limited
   - Reduce `MAX_CONCURRENT_DOWNLOADS`

### Debug Mode

```bash
# Enable debug logging
DEBUG=kaggle:* node pipeline.mjs
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - See [LICENSE](../../LICENSE) for details.

## Support

For issues or questions:
- Check the [Harvy Documentation](../../docs/)
- Review the [AGENTS.md](../../AGENTS.md) for platform rules
- Create an issue in the repository

---

**Built with ❤️ for Harvy Automation**

*Last updated: 2026-10-30*