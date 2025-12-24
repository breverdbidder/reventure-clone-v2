#!/usr/bin/env node

/**
 * COMPREHENSIVE ZILLOW DATA LOADER V2.0
 * =====================================
 * 
 * This script handles the complete data pipeline:
 * 1. Download all Zillow Research CSV files
 * 2. Parse and validate data
 * 3. Transform (calculate YoY%, MoM%, etc.)
 * 4. Load into Supabase database
 * 5. Fetch and integrate Census demographics
 * 6. Generate data quality reports
 * 
 * USAGE:
 *   node scripts/load_all_data.js
 *   node scripts/load_all_data.js --skip-census
 *   node scripts/load_all_data.js --zip=32937 (single ZIP test)
 */

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mocerqjnksmhcjzxrewo.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'your-supabase-anon-key';
const CENSUS_API_KEY = process.env.CENSUS_API_KEY || 'your-census-api-key';

const DATA_DIR = path.join(__dirname, '../data');
const RAW_DIR = path.join(DATA_DIR, 'raw');
const PROCESSED_DIR = path.join(DATA_DIR, 'processed');
const REPORTS_DIR = path.join(DATA_DIR, 'reports');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Zillow Data Sources
const ZILLOW_SOURCES = {
  zhvi_zip: {
    url: 'https://files.zillowstatic.com/research/public_csvs/zhvi/Zip_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv',
    table: 'zhvi_monthly',
    name: 'ZHVI ZIP'
  },
  zhvi_city: {
    url: 'https://files.zillowstatic.com/research/public_csvs/zhvi/City_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv',
    table: 'zhvi_monthly_city',
    name: 'ZHVI City'
  },
  zhvi_county: {
    url: 'https://files.zillowstatic.com/research/public_csvs/zhvi/County_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv',
    table: 'zhvi_monthly_county',
    name: 'ZHVI County'
  },
  zori_zip: {
    url: 'https://files.zillowstatic.com/research/public_csvs/zori/Zip_zori_sm_month.csv',
    table: 'zori_monthly',
    name: 'ZORI ZIP'
  },
  zori_city: {
    url: 'https://files.zillowstatic.com/research/public_csvs/zori/City_zori_sm_month.csv',
    table: 'zori_monthly_city',
    name: 'ZORI City'
  },
  inventory_zip: {
    url: 'https://files.zillowstatic.com/research/public_csvs/invt_fs/Zip_invt_fs_uc_sfrcondo_sm_month.csv',
    table: 'market_metrics',
    name: 'Inventory ZIP',
    metric: 'inventory'
  },
  sales_zip: {
    url: 'https://files.zillowstatic.com/research/public_csvs/sales/Zip_sales_count_now_uc_sfrcondo_month.csv',
    table: 'market_metrics',
    name: 'Sales ZIP',
    metric: 'sales'
  },
  price_cuts_zip: {
    url: 'https://files.zillowstatic.com/research/public_csvs/pct_reduced/Zip_pct_reduced_uc_sfrcondo_month.csv',
    table: 'market_metrics',
    name: 'Price Cuts ZIP',
    metric: 'price_cuts_pct'
  },
  dom_zip: {
    url: 'https://files.zillowstatic.com/research/public_csvs/median_dom/Zip_median_dom_uc_sfrcondo_month.csv',
    table: 'market_metrics',
    name: 'Days on Market ZIP',
    metric: 'dom'
  },
  sale_to_list_zip: {
    url: 'https://files.zillowstatic.com/research/public_csvs/median_sale_to_list/Zip_median_sale_to_list_uc_sfrcondo_month.csv',
    table: 'market_metrics',
    name: 'Sale-to-List ZIP',
    metric: 'sale_to_list_ratio'
  }
};

// Stats tracking
const stats = {
  downloads: { success: 0, failed: 0 },
  parsing: { records: 0, errors: 0 },
  loading: { inserts: 0, errors: 0 },
  startTime: new Date()
};

// Helper: Ensure directories exist
async function ensureDirectories() {
  await fs.mkdir(RAW_DIR, { recursive: true });
  await fs.mkdir(PROCESSED_DIR, { recursive: true });
  await fs.mkdir(REPORTS_DIR, { recursive: true });
}

