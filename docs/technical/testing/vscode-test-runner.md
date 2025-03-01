# VS Code Test Runner Guide

## Overview

This guide documents the VS Code Test Runner framework using `@vscode/test-cli` and `@vscode/test-electron`. This is the recommended approach for testing VS Code extensions, providing a robust and flexible testing environment.

## Setup

### Dependencies

Required packages in package.json:
```json
{
  "devDependencies": {
    "@vscode/test-cli": "^0.0.4",
    "@vscode/test-electron": "^2.3.9",
    "@types/mocha": "^10.0.6",
    "mocha": "^10.2.0"
  }
}
```

### NPM Scripts

Add these scripts to your package.json:
```json
{
  "scripts": {
    "test": "vscode-test",
    "test:unit": "vscode-test --label unitTests",
    "test:integration": "vscode-test --label integrationTests"
  }
}
```

### Test Configuration

Create a `.vscode-test.mjs`, `.vscode-test.js`, or `.vscode-test.json` configuration file in your project root:

#### JavaScript Format (ES Modules)

```javascript
import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  files: 'out/test/**/*.test.js',
  workspaceFolder: 'test-fixtures/workspace',
  mocha: {
    ui: 'tdd',
    timeout: 20000
  }
});
```

#### JSON Format

```json
{
  "label": "allTests",
  "files": "out/test/**/*.test.js",
  "workspaceFolder": "test-fixtures/workspace",
  "mocha": {
    "ui": "tdd",
    "timeout": 20000,
    "color": true
  },
  "launchArgs": [
    "--enable-proposed-api=your.extension.id"
  ],
  "debug": true,
  "verbose": true
}
```

#### Multiple Test Configurations

You can define multiple test configurations in a single file by using an array:

```json
[
  {
    "label": "basicTests",
    "files": "out/test/suite/mocha-test.js",
    "workspaceFolder": "path/to/workspace",
    "mocha": {
      "ui": "tdd",
      "timeout": 30000
    }
  },
  {
    "label": "coreTests",
    "files": [
      "out/test/suite/core/**/*.test.js"
    ],
    "extensionTestsPath": "out/test/suite/core/extension.js",
    "workspaceFolder": "path/to/workspace",
    "mocha": {
      "ui": "tdd",
      "timeout": 30000
    }
  }
]
```

This allows you to organize and run different types of tests separately.

#### Configuration Parameters

- `label`: A name for the test configuration, which can be used to run specific test configurations
- `files`: Pattern(s) for test files to run (required)
- `extensionTestsPath`: Path to the extension test runner script
- `workspaceFolder`: Path to a workspace to open during tests
- `mocha`: Configuration options for Mocha test runner
  - `ui`: Test interface style ('bdd', 'tdd', etc.)
  - `timeout`: Test timeout in milliseconds
  - `color`: Enable/disable colored output
- `launchArgs`: Additional arguments to pass to VS Code when launching
- `debug`: Enable debug mode
- `verbose`: Enable verbose output

## Writing Tests

### Test Structure

Tests are written using Mocha's test framework. Place test files in `src/test/suite/`:

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
    test('Sample test', async () => {
        // Arrange
        const document = await vscode.workspace.openTextDocument({
            content: 'Hello, World!'
        });

        // Act
        await vscode.window.showTextDocument(document);

        // Assert
        assert.strictEqual(document.getText(), 'Hello, World!');
    });
});
```

### Test Types

1. **Unit Tests**
   - Location: `src/test/suite/unit/`
   - Purpose: Test individual components
   - Example:
   ```typescript
   suite('Utils', () => {
       test('formatMessage formats correctly', () => {
           assert.strictEqual(formatMessage('test'), 'TEST');
       });
   });
   ```

2. **Integration Tests**
   - Location: `src/test/suite/integration/`
   - Purpose: Test VSCode extension features
   - Example:
   ```typescript
   suite('Extension Integration', () => {
       test('activates successfully', async () => {
           const ext = vscode.extensions.getExtension('your.extension.id');
           await ext?.activate();
           assert.ok(ext?.isActive);
       });
   });
   ```

### Test Fixtures

1. Create test fixtures in `test-fixtures/` directory:
   ```
   test-fixtures/
   ├── workspace/        # Test workspace
   │   ├── file1.ts     # Test files
   │   └── file2.ts
   └── settings.json    # Test settings
   ```

2. Load fixtures in tests:
   ```typescript
   const workspacePath = path.resolve(__dirname, '../../../test-fixtures/workspace');
   const uri = vscode.Uri.file(workspacePath);
   await vscode.workspace.updateWorkspaceFolders(0, 0, { uri });
   ```

## Running Tests

### Command Line

```bash
# Run all tests
npm test

