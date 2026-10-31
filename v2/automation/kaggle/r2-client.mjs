/**
 * Cloudflare R2 Client for Harvy Artifacts Storage
 * Handles uploading, downloading, and managing dataset files in R2
 */

import { S3Client, PutObjectCommand, GetObjectCommand, 
         ListObjectsV2Command, DeleteObjectCommand, 
         HeadObjectCommand } from '@aws-sdk/client-s3';

/**
 * R2 Storage Client
 * Uses AWS SDK with Cloudflare R2 endpoint
 */
export class R2Client {
  constructor(accountId, accessKeyId, secretAccessKey, bucketName = 'harvy-artifacts') {
    this.bucketName = bucketName;
    this.accountId = accountId;
    
    // Cloudflare R2 uses AWS S3-compatible API
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    });
  }

  /**
   * Upload a file to R2
   */
  async uploadFile(key, fileContent, contentType = 'application/octet-stream', metadata = {}) {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: fileContent,
      ContentType: contentType,
      Metadata: metadata,
      // Enable versioning if needed
      // VersionId: versionId
    });

    try {
      const response = await this.client.send(command);
      return {
        success: true,
        key,
        etag: response.ETag,
        versionId: response.VersionId,
        url: this.getPublicUrl(key)
      };
    } catch (error) {
      console.error('Error uploading to R2:', error);
      throw error;
    }
  }

  /**
   * Upload a file from a local path
   */
  async uploadFromPath(key, filePath, contentType = null) {
    // In a real implementation, we would read the file and upload it
    // For now, we'll return the structure
    return {
      success: true,
      key,
      filePath,
      contentType: contentType || this._getContentType(filePath)
    };
  }

  /**
   * Download a file from R2
   */
  async downloadFile(key) {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key
    });

    try {
      const response = await this.client.send(command);
      return {
        success: true,
        key,
        content: response.Body,
        contentType: response.ContentType,
        size: response.ContentLength,
        metadata: response.Metadata
      };
    } catch (error) {
      console.error('Error downloading from R2:', error);
      throw error;
    }
  }

  /**
   * List objects in a bucket with prefix
   */
  async listObjects(prefix = '', maxKeys = 1000) {
    const command = new ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: prefix,
      MaxKeys: maxKeys
    });

    try {
      const response = await this.client.send(command);
      return {
        objects: response.Contents || [],
        isTruncated: response.IsTruncated || false,
        nextContinuationToken: response.NextContinuationToken,
        prefix
      };
    } catch (error) {
      console.error('Error listing objects:', error);
      throw error;
    }
  }

  /**
   * Check if an object exists
   */
  async objectExists(key) {
    const command = new HeadObjectCommand({
      Bucket: this.bucketName,
      Key: key
    });

    try {
      await this.client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Delete an object
   */
  async deleteObject(key) {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key
    });

    try {
      await this.client.send(command);
      return { success: true, key };
    } catch (error) {
      console.error('Error deleting object:', error);
      throw error;
    }
  }

  /**
   * Get public URL for an object
   */
  getPublicUrl(key) {
    // Cloudflare R2 public URLs follow this format
    return `https://${this.bucketName}.${this.accountId}.r2.cloudflarestorage.com/${key}`;
  }

  /**
   * Get signed URL for private objects
   */
  async getSignedUrl(key, expiresIn = 3600) {
    // In a real implementation, we would generate a signed URL
    // For now, return the public URL format
    return this.getPublicUrl(key);
  }

  /**
   * Upload dataset metadata
   */
  async uploadDatasetMetadata(datasetId, metadata) {
    const key = `kaggle/datasets/${datasetId}/metadata.json`;
    const content = JSON.stringify(metadata, null, 2);
    
    return this.uploadFile(key, content, 'application/json', {
      'dataset-id': datasetId,
      'type': 'metadata',
      'source': 'kaggle'
    });
  }

  /**
   * Upload dataset file with proper organization
   */
  async uploadDatasetFile(datasetId, filename, fileContent, contentType = null) {
    const key = `kaggle/datasets/${datasetId}/files/${filename}`;
    
    return this.uploadFile(key, fileContent, contentType || this._getContentType(filename), {
      'dataset-id': datasetId,
      'filename': filename,
      'source': 'kaggle',
      'uploaded-at': new Date().toISOString()
    });
  }

  /**
   * List all datasets in the kaggle namespace
   */
  async listDatasets() {
    return this.listObjects('kaggle/datasets/');
  }

  /**
   * List files for a specific dataset
   */
  async listDatasetFiles(datasetId) {
    return this.listObjects(`kaggle/datasets/${datasetId}/files/`);
  }

  /**
   * Get content type from filename extension
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
}

/**
 * Create R2 client with environment variables
 */
export function createR2Client() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME || 'harvy-artifacts';
  
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 credentials are required. Set CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY environment variables.');
  }
  
  return new R2Client(accountId, accessKeyId, secretAccessKey, bucketName);
}

export default R2Client;