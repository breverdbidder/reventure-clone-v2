#!/usr/bin/env node

/**
 * REVENTURE.APP CLONING ORCHESTRATOR V2.0
 * ========================================
 * 
 * This is the master script that orchestrates the complete cloning pipeline:
 * 
 * PHASE 1: DISCOVERY & REVERSE ENGINEERING
 * - Run cloning agent to analyze target site
 * - Extract API endpoints, data schemas, and technologies
 * - Document component structure and features
 * 
 * PHASE 2: DATA ACQUISITION
 * - Download all Zillow Research CSV files (FREE)
 * - Fetch Census demographic data
 * - Process and transform data
 * 
 * PHASE 3: DATABASE SETUP
 * - Create Supabase tables and schemas
 * - Load processed data
 * - Set up indexes and constraints
 * 
 * PHASE 4: FRONTEND BUILD
 * - Generate React components
 * - Set up Mapbox integration
 * - Build data visualization charts
 * 
 * PHASE 5: DEPLOYMENT
 * - Build production bundle
 * - Deploy to Cloudflare Pages
 * - Set up GitHub Actions for auto-updates
 * 
 * USAGE:
 *   npm run orchestrate           # Full pipeline
 *   npm run orchestrate -- --skip-discovery  # Skip reverse engineering
 *   npm run orchestrate -- --skip-data       # Skip data download
 *   npm run orchestrate -- --deploy-only     # Just deploy
 */

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  projectRoot: path.join(__dirname, '..'),
  scriptsDir: __dirname,
  dataDir: path.join(__dirname, '../data'),
  docsDir: path.join(__dirname, '../docs'),
  
  // Phase toggles (can be controlled via CLI args)
  phases: {
    discovery: true,
    dataAcquisition: true,
    databaseSetup: true,
    frontendBuild: true,
    deployment: true
  },
  
  // Timeouts (in milliseconds)
  timeouts: {
    discovery: 180000,      // 3 minutes for cloning agent
    dataDownload: 600000,   // 10 minutes for data download
    databaseSetup: 120000,  // 2 minutes for DB setup
    build: 300000,          // 5 minutes for build
    deployment: 180000      // 3 minutes for deployment
  }
};

// Parse CLI arguments
const args = process.argv.slice(2);
if (args.includes('--skip-discovery')) CONFIG.phases.discovery = false;
if (args.includes('--skip-data')) CONFIG.phases.dataAcquisition = false;
if (args.includes('--skip-db')) CONFIG.phases.databaseSetup = false;
if (args.includes('--skip-build')) CONFIG.phases.frontendBuild = false;
if (args.includes('--deploy-only')) {
  CONFIG.phases.discovery = false;
  CONFIG.phases.dataAcquisition = false;
  CONFIG.phases.databaseSetup = false;
  CONFIG.phases.frontendBuild = false;
}

// Logging utilities
const LOG_LEVELS = {
  INFO: '\x1b[36m[INFO]\x1b[0m',
  SUCCESS: '\x1b[32m[SUCCESS]\x1b[0m',
  ERROR: '\x1b[31m[ERROR]\x1b[0m',
  WARNING: '\x1b[33m[WARNING]\x1b[0m',
  PHASE: '\x1b[35m[PHASE]\x1b[0m'
};

function log(level, message) {
  console.log(`${LOG_LEVELS[level]} ${message}`);
}

// State tracking
const STATE = {
  startTime: Date.now(),
  phases: {},
  errors: [],
  warnings: [],
  artifacts: {}
};

// Execute command with timeout
function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const timeout = options.timeout || 60000;
    const cwd = options.cwd || CONFIG.projectRoot;
    
    log('INFO', `Running: ${command} ${args.join(' ')}`);
    
    const proc = spawn(command, args, {
      cwd,
      stdio: options.silent ? 'pipe' : 'inherit',
      shell: true
    });
    
    let stdout = '';
    let stderr = '';
    
    if (options.silent) {
      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });
    }
    
    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error(`Command timed out after ${timeout}ms`));
    }, timeout);
    
    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ stdout, stderr, code });
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      }
    });
    
    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

