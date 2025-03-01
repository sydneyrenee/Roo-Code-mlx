# VS Code Test Configuration

This document provides detailed information about the `.vscode-test.json` configuration file used for running tests in the Roo Code project.

## Overview

The `.vscode-test.json` file defines test configurations for the `@vscode/test-cli` tool, which is used to run tests in a VS Code environment. Each configuration in this file represents a different test suite or group of tests.

## Configuration Structure

The `.vscode-test.json` file contains an array of test configurations, each with the following structure:

```json
{
  "label": "testLabel",
  "files": "path/to/test/files",
  "workspaceFolder": "path/to/workspace",
  "mocha": {
    "ui": "tdd",
    "timeout": 30000,
    "color": true
  },
  "launchArgs": [
    "--enable-proposed-api=RooVeterinaryInc.roo-cline",
    "src/test/workspace"
  ],
  "debug": true,
  "verbose": true
}
```

### Configuration Properties

| Property | Description |
|----------|-------------|
| `label` | A unique identifier for the test configuration |
| `files` | Path(s) to the test files to run (string or array of strings) |
| `workspaceFolder` | The workspace folder to use for the tests |
| `extensionTestsPath` | Path to the extension test runner (optional) |
| `mocha` | Mocha configuration options |
| `launchArgs` | Arguments to pass to VS Code when launching |
| `debug` | Whether to enable debugging |
| `verbose` | Whether to enable verbose output |

## Available Test Configurations

The following test configurations are defined in the `.vscode-test.json` file:

### 1. basicTests

```bash
npx @vscode/test-cli --label basicTests
```

Runs basic tests from `out/test/suite/mocha-test.js`.

### 2. coreTests

```bash
npx @vscode/test-cli --label coreTests
```

Runs core functionality tests:
- `out/test/suite/basic.test.js`
- `out/test/suite/simple.test.js`
- `out/test/suite/example.test.js`
- `out/test/suite/task.test.js`
- `out/test/suite/modes.test.js`

### 3. extensionTests

```bash
npx @vscode/test-cli --label extensionTests
```

Runs extension-specific tests from `out/test/suite/extension.test.js`.

### 4. coreComponentTests

```bash
npx @vscode/test-cli --label coreComponentTests
```

Runs tests for core components:
- `out/test/suite/core/Cline.test.js`
- `out/test/suite/core/CodeActionProvider.test.js`
- `out/test/suite/core/EditorUtils.test.js`
- `out/test/suite/core/mode-validator.test.js`

### 5. allTests

```bash
npx @vscode/test-cli --label allTests
```

Runs all tests defined in the other configurations.

## Running Tests

You can run tests using the `@vscode/test-cli` tool:

```bash
# Run all tests
npx @vscode/test-cli

# Run a specific test configuration
npx @vscode/test-cli --label coreTests

# Run with specific VS Code version
npx @vscode/test-cli --version insiders
```

## Integration with npm Scripts

The test configurations are integrated with npm scripts in `package.json`:

```bash
# Run all tests
npm test

# Run VS Code extension tests
npm run test:vscode
```

## Additional Resources

- [VS Code Test Runner Guide](./vscode-test-runner.md)
- [Testing Overview](./testing-overview.md)
- [Build Process Documentation](../build-process.md)