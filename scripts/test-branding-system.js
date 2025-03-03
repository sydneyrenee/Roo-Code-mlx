#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const { EXTENSION_ID, DISPLAY_NAME, EXTENSION_NAME } = require('../src/core/constants');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Log with color
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Log success message
function success(message) {
  log(`✓ ${message}`, colors.green);
}

// Log error message
function error(message) {
  log(`✗ ${message}`, colors.red);
}

// Log info message
function info(message) {
  log(`ℹ ${message}`, colors.blue);
}

// Check if a file exists
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Run a command and return its output
function runCommand(command) {
  try {
    return execSync(command, { encoding: 'utf8' });
  } catch (err) {
    error(`Command failed: ${command}`);
    error(err.message);
    return null;
  }
}

// Verify that a file contains expected content
async function verifyFileContent(filePath, expectedContent) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return content.includes(expectedContent);
  } catch {
    return false;
  }
}

// Find all template files in a directory
async function findTemplateFiles(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = [];
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        const subFiles = await findTemplateFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.name.endsWith('.template')) {
        const destination = fullPath.replace('.template', '');
        files.push({
          source: fullPath,
          destination: destination
        });
      }
    }
    
    return files;
  } catch (err) {
    error(`Error finding template files: ${err.message}`);
    return [];
  }
}

// Main test function
async function runTests() {
  log('=== Testing Branding System ===', colors.cyan);
  
  // Step 1: Check if sample branding.json exists
  info('Checking for sample branding.json...');
  const sampleExists = await fileExists('branding.json.sample');
  if (!sampleExists) {
    error('branding.json.sample not found');
    process.exit(1);
  }
  success('Found branding.json.sample');
  
  // Step 2: Backup existing branding.json if it exists
  info('Backing up existing branding.json if it exists...');
  const brandingExists = await fileExists('branding.json');
  if (brandingExists) {
    await fs.copyFile('branding.json', 'branding.json.bak');
    success('Backed up existing branding.json');
  } else {
    info('No existing branding.json found');
  }
  
  // Step 3: Copy sample to branding.json
  info('Copying sample to branding.json...');
  await fs.copyFile('branding.json.sample', 'branding.json');
  success('Copied sample to branding.json');
  
  // Step 4: Find all template files
  info('Finding template files...');
  const templateDir = path.join(process.cwd(), 'templates');
  const templates = await findTemplateFiles(templateDir);
  
  if (templates.length === 0) {
    error('No template files found in templates/ directory');
    await restoreBackup();
    process.exit(1);
  }
  
  info(`Found ${templates.length} template files`);
  
  // Step 5: Run process-templates.js
  info('Running process-templates.js...');
  const output = runCommand('node scripts/process-templates.js');
  if (!output) {
    error('Failed to run process-templates.js');
    await restoreBackup();
    process.exit(1);
  }
  success('Ran process-templates.js');
  
  // Step 6: Verify generated files
  info('Verifying generated files...');
  
  // Load branding.json to get expected values
  const brandingContent = await fs.readFile('branding.json', 'utf8');
  const branding = JSON.parse(brandingContent);
  
  let allFilesOk = true;
  
  // Verify each generated file
  for (const template of templates) {
    const fileExists = await fs.access(template.destination).then(() => true).catch(() => false);
    
    if (!fileExists) {
      error(`${template.destination} was not generated`);
      allFilesOk = false;
      continue;
    }
    
    // Verify file contains the display name
    const fileOk = await verifyFileContent(template.destination, branding.extension.displayName);
    if (fileOk) {
      success(`${template.destination} contains correct branding`);
    } else {
      error(`${template.destination} does not contain correct branding`);
      allFilesOk = false;
    }
  }
  
  // Step 7: Restore backup if it existed
  await restoreBackup();
  
  if (allFilesOk) {
    success('All branding files verified successfully!');
  } else {
    error('Some branding files failed verification');
    process.exit(1);
  }
  
  log('=== Branding System Test Complete ===', colors.cyan);
}

// Restore backup if it existed
async function restoreBackup() {
  info('Restoring backup if it existed...');
  const backupExists = await fileExists('branding.json.bak');
  if (backupExists) {
    await fs.copyFile('branding.json.bak', 'branding.json');
    await fs.unlink('branding.json.bak');
    success('Restored backup');
  } else {
    await fs.unlink('branding.json');
    info('Removed temporary branding.json');
  }
}

// Run the tests
runTests().catch(err => {
  error(`Test failed: ${err.message}`);
  restoreBackup().catch(() => {});
  process.exit(1);
});