// Phase 1: Discovery & Reverse Engineering
async function phaseDiscovery() {
  log('PHASE', '🔍 PHASE 1: DISCOVERY & REVERSE ENGINEERING');
  const phaseStart = Date.now();
  
  try {
    // Run cloning agent
    log('INFO', 'Running specialized cloning agent...');
    await runCommand('node', ['scripts/cloning_agent.js'], {
      timeout: CONFIG.timeouts.discovery
    });
    
    // Run reverse engineering script
    log('INFO', 'Running reverse engineering analysis...');
    await runCommand('node', ['scripts/reverse_engineer.js'], {
      timeout: CONFIG.timeouts.discovery
    });
    
    // Verify outputs
    const analysisPath = path.join(CONFIG.dataDir, 'cloning_analysis/full_analysis.json');
    const analysisExists = await fs.access(analysisPath).then(() => true).catch(() => false);
    
    if (!analysisExists) {
      throw new Error('Analysis output not found');
    }
    
    const analysis = JSON.parse(await fs.readFile(analysisPath, 'utf-8'));
    STATE.artifacts.analysis = analysis;
    
    log('SUCCESS', `Discovery complete - Found ${analysis.apis?.endpoints?.length || 0} API endpoints`);
    log('SUCCESS', `Technologies detected: ${analysis.technologies?.framework || 'Unknown'}`);
    
    STATE.phases.discovery = {
      duration: Date.now() - phaseStart,
      status: 'success',
      endpoints: analysis.apis?.endpoints?.length || 0,
      framework: analysis.technologies?.framework
    };
    
  } catch (error) {
    log('ERROR', `Discovery failed: ${error.message}`);
    STATE.phases.discovery = {
      duration: Date.now() - phaseStart,
      status: 'failed',
      error: error.message
    };
    STATE.errors.push({
      phase: 'discovery',
      error: error.message
    });
    throw error;
  }
}

// Phase 2: Data Acquisition
async function phaseDataAcquisition() {
  log('PHASE', '📊 PHASE 2: DATA ACQUISITION');
  const phaseStart = Date.now();
  
  try {
    // Download Zillow data
    log('INFO', 'Downloading Zillow Research CSVs (FREE)...');
    await runCommand('node', ['scripts/load_all_data.js'], {
      timeout: CONFIG.timeouts.dataDownload
    });
    
    // Verify downloaded files
    const rawDir = path.join(CONFIG.dataDir, 'raw');
    const files = await fs.readdir(rawDir);
    const csvFiles = files.filter(f => f.endsWith('.csv'));
    
    if (csvFiles.length === 0) {
      throw new Error('No CSV files downloaded');
    }
    
    log('SUCCESS', `Downloaded ${csvFiles.length} data files`);
    log('INFO', 'Data sources: ZHVI, ZORI, Inventory, Sales, Price Cuts, DOM, Sale-to-List');
    
    STATE.phases.dataAcquisition = {
      duration: Date.now() - phaseStart,
      status: 'success',
      filesDownloaded: csvFiles.length,
      dataSources: ['ZHVI', 'ZORI', 'Inventory', 'Sales', 'Price Cuts', 'DOM', 'Sale-to-List']
    };
    
  } catch (error) {
    log('ERROR', `Data acquisition failed: ${error.message}`);
    STATE.phases.dataAcquisition = {
      duration: Date.now() - phaseStart,
      status: 'failed',
      error: error.message
    };
    STATE.errors.push({
      phase: 'dataAcquisition',
      error: error.message
    });
    throw error;
  }
}

// Phase 3: Database Setup
async function phaseDatabaseSetup() {
  log('PHASE', '🗄️  PHASE 3: DATABASE SETUP');
  const phaseStart = Date.now();
  
  try {
    // Set up Supabase schema
    log('INFO', 'Creating Supabase database schema...');
    await runCommand('node', ['scripts/setup_database.js'], {
      timeout: CONFIG.timeouts.databaseSetup
    });
    
    log('SUCCESS', 'Database schema created');
    log('INFO', 'Tables: zip_market_data, zhvi_monthly, zori_monthly, market_metrics');
    
    STATE.phases.databaseSetup = {
      duration: Date.now() - phaseStart,
      status: 'success',
      tables: ['zip_market_data', 'zhvi_monthly', 'zori_monthly', 'market_metrics']
    };
    
  } catch (error) {
    log('ERROR', `Database setup failed: ${error.message}`);
    STATE.phases.databaseSetup = {
      duration: Date.now() - phaseStart,
      status: 'failed',
      error: error.message
    };
    STATE.errors.push({
      phase: 'databaseSetup',
      error: error.message
    });
    throw error;
  }
}

