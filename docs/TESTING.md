# Testing Guide

## Test Types

### 1. Unit Tests
- Located in test/suite/core/
- Test single units of code using VS Code Testing API
- Focus on individual components and utilities
- Fast execution

### 2. Integration Tests
- Located in test/suite/integration/
- Test multiple components working together
- Uses VS Code Testing API
- Tests extension features and VS Code integration
- Focus on end-to-end functionality

### 3. Service Tests
- Located in test/suite/services/
- Test service boundaries and external integrations
- Uses VS Code Testing API
- Mix of unit and integration testing approaches

## Directory Structure
```
src/test/
├── suite/
│   ├── core/               # Core unit tests
│   │   ├── Cline.test.ts
│   │   └── mode-validator.test.ts
│   ├── services/          # Service tests
│   │   └── api.test.ts
│   ├── integration/       # Integration tests
│   │   └── extension.test.ts
│   └── testUtils.ts       # Shared test utilities
```

## Test Organization

### File Naming
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

## Best Practices

### 1. Test Isolation
- Each test should be independent
- Clean up after each test
- Use proper setup/teardown

### 2. Test Discovery
- Implement proper test discovery patterns
- Use workspace events for active discovery
- Configure resolveHandler for lazy loading

### 3. Assertions
- Use VS Code's assert module
- Test edge cases
- Test error conditions
- Leverage VS Code's testing capabilities for rich output

### 4. Documentation
- README.md in test directories
- Clear test descriptions
- Setup instructions

## Running Tests

### Using VS Code Test Explorer
1. Open the Testing view in VS Code
2. Navigate through test hierarchy
3. Run individual tests or test suites
4. View test results and output

### Using Command Line
```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration
```

### Debug Tests
1. Set breakpoints in test files
2. Use VS Code's debug view
3. Select "Extension Tests" launch configuration
4. Run tests with debugger attached

## Migration Status
For detailed information about the migration to VS Code Testing API, refer to:
- [Test Migration Plan](technical/testing/test-migration-plan.md)
- [VS Code Testing API Guide](https://code.visualstudio.com/api/extension-guides/testing)
- [VS Code API Reference](https://code.visualstudio.com/api/references/vscode-api)