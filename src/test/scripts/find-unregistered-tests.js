/**
 * This script finds tests that have been migrated to the VS Code Testing API format
 * but are not yet registered in registerTests.ts.
 * It also identifies tests that are still using Jest's describe/it pattern.
 *
 * Usage:
 * node src/test/scripts/find-unregistered-tests.js
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const glob = require('glob');

async function findTests() {
    // Find all test files
    const testFiles = await glob.glob('src/**/*.test.{ts,js}');
    
    // Read registerTests.ts to find registered tests
    const registerTestsPath = path.join(__dirname, '..', 'registerTests.ts');
    const registerTestsContent = await readFile(registerTestsPath, 'utf8');
    
    const registeredTests = [];
    const migratedTests = [];
    const unregisteredTests = [];
    const jestTests = [];
    const allTests = [];
    const otherTests = []; // Tests that don't match any pattern
    
    // Find registered tests
    const importRegex = /import\s+{\s*activate(\w+)Tests\s*}\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(registerTestsContent)) !== null) {
        const testName = match[1];
        const testPath = match[2];
        registeredTests.push({ testName, testPath });
    }
    
    // Process all test files
    for (const testFile of testFiles) {
        const relativePath = testFile.replace(/\\/g, '/');
        allTests.push(relativePath);
        
        const content = await readFile(testFile, 'utf8');
        
        // Check if test is migrated to VS Code Testing API
        const activationRegex = /export\s+async\s+function\s+activate(\w+)Tests/;
        const activationMatch = content.match(activationRegex);
        
        if (activationMatch) {
            const testName = activationMatch[1];
            migratedTests.push({ testName, relativePath });
            
            // Check if test is registered
            const isRegistered = registeredTests.some(
                rt => rt.testName === testName || rt.testPath === relativePath || rt.testPath === `./${relativePath}`
            );
            
            if (!isRegistered) {
                unregisteredTests.push({ testName, relativePath });
            }
        } else {
            // Check if test is using Jest's describe/it pattern
            const jestRegex = /describe\s*\(/;
            const jestMatch = content.match(jestRegex);
            
            if (jestMatch) {
                jestTests.push(relativePath);
            } else {
                // Tests that don't match any pattern
                otherTests.push(relativePath);
            }
        }
    }
    
    return {
        registeredTests,
        migratedTests,
        unregisteredTests,
        jestTests,
        allTests,
        otherTests
    };
}

async function generateRegistrationCode() {
    const {
        registeredTests,
        migratedTests,
        unregisteredTests,
        jestTests,
        allTests,
        otherTests
    } = await findTests();
    
    console.log('=== TEST MIGRATION STATUS ===');
    console.log(`Total test files found: ${allTests.length}`);
    console.log(`Tests using Jest's describe/it pattern: ${jestTests.length}`);
    console.log(`Tests migrated to VS Code Testing API: ${migratedTests.length}`);
    console.log(`Tests registered in registerTests.ts: ${registeredTests.length}`);
    console.log(`Tests migrated but not registered: ${unregisteredTests.length}`);
    console.log(`Tests not matching any pattern: ${otherTests.length}\n`);
    
    // Calculate migration progress percentage
    const migrationPercentage = ((migratedTests.length / allTests.length) * 100).toFixed(2);
    console.log(`Migration progress: ${migrationPercentage}% (${migratedTests.length}/${allTests.length})\n`);
    
    if (unregisteredTests.length === 0 && migratedTests.length > 0) {
        console.log('✅ All migrated tests are registered!');
    } else if (migratedTests.length === 0) {
        console.log('⚠️ No tests have been migrated to the VS Code Testing API yet.');
    }
    
    if (unregisteredTests.length > 0) {
        console.log('\n=== UNREGISTERED TESTS ===');
        unregisteredTests.forEach(test => {
            console.log(`- ${test.testName}: ${test.relativePath}`);
        });
        
        console.log('\n=== REGISTRATION CODE ===');
        console.log('Import statements to add to registerTests.ts:');
        unregisteredTests.forEach(test => {
            const importPath = test.relativePath.replace(/\.ts$/, '').replace(/\.js$/, '');
            console.log(`import { activate${test.testName}Tests } from '../${importPath}'`);
        });
        
        console.log('\nRegistration code to add to registerTests.ts:');
        unregisteredTests.forEach(test => {
            console.log(`await activate${test.testName}Tests(context)`);
            console.log(`console.log('✓ Registered ${test.testName} tests')`);
        });
    }
    
    if (jestTests.length > 0) {
        console.log('\n=== TESTS USING JEST ===');
        console.log(`Found ${jestTests.length} tests still using Jest's describe/it pattern.`);
        console.log('Sample of tests to migrate (first 10):');
        jestTests.slice(0, 10).forEach(test => {
            console.log(`- ${test}`);
        });
        
        console.log('\nThese tests need to be migrated to the VS Code Testing API format.');
        console.log('Use the generate-test-migration.js script to generate a skeleton for migrating a Jest test file:');
        console.log('npm run test:generate-migration <path-to-test-file>');
    }
    
    if (otherTests.length > 0) {
        console.log('\n=== OTHER TEST FILES ===');
        console.log(`Found ${otherTests.length} test files that don't match any pattern.`);
        console.log('These files might be utility files or tests in a different format:');
        otherTests.forEach(test => {
            console.log(`- ${test}`);
        });
    }
}

generateRegistrationCode().catch(console.error);