// Phase 4: Frontend Build
async function phaseFrontendBuild() {
  log('PHASE', '⚛️  PHASE 4: FRONTEND BUILD');
  const phaseStart = Date.now();
  
  try {
    // Install dependencies if needed
    const nodeModulesExists = await fs.access(
      path.join(CONFIG.projectRoot, 'node_modules')
    ).then(() => true).catch(() => false);
    
    if (!nodeModulesExists) {
      log('INFO', 'Installing dependencies...');
      await runCommand('npm', ['install'], {
        timeout: 120000
      });
    }
    
    // Build frontend
    log('INFO', 'Building React frontend with Vite...');
    await runCommand('npm', ['run', 'build'], {
      timeout: CONFIG.timeouts.build
    });
    
    // Verify build output
    const distDir = path.join(CONFIG.projectRoot, 'dist');
    const distExists = await fs.access(distDir).then(() => true).catch(() => false);
    
    if (!distExists) {
      throw new Error('Build output directory not found');
    }
    
    const distFiles = await fs.readdir(distDir);
    log('SUCCESS', `Frontend built - ${distFiles.length} files in dist/`);
    
    STATE.phases.frontendBuild = {
      duration: Date.now() - phaseStart,
      status: 'success',
      outputFiles: distFiles.length,
      framework: 'React + Vite'
    };
    
  } catch (error) {
    log('ERROR', `Frontend build failed: ${error.message}`);
    STATE.phases.frontendBuild = {
      duration: Date.now() - phaseStart,
      status: 'failed',
      error: error.message
    };
    STATE.errors.push({
      phase: 'frontendBuild',
      error: error.message
    });
    throw error;
  }
}

// Phase 5: Deployment
async function phaseDeployment() {
  log('PHASE', '🚀 PHASE 5: DEPLOYMENT');
  const phaseStart = Date.now();
  
  try {
    // Check for Cloudflare credentials
    if (!process.env.CLOUDFLARE_API_TOKEN) {
      log('WARNING', 'CLOUDFLARE_API_TOKEN not set - skipping deployment');
      log('INFO', 'To deploy: wrangler pages deploy dist/');
      STATE.phases.deployment = {
        duration: Date.now() - phaseStart,
        status: 'skipped',
        reason: 'No Cloudflare credentials'
      };
      return;
    }
    
    // Deploy to Cloudflare Pages
    log('INFO', 'Deploying to Cloudflare Pages...');
    const result = await runCommand('npx', ['wrangler', 'pages', 'deploy', 'dist/', '--project-name=reventure-clone'], {
      timeout: CONFIG.timeouts.deployment,
      silent: true
    });
    
    // Extract deployment URL from output
    const urlMatch = result.stdout.match(/https:\/\/[^\s]+/);
    const deploymentUrl = urlMatch ? urlMatch[0] : 'Unknown';
    
    log('SUCCESS', `Deployed to: ${deploymentUrl}`);
    
    STATE.phases.deployment = {
      duration: Date.now() - phaseStart,
      status: 'success',
      url: deploymentUrl,
      platform: 'Cloudflare Pages'
    };
    
  } catch (error) {
    log('ERROR', `Deployment failed: ${error.message}`);
    STATE.phases.deployment = {
      duration: Date.now() - phaseStart,
      status: 'failed',
      error: error.message
    };
    STATE.errors.push({
      phase: 'deployment',
      error: error.message
    });
    // Don't throw - deployment failure shouldn't block the pipeline
  }
}

