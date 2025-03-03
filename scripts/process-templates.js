#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
// Define constants directly to avoid TypeScript import issues
const EXTENSION_ID = 'RooVeterinaryInc.roo-cline';
const DISPLAY_NAME = 'Roo Code';
const EXTENSION_NAME = 'roo-cline';

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

// Check if git is available
function isGitAvailable() {
  try {
    execSync('git --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Check for uncommitted changes
function hasUncommittedChanges() {
  try {
    const output = execSync('git status --porcelain').toString();
    return output.trim().length > 0;
  } catch (error) {
    error('Error checking git status:', error.message);
    return true; // Assume there are changes if we can't check
  }
}

// Load branding configuration
async function loadBrandingConfig() {
  try {
    const configPath = path.join(process.cwd(), 'branding.json');
    const configContent = await fs.readFile(configPath, 'utf8');
    return JSON.parse(configContent);
  } catch (err) {
    if (err.code === 'ENOENT') {
      error('branding.json not found. Please create it from branding.json.template.');
      process.exit(1);
    }
    error('Error loading branding configuration:', err.message);
    process.exit(1);
  }
}

// Process a template string with handlebars-style placeholders
function processTemplate(template, context) {
  // Process simple placeholders like {{extension.name}}
  let result = template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = path.trim().split('.').reduce((obj, key) =>
      obj && obj[key] !== undefined ? obj[key] : undefined, context);
    
    return value !== undefined ? value : match;
  });
  
  // Process each loops like {{#each keywords}}...{{/each}}
  const eachRegex = /\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
  result = result.replace(eachRegex, (match, arrayPath, template) => {
    const array = arrayPath.trim().split('.').reduce((obj, key) =>
      obj && obj[key] !== undefined ? obj[key] : [], context);
    
    if (!Array.isArray(array)) {
      return '';
    }
    
    return array.map((item, index) => {
      // Replace {{this}} with the current item
      let itemTemplate = template.replace(/\{\{this\}\}/g, item);
      
      // Handle @last conditional
      itemTemplate = itemTemplate.replace(/\{\{#unless @last\}\}(.*?)\{\{\/unless\}\}/g,
        (match, content) => (index === array.length - 1) ? '' : content);
      
      // Add @index variable
      itemTemplate = itemTemplate.replace(/\{\{@index\}\}/g, index);
      
      // Add @first conditional
      itemTemplate = itemTemplate.replace(/\{\{#if @first\}\}(.*?)\{\{\/if\}\}/g,
        (match, content) => (index === 0) ? content : '');
      
      return itemTemplate;
    }).join('');
  });
  
  // Process if conditions like {{#if condition}}...{{/if}}
  const ifRegex = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  result = result.replace(ifRegex, (match, condition, content) => {
    // Handle simple property existence checks
    const value = condition.trim().split('.').reduce((obj, key) =>
      obj && obj[key] !== undefined ? obj[key] : undefined, context);
    
    return value ? content : '';
  });
  
  // Process if/else conditions like {{#if condition}}...{{else}}...{{/if}}
  const ifElseRegex = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g;
  result = result.replace(ifElseRegex, (match, condition, ifContent, elseContent) => {
    const value = condition.trim().split('.').reduce((obj, key) =>
      obj && obj[key] !== undefined ? obj[key] : undefined, context);
    
    return value ? ifContent : elseContent;
  });
  
  return result;
}

// Process a template file
async function processTemplateFile(templatePath, outputPath, context) {
  try {
    info(`Processing template: ${templatePath}`);
    
    // Read template content
    const template = await fs.readFile(templatePath, 'utf8');
    
    // Process template
    const output = processTemplate(template, context);
    
    // Create directory if it doesn't exist
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });
    
    // Write output file
    await fs.writeFile(outputPath, output, 'utf8');
    success(`Generated: ${outputPath}`);
    
    return true;
  } catch (err) {
    error(`Error processing template ${templatePath}: ${err.message}`);
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

// Main function
async function main() {
  log('=== Processing Branding Templates ===', colors.cyan);
  
  // Check if git is available and if there are uncommitted changes
  let stashed = false;
  const gitAvailable = isGitAvailable();
  
  if (gitAvailable && hasUncommittedChanges()) {
    info('Stashing uncommitted changes...');
    execSync('git stash push -m "Auto-stash before branding update"');
    stashed = true;
  }
  
  try {
    // Load branding configuration
    const branding = await loadBrandingConfig();
    info(`Loaded branding for ${branding.extension.displayName} v${branding.extension.version}`);
    
    // Find all template files
    const templateDir = path.join(process.cwd(), 'templates');
    const templates = await findTemplateFiles(templateDir);
    
    if (templates.length === 0) {
      error('No template files found in templates/ directory');
      process.exit(1);
    }
    
    info(`Found ${templates.length} template files`);
    
    // Process each template
    let success = true;
    for (const template of templates) {
      const result = await processTemplateFile(
        template.source,
        template.destination,
        branding
      );
      success = success && result;
    }
    
    if (success) {
      log('All templates processed successfully!', colors.green);
      
      // Stage changes if git is available
      if (gitAvailable) {
        info('Staging generated files...');
        for (const template of templates) {
          execSync(`git add ${template.destination}`);
        }
        log('Files staged. You can now commit the changes.', colors.green);
      }
    } else {
      error('Some templates failed to process.');
      process.exit(1);
    }
  } catch (err) {
    error(`Error processing templates: ${err.message}`);
    process.exit(1);
  } finally {
    // Restore stashed changes if needed
    if (stashed) {
      info('Restoring stashed changes...');
      execSync('git stash pop');
    }
  }
  
  log('=== Template Processing Complete ===', colors.cyan);
}

// Run the main function
main();