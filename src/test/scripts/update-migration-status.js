/**
 * This script updates the MIGRATION_STATUS.md file with the current status of test migration.
 * 
 * Usage:
 * node src/test/scripts/update-migration-status.js
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const glob = require('glob');

async function updateMigrationStatus() {
    // Find all test files
    const testFiles = await glob.glob('src/**/*.test.{ts,js}');
    
    // Read registerTests.ts to find registered tests
    const registerTestsPath = path.join(__dirname, '..', 'registerTests.ts');
    const registerTestsContent = await readFile(registerTestsPath, 'utf8');
    
    // Find registered tests
    const registeredTests = [];
    const importRegex = /import\s+{\s*activate(\w+)Tests\s*}\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(registerTestsContent)) !== null) {
        const testName = match[1];
        const testPath = match[2];
        registeredTests.push({ testName, testPath });
    }
    
    // Categorize test files
    const categories = {
        'Core Tests': [],
        'API Tests': [],
        'Integration Tests': [],
        'Service Tests': [],
        'Utility Tests': [],
        'Shared Module Tests': [],
        'Template Tests': [],
        'End-to-End Tests': [],
    };
    
    // Map test files to categories
    for (const testFile of testFiles) {
        const relativePath = testFile.replace(/\\/g, '/');
        
        // Check if test is migrated
        const content = await readFile(testFile, 'utf8');
        const isMigrated = content.includes('export async function activate') && 
                          content.includes('vscode.tests.createTestController');
        
        // Check if test is registered
        const isRegistered = registeredTests.some(
            rt => relativePath.includes(rt.testPath.replace(/^\.\//, '')) || 
                 relativePath.includes(rt.testPath.replace(/^\.\.\//, ''))
        );
        
        // Determine category
        let category;
        if (relativePath.includes('src/core/')) {
            category = 'Core Tests';
        } else if (relativePath.includes('src/api/')) {
            category = 'API Tests';
        } else if (relativePath.includes('src/integrations/')) {
            category = 'Integration Tests';
        } else if (relativePath.includes('src/services/') || relativePath.includes('src/test/suite/services/')) {
            category = 'Service Tests';
        } else if (relativePath.includes('src/utils/')) {
            category = 'Utility Tests';
        } else if (relativePath.includes('src/shared/')) {
            category = 'Shared Module Tests';
        } else if (relativePath.includes('src/test/suite/templates/')) {
            category = 'Template Tests';
        } else if (relativePath.includes('src/test/suite/e2e/')) {
            category = 'End-to-End Tests';
        } else if (relativePath.includes('src/test/suite/')) {
            category = 'Integration Tests';
        } else {
            category = 'Other Tests';
        }
        
        categories[category] = categories[category] || [];
        categories[category].push({
            path: relativePath,
            migrated: isMigrated,
            registered: isRegistered,
        });
    }
    
    // Generate statistics
    const stats = {
        total: 0,
        migrated: 0,
        registered: 0,
        categories: {},
    };
    
    for (const [category, tests] of Object.entries(categories)) {
        if (!tests || tests.length === 0) continue;
        
        const categoryStats = {
            total: tests.length,
            migrated: tests.filter(t => t.migrated).length,
            registered: tests.filter(t => t.registered).length,
        };
        
        stats.total += categoryStats.total;
        stats.migrated += categoryStats.migrated;
        stats.registered += categoryStats.registered;
        stats.categories[category] = categoryStats;
    }
    
    // Generate migration status markdown
    const migrationStatus = generateMigrationStatusMarkdown(categories, stats);
    
    // Write migration status to file
    const migrationStatusPath = path.join(__dirname, '..', 'MIGRATION_STATUS.md');
    await writeFile(migrationStatusPath, migrationStatus);
    
    console.log(`Updated migration status at ${migrationStatusPath}`);
    console.log(`Total tests: ${stats.total}`);
    console.log(`Migrated tests: ${stats.migrated} (${Math.round((stats.migrated / stats.total) * 100)}%)`);
    console.log(`Registered tests: ${stats.registered} (${Math.round((stats.registered / stats.total) * 100)}%)`);
}

function generateMigrationStatusMarkdown(categories, stats) {
    const lines = [];
    
    // Header
    lines.push('# Test Migration Status');
    lines.push('');
    lines.push('## Overview');
    lines.push('');
    lines.push('This document tracks the migration of tests from Jest to the VS Code Testing API. The VS Code Testing API provides richer test discovery, execution, and result reporting capabilities directly integrated with VS Code.');
    lines.push('');
    
    // Migration Progress Summary
    lines.push('## Migration Progress Summary');
    lines.push('');
    lines.push('| Category | Total Tests | Migrated | Registered & Working | Status |');
    lines.push('|----------|-------------|----------|---------------------|--------|');
    
    for (const [category, categoryStats] of Object.entries(stats.categories)) {
        const percentRegistered = Math.round((categoryStats.registered / categoryStats.total) * 100);
        let status;
        if (percentRegistered === 100) {
            status = '✓ Complete';
        } else if (percentRegistered === 0) {
            status = '⚠️ Not Working';
        } else {
            status = '⚠️ Partially Working';
        }
        
        lines.push(`| ${category} | ${categoryStats.total} | ${categoryStats.migrated} | ${categoryStats.registered} | ${status} |`);
    }
    
    const percentRegistered = Math.round((stats.registered / stats.total) * 100);
    lines.push(`| **Total** | **${stats.total}** | **${stats.migrated}** | **${stats.registered}** | **⚠️ ${percentRegistered}% Working** |`);
    lines.push('');
    
    // Test Registration Status
    lines.push('## Test Registration Status');
    lines.push('');
    
    const registeredTests = [];
    for (const [category, tests] of Object.entries(categories)) {
        if (!tests || tests.length === 0) continue;
        
        for (const test of tests) {
            if (test.registered) {
                registeredTests.push(test.path);
            }
        }
    }
    
    if (registeredTests.length > 0) {
        lines.push('Currently, the following tests are properly registered in the `registerTests.ts` file:');
        for (const test of registeredTests) {
            lines.push(`- ✓ ${test}`);
        }
    } else {
        lines.push('No tests are currently registered in the `registerTests.ts` file.');
    }
    
    lines.push('');
    lines.push('**Important Note**: While many tests have been migrated to use the VS Code Testing API format, many of them are not being discovered and run because they are not registered in the `registerTests.ts` file. This explains why running `npm test` only shows a few tests passing.');
    lines.push('');
    
    // Generate sections for each category
    for (const [category, tests] of Object.entries(categories)) {
        if (!tests || tests.length === 0) continue;
        
        const categoryStats = stats.categories[category];
        const percentMigrated = Math.round((categoryStats.migrated / categoryStats.total) * 100);
        const percentRegistered = Math.round((categoryStats.registered / categoryStats.total) * 100);
        
        let phaseNumber;
        switch (category) {
            case 'Core Tests': phaseNumber = 1; break;
            case 'API Tests': phaseNumber = 2; break;
            case 'Integration Tests': phaseNumber = 3; break;
            case 'Service Tests': phaseNumber = 4; break;
            case 'Utility Tests': phaseNumber = 5; break;
            case 'Shared Module Tests': phaseNumber = 5; break;
            case 'Template Tests': phaseNumber = 6; break;
            case 'End-to-End Tests': phaseNumber = 7; break;
            default: phaseNumber = 8; break;
        }
        
        let status = '';
        if (percentMigrated === 100) {
            if (percentRegistered === 100) {
                status = '✓ (Completed)';
            } else if (percentRegistered === 0) {
                status = '✓ (Migrated, ⚠️ Not Registered)';
            } else {
                status = '✓ (Migrated, ⚠️ Partially Registered)';
            }
        } else if (percentMigrated === 0) {
            status = '❌ (Not Started)';
        } else {
            status = '🔄 (In Progress)';
        }
        
        lines.push(`## Phase ${phaseNumber}: ${category} Migration ${status}`);
        lines.push('');
        
        if (percentMigrated > 0) {
            lines.push('### Migrated');
            
            // Group tests by subdirectory
            const testsBySubdir = {};
            for (const test of tests) {
                if (!test.migrated) continue;
                
                const parts = test.path.split('/');
                const subdir = parts.slice(0, -1).join('/');
                testsBySubdir[subdir] = testsBySubdir[subdir] || [];
                testsBySubdir[subdir].push(test);
            }
            
            // Output tests by subdirectory
            for (const [subdir, subdirTests] of Object.entries(testsBySubdir)) {
                const subdirName = subdir.split('/').pop();
                lines.push(`- ✓ ${subdirName} tests:`);
                
                for (const test of subdirTests) {
                    const status = test.registered ? '✓ Registered' : '⚠️ Not Registered';
                    lines.push(`  - ✓ ${test.path} - ${status}`);
                }
            }
            
            lines.push('');
        }
        
        if (percentMigrated < 100) {
            lines.push('### Not Migrated');
            
            for (const test of tests) {
                if (test.migrated) continue;
                
                lines.push(`- ❌ ${test.path}`);
            }
            
            lines.push('');
        }
    }
    
    // Migration Challenges
    lines.push('## Migration Challenges');
    lines.push('');
    lines.push('During the migration, we encountered several challenges:');
    lines.push('');
    lines.push('1. **Module System Incompatibilities**: Some dependencies (e.g., globby) are ES modules but are imported using CommonJS require(). This caused errors when running tests.');
    lines.push('');
    lines.push('2. **Duplicate Controller IDs**: When multiple test files create controllers with the same ID, VS Code throws an error. We solved this by adding a unique ID generation mechanism.');
    lines.push('');
    lines.push('3. **Test Discovery**: The VS Code Testing API uses a different approach to test discovery than Jest. Instead of using glob patterns, tests are registered with controllers.');
    lines.push('');
    lines.push('4. **Test Execution**: Tests are executed by the VS Code Test Runner, not by Jest. This means that Jest-specific features like mocking and spying need to be replaced with VS Code-compatible alternatives.');
    lines.push('');
    lines.push('5. **Test Registration**: Tests need to be explicitly registered in the `registerTests.ts` file to be discovered and run. Currently, only a few tests are registered.');
    lines.push('');
    lines.push('For detailed information on these challenges and how to address them, see the [VS Code Testing API Guide](../../docs/technical/testing/vscode-testing-api.md).');
    lines.push('');
    
    // Next Steps
    lines.push('## Next Steps');
    lines.push('');
    lines.push('1. **Register All Tests**: Continue updating the `registerTests.ts` file to register all migrated tests.');
    lines.push('2. **Verify Test Activation Functions**: Ensure all test files export proper activation functions.');
    lines.push('3. **Run Tests Incrementally**: Register and run tests in small batches to verify they work.');
    lines.push('4. **Update Documentation**: Keep this document updated as tests are registered and verified.');
    lines.push('5. **Address Module System Incompatibilities**: Fix any remaining issues with ES modules.');
    lines.push('6. **Optimize Test Performance**: Improve test execution speed.');
    
    if (stats.categories['End-to-End Tests'] && stats.categories['End-to-End Tests'].migrated === 0) {
        lines.push('7. **Begin Phase 7**: Start work on E2E test environment setup.');
    }
    
    lines.push('');
    
    // How to Register a Test
    lines.push('## How to Register a Test');
    lines.push('');
    lines.push('To register a test with the VS Code Testing API:');
    lines.push('');
    lines.push('1. Ensure your test file exports an activation function:');
    lines.push('   ```typescript');
    lines.push('   export async function activateYourTestName(context) {');
    lines.push('       const testController = createTestController(\'your-test-id\', \'Your Test Label\');');
    lines.push('       // Test implementation');
    lines.push('       return controller;');
    lines.push('   }');
    lines.push('   ```');
    lines.push('');
    lines.push('2. Add an import and registration call in `registerTests.ts`:');
    lines.push('   ```typescript');
    lines.push('   import { activateYourTestName } from "../path/to/your/test";');
    lines.push('   ');
    lines.push('   async function registerTests(context) {');
    lines.push('       // ...');
    lines.push('       await activateYourTestName(context);');
    lines.push('       // ...');
    lines.push('   }');
    lines.push('   ```');
    lines.push('');
    lines.push('3. Run the tests to verify they work:');
    lines.push('   ```');
    lines.push('   npm test');
    lines.push('   ```');
    lines.push('');
    
    // Recent Updates
    lines.push('## Recent Updates');
    lines.push('');
    lines.push('- Updated MIGRATION_STATUS.md to accurately reflect the current state of test migration');
    lines.push('- Added scripts to help with test migration and registration:');
    lines.push('  - `src/test/scripts/find-unregistered-tests.js`: Finds tests that have been migrated but not registered');
    lines.push('  - `src/test/scripts/generate-test-migration.js`: Generates a skeleton for migrating a Jest test file');
    lines.push('  - `src/test/scripts/run-tests.js`: Runs tests and provides a summary of the results');
    lines.push('  - `src/test/scripts/update-migration-status.js`: Updates this document with the current status');
    
    return lines.join('\n');
}

// Main
updateMigrationStatus().catch(console.error);