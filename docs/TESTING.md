# Testing Guide

## Test Types

### 1. Unit Tests
- Located in `src/**/__tests__/` directories and test/suite/core/
- Test single units of code
- Focus on individual components and utilities
- Heavy use of mocking for dependencies
- Fast execution
- Using VS Code Testing API and @vscode/test-cli

### 2. Integration Tests
- Located in test/suite/integration/
- Test multiple components working together
- Uses VS Code Testing API
- Tests extension features and VS Code integration
- Minimal mocking, uses real VSCode instance
- Focus on end-to-end functionality

### 3. Service Tests
- Located in test/suite/services/
- Test service boundaries and external integrations
- Uses VS Code Testing API
- Mix of unit and integration testing approaches
- Organized into:
  * Contract Tests - Verify service interface compliance
  * Integration Tests - Test service interactions
  * Boundary Tests - Test service limits and edge cases

## Directory Structure
```
src/
├── core/              # Core functionality
│   └── __tests__/     # Core unit tests
├── services/          # Service implementations
│   └── service-name/  # Individual service
│       └── __tests__/ # Unit tests
└── test/
    └── suite/
        ├── core/               # Core integration tests
        │   ├── Cline.test.ts
        │   └── mode-validator.test.ts
        ├── services/          # Service tests
        │   └── api.test.ts
        ├── integration/       # Integration tests
        │   └── extension.test.ts
        └── testUtils.ts       # Shared test utilities
```

## Test Organization

### File Naming
- Unit tests: `__tests__/component.test.ts`
- Core tests: `suite/core/component.test.ts`
- Integration: `suite/integration/feature.test.ts`
- Services: `suite/services/service-name.test.ts`

### Test Structure
```typescript
const testController = vscode.test.createTestController('myTestSuite', 'My Test Suite');

// Create test hierarchy
const rootTest = testController.createTestItem('root', 'Component Tests', uri);
const featureTest = testController.createTestItem('feature', 'Feature Tests', uri);
rootTest.children.add(featureTest);

// Add test cases
featureTest.children.add(
    createTest('test1', 'should work', async run => {
        assert.strictEqual(result, true);
        run.passed(test);
    })
);
```

## Testing Frameworks

The project uses two complementary testing frameworks:

### 1. VS Code Testing API
- Used for tests that need to interact with VS Code
- Provides rich test discovery and execution
- Enables tests to be run from the VS Code Test Explorer
- Supports test decorations and commands

### 2. @vscode/test-cli
- Command-line tool for running tests in a VS Code environment
- Configured via `.vscode-test.js`, `.vscode-test.json`, or `.vscode-test.mjs`
- Supports multiple test configurations
- Enables CI/CD integration

For detailed information about these frameworks, refer to:
- [Testing Frameworks Overview](technical/testing/testing-frameworks.md)
- [VS Code Testing API Guide](technical/testing/vscode-testing-api.md)
- [VS Code Test Runner Guide](technical/testing/vscode-test-runner.md)

## Best Practices

### 1. Test Isolation
- Each test should be independent
- Clean up after each test
- Use proper setup/teardown
- Reset mocks between tests

### 2. Test Discovery
- Implement proper test discovery patterns
- Use workspace events for active discovery
- Configure resolveHandler for lazy loading

### 3. Assertions
- Use VS Code's assert module
- Test edge cases
- Test error conditions
- Leverage VS Code's testing capabilities for rich output
- Include meaningful error messages

### 4. Documentation
- README.md in test directories
- Clear test descriptions
- Setup instructions
- Document patterns and examples

## Coverage Requirements

All tests must maintain:
- Statements: 80%
- Branches: 80%
- Functions: 80%
- Lines: 80%

Check coverage:
```bash
npm test -- --coverage
```

## Running Tests

### Using VS Code Test Explorer
1. Open the Testing view in VS Code
2. Navigate through test hierarchy
3. Run individual tests or test suites
4. View test results and output

### Using Command Line

#### VS Code Testing API
```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run specific test file
npm run test:integration -- --grep "test name"
```

#### @vscode/test-cli
```bash
# Run all test configurations
npx @vscode/test-cli

# Run specific test configuration by label
npx @vscode/test-cli --label basicTests
npx @vscode/test-cli --label coreTests

# Run with specific VS Code version
npx @vscode/test-cli --version insiders

# Get help with available options
npx @vscode/test-cli --help
```

### Debug Tests
1. Set breakpoints in test files
2. Use VS Code's debug view
3. Select "Extension Tests" launch configuration
4. Run tests with debugger attached
5. Use `console.log()` for additional debugging info

## Common Issues and Troubleshooting

### Test Failures
1. Check test isolation
2. Verify mocks
3. Check async operations
4. Review error handling

### Coverage Issues
1. Add missing test cases
2. Check edge cases
3. Include error paths
4. Test async flows

### Integration Test Issues
1. Check VSCode version
2. Verify extension setup
3. Review timeouts
4. Check environment

## Additional Resources
- [Testing Frameworks Overview](technical/testing/testing-frameworks.md)
- [Unit Testing Guide](technical/testing/unit-tests.md)
- [Integration Testing Guide](technical/testing/integration-tests.md)
- [Service Testing Guide](technical/testing/service-tests.md)
- [VS Code Test Runner Guide](technical/testing/vscode-test-runner.md)
- [VS Code Testing API Guide](technical/testing/vscode-testing-api.md)
- [VS Code Testing API Documentation](https://code.visualstudio.com/api/extension-guides/testing)
- [VS Code API Reference](https://code.visualstudio.com/api/references/vscode-api)