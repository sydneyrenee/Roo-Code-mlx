#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const API_FILE = path.join(process.cwd(), 'node_modules/@types/vscode/index.d.ts');

function findInterface(content, name) {
    // Match interface or class definition with any preceding comments
    const pattern = new RegExp(`\\/\\*\\*([^*]|\\*[^/])*\\*\\/\\s*export\\s+(interface|class)\\s+${name}\\s*{[^}]*}`, 'g');
    const matches = content.match(pattern);
    return matches ? matches[0] : null;
}

function formatOutput(text) {
    // Clean up the text and format it nicely
    return text
        .replace(/\/\*\*|\*\//g, '')  // Remove comment markers
        .replace(/\n\s*\*/g, '\n')    // Remove leading asterisks
        .replace(/\n\s{2,}/g, '\n  ') // Normalize indentation
        .trim();
}

function main() {
    const interfaceName = process.argv[2];
    
    if (!interfaceName) {
        console.error('Please provide an interface name');
        console.error('Usage: npm run api-docs <interfaceName>');
        console.error('Example: npm run api-docs TestItem');
        process.exit(1);
    }

    const content = fs.readFileSync(API_FILE, 'utf8');
    const result = findInterface(content, interfaceName.trim());
    
    if (result) {
        console.log(formatOutput(result));
    } else {
        console.error(`No matching interface or class found for: ${interfaceName}`);
        process.exit(1);
    }
}

main();