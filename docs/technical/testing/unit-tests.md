# Unit Testing Guide

This guide covers writing and running unit tests for Roo Code using the VS Code Testing API.

## Overview

Unit tests in Roo Code:
- Use the VS Code Testing API as the testing framework
- Run in a real VS Code environment with full access to the VS Code API
- Focus on testing individual components in isolation
- Use the Node.js assert module for assertions

## Writing Unit Tests

### Basic Test Structure

```typescript
import * as vscode from 'vscode';
import * as assert from 'assert';
import { createTestController } from '../testController';
import { TestUtils } from '../../testUtils';

// Create a test controller for component tests
const controller = createTestController('componentTests', 'Component Tests');

// Root test item for component tests
const componentTests = controller.createTestItem('component', 'Component', vscode.Uri.file(__filename));
controller.items.add(componentTests);

// Test for specific functionality
componentTests.children.add(
    TestUtils.createTest(
        controller,
        'functionality',
        'Should perform specific action',
        vscode.Uri.file(__filename),
        async run => {
            // Arrange
            const input = 'test';

            // Act
            const result = someFunction(input);

            // Assert
            assert.strictEqual(result, 'expected', 'Function should return expected value');
        }
    )
);

// Export the controller
export function activate() {
    return controller;
}
```

### Mocking

#### 1. Function Mocks
```typescript
// Create a mock function
const mockFunction = () => 'mocked value';

// Replace the original function with the mock
const originalFunction = module.someFunction;
module.someFunction = mockFunction;

// Restore the original function after the test
afterEach(() => {
    module.someFunction = originalFunction;
});
```

#### 2. Class Mocks
```typescript
// Create a mock class
class MockClass {
    method() {
        return Promise.resolve('result');
    }
}

// Replace the original class with the mock
const originalClass = module.SomeClass;
module.SomeClass = MockClass;

// Restore the original class after the test
afterEach(() => {
    module.SomeClass = originalClass;
});
```

#### 3. VSCode API Mocks
```typescript
// Store original functions
const originalShowInformationMessage = vscode.window.showInformationMessage;
const originalGetConfiguration = vscode.workspace.getConfiguration;

// Replace with mocks
vscode.window.showInformationMessage = () => Promise.resolve('OK');
vscode.workspace.getConfiguration = () => ({
    get: () => 'config value',
    update: () => Promise.resolve()
});

// Restore original functions after the test
afterEach(() => {
    vscode.window.showInformationMessage = originalShowInformationMessage;
    vscode.workspace.getConfiguration = originalGetConfiguration;
});
```

### Async Testing

```typescript
TestUtils.createTest(
    controller,
    'async',
    'Should handle async operations',
    vscode.Uri.file(__filename),
    async run => {
        // Arrange
        const mockData = { result: 'success' };
        const originalFetch = api.fetch;
        api.fetch = () => Promise.resolve(mockData);

        try {
            // Act
            const result = await someAsyncFunction();

            // Assert
            assert.deepStrictEqual(result, mockData, 'Should return mock data');
        } finally {
            // Restore original function
            api.fetch = originalFetch;
        }
    }
);
```

## Test Organization

### File Structure
```
test/
└── suite/
    ├── index.ts           # Test suite loader
    ├── basic.test.ts      # Basic tests
    └── component.test.ts  # Component-specific tests
```

### Test Grouping
```typescript
// Create a test controller
const controller = createTestController('componentTests', 'Component Tests');

// Root test item
const componentTests = controller.createTestItem('component', 'Component', vscode.Uri.file(__filename));
controller.items.add(componentTests);

// Method-specific tests
const methodTests = controller.createTestItem('method', 'Method', vscode.Uri.file(__filename));
componentTests.children.add(methodTests);

// Condition-specific tests
const conditionTests = controller.createTestItem('condition', 'When condition', vscode.Uri.file(__filename));
methodTests.children.add(conditionTests);

// Specific test
conditionTests.children.add(
    TestUtils.createTest(
        controller,
        'behavior',
        'Should exhibit behavior',
        vscode.Uri.file(__filename),
        async run => {
            // Test implementation
        }
    )
);
```

## Best Practices

### 1. Test Isolation
- Each test should be independent
- Clean up any mocks or side effects after each test
- Use unique IDs for test controllers to avoid conflicts

### 2. Naming Conventions
- Test controller IDs: camelCase, descriptive of the component being tested
- Test item IDs: camelCase, descriptive of the functionality being tested
- Test item labels: Clear, descriptive sentences

### 3. Assertions
- Use the Node.js assert module for assertions
- Test one concept per test
- Make specific assertions
- Include edge cases
- Test error conditions

### 4. Mocking
- Store original functions/objects before mocking
- Restore original functions/objects after testing
- Document mock behavior
- Clean up mocks after each test

## Common Patterns

### 1. Testing Error Handling
```typescript
TestUtils.createTest(
    controller,
    'errorHandling',
    'Should handle errors',
    vscode.Uri.file(__filename),
    async run => {
        // Arrange
        const error = new Error('Test error');
        const originalFetch = api.fetch;
        api.fetch = () => Promise.reject(error);

        try {
            // Act & Assert
            await assert.rejects(
                async () => await someAsyncFunction(),
                error,
                'Should reject with the expected error'
            );
        } finally {
            // Restore original function
            api.fetch = originalFetch;
        }
    }
);
```

### 2. Testing Event Handlers
```typescript
TestUtils.createTest(
    controller,
    'eventHandling',
    'Should handle events',
    vscode.Uri.file(__filename),
    async run => {
        // Arrange
        let eventData = null;
        const handler = (data) => { eventData = data; };
        const component = new Component();
        component.on('event', handler);

        // Act
        component.emit('event', 'data');

        // Assert
        assert.strictEqual(eventData, 'data', 'Event handler should receive data');
    }
);
```

### 3. Testing State Changes
```typescript
TestUtils.createTest(
    controller,
    'stateChanges',
    'Should update state',
    vscode.Uri.file(__filename),
    async run => {
        // Arrange
        const component = new Component();
        
        // Act
        component.setState({ value: 'new' });

        // Assert
        assert.deepStrictEqual(component.getState(), { value: 'new' }, 'State should be updated');
    }
);
```

## Running Tests

### Basic Commands
```bash
# Run all tests
npm test

# Run VS Code tests
npm run test:vscode
```

### Coverage Requirements
- Statements: 80%
- Branches: 80%
- Functions: 80%
- Lines: 80%

## Troubleshooting

### Common Issues

1. **Duplicate Controller IDs**
   - Use the createTestController function from testController.ts
   - Ensure unique IDs for test controllers

2. **Module System Errors**
   - Use dynamic imports for ES modules
   - Check for compatibility issues between CommonJS and ES modules

3. **Tests Not Running**
   - Check that test files are being compiled to JavaScript
   - Verify that test files are being loaded by the index.ts file
   - Look for errors in the VS Code Developer Tools console

## Resources

- [VS Code Testing API Documentation](https://code.visualstudio.com/api/extension-guides/testing)
- [Node.js Assert Documentation](https://nodejs.org/api/assert.html)
- [VS Code Extension Testing Guide](https://code.visualstudio.com/api/working-with-extensions/testing-extension)