// Helper: Download CSV file
async function downloadCSV(url, filename) {
  console.log(`📥 Downloading: ${filename}`);
  
  try {
    const response = await axios.get(url, {
      responseType: 'text',
      timeout: 180000, // 3 minute timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Referer': 'https://www.zillow.com/research/data/'
      }
    });
    
    const filepath = path.join(RAW_DIR, `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    await fs.writeFile(filepath, response.data);
    
    console.log(`   ✅ Downloaded: ${(response.data.length / 1024 / 1024).toFixed(2)} MB`);
    stats.downloads.success++;
    
    return filepath;
  } catch (error) {
    console.error(`   ❌ Download failed: ${error.message}`);
    stats.downloads.failed++;
    return null;
  }
}

// Helper: Parse CSV file
function parseCSV(content) {
  try {
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
      trim: true
    });
    
    stats.parsing.records += records.length;
    return records;
  } catch (error) {
    console.error(`   ❌ Parse error: ${error.message}`);
    stats.parsing.errors++;
    return [];
  }
}

// Helper: Get date columns from CSV
function getDateColumns(record) {
  return Object.keys(record)
    .filter(k => k.match(/^\d{4}-\d{2}-\d{2}$/))
    .sort();
}

// Helper: Calculate YoY % change
function calculateYoY(current, previous) {
  if (!current || !previous || previous === 0) return null;
  return parseFloat((((current - previous) / previous) * 100).toFixed(2));
}

// Helper: Calculate MoM % change
function calculateMoM(current, previous) {
  if (!current || !previous || previous === 0) return null;
  return parseFloat((((current - previous) / previous) * 100).toFixed(2));
}

// Transform ZHVI data
function transformZHVI(records) {
  console.log(`🔄 Transforming ZHVI data (${records.length} regions)...`);
  
  const transformed = [];
  
  for (const record of records) {
    const zip = record.RegionName;
    const state = record.State;
    const city = record.City;
    const county = record.CountyName;
    const metro = record.Metro;
    
    const dateColumns = getDateColumns(record);
    
    for (let i = 0; i < dateColumns.length; i++) {
      const date = dateColumns[i];
      const value = parseInt(record[date]);
      
      if (!value || isNaN(value)) continue;
      
      // Calculate YoY (12 months ago)
      const yoyDate = dateColumns[i - 12];
      const yoyValue = yoyDate ? parseInt(record[yoyDate]) : null;
      const yoy_pct = yoyValue ? calculateYoY(value, yoyValue) : null;
      
      // Calculate MoM (1 month ago)
      const momDate = dateColumns[i - 1];
      const momValue = momDate ? parseInt(record[momDate]) : null;
      const mom_pct = momValue ? calculateMoM(value, momValue) : null;
      
      transformed.push({
        zip,
        state,
        city,
        county,
        metro,
        date,
        value,
        yoy_pct,
        mom_pct
      });
    }
  }
  
  console.log(`   ✅ Transformed: ${transformed.length.toLocaleString()} records`);
  return transformed;
}

// Transform ZORI data
function transformZORI(records) {
  console.log(`🔄 Transforming ZORI data (${records.length} regions)...`);
  
  const transformed = [];
  
  for (const record of records) {
    const zip = record.RegionName;
    const state = record.State;
    const city = record.City;
    const county = record.CountyName;
    const metro = record.Metro;
    
    const dateColumns = getDateColumns(record);
    
    for (let i = 0; i < dateColumns.length; i++) {
      const date = dateColumns[i];
      const rent = parseInt(record[date]);
      
      if (!rent || isNaN(rent)) continue;
      
      const yoyDate = dateColumns[i - 12];
      const yoyRent = yoyDate ? parseInt(record[yoyDate]) : null;
      const yoy_pct = yoyRent ? calculateYoY(rent, yoyRent) : null;
      
      const momDate = dateColumns[i - 1];
      const momRent = momDate ? parseInt(record[momDate]) : null;
      const mom_pct = momRent ? calculateMoM(rent, momRent) : null;
      
      transformed.push({
        zip,
        state,
        city,
        county,
        metro,
        date,
        rent,
        yoy_pct,
        mom_pct
      });
    }
  }
  
  console.log(`   ✅ Transformed: ${transformed.length.toLocaleString()} records`);
  return transformed;
}

// Transform market metrics (inventory, sales, DOM, etc.)
function transformMetrics(records, metricName) {
  console.log(`🔄 Transforming ${metricName} data (${records.length} regions)...`);
  
  const transformed = [];
  
  for (const record of records) {
    const zip = record.RegionName;
    const dateColumns = getDateColumns(record);
    
    for (const date of dateColumns) {
      let value = record[date];
      
      // Parse value based on metric type
      if (metricName === 'price_cuts_pct' || metricName === 'sale_to_list_ratio') {
        value = parseFloat(value);
      } else {
        value = parseInt(value);
      }
      
      if (!value || isNaN(value)) continue;
      
      transformed.push({
        zip,
        date,
        [metricName]: value
      });
    }
  }
  
  console.log(`   ✅ Transformed: ${transformed.length.toLocaleString()} records`);
  return transformed;
}

// Load data to Supabase (with batching)
async function loadToSupabase(table, records, conflictColumns = ['zip', 'date']) {
  console.log(`📤 Loading ${records.length.toLocaleString()} records to ${table}...`);
  
  const BATCH_SIZE = 1000;
  let loaded = 0;
  let errors = 0;
  
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    
    try {
      const { error } = await supabase
        .from(table)
        .upsert(batch, { onConflict: conflictColumns.join(',') });
      
      if (error) {
        console.error(`   ❌ Batch error: ${error.message}`);
        errors++;
        stats.loading.errors++;
      } else {
        loaded += batch.length;
        stats.loading.inserts += batch.length;
      }
      
      // Progress indicator
      if ((i + BATCH_SIZE) % 10000 === 0) {
        console.log(`   ... ${loaded.toLocaleString()} / ${records.length.toLocaleString()} loaded`);
      }
    } catch (error) {
      console.error(`   ❌ Insert failed: ${error.message}`);
      errors++;
    }
  }
  
  console.log(`   ✅ Loaded: ${loaded.toLocaleString()} records (${errors} errors)`);
  return { loaded, errors };
}

// Extract unique ZIPs for zip_codes master table
function extractZipCodes(records) {
  const zipMap = new Map();
  
  for (const record of records) {
    if (record.zip && !zipMap.has(record.zip)) {
      zipMap.set(record.zip, {
        zip: record.zip,
        city: record.city || null,
        county: record.county || null,
        state: record.state || null,
        metro: record.metro || null
      });
    }
  }
  
  return Array.from(zipMap.values());
}

// Fetch Census demographics
async function fetchCensusDemographics() {
  console.log('\n📊 Fetching Census demographics...');
  
  if (!CENSUS_API_KEY || CENSUS_API_KEY === 'your-census-api-key') {
    console.log('   ⚠️  Census API key not configured - skipping demographics');
    return [];
  }
  
  const variables = [
    'NAME',
    'B01003_001E', // Total population
    'B19013_001E', // Median household income
    'B25001_001E', // Total housing units
    'B25002_003E', // Vacant housing units
    'B01002_001E'  // Median age
  ].join(',');
  
  const url = `https://api.census.gov/data/2021/acs/acs5?get=${variables}&for=zip%20code%20tabulation%20area:*&key=${CENSUS_API_KEY}`;
  
  try {
    const response = await axios.get(url, { timeout: 60000 });
    const [headers, ...rows] = response.data;
    
    const demographics = rows.map(row => {
      const population = parseInt(row[1]) || null;
      const median_income = parseInt(row[2]) || null;
      const housing_units = parseInt(row[3]) || null;
      const vacant_units = parseInt(row[4]) || null;
      const median_age = parseFloat(row[5]) || null;
      
      return {
        zip: row[6],
        year: 2021,
        population,
        median_income,
        median_age,
        housing_units,
        vacant_units,
        vacancy_rate: housing_units && vacant_units
          ? parseFloat(((vacant_units / housing_units) * 100).toFixed(2))
          : null
      };
    });
    
    console.log(`   ✅ Fetched: ${demographics.length.toLocaleString()} ZIP demographics`);
    return demographics;
  } catch (error) {
    console.error(`   ❌ Census fetch failed: ${error.message}`);
    return [];
  }
}

// Generate data quality report
async function generateReport() {
  console.log('\n📋 Generating data quality report...');
  
  const runtime = ((new Date() - stats.startTime) / 1000).toFixed(1);
  
  const report = {
    timestamp: new Date().toISOString(),
    runtime_seconds: parseFloat(runtime),
    downloads: stats.downloads,
    parsing: stats.parsing,
    loading: stats.loading,
    summary: {
      total_downloads: stats.downloads.success + stats.downloads.failed,
      total_records_parsed: stats.parsing.records,
      total_records_loaded: stats.loading.inserts,
      success_rate: ((stats.loading.inserts / stats.parsing.records) * 100).toFixed(2) + '%'
    }
  };
  
  const reportPath = path.join(REPORTS_DIR, `data_load_${new Date().toISOString().split('T')[0]}.json`);
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 DATA LOAD SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`⏱️  Runtime: ${runtime}s`);
  console.log(`📥 Downloads: ${stats.downloads.success} success, ${stats.downloads.failed} failed`);
  console.log(`📄 Parsed: ${stats.parsing.records.toLocaleString()} records`);
  console.log(`💾 Loaded: ${stats.loading.inserts.toLocaleString()} records`);
  console.log(`✅ Success Rate: ${report.summary.success_rate}`);
  console.log(`📋 Report: ${reportPath}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Main execution
async function main() {
  console.log('🚀 Zillow Data Loader V2.0\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  await ensureDirectories();
  
  // Step 1: Download all Zillow CSVs
  console.log('STEP 1: Download Zillow Data\n');
  
  const downloadedFiles = {};
  
  for (const [key, source] of Object.entries(ZILLOW_SOURCES)) {
    const filepath = await downloadCSV(source.url, key);
    if (filepath) {
      downloadedFiles[key] = { filepath, source };
    }
  }
  
  // Step 2: Parse and transform data
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 2: Parse & Transform Data\n');
  
  let allZHVIRecords = [];
  let allZORIRecords = [];
  let allMetricsRecords = {};
  
  for (const [key, { filepath, source }] of Object.entries(downloadedFiles)) {
    console.log(`\n📂 Processing: ${source.name}`);
    
    const content = await fs.readFile(filepath, 'utf-8');
    const records = parseCSV(content);
    
    if (records.length === 0) continue;
    
    // Transform based on data type
    if (key.startsWith('zhvi_')) {
      const transformed = transformZHVI(records);
      allZHVIRecords.push(...transformed);
    } else if (key.startsWith('zori_')) {
      const transformed = transformZORI(records);
      allZORIRecords.push(...transformed);
    } else {
      const metricName = source.metric;
      const transformed = transformMetrics(records, metricName);
      
      if (!allMetricsRecords[metricName]) {
        allMetricsRecords[metricName] = [];
      }
      allMetricsRecords[metricName].push(...transformed);
    }
  }
  
  // Step 3: Extract ZIP codes for master table
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 3: Extract ZIP Codes\n');
  
  const zipCodes = extractZipCodes(allZHVIRecords);
  console.log(`✅ Extracted: ${zipCodes.length.toLocaleString()} unique ZIPs`);
  
  // Step 4: Fetch Census demographics
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 4: Fetch Demographics');
  
  const demographics = await fetchCensusDemographics();
  
  // Step 5: Load to Supabase
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 5: Load to Supabase\n');
  
  // Load ZIP codes
  console.log('📦 Loading ZIP codes...');
  await loadToSupabase('zip_codes', zipCodes, ['zip']);
  
  // Load ZHVI data
  if (allZHVIRecords.length > 0) {
    console.log('\n📦 Loading ZHVI data...');
    await loadToSupabase('zhvi_monthly', allZHVIRecords);
  }
  
  // Load ZORI data
  if (allZORIRecords.length > 0) {
    console.log('\n📦 Loading ZORI data...');
    await loadToSupabase('zori_monthly', allZORIRecords);
  }
  
  // Load market metrics (merge all metrics by zip+date)
  console.log('\n📦 Loading market metrics...');
  const mergedMetrics = mergeMetricsByZipDate(allMetricsRecords);
  if (mergedMetrics.length > 0) {
    await loadToSupabase('market_metrics', mergedMetrics);
  }
  
  // Load demographics
  if (demographics.length > 0) {
    console.log('\n📦 Loading demographics...');
    await loadToSupabase('demographics', demographics, ['zip']);
  }
  
  // Step 6: Generate report
  await generateReport();
  
  console.log('✅ ALL DONE!\n');
}

// Helper: Merge metrics by ZIP + date
function mergeMetricsByZipDate(metricsObj) {
  const merged = new Map();
  
  for (const [metricName, records] of Object.entries(metricsObj)) {
    for (const record of records) {
      const key = `${record.zip}|${record.date}`;
      
      if (!merged.has(key)) {
        merged.set(key, {
          zip: record.zip,
          date: record.date
        });
      }
      
      merged.get(key)[metricName] = record[metricName];
    }
  }
  
  return Array.from(merged.values());
}

// Run
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
