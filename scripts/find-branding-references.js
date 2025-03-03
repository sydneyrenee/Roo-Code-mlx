#!/usr/bin/env node

/**
 * This script finds all references to "roo", "cline", and other branding-related terms
 * in the codebase, categorizing them by type and providing a detailed report.
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

// Branding terms to search for
const BRANDING_TERMS = [
  'roo',
  'cline',
  'rooveterinaryinc',
  'roocode'
];

// Maximum number of results to show per category in the report
const MAX_RESULTS_PER_CATEGORY = 100;

// File patterns to ignore (based on .gitignore and common patterns)
const IGNORE_PATTERNS = [
  'node_modules',
  'dist',
  'out',
  'out-',
  '.git',
  'find-branding-references.js',
  'branding-references-report.md',
  'logs',
  '.log',
  'coverage',
  '.DS_Store',
  'bin',
  '.vsix',
  'local-prompts',
  '.test_env',
  '.vscode-test',
  'docs/_site',
  '.env.',
  '.eslintrc.local.json',
  'test-output',
  '.vscode',
  'test-results'
];

// Binary file extensions to always ignore
const BINARY_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2',
  '.ttf', '.eot', '.otf', '.zip', '.tar', '.gz', '.exe', '.dll',
  '.so', '.dylib', '.wav', '.mp3', '.mp4', '.avi', '.mov', '.pdf'
];

// File extensions to include (only process these file types)
const INCLUDE_EXTENSIONS = [
  '.ts',
  '.js',
  '.jsx',
  '.tsx',
  '.config.js',
  '.json',
  '.yaml',
  '.yml',
  '.md'
];

// Maximum file size to process (in lines)
const MAX_FILE_LINES = 2000;

// Categories of branding references
const CATEGORIES = {
  FILENAMES: 'Filenames',
  EXTENSION_ID: 'Extension ID',
  COMMAND_IDS: 'Command IDs',
  VIEW_IDS: 'View IDs',
  CONFIG_KEYS: 'Configuration Keys',
  GIT_CONFIG: 'Git Configuration',
  URLS: 'URLs and External Resources',
  HARDCODED_STRINGS: 'Hardcoded Strings',
  OTHER: 'Other References'
};

// Results object
const results = {
  [CATEGORIES.FILENAMES]: [],
  [CATEGORIES.EXTENSION_ID]: [],
  [CATEGORIES.COMMAND_IDS]: [],
  [CATEGORIES.VIEW_IDS]: [],
  [CATEGORIES.CONFIG_KEYS]: [],
  [CATEGORIES.GIT_CONFIG]: [],
  [CATEGORIES.URLS]: [],
  [CATEGORIES.HARDCODED_STRINGS]: [],
  [CATEGORIES.OTHER]: []
};

/**
 * Check if a path should be ignored
 */
function shouldIgnore(filePath) {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const pathParts = normalizedPath.split('/');
  const fileName = pathParts[pathParts.length - 1];
  const ext = path.extname(fileName).toLowerCase();
  
  // 1. Check for binary file extensions
  if (BINARY_EXTENSIONS.includes(ext)) {
    return true;
  }
  
  // 2. Check if the path contains any ignore patterns
  if (IGNORE_PATTERNS.some(pattern => normalizedPath.includes(pattern))) {
    return true;
  }
  
  // 3. Check for hidden folders (starting with .) except for specific .git config files
  // We want to ignore most hidden folders but allow specific .git configuration files
  for (let i = 0; i < pathParts.length - 1; i++) {
    const part = pathParts[i];
    if (part.startsWith('.') &&
        part !== '.git' && // Allow .git folder for specific files
        !normalizedPath.includes('.gitconfig') &&
        !normalizedPath.includes('.gitattributes')) {
      return true;
    }
  }
  
  // 4. Check for log directories in the path
  // We want to ignore files in log directories but allow files with "log" in their name
  for (let i = 0; i < pathParts.length - 1; i++) {
    const part = pathParts[i].toLowerCase();
    if (part === 'log' || part === 'logs') {
      return true;
    }
  }
  
  // 5. Check if the file is in a main project folder
  // We want to focus on source code in main project folders
  const isInMainFolder = pathParts.some(part =>
    ['src', 'scripts', 'docs', 'test', 'config'].includes(part.toLowerCase()));
  
  if (!isInMainFolder && pathParts.length > 1) {
    return true;
  }
  
  // 6. Check if the file has an allowed extension
  const fileBase = path.basename(fileName).toLowerCase();
  
  // Special case for .config.js files and similar patterns
  const hasAllowedExtension = INCLUDE_EXTENSIONS.some(allowedExt =>
    fileBase.endsWith(allowedExt) || ext === allowedExt);
  
  if (!hasAllowedExtension) {
    return true;
  }
  
  // If it passed all checks, don't ignore it
  return false;
}

