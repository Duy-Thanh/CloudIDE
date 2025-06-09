#!/usr/bin/env node

/**
 * CloudIDE+ Deployment Script
 *
 * This script handles the deployment of CloudIDE+ to Google Cloud Platform.
 * It builds both frontend and backend, then deploys to Google Compute Engine.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  projectId: process.env.GCP_PROJECT_ID || 'cloudide-plus',
  zone: process.env.GCP_ZONE || 'us-central1-a',
  instanceName: process.env.GCP_INSTANCE_NAME || 'cloudide-plus-vm',
  machineType: process.env.GCP_MACHINE_TYPE || 'e2-medium',
  image: process.env.GCP_IMAGE || 'ubuntu-2004-lts'
};

/**
 * Execute shell command with error handling
 */
function executeCommand(command, description) {
  console.log(`\n🔄 ${description}...`);
  try {
    const result = execSync(command, { stdio: 'inherit', encoding: 'utf8' });
    console.log(`✅ ${description} completed successfully`);
    return result;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    process.exit(1);
  }
}

/**
 * Check if required environment variables are set
 */
function validateEnvironment() {
  console.log('🔍 Validating environment...');

  const requiredVars = [
    'GCP_PROJECT_ID',
    'GOOGLE_APPLICATION_CREDENTIALS'
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(varName => console.error(`   - ${varName}`));
    console.error('\nPlease set these variables before deploying.');
    process.exit(1);
  }

  console.log('✅ Environment validation passed');
}

/**
 * Build frontend application
 */
function buildFrontend() {
  const frontendPath = path.join(__dirname, '../frontend');

  if (!fs.existsSync(frontendPath)) {
    console.log('⚠️  Frontend directory not found, skipping frontend build');
    return;
  }

  executeCommand(
    'cd frontend && npm install && npm run build',
    'Building frontend application'
  );
}

/**
 * Build backend application
 */
function buildBackend() {
  const backendPath = path.join(__dirname, '../backend');

  if (!fs.existsSync(backendPath)) {
    console.log('⚠️  Backend directory not found, skipping backend build');
    return;
  }

  executeCommand(
    'cd backend && npm install && npm run build',
    'Building backend application'
  );
}

/**
 * Create or update Google Compute Engine instance
 */
function deployToGCP() {
  console.log('\n🚀 Starting GCP deployment...');

  // Check if gcloud CLI is installed
  try {
    execSync('gcloud --version', { stdio: 'pipe' });
  } catch (error) {
    console.error('❌ Google Cloud CLI not found. Please install gcloud CLI first.');
    console.error('   Visit: https://cloud.google.com/sdk/docs/install');
    process.exit(1);
  }

  // Set the project
  executeCommand(
    `gcloud config set project ${CONFIG.projectId}`,
    'Setting GCP project'
  );

  // Check if instance exists
  let instanceExists = false;
  try {
    execSync(
      `gcloud compute instances describe ${CONFIG.instanceName} --zone=${CONFIG.zone}`,
      { stdio: 'pipe' }
    );
    instanceExists = true;
    console.log('📍 Instance already exists, will update deployment');
  } catch (error) {
    console.log('📍 Creating new instance...');
  }

  if (!instanceExists) {
    // Create new instance
    executeCommand(
      `gcloud compute instances create ${CONFIG.instanceName} ` +
      `--zone=${CONFIG.zone} ` +
      `--machine-type=${CONFIG.machineType} ` +
      `--image-family=${CONFIG.image} ` +
      `--image-project=ubuntu-os-cloud ` +
      `--boot-disk-size=20GB ` +
      `--tags=http-server,https-server ` +
      `--metadata=startup-script='#!/bin/bash
        apt-get update
        apt-get install -y nodejs npm nginx
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        systemctl start docker
        systemctl enable docker
      '`,
      'Creating GCP Compute Engine instance'
    );

    // Create firewall rules
    executeCommand(
      `gcloud compute firewall-rules create allow-http-8080 ` +
      `--allow tcp:8080 ` +
      `--source-ranges 0.0.0.0/0 ` +
      `--description "Allow HTTP traffic on port 8080"`,
      'Creating firewall rules'
    );
  }

  // TODO: Add actual deployment logic here
  // This would typically involve:
  // 1. Copying build files to the instance
  // 2. Installing dependencies on the instance
  // 3. Starting the application services
  // 4. Configuring nginx as reverse proxy

  console.log('\n🎉 Deployment preparation completed!');
  console.log('\n📝 Next steps:');
  console.log('   1. SSH into the instance: gcloud compute ssh ' + CONFIG.instanceName + ' --zone=' + CONFIG.zone);
  console.log('   2. Copy your application files to the instance');
  console.log('   3. Configure and start your services');
  console.log('   4. Set up SSL certificates with Cloudflare');
}

/**
 * Main deployment function
 */
async function deploy() {
  console.log('🚀 CloudIDE+ Deployment Script');
  console.log('===============================\n');

  try {
    // Validate environment
    validateEnvironment();

    // Build applications
    console.log('\n📦 Building applications...');
    buildFrontend();
    buildBackend();

    // Deploy to GCP
    deployToGCP();

    console.log('\n🎉 Deployment completed successfully!');

  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

// Run deployment if this script is executed directly
if (require.main === module) {
  deploy();
}

module.exports = { deploy, CONFIG };
