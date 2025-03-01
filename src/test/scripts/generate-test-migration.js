/**
 * This script generates a skeleton for migrating a Jest test file to the VS Code Testing API format.
 * 
 * Usage:
 * node src/test/scripts/generate-test-migration.js path/to/test.js
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

async function generateTestMigration(testFilePath) {
    // Read the test file
    const content = await readFile(testFilePath, 'utf8');
    
    // Extract test name from file path
    const fileName = path.basename(testFilePath, path.extname(testFilePath));
    const testName = fileName.replace(/[-.]test$/, '').replace(/[-.]/g, '');
    const testNameCapitalized = testName.charAt(0).toUpperCase() + testName.slice(1);
    
    // Parse the test structure
    const describeBlocks = [];
    const testCases = [];
    
    // Extract describe blocks
    const describeRegex = /describe\(['"]([^'"]+)['"]/g;
    let describeMatch;
    while ((describeMatch = describeRegex.exec(content)) !== null) {
        describeBlocks.push(describeMatch[1]);
    }
    
    // Extract test cases
    const testRegex = /(?:it|test)\(['"]([^'"]+)['"]/g;
    let testMatch;
    while ((testMatch = testRegex.exec(content)) !== null) {
        testCases.push(testMatch[1]);
    }
    
    // Generate the migrated test file
    const migrated = generateMigratedTestFile(testName, testNameCapitalized, describeBlocks, testCases);
    
    // Write the migrated test file
    const outputPath = testFilePath.replace(/\.js$/, '.migrated.ts').replace(/\.ts$/, '.migrated.ts');
    await writeFile(outputPath, migrated);
    
    console.log(`Generated migrated test file: ${outputPath}`);
    console.log(`Found ${describeBlocks.length} describe blocks and ${testCases.length} test cases.`);
}

function generateMigratedTestFile(testName, testNameCapitalized, describeBlocks, testCases) {
    // Generate test IDs from test cases
    const testIds = testCases.map(testCase => {
        return testCase
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    });
    
    // Generate test suites from describe blocks
    const testSuites = describeBlocks.map(describeBlock => {
        return {
            id: describeBlock
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, ''),
            label: describeBlock
        };
    });
    
    return `import * as vscode from 'vscode'
import * as assert from 'assert'
// TODO: Import the module being tested
// import { ... } from '...'

export async function activate${testNameCapitalized}Tests(context: vscode.ExtensionContext): Promise<void> {
    const testController = vscode.tests.createTestController('${testName}Tests', '${testNameCapitalized} Tests')
    context.subscriptions.push(testController)

    // Root test item
    const rootSuite = testController.createTestItem('${testName}', '${testNameCapitalized}')
    testController.items.add(rootSuite)

    // Create test suites
${testSuites.map(suite => `    const ${suite.id}Suite = testController.createTestItem('${suite.id}', '${suite.label}')
    rootSuite.children.add(${suite.id}Suite)`).join('\n')}

    // Add test cases
${testIds.map((id, index) => `    ${testSuites.length > 0 ? testSuites[0].id + 'Suite' : 'rootSuite'}.children.add(testController.createTestItem(
        '${id}',
        '${testCases[index]}'
    ))`).join('\n')}

    // Create run profile
    testController.createRunProfile('run', vscode.TestRunProfileKind.Run, async (request) => {
        const queue: vscode.TestItem[] = []
        if (request.include) {
            request.include.forEach(test => queue.push(test))
        }

        const run = testController.createTestRun(request)

        for (const test of queue) {
            run.started(test)
            try {
                switch (test.id) {
${testIds.map(id => `                    case '${id}': {
                        // TODO: Implement test
                        // assert.strictEqual(actual, expected)
                        break
                    }`).join('\n')}
                }
                run.passed(test)
            } catch (err) {
                run.failed(test, new vscode.TestMessage(err instanceof Error ? err.message : String(err)))
            }
        }
        run.end()
    })
}
`;
}

// Main
const testFilePath = process.argv[2];
if (!testFilePath) {
    console.error('Please provide a test file path');
    process.exit(1);
}

generateTestMigration(testFilePath).catch(console.error);