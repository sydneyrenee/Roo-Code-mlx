# VSCode Integration Testing Guide

This guide covers writing and running integration tests for Roo Code in the VSCode environment.

## Overview

Integration tests in Roo Code:
- Test the extension in a real VSCode environment
- Located in `src/test/suite/`
- Use minimal mocking
- Focus on end-to-end functionality

## Test Environment

### Setup

Integration tests run in a special VSCode extension development host:
- Clean VSCode instance
- Extension loaded in development mode
- Isolated workspace
- Real file system access

### Test Runner

Tests use the VSCode Extension Test Runner:
- Launches VSCode instance
- Loads extension
- Executes test suite
- Reports results

## Writing Integration Tests

### Basic Test Structure

```typescript
suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Starting integration tests.');

    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('RooVeterinaryInc.roo-cline'));
    });

    test('Should activate extension', async () => {
        const ext = vscode.extensions.getExtension('RooVeterinaryInc.roo-cline');
        await ext?.activate();
        assert.ok(ext?.isActive);
    });
});
```

### Testing Commands

```typescript
test('Should execute command', async () => {
    // Arrange
    const document = await vscode.workspace.openTextDocument({
        content: 'test content'
    });
    await vscode.window.showTextDocument(document);

    // Act
    await vscode.commands.executeCommand('roo-code.someCommand');

    // Assert
    assert.strictEqual(document.getText(), 'expected content');
});
```

### Testing File Operations

```typescript
test('Should modify file', async () => {
    // Arrange
    const testFile = path.join(__dirname, 'test.txt');
    await fs.writeFile(testFile, 'initial content');

    // Act
    await vscode.commands.executeCommand('roo-code.modifyFile', testFile);

    // Assert
    const content = await fs.readFile(testFile, 'utf8');
    assert.strictEqual(content, 'modified content');
});
```

## Test Organization

### Directory Structure
```
src/
└── test/
    ├── suite/
    │   ├── extension.test.ts
    │   ├── commands.test.ts
    │   └── services/
    │       └── service-name.test.ts
    └── runTest.ts
```

### Test Grouping
```typescript
suite('Feature Group', () => {
    setup(() => {
        // Setup for all tests in this group
    });

    teardown(() => {
        // Cleanup after all tests in this group
    });

    test('should perform action', async () => {
        // Test implementation
    });
});
```

## Best Practices

### 1. Test Setup
- Use clean workspace for each test
- Reset extension state
- Clean up test files
- Handle async operations properly

### 2. File Operations
- Use temporary directories
- Clean up after tests
- Handle file paths correctly
- Check file existence

### 3. Command Testing
- Wait for command completion
- Verify command results
- Handle command errors
- Check UI updates

### 4. UI Testing
- Wait for UI updates
- Check visible elements
- Verify user interactions
- Handle notifications

## Common Patterns

### 1. Testing Workspace Changes
```typescript
test('Should handle workspace changes', async () => {
    // Create test workspace
    const workspaceEdit = new vscode.WorkspaceEdit();
    const filePath = vscode.Uri.file('/test/file.txt');
    workspaceEdit.createFile(filePath);
    
    // Apply changes
    await vscode.workspace.applyEdit(workspaceEdit);
    
    // Verify
    const exists = await vscode.workspace.fs.stat(filePath);
    assert.ok(exists);
});
```

### 2. Testing UI Interactions
```typescript
test('Should show quick pick', async () => {
    // Setup quick pick response
    const quickPick = await vscode.window.showQuickPick(['Option 1', 'Option 2']);
    
    // Simulate selection
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify
    assert.strictEqual(quickPick, 'Option 1');
});
```

### 3. Testing Extension Settings
```typescript
test('Should respect settings', async () => {
    // Update settings
    await vscode.workspace.getConfiguration('roo-code')
        .update('setting', 'value', vscode.ConfigurationTarget.Global);
    
    // Verify
    const config = vscode.workspace.getConfiguration('roo-code');
    assert.strictEqual(config.get('setting'), 'value');
});
```

## Running Tests

### Commands
```bash
# Run all integration tests
npm run test:integration

# Run specific test file
npm run test:integration -- --grep "test name"

# Run with debugger
npm run test:integration -- --debug
```

### Debug Configuration
```json
{
    "type": "node",
    "request": "launch",
    "name": "Integration Tests",
    "program": "${workspaceFolder}/out/test/runTest.js",
    "args": ["--extensionDevelopmentPath=${workspaceFolder}"],
    "outFiles": ["${workspaceFolder}/out/test/**/*.js"]
}
```

## Troubleshooting

### Common Issues

1. **Test Timeout**
   - Increase timeout in test configuration
   - Check for hanging promises
   - Verify async operations complete

2. **File System Errors**
   - Use proper path separators
   - Clean up test files
   - Handle file permissions

3. **UI Interaction Failures**
   - Add appropriate delays
   - Wait for UI updates
   - Check element visibility

## Resources

- [VSCode Testing Documentation](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- [Integration Test Examples](../../../src/test/suite/)
- [Test Runner Configuration](../../../src/test/runTest.ts)