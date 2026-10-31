/**
 * Kaggle API Client for Harvy Automation
 * Handles dataset discovery, download, and metadata extraction
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';

/**
 * Kaggle API Client Configuration
 */
export class KaggleClient {
  constructor(apiToken = null) {
    this.apiToken = apiToken || process.env.KAGGLE_API_TOKEN;
    this.baseUrl = 'https://www.kaggle.com/api/v1';
    this.kaggleDir = join(homedir(), '.kaggle');
    this.configFile = join(this.kaggleDir, 'kaggle.json');
    
    if (!this.apiToken) {
      throw new Error('Kaggle API token is required. Set KAGGLE_API_TOKEN environment variable.');
    }
  }

  /**
   * Initialize Kaggle configuration directory
   */
  async initialize() {
    if (!existsSync(this.kaggleDir)) {
      await mkdir(this.kaggleDir, { recursive: true });
    }
    
    // Create kaggle.json config file
    const config = {
      username: 'harvy-automation',
      key: this.apiToken
    };
    
    await writeFile(this.configFile, JSON.stringify(config, null, 2));
    // Set restrictive permissions (600)
    // Note: This would need to be done via chmod in a real implementation
  }

  /**
   * Search for datasets on Kaggle
   */
  async searchDatasets(query, page = 1, pageSize = 20) {
    const url = `${this.baseUrl}/datasets/list?search=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}`;
    
    const response = await this._makeRequest(url);
    return response.datasets || [];
  }

  /**
   * Get dataset metadata
   */
  async getDatasetMetadata(datasetIdentifier) {
    const url = `${this.baseUrl}/datasets/metadata/${datasetIdentifier}`;
    
    const response = await this._makeRequest(url);
    return response;
  }

  /**
   * List files in a dataset
   */
  async listDatasetFiles(datasetIdentifier) {
    const url = `${this.baseUrl}/datasets/list_files/${datasetIdentifier}`;
    
    const response = await this._makeRequest(url);
    return response.files || [];
  }

  /**
   * Download a dataset file
   */
  async downloadFile(datasetIdentifier, filename, downloadPath) {
    const url = `${this.baseUrl}/datasets/download_file/${datasetIdentifier}/${filename}`;
    
    // For file downloads, we need to handle the response differently
    const response = await this._makeRequest(url, { 
      responseType: 'stream',
      headers: { 
        'Accept': 'application/octet-stream'
      }
    });
    
    // In a real implementation, we would pipe the stream to a file
    // For now, we'll return the URL and let the caller handle the download
    return {
      url: `${this.baseUrl}/datasets/download_file/${datasetIdentifier}/${filename}`,
      filename,
      datasetIdentifier
    };
  }

  /**
   * Download entire dataset
   */
  async downloadDataset(datasetIdentifier, downloadDir) {
    const metadata = await this.getDatasetMetadata(datasetIdentifier);
    const files = await this.listDatasetFiles(datasetIdentifier);
    
    const results = [];
    
    for (const file of files) {
      const filePath = join(downloadDir, file.name);
      const result = await this.downloadFile(datasetIdentifier, file.name, filePath);
      results.push(result);
      
      // Rate limiting - Kaggle has strict rate limits
      await setTimeout(1000);
    }
    
    return {
      dataset: datasetIdentifier,
      files: results,
      metadata
    };
  }

  /**
   * Get dataset categories
   */
  async getCategories() {
    const url = `${this.baseUrl}/datasets/categories`;
    
    const response = await this._makeRequest(url);
    return response.categories || [];
  }

  /**
   * Get popular datasets
   */
  async getPopularDatasets(category = null, sortBy = 'hotness', page = 1, pageSize = 20) {
    let url = `${this.baseUrl}/datasets/list?sortBy=${sortBy}&page=${page}&pageSize=${pageSize}`;
    
    if (category) {
      url += `&category=${category}`;
    }
    
    const response = await this._makeRequest(url);
    return response.datasets || [];
  }

  /**
   * Make authenticated request to Kaggle API
   */
  async _makeRequest(url, options = {}) {
    const headers = {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
      ...options
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Kaggle API error ${response.status}: ${errorText}`);
    }
    
    if (options.responseType === 'stream') {
      return response;
    }
    
    return response.json();
  }

  /**
   * Get user's datasets (requires authentication)
   */
  async getUserDatasets() {
    const url = `${this.baseUrl}/datasets/list/mine`;
    
    const response = await this._makeRequest(url);
    return response.datasets || [];
  }
}

/**
 * Dataset metadata structure
 */
export interface KaggleDataset {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  owner: {
    username: string;
    displayName: string;
  };
  isPrivate: boolean;
  isProject: boolean;
  license: string;
  tags: string[];
  categories: string[];
  totalBytes: number;
  fileCount: number;
  downloadCount: number;
  viewCount: number;
  voteCount: number;
  created: string;
  updated: string;
  url: string;
}

/**
 * File metadata structure
 */
export interface KaggleFile {
  name: string;
  size: number;
  description: string;
  totalRows: number;
  schema: {
    columns: Array<{
      name: string;
      type: string;
      description: string;
    }>;
  };
}

export default KaggleClient;