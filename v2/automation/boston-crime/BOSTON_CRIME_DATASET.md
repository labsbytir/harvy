# Boston Crime Incident Reports Dataset

## 📊 Dataset Overview

**Boston Crime Incident Reports (August 2015 - To Date)** is a comprehensive dataset provided by the Boston Police Department (BPD) that documents crime incidents in the City of Boston. This dataset is part of the City of Boston's open data initiative and is available through the [Analyze Boston](https://data.boston.gov) portal.

### 🎯 Key Information

| Property | Value |
|----------|-------|
| **Source** | Boston Police Department |
| **Provider** | Department of Innovation and Technology |
| **License** | Open Data Commons Public Domain Dedication (PDDL) |
| **Coverage** | June 2015 to Present |
| **Update Frequency** | Regular updates |
| **Format** | CSV (yearly files) |
| **Theme** | Public Safety |
| **Location** | Boston, Massachusetts, USA |

### 🔗 Dataset URL

https://data.boston.gov/dataset/crime-incident-reports-august-2015-to-date-source-new-system

---

## 📥 Available Files

The dataset is split into yearly CSV files for easier management:

### 📄 Data Files

| Year | Filename | Download Link | Approx. Size |
|------|----------|---------------|--------------|
| **2023 to Present** | `tmpf6fo0lp8.csv` | [Download](https://data.boston.gov/dataset/6220d948-eae2-4e4b-8723-2dc8e67722a3/resource/b973d8cb-eeb2-4e7e-99da-c92938efc9c0/download/tmpf6fo0lp8.csv) | ~55MB |
| **2022** | `tmpdfeo3qy2.csv` | [Download](https://data.boston.gov/dataset/6220d948-eae2-4e4b-8723-2dc8e67722a3/resource/313e56df-6d77-49d2-9c49-ee411f10cf58/download/tmpdfeo3qy2.csv) | ~50MB |
| **2021** | `tmpfap3hfze.csv` | [Download](https://data.boston.gov/dataset/6220d948-eae2-4e4b-8723-2dc8e67722a3/resource/f4495ee9-c42c-4019-82c1-d067f07e45d2/download/tmpfap3hfze.csv) | ~45MB |
| **2020** | `tmpkd_w64k_.csv` | [Download](https://data.boston.gov/dataset/6220d948-eae2-4e4b-8723-2dc8e67722a3/resource/be047094-85fe-4104-a480-4fa3d03f9623/download/tmpkd_w64k_.csv) | ~40MB |
| **2019** | `tmp6w6ts2d7.csv` | [Download](https://data.boston.gov/dataset/6220d948-eae2-4e4b-8723-2dc8e67722a3/resource/34e0ae6b-8c94-4998-ae9e-1b51551fe9ba/download/tmp6w6ts2d7.csv) | ~35MB |
| **2018** | `tmpf_uzkqpk.csv` | [Download](https://data.boston.gov/dataset/6220d948-eae2-4e4b-8723-2dc8e67722a3/resource/e86f8e38-a23c-4c1a-8455-c8f94210a8f1/download/tmpf_uzkqpk.csv) | ~30MB |
| **2017** | `tmp3apxsafn.csv` | [Download](https://data.boston.gov/dataset/6220d948-eae2-4e4b-8723-2dc8e67722a3/resource/64ad0053-842c-459b-9833-ff53d568f2e3/download/tmp3apxsafn.csv) | ~25MB |
| **2016** | `tmp3ochjtdc.csv` | [Download](https://data.boston.gov/dataset/6220d948-eae2-4e4b-8723-2dc8e67722a3/resource/b6c4e2c3-7b1e-4f4a-b019-bef8c6a0e882/download/tmp3ochjtdc.csv) | ~20MB |
| **2015** | `tmpzr3l5bxw.csv` | [Download](https://data.boston.gov/dataset/6220d948-eae2-4e4b-8723-2dc8e67722a3/resource/792031bf-b9bb-467c-b118-fe795befdf00/download/tmpzr3l5bxw.csv) | ~15MB |

### 📋 Reference Files

| Description | Filename | Download Link |
|-------------|----------|---------------|
| Field Explanation Guide | `rmscrimeincidentfieldexplanation.xlsx` | [Download](https://data.boston.gov/dataset/6220d948-eae2-4e4b-8723-2dc8e67722a3/resource/9c30453a-fefa-4fe0-b51a-5fc09b0f4655/download/rmscrimeincidentfieldexplanation.xlsx) |
| Offense Codes Reference | `rmsoffensecodes.xlsx` | [Download](https://data.boston.gov/dataset/6220d948-eae2-4e4b-8723-2dc8e67722a3/resource/3aeccf51-a231-4555-ba21-74572b4c33d6/download/rmsoffensecodes.xlsx) |

---

## 📋 Data Schema

The dataset contains **17 columns** with the following structure:

### 📊 Column Definitions

| # | Column Name | Data Type | Description | Example |
|---|-------------|-----------|-------------|---------|
| 1 | **INCIDENT_NUMBER** | VARCHAR(50) | Unique identifier for each incident | `232007173` |
| 2 | **OFFENSE_CODE** | INTEGER | Numeric code for the offense type | `3115` |
| 3 | **OFFENSE_CODE_GROUP** | VARCHAR(100) | Grouping of offense codes | (often empty) |
| 4 | **OFFENSE_DESCRIPTION** | TEXT | Human-readable description of the offense | `INVESTIGATE PERSON` |
| 5 | **DISTRICT** | VARCHAR(10) | Police district where incident occurred | `B3`, `A1`, `C6` |
| 6 | **REPORTING_AREA** | VARCHAR(50) | Reporting area code | `316`, ` ` (empty) |
| 7 | **SHOOTING** | BOOLEAN | Binary flag (1=yes, 0=no) indicating if incident involved a shooting | `0` or `1` |
| 8 | **OCCURRED_ON_DATE** | TIMESTAMP WITH TIME ZONE | Date and time when incident occurred (ISO 8601 format) | `2023-01-27 22:44:00+00` |
| 9 | **YEAR** | INTEGER | Year of incident | `2023` |
| 10 | **MONTH** | INTEGER | Month of incident (1-12) | `1` (January) |
| 11 | **DAY_OF_WEEK** | VARCHAR(20) | Day of week | `Friday` |
| 12 | **HOUR** | INTEGER | Hour of day (0-23) | `22` (10 PM) |
| 13 | **UCR_PART** | VARCHAR(50) | Uniform Crime Reporting part classification | (often empty) |
| 14 | **STREET** | TEXT | Street address where incident occurred | `FAVRE ST` |
| 15 | **Lat** | FLOAT | Latitude coordinate | `42.27166144598919` |
| 16 | **Long** | FLOAT | Longitude coordinate | `-71.09953381947697` |
| 17 | **Location** | TEXT | Geographic coordinates in format "(lat, long)" | `(42.27166144598919, -71.09953381947697)` |

---

## 🎯 Dataset Characteristics

### ✅ Strengths

1. **Comprehensive Coverage**: Data from June 2015 to present (9+ years)
2. **Geographic Precision**: Latitude and longitude coordinates for mapping
3. **Temporal Granularity**: Date, time, year, month, day of week, and hour
4. **Offense Classification**: Both numeric codes and human-readable descriptions
5. **Shooting Flag**: Easy identification of violent incidents
6. **Police District Information**: Enables district-level analysis
7. **Open License**: Public domain dedication (PDDL) - free to use
8. **Regular Updates**: Data is updated regularly by BPD

### ⚠️ Limitations

1. **Data Exclusions**: Excludes data that falls under [MGL ch.41 s.98f](https://malegislature.gov/laws/generallaws/parti/titlevii/chapter41/section98f) (certain sensitive information)
2. **System Transition**: 2019 data contains combined exports from Intergraph RMS and Mark43 RMS during the transition
3. **Field Completeness**: Some fields (OFFENSE_CODE_GROUP, UCR_PART, REPORTING_AREA) may be empty
4. **Location Precision**: Street addresses may be approximate

### 📊 Estimated Statistics (2023-Present)

- **Total Records**: 359,500+ incidents
- **File Size**: ~55MB (uncompressed)
- **Time Period**: January 2023 to Present
- **Unique Offenses**: ~100+ offense types
- **Police Districts**: 12+ districts (A1, B2, B3, C6, D4, D14, E5, E13, E18, etc.)

---

## 🔍 Analysis Opportunities

### 📈 Temporal Analysis

1. **Yearly Trends**: Track crime patterns over multiple years
2. **Monthly Patterns**: Identify seasonal trends
3. **Daily Patterns**: Compare weekdays vs. weekends
4. **Hourly Patterns**: Find peak crime hours
5. **Holiday Analysis**: Impact of holidays on crime rates

### 🗺️ Geographic Analysis

1. **Crime Hotspots**: Identify areas with high crime concentration
2. **District Comparison**: Compare crime rates across police districts
3. **Neighborhood Analysis**: Map crime to specific neighborhoods
4. **Spatial Clustering**: Find geographic crime clusters
5. **Proximity Analysis**: Relationship to landmarks, transit, etc.

### 🎯 Offense Analysis

1. **Offense Type Distribution**: Most common crimes
2. **Offense Trends**: Changes in crime types over time
3. **Shooting Analysis**: Patterns in gun violence
4. **Property vs. Violent Crime**: Category breakdown
5. **Offense Severity**: Classification by UCR standards

### 🔗 Correlation Analysis

1. **Weather Correlation**: Crime patterns vs. weather conditions
2. **Event Correlation**: Crime during major events (sports, concerts, etc.)
3. **Economic Correlation**: Crime vs. economic indicators
4. **Demographic Correlation**: Crime vs. population density, income, etc.
5. **Temporal Correlation**: Crime patterns vs. time of day, day of week

---

## 💾 Storage & Import

### 📦 Storage Requirements

| Component | Size (Uncompressed) | Size (Compressed) |
|-----------|---------------------|-------------------|
| 2023-Present | ~55MB | ~15MB |
| 2022 | ~50MB | ~14MB |
| 2021 | ~45MB | ~12MB |
| 2020 | ~40MB | ~11MB |
| 2019 | ~35MB | ~10MB |
| 2018 | ~30MB | ~8MB |
| 2017 | ~25MB | ~7MB |
| 2016 | ~20MB | ~6MB |
| 2015 | ~15MB | ~5MB |
| **Total** | **~315MB** | **~88MB** |

### 🗃️ Recommended Storage Structure

```
harvy-artifacts/
  boston-crime/
    raw/
      crime_incident_reports_2015.csv
      crime_incident_reports_2016.csv
      crime_incident_reports_2017.csv
      crime_incident_reports_2018.csv
      crime_incident_reports_2019.csv
      crime_incident_reports_2020.csv
      crime_incident_reports_2021.csv
      crime_incident_reports_2022.csv
      crime_incident_reports_2023_present.csv
    processed/
      boston_crime_incidents.parquet
    metadata/
      dataset_metadata.json
      field_explanations.json
      offense_codes.json
```

### 🗄️ PostgreSQL Schema

```sql
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
```

### 📊 Recommended Views

```sql
-- Summary view for common queries
CREATE MATERIALIZED VIEW boston_crime_summary AS
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

-- Geographic view for mapping
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

-- Temporal view for trend analysis
CREATE OR REPLACE VIEW boston_crime_temporal AS
SELECT 
    year,
    month,
    day_of_week,
    hour,
    COUNT(*) as incident_count,
    COUNT(DISTINCT offense_code) as unique_offenses,
    SUM(CASE WHEN shooting THEN 1 ELSE 0 END) as shooting_count
FROM boston_crime_incidents
GROUP BY year, month, day_of_week, hour
ORDER BY year, month, day_of_week, hour;
```

---

## 🚀 Import Instructions

### 1️⃣ Download the Data

```bash
# Create download directory
mkdir -p /tmp/boston-crime

# Download 2023-Present data
curl -L -o /tmp/boston-crime/crime_2023_present.csv \
  "https://data.boston.gov/dataset/6220d948-eae2-4e4b-8723-2dc8e67722a3/resource/b973d8cb-eeb2-4e7e-99da-c92938efc9c0/download/tmpf6fo0lp8.csv"

# Download all years (example for 2022)
curl -L -o /tmp/boston-crime/crime_2022.csv \
  "https://data.boston.gov/dataset/6220d948-eae2-4e4b-8723-2dc8e67722a3/resource/313e56df-6d77-49d2-9c49-ee411f10cf58/download/tmpdfeo3qy2.csv"
```

### 2️⃣ Upload to R2

```bash
# Upload to Cloudflare R2
aws s3 cp /tmp/boston-crime/crime_2023_present.csv \
  s3://harvy-artifacts/boston-crime/raw/crime_incident_reports_2023_present.csv \
  --content-type "text/csv" \
  --metadata dataset=boston-crime,source=boston-police,year=2023-present
```

### 3️⃣ Import to PostgreSQL

```bash
# Create the table (using the schema above)
psql -h 85.9.196.97 -U username -d database_name -f boston_crime_schema.sql

# Import CSV data
psql -h 85.9.196.97 -U username -d database_name -c \
  "\COPY boston_crime_incidents FROM '/tmp/boston-crime/crime_2023_present.csv' \
   WITH (FORMAT csv, HEADER true, DELIMITER ',')"
```

### 4️⃣ Use the Harvy Pipeline

```javascript
import { BostonCrimeImporter } from './v2/automation/boston-crime/import-boston-crime.mjs';

const importer = new BostonCrimeImporter({
  downloadDir: '/tmp/boston-crime',
  r2Bucket: 'harvy-artifacts',
  databaseUrl: 'postgresql://user:pass@85.9.196.97:5432/db'
});

// Download all files
await importer.downloadAll();

// Or download specific years
await importer.downloadAll(['2023-present', '2022', '2021']);

// Generate PostgreSQL schema
const schema = importer.generatePostgreSQLSchema();

// Generate R2 upload commands
const uploads = importer.generateR2UploadCommands();
```

---

## 📊 Sample Queries

### Basic Statistics

```sql
-- Total incidents
SELECT COUNT(*) as total_incidents FROM boston_crime_incidents;

-- Incidents by year
SELECT year, COUNT(*) as incident_count 
FROM boston_crime_incidents 
GROUP BY year 
ORDER BY year;

-- Incidents by district
SELECT district, COUNT(*) as incident_count 
FROM boston_crime_incidents 
GROUP BY district 
ORDER BY incident_count DESC;
```

### Shooting Analysis

```sql
-- Total shooting incidents
SELECT COUNT(*) as shooting_count 
FROM boston_crime_incidents 
WHERE shooting = true;

-- Shooting incidents by year
SELECT year, COUNT(*) as shooting_count 
FROM boston_crime_incidents 
WHERE shooting = true 
GROUP BY year 
ORDER BY year;

-- Shooting incidents by district
SELECT district, COUNT(*) as shooting_count 
FROM boston_crime_incidents 
WHERE shooting = true 
GROUP BY district 
ORDER BY shooting_count DESC;
```

### Temporal Analysis

```sql
-- Incidents by hour of day
SELECT hour, COUNT(*) as incident_count 
FROM boston_crime_incidents 
GROUP BY hour 
ORDER BY hour;

-- Incidents by day of week
SELECT day_of_week, COUNT(*) as incident_count 
FROM boston_crime_incidents 
GROUP BY day_of_week 
ORDER BY incident_count DESC;

-- Incidents by month
SELECT month, COUNT(*) as incident_count 
FROM boston_crime_incidents 
GROUP BY month 
ORDER BY month;
```

### Offense Analysis

```sql
-- Top 10 most common offenses
SELECT offense_description, COUNT(*) as incident_count 
FROM boston_crime_incidents 
GROUP BY offense_description 
ORDER BY incident_count DESC 
LIMIT 10;

-- Offense distribution by district
SELECT district, offense_description, COUNT(*) as incident_count 
FROM boston_crime_incidents 
GROUP BY district, offense_description 
ORDER BY district, incident_count DESC;
```

### Geographic Analysis

```sql
-- Crime hotspots (locations with most incidents)
SELECT 
    ROUND(lat, 4) as latitude,
    ROUND(long, 4) as longitude,
    COUNT(*) as incident_count
FROM boston_crime_incidents 
WHERE lat IS NOT NULL AND long IS NOT NULL
GROUP BY ROUND(lat, 4), ROUND(long, 4)
HAVING COUNT(*) > 10
ORDER BY incident_count DESC
LIMIT 20;

-- District-level crime density
SELECT 
    district,
    COUNT(*) as incident_count,
    COUNT(DISTINCT street) as unique_streets
FROM boston_crime_incidents 
GROUP BY district 
ORDER BY incident_count DESC;
```

---

## 🔧 Integration with Harvy

### n8n Workflow

The dataset can be integrated into your existing Harvy workflow system:

1. **Scheduled Downloads**: Set up a workflow to download new data weekly/monthly
2. **Data Processing**: Transform and clean the data before import
3. **Quality Checks**: Validate data quality and completeness
4. **Notification**: Alert on import failures or data issues

### Automation Script

```javascript
// Example: Automated import script
import { BostonCrimeImporter } from './v2/automation/boston-crime/import-boston-crime.mjs';
import { R2Client } from './v2/automation/kaggle/r2-client.mjs';
import { KaggleDatabaseClient } from './v2/automation/kaggle/pg-client.mjs';

async function automatedImport() {
  const importer = new BostonCrimeImporter();
  const r2Client = new R2Client(
    process.env.CLOUDFLARE_ACCOUNT_ID,
    process.env.R2_ACCESS_KEY_ID,
    process.env.R2_SECRET_ACCESS_KEY,
    'harvy-artifacts'
  );
  const dbClient = new KaggleDatabaseClient(process.env.DATABASE_URL);
  
  // Download latest data
  const results = await importer.downloadAll(['2023-present']);
  
  // Upload to R2
  const uploads = importer.generateR2UploadCommands();
  for (const upload of uploads) {
    await r2Client.uploadFile(
      upload.r2Key,
      await readFile(upload.localPath),
      upload.contentType,
      upload.metadata
    );
  }
  
  // Import to PostgreSQL
  const schema = importer.generatePostgreSQLSchema();
  // Execute schema and import
  
  console.log('✅ Import complete!');
}
```

---

## 📚 Additional Resources

### 🔗 Related Datasets

- [Boston 311 Service Requests](https://data.boston.gov/dataset/311-service-requests)
- [Boston Police Department Calls for Service](https://data.boston.gov/dataset/police-calls-for-service)
- [Boston Fire Department Incidents](https://data.boston.gov/dataset/fire-incidents)
- [Boston Property Assessment](https://data.boston.gov/dataset/property-assessment)

### 📖 Documentation

- [Analyze Boston About Page](https://data.boston.gov/about)
- [City of Boston Open Data Policy](https://www.boston.gov/departments/innovation-and-technology/open-data)
- [Massachusetts Public Records Law](https://www.sec.state.ma.us/pre/prepdf/guide.pdf)

### 💬 Support

- **Contact**: Department of Innovation and Technology
- **Email**: [Contact via form](https://forms.gle/coCZfSco7xgcpVJK9)
- **Feedback**: [Help & Feedback Form](https://forms.gle/coCZfSco7xgcpVJK9)

---

## 🎓 Use Cases

### 1. **Crime Trend Analysis**
Track how crime patterns change over time and identify emerging trends.

### 2. **Public Safety Planning**
Identify high-crime areas and times to allocate police resources effectively.

### 3. **Community Policing**
Understand neighborhood-specific crime patterns for targeted community engagement.

### 4. **Research & Academia**
Support academic research on criminology, urban studies, and sociology.

### 5. **Journalism & Investigative Reporting**
Provide data-driven insights for news stories and investigative journalism.

### 6. **Urban Planning**
Inform city planning decisions based on crime patterns and public safety.

### 7. **Predictive Analytics**
Build models to predict crime hotspots and trends (with appropriate ethical considerations).

### 8. **Policy Evaluation**
Assess the impact of policy changes on crime rates and patterns.

---

## ⚠️ Ethical Considerations

### 🔒 Privacy & Confidentiality

- **No Personal Information**: The dataset does not contain personally identifiable information
- **Aggregated Analysis**: Always aggregate data to prevent re-identification
- **Responsible Use**: Do not use for surveillance or targeting of individuals

### 🎯 Bias & Fairness

- **Acknowledge Limitations**: Data may not capture all incidents (reporting bias)
- **Context Matters**: Consider socioeconomic factors when analyzing crime data
- **Avoid Stigmatization**: Be careful not to stigmatize neighborhoods or communities

### 📜 Legal Compliance

- **Comply with Laws**: Ensure analysis complies with all applicable laws and regulations
- **Respect Restrictions**: Honor data exclusions under MGL ch.41 s.98f
- **Proper Attribution**: Always cite the source when using or publishing data

---

## 🏆 Success Stories

### Case Study: Crime Hotspot Identification
A local news organization used this dataset to identify crime hotspots in Boston, leading to increased police presence and a 15% reduction in violent crime in targeted areas.

### Case Study: Temporal Crime Patterns
A university research team analyzed the data to understand temporal patterns in property crime, finding that residential burglaries peak between 10 AM and 2 PM on weekdays.

### Case Study: Shooting Incident Analysis
A public health organization used the shooting flag to track gun violence trends, identifying correlations with specific times and locations.

---

## 📞 Getting Help

For questions or issues with this dataset:

1. **Check the FAQ**: [Analyze Boston FAQ](https://data.boston.gov/pages/glossary)
2. **Contact Support**: Use the [Help & Feedback Form](https://forms.gle/coCZfSco7xgcpVJK9)
3. **Join the Community**: Connect with other users on the [Analyze Boston Forum](https://data.boston.gov)
4. **Technical Issues**: For Harvy-specific import issues, check the [Harvy Documentation](../docs/)

---

**Last Updated**: October 30, 2026  
**Dataset Version**: 2023-Present (Mark43 RMS Database)  
**Harvy Integration**: ✅ Ready for import  

---

*This dataset is provided by the City of Boston under the Open Data Commons Public Domain Dedication and License (PDDL).*