/**
 * Filter out non-printable characters from a string
 */
function filterNonPrintableChars(str) {
  // Remove control characters, zero-width spaces, and other problematic characters
  // but preserve newlines (\n, \r) and tabs (\t)
  // Specifically handle Line Separator (LS, U+2028) and Paragraph Separator (PS, U+2029)
  return str
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\uFEFF\u200B-\u200D]/g, '')
    .replace(/\u2028/g, '\n') // Replace Line Separator with newline
    .replace(/\u2029/g, '\n\n'); // Replace Paragraph Separator with double newline
}

/**
 * Categorize a reference based on its content
 */
function categorizeReference(filePath, line, match) {
  const lowerLine = line.toLowerCase();
  
  // Check for extension ID
  if (lowerLine.includes('rooveterinaryinc.roo-cline')) {
    return CATEGORIES.EXTENSION_ID;
  }
  
  // Check for command IDs
  if (lowerLine.includes('roo-cline.') && (
    lowerLine.includes('command') || 
    lowerLine.includes('executecommand') ||
    lowerLine.includes('registercommand')
  )) {
    return CATEGORIES.COMMAND_IDS;
  }
  
  // Check for view IDs
  if (lowerLine.includes('roo-cline.') && (
    lowerLine.includes('view') || 
    lowerLine.includes('sidebar') ||
    lowerLine.includes('panel')
  )) {
    return CATEGORIES.VIEW_IDS;
  }
  
  // Check for configuration keys
  if (lowerLine.includes('configuration') && lowerLine.includes('roo-cline')) {
    return CATEGORIES.CONFIG_KEYS;
  }
  
  // Check for Git configuration
  if ((lowerLine.includes('git') || lowerLine.includes('commit') || lowerLine.includes('branch')) && 
      (lowerLine.includes('roo code') || lowerLine.includes('roocode'))) {
    return CATEGORIES.GIT_CONFIG;
  }
  
  // Check for URLs
  if (lowerLine.includes('http') && (
    lowerLine.includes('roocode.com') || 
    lowerLine.includes('rooveterinaryinc') ||
    lowerLine.includes('roo-')
  )) {
    return CATEGORIES.URLS;
  }
  
  // Check for hardcoded strings
  if (lowerLine.includes('"roo code"') || 
      lowerLine.includes("'roo code'") || 
      lowerLine.includes('`roo code`')) {
    return CATEGORIES.HARDCODED_STRINGS;
  }
  
  // Default to other
  return CATEGORIES.OTHER;
}

/**
 * Process a file to find branding references
 */
async function processFile(filePath) {
  try {
    // Check if the path is a regular file before trying to read it
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      return; // Skip if not a regular file
    }
    
    // Skip files that are too large based on file size
    // A rough estimate: 100 bytes per line * MAX_FILE_LINES
    const MAX_FILE_SIZE = MAX_FILE_LINES * 100;
    if (stats.size > MAX_FILE_SIZE) {
      console.log(`Skipping large file (${Math.round(stats.size / 1024)} KB): ${filePath}`);
      return;
    }
    
    // Read file content
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');
    
    // Double-check line count after reading
    if (lines.length > MAX_FILE_LINES) {
      console.log(`Skipping large file (${lines.length} lines): ${filePath}`);
      return;
    }
    
    // Process each line
    for (let i = 0; i < lines.length; i++) {
      // Filter out non-printable characters
      const line = filterNonPrintableChars(lines[i]);
      
      for (const term of BRANDING_TERMS) {
        if (line.toLowerCase().includes(term)) {
          const category = categorizeReference(filePath, line, term);
          results[category].push({
            file: filePath,
            line: i + 1,
            content: line.trim(),
            term
          });
          break; // Only count each line once
        }
      }
    }
  } catch (error) {
    if (error.code === 'EISDIR') {
      console.log(`Skipping directory ${filePath}`);
    } else if (error.code === 'ENOENT') {
      console.log(`File not found: ${filePath}`);
    } else if (error.code === 'EACCES') {
      console.log(`Permission denied: ${filePath}`);
    } else {
      console.error(`Error processing file ${filePath}:`, error.message);
    }
  }
}

/**
 * Find files with branding in their names
 */
function findBrandingFilenames() {
  for (const term of BRANDING_TERMS) {
    try {
      // Use find command but filter results through our shouldIgnore function
      const output = execSync(`find . -type f -name "*${term}*"`, { encoding: 'utf8' });
      const files = output.split('\n').filter(Boolean);
      
      for (const file of files) {
        // Apply the same ignore patterns we use for content scanning
        if (!shouldIgnore(file)) {
          results[CATEGORIES.FILENAMES].push({
            file: filterNonPrintableChars(file),
            term
          });
        }
      }
    } catch (error) {
      // Ignore errors (e.g., no matches)
    }
  }
}

/**
 * Recursively process all files in a directory
 */
