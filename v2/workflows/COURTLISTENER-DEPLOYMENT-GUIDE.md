# CourtListener Bulk Data Ingestion - Deployment Guide

## 📦 Workflow File

**Location:** `/Users/pen/Desktop/harvy-new/v2/workflows/courtlistener-bulk-ingestion.json`

**Status:** ✅ Validated (passes `npm run validate:workflows`)

**Workflow ID:** `courtlistener-bulk-ingestion-v1`

---

## 🎯 Quick Start

### Option 1: Import via n8n Web UI (Recommended)

1. **Open n8n Dashboard**
   - Navigate to: `https://n8n.harvy.dev`
   
2. **Import Workflow**
   - Click **"Import"** button (top-right)
   - Select **"From File"**
   - Choose: `courtlistener-bulk-ingestion.json`
   - Click **"Import"**

3. **Configure Credentials**
   - Go to **Credentials** tab
   - Create/update the following:
     - **R2 Credentials** (ID: `r2-credentials`)
       - Type: S3
       - Access Key: Your R2 access key
       - Secret Key: Your R2 secret key
       - Endpoint: `https://<account-id>.r2.cloudflarestorage.com`
       - Bucket: `harvy-raw` (or your bucket name)
     
     - **Generic Credential** (for Harvy API)
       - Type: HTTP Header Auth
       - Name: `Harvy API Auth`
       - Header: `x-harvy-organization-id`
       - Value: Your organization ID

4. **Configure Environment Variables**
   - Go to **Settings** → **Variables**
   - Add the following global variables:
     ```
     SPIDER_API_KEY = your-spider-api-key
     WEBSHARE_PROXY_URL = http://username:password@proxy.webshare.io:80
     R2_BUCKET_NAME = harvy-raw
     HARVY_DOMAIN = your-harvy-domain.com
     AUTOMATION_CALLBACK_SECRET = your-callback-secret
     ```

5. **Replace Placeholders**
   - Open the workflow
   - Find and replace:
     - `REPLACE_WITH_HARVY_DOMAIN` → Your Harvy domain (e.g., `harvy.dev`)
     - `REPLACE_WITH_ORGANIZATION_ID` → Your organization ID

6. **Save & Keep Inactive**
   - Click **"Save"**
   - **DO NOT ACTIVATE YET** - Must verify first

---

### Option 2: Import via n8n REST API

```bash
# Set your n8n API key
N8N_API_KEY="your-n8n-api-key"

# Import the workflow
curl -X POST https://n8n.harvy.dev/api/v1/workflows/import \
  -H "Authorization: Bearer $N8N_API_KEY" \
  -H "Content-Type: multipart/form-data" \
  -F "data=@courtlistener-bulk-ingestion.json" \
  -F "separate=true"

# Note: You'll need to configure credentials and variables separately via UI
```

---

### Option 3: Import via MCP (When Available)

```bash
# Using MCP tools (when server is accessible)
tools.automation.create_workflow \
  --name "CourtListener Bulk Data Ingestion" \
  --file courtlistener-bulk-ingestion.json \
  --active false
```

---

## 🔧 Configuration Checklist

### ✅ Required Configuration

| Item | Type | Value | Notes |
|------|------|-------|-------|
| SPIDER_API_KEY | Variable | Your Spider API key | From spider.cloud |
| WEBSHARE_PROXY_URL | Variable | Proxy URL with credentials | Format: `http://user:pass@proxy.webshare.io:80` |
| R2_BUCKET_NAME | Variable | R2 bucket name | Default: `harvy-raw` |
| HARVY_DOMAIN | Variable | Your Harvy domain | e.g., `harvy.dev` |
| AUTOMATION_CALLBACK_SECRET | Variable | Callback HMAC secret | For signed callbacks |
| R2 Credentials | Credential | S3 access keys | Cloudflare R2 |
| Harvy API Auth | Credential | HTTP Header Auth | Organization ID |

### ✅ Placeholders to Replace

In the workflow JSON, replace:
- `REPLACE_WITH_HARVY_DOMAIN` → Your actual Harvy domain
- `REPLACE_WITH_ORGANIZATION_ID` → Your actual organization ID

---

## 📋 Workflow Structure

### Triggers
1. **Manual Trigger** - For on-demand execution
2. **Webhook Trigger** - Path: `/webhook/internal/v1/courtlistener-bulk`

### Main Pipeline (12 Nodes)

```
Manual Trigger
  ↓
Set Job Parameters          - Configures source_id, file_types, date range
  ↓
Validate Envelope          - Validates contract v1 requirements
  ↓
Submit to Automation       - POST to /api/v1/runs
  ↓
Preflight Webshare Proxy   - Verifies proxy connectivity
  ↓
Fetch S3 File Listing      - Via spider.cloud API
  ↓
Parse and Filter Files     - Extracts metadata, filters by type/date
  ↓
Download File via Proxy    - Downloads each file via Webshare
  ↓
Create Event Metadata      - Generates Harvy-compatible events
  ↓
Upload Raw to R2           - Stores raw files in R2
  ↓
Transform to Evidence      - Converts to evidence format
  ↓
Upload Processed to R2      - Stores processed artifacts
  ↓
Post Status Callback        - POST to /internal/v1/automation-callback
  ↓
Post Publication Callback  - POST to /internal/v1/automation-publications
  ↓
Respond 202 Accepted       - Returns 202 to caller
```

### Error Handling
- **Error Trigger** → **Format Error** → Logs errors

---

