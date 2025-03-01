# Test Migration Guide

## Overview

This project is migrating from Jest to VS Code's native Testing API. This document provides guidance on the migration process and how to run tests.

## Migration Status

The migration is in progress. Many tests have been migrated to the VS Code Testing API format, but not all of them are registered in the `registerTests.ts` file. See [MIGRATION_STATUS.md](./MIGRATION_STATUS.md) for a detailed status of the migration.

### Registered Tests

Tests that have been migrated to the VS Code Testing API and are registered in `registerTests.ts`:

- `src/core/__tests__/CodeActionProvider.test.ts`
- `src/api/transform/__tests__/bedrock-converse-format.test.ts`
- `src/shared/__tests__/vsCodeSelectorUtils.test.ts`
- `src/shared/__tests__/checkExistApiConfig.test.ts`
- `src/services/mcp/__tests__/McpHub.test.ts`
- `src/utils/__tests__/git.test.ts`
- `src/utils/__tests__/path.test.ts`
- `src/utils/__tests__/shell.test.ts`

### Migrated But Not Registered

Many tests have been migrated to the VS Code Testing API format but are not yet registered in `registerTests.ts`. These tests need to be registered to be discovered and run.

### Tests Still Using Jest

Some tests in `src/**/__tests__/` directories still use Jest and need to be migrated to the VS Code Testing API format.

## Migration Process

To migrate a test file from Jest to VS Code Testing API:

1. Convert the test file to use the VS Code Testing API pattern:
   - Create an async function that takes a `vscode.ExtensionContext` parameter
   - Create a test controller using `vscode.tests.createTestController`
   - Create a test hierarchy using `testController.createTestItem`
   - Add test cases to the hierarchy
   - Create a run profile that executes the tests
   - Export the function so it can be registered when the extension activates

2. Add the test activation function to `src/test/registerTests.ts`

Example of a migrated test file:

```typescript
import * as vscode from 'vscode'
import * as assert from 'assert'

export async function activateMyTests(context: vscode.ExtensionContext): Promise<void> {
    const testController = vscode.tests.createTestController('myTests', 'My Tests')
    context.subscriptions.push(testController)

    const rootSuite = testController.createTestItem('my-tests', 'My Tests')
    testController.items.add(rootSuite)

    // Add test cases
    rootSuite.children.add(testController.createTestItem(
        'test-1',
        'should do something'
    ))

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
                    case 'test-1': {
                        // Test implementation
                        assert.strictEqual(result, expected)
                        break
                    }
                }
                run.passed(test)
            } catch (err) {
                run.failed(test, new vscode.TestMessage(err instanceof Error ? err.message : String(err)))
            }
        }
        run.end()
    })
}
```

## How to Register a Test

To register a test with the VS Code Testing API:

1. Ensure your test file exports an activation function:
   ```typescript
   export async function activateYourTestName(context: vscode.ExtensionContext): Promise<void> {
       const testController = vscode.tests.createTestController('yourTestId', 'Your Test Label')
       // Test implementation
       // ...
   }
   ```

2. Add an import and registration call in `src/test/registerTests.ts`:
   ```typescript
   import { activateYourTestName } from '../path/to/your/test'
   
   export async function registerTests(context: vscode.ExtensionContext): Promise<void> {
       // ...
       await activateYourTestName(context)
       // ...
   }
   ```

## Running Tests

### Running VS Code Testing API Tests

```bash
# Run tests and save output to test-output.log
npm run test:vscode

# Run tests and show only the last 100 lines of output
npm run test:vscode:tail
```

This will launch VS Code with the extension in development mode, which will register the VS Code Testing API tests. You can then run the tests using the VS Code Testing view.

### Running All Tests

```bash
npm test
```

This will run the integration tests using the VS Code Testing API.

### Viewing Test Logs

Since test output can be very large and might exceed buffer limits, we've added utilities to handle this:

```bash
# View and navigate test logs with the log viewer utility
npm run test:log
```

The log viewer provides the following commands:
- `n`: Next page
- `p`: Previous page
- `g <num>`: Go to page number
- `f <text>`: Find text in logs
- `q`: Quit

## Test Organization

Tests are organized as follows:

- Unit Tests: Located in `src/**/__tests__/` directories
- Integration Tests: Located in `test/suite/integration/`
- Service Tests: Located in `test/suite/services/`

## Assertions

- Jest tests use `expect()` assertions
- VS Code Testing API tests use Node.js `assert` module

## Test Discovery

VS Code Testing API tests are registered in `src/test/registerTests.ts` and are automatically discovered when the extension activates in development mode.

## Common Issues

1. **Test Not Running**: If a test is not being discovered or run, check if it's properly registered in `registerTests.ts`.

2. **Duplicate Controller IDs**: When multiple test files create controllers with the same ID, VS Code throws an error. Ensure each test controller has a unique ID.

3. **Module System Incompatibilities**: Some dependencies (e.g., globby) are ES modules but are imported using CommonJS require(). This can cause errors when running tests.

## Next Steps

1. Continue registering migrated tests in `registerTests.ts`.
2. Migrate remaining tests from Jest to VS Code Testing API.
3. Update the MIGRATION_STATUS.md document as tests are registered and verified.