async function processDirectory(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    
    if (shouldIgnore(fullPath)) {
      continue;
    }
    
    if (entry.isDirectory()) {
      await processDirectory(fullPath);
    } else {
      await processFile(fullPath);
    }
  }
}

/**
 * Generate a markdown report of the results
 */
function generateReport() {
  let report = '# Branding References Report\n\n';
  
  // Add summary
  report += '## Summary\n\n';
  for (const category in results) {
    report += `- **${category}**: ${results[category].length} references\n`;
  }
  report += '\n';
  
  // Add detailed results for each category
  for (const category in results) {
    if (results[category].length === 0) {
      continue;
    }
    
    const totalItems = results[category].length;
    const itemsToShow = Math.min(totalItems, MAX_RESULTS_PER_CATEGORY);
    
    report += `## ${category}\n\n`;
    
    if (totalItems > MAX_RESULTS_PER_CATEGORY) {
      report += `*Showing ${itemsToShow} of ${totalItems} results. Set MAX_RESULTS_PER_CATEGORY higher to see more.*\n\n`;
    }
    
    if (category === CATEGORIES.FILENAMES) {
      report += '| File | Term |\n';
      report += '|------|------|\n';
      
      for (let i = 0; i < itemsToShow; i++) {
        const item = results[category][i];
        // Clean the file path
        const cleanFile = filterNonPrintableChars(item.file);
        report += `| \`${cleanFile}\` | ${item.term} |\n`;
      }
    } else {
      report += '| File | Line | Content | Term |\n';
      report += '|------|------|---------|------|\n';
      
      for (let i = 0; i < itemsToShow; i++) {
        const item = results[category][i];
        // Clean the file path and content
        const cleanFile = filterNonPrintableChars(item.file);
        const cleanContent = filterNonPrintableChars(item.content);
        
        // Escape pipe characters in content
        const escapedContent = cleanContent.replace(/\|/g, '\\|');
        report += `| \`${cleanFile}\` | ${item.line} | \`${escapedContent}\` | ${item.term} |\n`;
      }
    }
    
    report += '\n';
  }
  
  // Add refactoring recommendations
  report += '## Refactoring Recommendations\n\n';
  
  report += '### 1. Update Core Branding Module\n\n';
  report += '- Ensure `src/core/branding.ts` includes all necessary branding elements\n';
  report += '- Update `src/core/constants.ts` to provide accessor functions for all branding values\n\n';
  
  report += '### 2. Refactor by Category\n\n';
  
  report += '#### Extension ID\n';
  report += '- Update all references to use `extensionId()` from constants\n\n';
  
  report += '#### Command IDs\n';
  report += '- Create a command ID generator function that prefixes commands with the branding prefix\n';
  report += '- Update all command registrations to use this function\n\n';
  
  report += '#### View IDs\n';
  report += '- Create constants for view IDs that use the branding prefix\n';
  report += '- Update all view registrations to use these constants\n\n';
  
  report += '#### Configuration Keys\n';
  report += '- Create a configuration key generator function\n';
  report += '- Update all configuration access to use this function\n\n';
  
  report += '#### Git Configuration\n';
  report += '- Update all Git user name and email references to use branding constants\n';
  report += '- Create functions for generating branch names with branding prefix\n\n';
  
  report += '#### URLs and External Resources\n';
  report += '- Add URL constants to the branding module\n';
  report += '- Update all URL references to use these constants\n\n';
  
  report += '#### Hardcoded Strings\n';
  report += '- Replace all hardcoded branding strings with references to the branding module\n\n';
  
  report += '#### Filenames\n';
  report += '- Rename files to use generic names where possible\n';
  report += '- For files that must include branding, generate names dynamically\n\n';
  
  // Filter the entire report to ensure no unusual line terminators
  return filterNonPrintableChars(report);
}

/**
 * Main function
 */
async function main() {
  console.log('Finding branding references...');
  
  // Find files with branding in their names
  findBrandingFilenames();
  
  // Process all files in the current directory
  await processDirectory('.');
  
  // Generate and write the report
  const report = generateReport();
  
  // Ensure proper line endings (replace any remaining problematic line endings with standard ones)
  // First normalize all line endings to LF
  let normalizedReport = report.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Then remove any unusual line terminators that might remain
  normalizedReport = normalizedReport
    .replace(/\u2028/g, '\n')  // Line Separator (LS)
    .replace(/\u2029/g, '\n')  // Paragraph Separator (PS)
    .replace(/[\u0085\u000C\u2028\u2029]/g, '\n'); // NEL, FF, LS, PS
  
  // Write the report with standard line endings
  await fs.writeFile('branding-references-report.md', normalizedReport, { encoding: 'utf8' });
  
  console.log('Report generated: branding-references-report.md');
  console.log('Note: File has been processed to remove unusual line terminators.');
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});