# Run all test configurations
npx @vscode/test-cli

# Run specific test configuration by label
npx @vscode/test-cli --label basicTests
npx @vscode/test-cli --label coreTests

# Run with specific VSCode version
npx @vscode/test-cli --version insiders

# Get help with available options
npx @vscode/test-cli --help
```

When using multiple test configurations, you can run them all at once or run specific configurations using the `--label` flag. This is particularly useful for running different types of tests separately during development or in CI/CD pipelines.

### VS Code Launch Configuration

Add to `.vscode/launch.json`:
```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Extension Tests",
            "type": "extensionHost",
            "request": "launch",
            "runtimeExecutable": "${execPath}",
            "args": [
                "--extensionDevelopmentPath=${workspaceFolder}",
                "--extensionTestsPath=${workspaceFolder}/out/test"
            ],
            "outFiles": ["${workspaceFolder}/out/test/**/*.js"]
        }
    ]
}
```

## Best Practices

1. **Test Organization**
   - Group related tests in suites
   - Use descriptive test names
   - Follow arrange-act-assert pattern

2. **Async Testing**
   ```typescript
   test('async operations', async () => {
       await vscode.commands.executeCommand('command');
       const result = await someAsyncOperation();
       assert.ok(result);
   });
   ```

3. **Cleanup**
   ```typescript
   suite('Test Suite', () => {
       suiteSetup(async () => {
           // Suite-wide setup
       });

       setup(async () => {
           // Test-specific setup
       });

       teardown(async () => {
           // Test-specific cleanup
       });

       suiteTeardown(async () => {
           // Suite-wide cleanup
       });
   });
   ```

4. **Mocking**
   ```typescript
   // Mock VSCode API
   const mockWorkspace = {
       getConfiguration: () => ({
           get: () => 'test-value'
       })
   };
   ```

## Debugging Tests

1. Set breakpoints in your TypeScript test files

2. Use the "Extension Tests" launch configuration

3. Debug Console shows test output and errors

4. Use `console.log()` for additional debugging info:
   ```typescript
   test('debug test', async () => {
       console.log('Test started');
       // Test code
       console.log('Test completed');
   });
   ```

## Common Patterns

### Testing Commands

```typescript
suite('Command Tests', () => {
    test('command execution', async () => {
        const result = await vscode.commands.executeCommand('extension.command');
        assert.ok(result);
    });
});
```

### Testing WebViews

```typescript
suite('WebView Tests', () => {
    test('webview creation', async () => {
        const panel = vscode.window.createWebviewPanel(
            'testView',
            'Test View',
            vscode.ViewColumn.One,
            {}
        );
        assert.ok(panel);
    });
});
```

### Testing File Operations

```typescript
suite('File Operation Tests', () => {
    test('file creation', async () => {
        const uri = vscode.Uri.file('/path/to/test/file.txt');
        await vscode.workspace.fs.writeFile(uri, Buffer.from('content'));
        const content = await vscode.workspace.fs.readFile(uri);
        assert.strictEqual(Buffer.from(content).toString(), 'content');
    });
});
```

## Assertion and Test Structure Reference

### Assertions

VS Code tests use Node's built-in `assert` module:

```typescript
import * as assert from 'assert';

