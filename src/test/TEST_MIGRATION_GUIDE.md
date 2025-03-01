# Test Migration Guide: Jest to VS Code Testing API

## Overview

This guide provides step-by-step instructions for migrating tests from Jest to the VS Code Testing API. The VS Code Testing API provides richer test discovery, execution, and result reporting capabilities directly integrated with VS Code.

## Migration Steps

### Step 1: Understand the Test Structure

Before migrating a test, understand its structure:
- What is being tested?
- What are the test cases?
- What mocks or fixtures are used?
- What assertions are made?

### Step 2: Create the Test Controller and Test Items

1. Create an async function that takes a `vscode.ExtensionContext` parameter:

```typescript
export async function activateYourTestName(context: vscode.ExtensionContext): Promise<void> {
    // Implementation will go here
}
```

2. Create a test controller with a unique ID:

```typescript
const testController = vscode.tests.createTestController('yourUniqueTestId', 'Your Test Label')
context.subscriptions.push(testController)
```

3. Create a root test item:

```typescript
const rootSuite = testController.createTestItem('your-test-root', 'Your Test Root Label')
testController.items.add(rootSuite)
```

4. Create test suites (optional):

```typescript
const featureSuite = testController.createTestItem('feature-suite', 'Feature Suite Label')
rootSuite.children.add(featureSuite)
```

5. Add test cases:

```typescript
featureSuite.children.add(testController.createTestItem(
    'test-case-id',
    'should do something specific'
))
```

### Step 3: Create the Run Profile

1. Create a run profile that executes the tests:

```typescript
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
                case 'test-case-id': {
                    // Test implementation
                    assert.strictEqual(actual, expected)
                    break
                }
                // Add more test cases
            }
            run.passed(test)
        } catch (err) {
            run.failed(test, new vscode.TestMessage(err instanceof Error ? err.message : String(err)))
        }
    }
    run.end()
})
```

### Step 4: Convert Assertions

Convert Jest assertions to Node.js `assert` module:

| Jest Assertion | Node.js Assert Equivalent |
|----------------|---------------------------|
| `expect(x).toBe(y)` | `assert.strictEqual(x, y)` |
| `expect(x).toEqual(y)` | `assert.deepStrictEqual(x, y)` |
| `expect(x).toBeDefined()` | `assert.ok(x !== undefined)` |
| `expect(x).toBeUndefined()` | `assert.strictEqual(x, undefined)` |
| `expect(x).toBeTruthy()` | `assert.ok(x)` |
| `expect(x).toBeFalsy()` | `assert.ok(!x)` |
| `expect(x).toContain(y)` | `assert.ok(x.includes(y))` |
| `expect(x).toHaveLength(y)` | `assert.strictEqual(x.length, y)` |
| `expect(x).toThrow()` | `assert.throws(() => x())` |
| `expect(x).toThrowError(y)` | `assert.throws(() => x(), y)` |
| `expect(x).toBeGreaterThan(y)` | `assert.ok(x > y)` |
| `expect(x).toBeLessThan(y)` | `assert.ok(x < y)` |
| `expect(x).toBeGreaterThanOrEqual(y)` | `assert.ok(x >= y)` |
| `expect(x).toBeLessThanOrEqual(y)` | `assert.ok(x <= y)` |
| `expect(x).toBeCloseTo(y, z)` | `assert.ok(Math.abs(x - y) < Math.pow(10, -z))` |
| `expect(x).toMatch(y)` | `assert.ok(y.test(x))` |
| `expect(x).toHaveBeenCalled()` | Use explicit mock verification |
| `expect(x).toHaveBeenCalledWith(y)` | Use explicit mock verification |

### Step 5: Convert Mocks

1. Replace Jest mocks with explicit mock implementations:

```typescript
// Instead of jest.mock() or jest.spyOn()
const originalFunction = someModule.someFunction
someModule.someFunction = (...args) => {
    // Mock implementation
    return mockResult
}

// Restore after test
someModule.someFunction = originalFunction
```

2. For complex mocks, create mock classes or objects:

```typescript
const mockObject = {
    method1: () => mockResult1,
    method2: () => mockResult2,
    // ...
}
```

### Step 6: Register the Test

Add the test to `src/test/registerTests.ts`:

```typescript
import { activateYourTestName } from '../path/to/your/test'

export async function registerTests(context: vscode.ExtensionContext): Promise<void> {
    // ...
    await activateYourTestName(context)
    // ...
}
```

## Example: Complete Test Migration

### Before (Jest):

```typescript
import { someFunction } from '../someModule'

describe('someModule', () => {
    describe('someFunction', () => {
        it('should return correct result for valid input', () => {
            const result = someFunction('valid input')
            expect(result).toBe('expected result')
        })

        it('should throw error for invalid input', () => {
            expect(() => someFunction(null)).toThrow('Invalid input')
        })
    })
})
```

### After (VS Code Testing API):

```typescript
import * as vscode from 'vscode'
import * as assert from 'assert'
import { someFunction } from '../someModule'

export async function activateSomeModuleTests(context: vscode.ExtensionContext): Promise<void> {
    const testController = vscode.tests.createTestController('someModuleTests', 'Some Module Tests')
    context.subscriptions.push(testController)

    const rootSuite = testController.createTestItem('some-module', 'Some Module')
    testController.items.add(rootSuite)

    const functionSuite = testController.createTestItem('some-function', 'someFunction')
    rootSuite.children.add(functionSuite)

    functionSuite.children.add(testController.createTestItem(
        'valid-input',
        'should return correct result for valid input'
    ))

    functionSuite.children.add(testController.createTestItem(
        'invalid-input',
        'should throw error for invalid input'
    ))

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
                    case 'valid-input': {
                        const result = someFunction('valid input')
                        assert.strictEqual(result, 'expected result')
                        break
                    }
                    case 'invalid-input': {
                        assert.throws(() => someFunction(null), /Invalid input/)
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

## Common Patterns

### Setup and Teardown

```typescript
// Before each test
const originalState = { ... }
const cleanup = () => {
    // Restore original state
}

try {
    // Test implementation
    assert.strictEqual(actual, expected)
} finally {
    cleanup()
}
```

### Async Tests

```typescript
case 'async-test': {
    const result = await someAsyncFunction()
    assert.strictEqual(result, expected)
    break
}
```

### Mocking Modules

```typescript
// Save original
const originalModule = { ...someModule }

// Mock
someModule.method1 = () => mockResult1
someModule.method2 = () => mockResult2

try {
    // Test implementation
    assert.strictEqual(someModule.method1(), mockResult1)
} finally {
    // Restore original
    Object.assign(someModule, originalModule)
}
```

## Tips for Successful Migration

1. **Migrate One Test at a Time**: Start with simple tests and gradually move to more complex ones.

2. **Test Your Tests**: After migrating a test, run it to ensure it works correctly.

3. **Keep Test IDs Unique**: Ensure each test controller and test item has a unique ID.

4. **Use Descriptive Labels**: Make test labels clear and descriptive.

5. **Handle Cleanup Properly**: Use try/finally blocks to ensure cleanup code runs even if tests fail.

6. **Add Logging**: Add console.log statements to help debug test issues.

7. **Update Documentation**: Keep the MIGRATION_STATUS.md document updated as tests are migrated and registered.

## Next Steps

1. Identify tests to migrate
2. Prioritize tests based on importance and complexity
3. Migrate tests one by one
4. Register migrated tests in registerTests.ts
5. Run tests to verify they work
6. Update documentation