## 🎯 Source Configuration

```json
{
  "source_id": "src_courtlistener",
  "connector_id": "courtlistener",
  "product": "Civic",
  "tenant_id": "shared",
  "workspace_id": "shared",
  "contract_version": 1,
  "required_proxy": "webshare",
  "preflight_required": true,
  "direct_fallback_allowed": false
}
```

---

## 📊 File Types Supported

The workflow automatically filters for these CourtListener bulk data types:

- `dockets` - Court case dockets
- `people-db-people` - Person records
- `people-db-educations` - Education records
- `people-db-positions` - Position records
- `people-db-political-affiliations` - Political affiliations
- `people-db-schools` - School records
- `people-db-retention-events` - Retention events
- `people_db_race` - Race information

---

## 🔒 Security & Compliance

### ✅ Harvy Contract Compliance
- Contract version: 1
- Required proxy: webshare
- Preflight required: true
- Direct fallback allowed: false

### ✅ Spider Cloud Integration
- Uses: `spider.unlimited.cloudflare.com/scrape`
- Proxy header: `x-spider-proxy`
- API key header: `x-spider-api-key`

### ✅ Webshare Proxy
- All HTTP requests use `$vars.WEBSHARE_PROXY_URL`
- Preflight verification to `ipv4.webshare.io`
- Proxy configured at request level

---

## 🚀 Pre-Activation Verification

### Step 1: Preflight Test
Before activating, manually verify proxy connectivity:

```bash
# Test Webshare proxy
curl -x http://username:password@proxy.webshare.io:80 https://ipv4.webshare.io/
# Should return: 200 OK with your egress IP

# Test Spider API
curl -H "x-spider-api-key: YOUR_KEY" \
     -H "x-spider-proxy: http://username:password@proxy.webshare.io:80" \
     "https://spider.unlimited.cloudflare.com/scrape?target=https://ipv4.webshare.io/&format=text"
# Should return: HTML with your egress IP
```

### Step 2: Test S3 Access
```bash
# Test S3 listing via proxy
curl -x http://username:password@proxy.webshare.io:80 \
  "https://com-courtlistener-storage.s3-us-west-2.amazonaws.com/?list-type=2&prefix=bulk-data/&max-keys=10"
# Should return: XML listing of files
```

### Step 3: Test R2 Upload
```bash
# Test R2 credentials
curl -X PUT \
  "https://<account-id>.r2.cloudflarestorage.com/harvy-raw/test.txt" \
  -H "Authorization: Bearer <access-key>:<secret-key>" \
  -H "Content-Type: text/plain" \
  -d "test"
# Should return: 200 OK
```

---

## 📈 Activation Steps

### 1. Import Workflow
See **Quick Start** above

### 2. Configure
- [ ] Set all required variables
- [ ] Set all required credentials
- [ ] Replace all placeholders

### 3. Verify
- [ ] Preflight test passed
- [ ] S3 access test passed
- [ ] R2 upload test passed

### 4. Test with Single File
- [ ] Execute workflow manually
- [ ] Verify 1 file downloaded
- [ ] Verify metadata created
- [ ] Verify R2 uploads successful
- [ ] Verify callbacks posted

### 5. Activate
- [ ] Click **"Activate"** button
- [ ] Monitor first execution
- [ ] Verify all nodes execute successfully

---

## 🎓 Post-Activation

### Monitoring
- Check **Executions** tab for workflow runs
- Verify **success rate** > 95%
- Monitor **error logs**

### Scaling
- Adjust `max_pages` for larger datasets
- Modify `file_types` array to include/exclude types
- Update `start_date`/`end_date` for historical backfill

### Maintenance
- Update workflow when new file types are added
- Monitor S3 for new bulk data formats
- Review error patterns and adjust retry logic

---

## ⚠️ Important Notes

### Workflow is INACTIVE by Design
- The workflow is **intentionally inactive** (`"active": false`)
- Must be configured and tested before activation
- Follows Harvy's safety-first deployment pattern

### Bounded Verification Required
Per AGENTS.md and DEVELOPMENT.md:
- ✅ Must pass Spider and Webshare preflight
- ✅ Target egress verification required
- ✅ No silent direct or metered fallback
- ✅ All requests via approved proxy path

### No Direct S3 Access
- All S3 requests MUST go through Webshare proxy
- Direct S3 access is NOT allowed per Harvy rules
- Spider cloud is used for HTML scraping when needed

---

## 📚 Workflow Metadata

```json
{
  "name": "Harvy - CourtListener Bulk Data Ingestion",
  "id": "courtlistener-bulk-ingestion-v1",
  "versionId": "v1.0.0",
  "active": false,
  "verificationStatus": "inactive",
  "description": "CourtListener bulk data ingestion workflow using spider.cloud and Webshare proxy. INACTIVE - requires credential configuration and Harvy domain setup."
}
```

---

## 🙏 Support

For issues or questions:

1. **Check logs** in n8n Executions tab
2. **Verify credentials** are correctly configured
3. **Test preflight** connectivity
4. **Review error messages** in Format Error node
5. **Check Harvy API** response codes

---

## 📝 Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-10-31 | v1.0.0 | Initial workflow creation |
| 2026-10-31 | v1.0.0 | Validation passed |

---

**Created:** 2026-10-31  
**Status:** ✅ Ready for import  
**Next Step:** Import into n8n and configure  
**Location:** `/Users/pen/Desktop/harvy-new/v2/workflows/courtlistener-bulk-ingestion.json`