// Basic assertions
assert.strictEqual(value, expected);
assert.deepStrictEqual(obj1, obj2);
assert.ok(value, 'Optional message');

// Async assertions
await assert.doesNotReject(async () => {
    await someAsyncFunction();
});

// Error assertions
assert.throws(() => {
    throw new Error('Expected error');
}, /Expected error/);
```

### Test Structure

Tests are organized using Mocha's TDD interface:

```typescript
suite('Feature Name', () => {
    // Setup and teardown
    setup(() => {
        // Run before each test
    });
    
    teardown(() => {
        // Run after each test
    });
    
    // Test cases
    test('should do something', async () => {
        // Test code
    });
    
    test('should handle errors', async () => {
        // Test code
    });
});
```

### Mocking

```typescript
// Create interface for type safety
interface MockService {
    getData: () => Promise<string>;
}

// Create mock implementation
const mockService: MockService = {
    getData: async () => 'mock data'
};

// Use in tests
test('uses service', async () => {
    const result = await someFunction(mockService);
    assert.strictEqual(result, 'expected result');
});
```

## Troubleshooting

1. **Tests Not Running**
   - Verify test file naming (*.test.ts)
   - Check .vscode-test.mjs configuration
   - Ensure tests are compiled to out/test/
   - Verify the test files are included in the `files` pattern

2. **Test Timeouts**
   - Increase timeout in .vscode-test.mjs
   - Check for hanging async operations
   - Verify cleanup in teardown

3. **VSCode API Issues**
   - Ensure extension is activated
   - Check VSCode version compatibility
   - Verify API permissions in package.json

4. **ES Module Issues**
   - If you encounter errors like `Error [ERR_REQUIRE_ESM]: require() of ES Module ... not supported`, you may need to:
     - Update dependencies to CommonJS versions
     - Use dynamic imports (`import()`) instead of `require()`
     - Isolate problematic dependencies in separate test configurations
     - Use the `.mjs` extension for ES Module files

5. **Multiple Test Configuration Issues**
   - Ensure each configuration has a unique `label`
   - Check for conflicts in file paths and workspace folders
   - Run specific configurations using the `--label` flag to isolate issues

## Organizing Test Configurations

### Recommended Configuration Structure

For larger projects, organizing tests into separate configurations can improve maintainability and test execution efficiency:

```json
[
  {
    "label": "unitTests",
    "files": "out/test/suite/unit/**/*.test.js",
    "mocha": {
      "ui": "tdd",
      "timeout": 10000
    }
  },
  {
    "label": "integrationTests",
    "files": "out/test/suite/integration/**/*.test.js",
    "extensionTestsPath": "out/test/suite/index.js",
    "workspaceFolder": "test-fixtures/workspace",
    "mocha": {
      "ui": "tdd",
      "timeout": 30000
    }
  },
  {
    "label": "serviceTests",
    "files": "out/test/suite/services/**/*.test.js",
    "extensionTestsPath": "out/test/suite/services/index.js",
    "workspaceFolder": "test-fixtures/workspace",
    "mocha": {
      "ui": "tdd",
      "timeout": 30000
    }
  }
]
```

### Configuration Strategies

1. **By Test Type**
   - Separate unit, integration, and service tests
   - Apply appropriate timeouts and settings for each type
   - Enable faster feedback by running only unit tests during development

2. **By Feature Area**
   - Group tests by feature or component
   - Isolate problematic areas during debugging
   - Allow focused testing of new features

3. **By Execution Environment**
   - Create configurations for different VS Code versions
   - Test with different extension settings
   - Test with different workspace configurations

4. **By Performance Characteristics**
   - Fast tests for quick feedback
   - Slow tests for thorough validation
   - Resource-intensive tests for specific scenarios