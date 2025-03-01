# VS Code Testing API Guide

This document provides guidance on using the VS Code Testing API for testing extensions in the Roo Code project.

## Overview

VS Code provides a built-in testing API that allows extensions to run tests within a special instance of VS Code called the "Extension Development Host". This approach has several advantages:

- Tests run in a real VS Code environment with full access to the VS Code API
- Tests can interact with VS Code UI elements, commands, and extensions
- Tests can be discovered and run from the VS Code Test Explorer

## Test Infrastructure

The test infrastructure consists of several key files:

1. **runTest.ts** - Entry point for running tests
2. **suite/index.ts** - Test suite loader
3. **testController.ts** - Helper for creating test controllers
4. **Individual test files** - Tests for specific functionality

### runTest.ts

This file is the entry point for running tests. It launches a VS Code instance and runs the tests.

```typescript
import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
    try {
        // The folder containing the Extension Manifest package.json
        const extensionDevelopmentPath = path.resolve(__dirname, '../../');

        // The path to the extension test script
        const extensionTestsPath = path.resolve(__dirname, './suite/index');

        // The path to test workspace
        const testWorkspacePath = path.resolve(__dirname, './workspace');

        // Download VS Code, unzip it and run the integration test
        await runTests({
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs: [
                testWorkspacePath,
                '--disable-extensions',
                '--disable-workspace-trust'
            ]
        });
    } catch (err) {
        console.error('Failed to run tests:', err);
        process.exit(1);
    }
}

main();
```

### suite/index.ts

This file loads and runs the tests. It can be configured to run specific test files or all test files in a directory.

```typescript
import * as path from 'path';
import Mocha = require('mocha');

export function run(): Promise<void> {
    // Create the mocha test
    const mocha = new Mocha({
        ui: 'tdd',
        color: true
    });

    const testsRoot = path.resolve(__dirname, '.');

    return new Promise<void>((c, e) => {
        try {
            // Run a specific test file
            const testFile = path.resolve(testsRoot, 'basic.test.js');
            console.log(`Adding test file: ${testFile}`);
            mocha.addFile(testFile);

            // Run the mocha test
            mocha.run((failures: number) => {
                if (failures > 0) {
                    e(new Error(`${failures} tests failed.`));
                } else {
                    c();
                }
            });
        } catch (err) {
            console.error(err);
            e(err);
        }
    });
}
```

### testController.ts

This file provides a helper function for creating test controllers with unique IDs.

```typescript
import * as vscode from 'vscode';

// Keep track of created controllers to ensure unique IDs
const createdControllers = new Set<string>();

export function createTestController(id: string, label: string) {
    // Ensure unique ID by adding a suffix if needed
    let uniqueId = id;
    let counter = 1;
    
    while (createdControllers.has(uniqueId)) {
        uniqueId = `${id}_${counter++}`;
    }
    
    // Remember this ID has been used
    createdControllers.add(uniqueId);
    
    const controller = vscode.tests.createTestController(uniqueId, label);
    
    controller.createRunProfile(
        'Run Tests',
        vscode.TestRunProfileKind.Run,
        async (request, token) => {
            const run = controller.createTestRun(request);
            const queue: vscode.TestItem[] = [];
            
            // Add all tests if no tests specifically requested
            if (!request.include) {
                controller.items.forEach(test => queue.push(test));
            } else {
                request.include.forEach(test => queue.push(test));
            }
            
            // Run all queued tests
            while (queue.length > 0 && !token.isCancellationRequested) {
                const test = queue.pop()!;

                // If test has children, add them to queue
                if (test.children.size > 0) {
                    test.children.forEach(child => queue.push(child));
                    continue;
                }

                // Run the test
                run.started(test);
                try {
                    await (test as any).run?.(run);
                    run.passed(test);
                } catch (err) {
                    run.failed(test, new vscode.TestMessage(err instanceof Error ? err.message : String(err)));
                }
            }
            
            run.end();
        }
    );

    return controller;
}
```

### Individual Test Files

Test files use the VS Code Testing API to define and run tests. Here's an example of a basic test file:

```typescript
import * as vscode from 'vscode';
import * as assert from 'assert';
import { createTestController } from '../testController';
import { TestUtils } from '../../testUtils';

// Create a test controller for simple tests
const controller = createTestController('simpleTests', 'Simple Tests');

// Root test item for simple tests
const simpleTests = controller.createTestItem('simple', 'Simple', vscode.Uri.file(__filename));
controller.items.add(simpleTests);

// Test for basic assertion
simpleTests.children.add(
    TestUtils.createTest(
        controller,
        'basic',
        'Basic assertion should pass',
        vscode.Uri.file(__filename),
        async run => {
            assert.strictEqual(1 + 1, 2, 'Basic math should work');
        }
    )
);

// Test for async operation
simpleTests.children.add(
    TestUtils.createTest(
        controller,
        'async',
        'Async operation should complete',
        vscode.Uri.file(__filename),
        async run => {
            const result = await Promise.resolve('success');
            assert.strictEqual(result, 'success', 'Async operation should resolve');
        }
    )
);

// Export the controller
export function activate() {
    return controller;
}
```

## Running Tests

Tests can be run using the following npm scripts:

```json
"scripts": {
  "test": "node ./out/test/runTest.js",
  "test:vscode": "node ./out/test/runTest.js"
}
```

To run the tests, use:

```bash
npm test
```

or

```bash
npm run test:vscode
```

## Migration Insights

When migrating from Jest to the VS Code Testing API, we encountered several challenges:

1. **Module System Incompatibilities**: Some dependencies (e.g., globby) are ES modules but are imported using CommonJS require(). This can cause errors when running tests.

2. **Duplicate Controller IDs**: When multiple test files create controllers with the same ID, VS Code will throw an error. We solved this by adding a unique ID generation mechanism in the testController.ts file.

3. **Test Discovery**: The VS Code Testing API uses a different approach to test discovery than Jest. Instead of using glob patterns, tests are registered with controllers.

4. **Test Execution**: Tests are executed by the VS Code Test Runner, not by Jest. This means that Jest-specific features like mocking and spying need to be replaced with VS Code-compatible alternatives.

## Best Practices

1. **Use Unique Controller IDs**: Always use unique IDs for test controllers to avoid conflicts.

2. **Organize Tests Hierarchically**: Use the test item hierarchy to organize tests logically.

3. **Clean Up Resources**: Make sure to clean up any resources created during tests, such as files, editors, or terminals.

4. **Use Assertions**: Use the Node.js assert module for assertions instead of Jest's expect.

5. **Handle Async Operations**: Use async/await for asynchronous operations and make sure to handle errors properly.

## Troubleshooting

### Tests Not Running

If tests are not running, check the following:

1. Make sure the test files are being compiled to JavaScript.
2. Check that the test files are being loaded by the index.ts file.
3. Verify that the test controllers are being created with unique IDs.
4. Look for errors in the VS Code Developer Tools console.

### Module System Errors

If you encounter module system errors (e.g., "Error [ERR_REQUIRE_ESM]"), you may need to update your dependencies or change how they are imported. Consider using dynamic imports for ES modules:

```typescript
// Instead of:
const globby = require('globby');

// Use:
const globby = await import('globby');
```

### Duplicate Controller IDs

If you encounter errors about duplicate controller IDs, make sure you're using the createTestController function from testController.ts, which ensures unique IDs.

## Conclusion

The VS Code Testing API provides a powerful way to test VS Code extensions. By following the guidelines in this document, you can create effective tests for your extension that run in a real VS Code environment.