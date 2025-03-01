# Testing Documentation Overview

This document provides a high-level overview of the testing documentation available in the Roo Code project. For comprehensive testing guidelines, please refer to the [main Testing Guide](../../TESTING.md).

## Available Documentation

- [Testing Guide](../../TESTING.md) - Main testing guide with comprehensive information
- [Testing Frameworks Overview](./testing-frameworks.md) - Detailed explanation of testing frameworks
- [VS Code Test Runner Guide](./vscode-test-runner.md) - Guide for the VS Code test runner
- [VS Code Testing API Guide](./vscode-testing-api.md) - Guide for the VS Code Testing API
- [VS Code Test Configuration](./vscode-test-config.md) - Detailed documentation of the .vscode-test.json configuration
- [Unit Testing Guide](./unit-tests.md) - Guide for writing unit tests
- [Integration Testing Guide](./integration-tests.md) - Guide for writing integration tests
- [Service Testing Guide](./service-tests.md) - Guide for writing service tests

## Quick Reference

### Test Types

| Type | Location | Purpose | Documentation |
|------|----------|---------|--------------|
| Unit Tests | `src/**/__tests__/` | Test individual components | [Unit Testing Guide](./unit-tests.md) |
| Integration Tests | `src/test/suite/` | Test VSCode integration | [Integration Testing Guide](./integration-tests.md) |
| Service Tests | `src/test/suite/services/` | Test service boundaries | [Service Testing Guide](./service-tests.md) |

### Testing Frameworks

| Framework | Purpose | Documentation |
|-----------|---------|--------------|
| VS Code Testing API | Interactive testing in VS Code | [VS Code Testing API Guide](./vscode-testing-api.md) |
| @vscode/test-cli | Command-line and CI/CD testing | [VS Code Test Runner Guide](./vscode-test-runner.md) |

### Common Commands

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run specific test configuration
npx @vscode/test-cli --label basicTests
```

### Key Requirements

- Test coverage: 80% (statements, branches, functions, lines)
- Test isolation: Each test should be independent
- Documentation: Each service should have a README.md

## Directory Structure

```
docs/technical/testing/
├── testing-frameworks.md   # Testing frameworks overview
├── testing-overview.md     # This file
├── unit-tests.md           # Unit testing guide
├── integration-tests.md    # Integration testing guide
├── service-tests.md        # Service testing guide
├── vscode-test-runner.md   # VS Code test runner guide
├── vscode-testing-api.md   # VS Code Testing API guide
└── vscode-test-config.md   # VS Code test configuration guide
```

For detailed information about testing practices, requirements, and guidelines, please refer to the [main Testing Guide](../../TESTING.md).