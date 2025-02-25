# VSCode Test Runner Guide

## Overview

This guide documents the new VSCode Test Runner framework using `@vscode/test-cli` and `@vscode/test-electron`. This is the recommended approach for testing VSCode extensions, replacing the legacy test kit.

## Setup

### Dependencies

Required packages in package.json:
```json
{
  "devDependencies": {
    "@vscode/test-cli": "^0.0.4",
    "@vscode/test-electron": "^2.3.9",
    "@types/mocha": "^10.0.6"
  }
}
```

### Test Configuration

Create a `.vscode-test.mjs` configuration file in your project root:

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

# Run specific test file
vscode-test --label unitTests

# Run with specific VSCode version
vscode-test --version insiders
```

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

## Migration from Jest

1. Replace Jest assertions with Node's assert:
   ```typescript
   // Jest
   expect(value).toBe(expected);
   
   // Node assert
   assert.strictEqual(value, expected);
   ```

2. Update test structure:
   ```typescript
   // Jest
   describe('suite', () => {
       it('test', () => {});
   });
   
   // Mocha
   suite('suite', () => {
       test('test', () => {});
   });
   ```

3. Update mocking patterns:
   ```typescript
   // Instead of Jest mocks, use TypeScript interfaces
   interface MockDependency {
       method: () => void;
   }
   
   const mockDep: MockDependency = {
       method: () => {}
   };
   ```

## Troubleshooting

1. **Tests Not Running**
   - Verify test file naming (*.test.ts)
   - Check .vscode-test.mjs configuration
   - Ensure tests are compiled to out/test/

2. **Test Timeouts**
   - Increase timeout in .vscode-test.mjs
   - Check for hanging async operations
   - Verify cleanup in teardown

3. **VSCode API Issues**
   - Ensure extension is activated
   - Check VSCode version compatibility
   - Verify API permissions in package.json