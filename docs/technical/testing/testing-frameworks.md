# VS Code Testing Frameworks

This document explains the relationship between the different testing frameworks used in the Roo Code project.

## Overview

The project uses two complementary testing frameworks:

1. **VS Code Testing API**: A built-in API for creating and running tests within VS Code
2. **@vscode/test-cli**: A command-line tool for running tests in a VS Code environment

These frameworks serve different purposes but work together to provide a comprehensive testing solution.

## VS Code Testing API

The VS Code Testing API is a built-in API that allows extensions to:

- Discover tests in the workspace
- Run tests and report results
- Display test results in the Test Explorer view
- Add test decorations to the editor
- Run tests from commands and context menus

This API is primarily used for tests that need to interact with VS Code directly, such as integration tests and UI tests.

### Key Components

- **TestController**: Creates and manages tests
- **TestItem**: Represents a test or test suite
- **TestRun**: Represents a test run and reports results
- **TestRunProfile**: Defines how tests are run

### Example Usage

```typescript
const controller = vscode.tests.createTestController('myTests', 'My Tests');
const rootTest = controller.createTestItem('root', 'Root Tests');
controller.items.add(rootTest);

// Add a test
rootTest.children.add(
    controller.createTestItem('test1', 'Test 1')
);

// Create a run profile
controller.createRunProfile(
    'Run',
    vscode.TestRunProfileKind.Run,
    async (request, token) => {
        // Run tests
    }
);
```

## @vscode/test-cli

The @vscode/test-cli package is a command-line tool that:

- Launches a VS Code instance
- Runs tests in that instance
- Reports test results
- Exits with an appropriate exit code

This tool is primarily used for running tests in CI/CD pipelines and from npm scripts.

### Configuration

The @vscode/test-cli tool is configured using a `.vscode-test.js`, `.vscode-test.json`, or `.vscode-test.mjs` file in the project root. This file defines:

- Which test files to run
- The workspace to open
- Mocha options
- VS Code launch arguments

### Multiple Test Configurations

One of the key features of @vscode/test-cli is the ability to define multiple test configurations in a single file. This allows you to:

- Organize tests by type or functionality
- Apply different settings to different tests
- Run specific test groups independently

### Example Configuration

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
  }
]
```

## How They Work Together

The VS Code Testing API and @vscode/test-cli work together in the following ways:

1. **Test Discovery**: The VS Code Testing API discovers tests in the workspace, while @vscode/test-cli uses file patterns to find test files.

2. **Test Execution**: The VS Code Testing API runs tests within the VS Code instance, while @vscode/test-cli launches a new VS Code instance to run tests.

3. **Test Reporting**: The VS Code Testing API reports results to the Test Explorer view, while @vscode/test-cli reports results to the console.

4. **Integration**: Tests written for the VS Code Testing API can be run using @vscode/test-cli, allowing for both interactive and automated testing.

## When to Use Each Framework

- **VS Code Testing API**: Use for interactive testing during development, especially for tests that need to interact with VS Code UI elements.

- **@vscode/test-cli**: Use for automated testing in CI/CD pipelines and for running tests from npm scripts.

## Additional Resources

- [VS Code Testing API Guide](./vscode-testing-api.md)
- [VS Code Test Runner Guide](./vscode-test-runner.md)
- [Integration Testing Guide](./integration-tests.md)
- [Unit Testing Guide](./unit-tests.md)