// Generate final report
async function generateReport() {
  log('PHASE', '📝 GENERATING FINAL REPORT');
  
  const totalDuration = Date.now() - STATE.startTime;
  const report = {
    timestamp: new Date().toISOString(),
    totalDuration: `${(totalDuration / 1000).toFixed(2)}s`,
    phases: STATE.phases,
    errors: STATE.errors,
    warnings: STATE.warnings,
    artifacts: {
      analysisFile: 'data/cloning_analysis/full_analysis.json',
      dataFiles: 'data/raw/*.csv',
      documentation: 'docs/',
      buildOutput: 'dist/'
    },
    nextSteps: []
  };
  
  // Add next steps based on what succeeded/failed
  if (STATE.phases.discovery?.status === 'success') {
    report.nextSteps.push('✅ Review API endpoints in docs/API_DISCOVERY.md');
  }
  
  if (STATE.phases.dataAcquisition?.status === 'success') {
    report.nextSteps.push('✅ Data loaded - check data/processed/ for transformed CSVs');
  }
  
  if (STATE.phases.databaseSetup?.status === 'success') {
    report.nextSteps.push('✅ Database ready - connect at Supabase dashboard');
  }
  
  if (STATE.phases.frontendBuild?.status === 'success') {
    report.nextSteps.push('✅ Frontend built - run `npm run preview` to test');
  }
  
  if (STATE.phases.deployment?.status === 'success') {
    report.nextSteps.push(`✅ Live at: ${STATE.phases.deployment.url}`);
  } else {
    report.nextSteps.push('⚠️  Deploy manually: npx wrangler pages deploy dist/');
  }
  
  // Save report
  const reportPath = path.join(CONFIG.docsDir, 'DEPLOYMENT_REPORT.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  
  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('CLONING ORCHESTRATOR - FINAL REPORT');
  console.log('='.repeat(80));
  console.log(`Total Duration: ${report.totalDuration}`);
  console.log('\nPhase Results:');
  
  for (const [phase, result] of Object.entries(STATE.phases)) {
    const icon = result.status === 'success' ? '✅' :
                 result.status === 'failed' ? '❌' :
                 result.status === 'skipped' ? '⏭️' : '❓';
    console.log(`  ${icon} ${phase}: ${result.status} (${(result.duration / 1000).toFixed(2)}s)`);
  }
  
  if (STATE.errors.length > 0) {
    console.log('\n⚠️  Errors:');
    STATE.errors.forEach(err => {
      console.log(`  - ${err.phase}: ${err.error}`);
    });
  }
  
  console.log('\n📋 Next Steps:');
  report.nextSteps.forEach(step => console.log(`  ${step}`));
  
  console.log('\n📄 Full report saved to: docs/DEPLOYMENT_REPORT.json');
  console.log('='.repeat(80) + '\n');
  
  return report;
}

// Main orchestration
async function main() {
  try {
    log('INFO', '🚀 Starting Reventure.app Cloning Orchestrator V2.0');
    log('INFO', `Project Root: ${CONFIG.projectRoot}`);
    log('INFO', `Phases enabled: ${Object.entries(CONFIG.phases).filter(([_, v]) => v).map(([k]) => k).join(', ')}`);
    console.log('');
    
    // Ensure directories exist
    await fs.mkdir(CONFIG.dataDir, { recursive: true });
    await fs.mkdir(CONFIG.docsDir, { recursive: true });
    await fs.mkdir(path.join(CONFIG.dataDir, 'raw'), { recursive: true });
    await fs.mkdir(path.join(CONFIG.dataDir, 'processed'), { recursive: true });
    await fs.mkdir(path.join(CONFIG.dataDir, 'cloning_analysis'), { recursive: true });
    
    // Run phases
    if (CONFIG.phases.discovery) {
      await phaseDiscovery();
    }
    
    if (CONFIG.phases.dataAcquisition) {
      await phaseDataAcquisition();
    }
    
    if (CONFIG.phases.databaseSetup) {
      await phaseDatabaseSetup();
    }
    
    if (CONFIG.phases.frontendBuild) {
      await phaseFrontendBuild();
    }
    
    if (CONFIG.phases.deployment) {
      await phaseDeployment();
    }
    
    // Generate final report
    const report = await generateReport();
    
    // Exit with appropriate code
    if (STATE.errors.length > 0) {
      log('WARNING', `Completed with ${STATE.errors.length} error(s)`);
      process.exit(1);
    } else {
      log('SUCCESS', '🎉 All phases completed successfully!');
      process.exit(0);
    }
    
  } catch (error) {
    log('ERROR', `Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run orchestrator
main();
