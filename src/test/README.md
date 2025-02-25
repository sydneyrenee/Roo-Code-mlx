# Roo Code Test Documentation

Welcome to the Roo Code test documentation. This guide will help you find the right resources for testing your contributions.

## Quick Links

- [Contributing Guidelines](../../CONTRIBUTING.md) - Start here for test organization and best practices
- [Jest Unit Tests](../jest-tests.md) - Guide for writing and running unit tests
- [VSCode Integration Tests](./VSCODE_INTEGRATION_TESTS.md) - Guide for integration testing
- [Test Templates](../../.github/TEMPLATES/TEST_TEMPLATE.md) - Templates for new test files

## Test Types

### 1. Unit Tests (Jest)
- **Location**: `src/**/__tests__/`
- **Purpose**: Test individual components
- **Documentation**: [Jest Tests Guide](../jest-tests.md)
- **Run Command**: `npm test`

### 2. Integration Tests
- **Location**: `src/test/suite/`
- **Purpose**: Test VSCode integration
- **Documentation**: [Integration Tests Guide](./VSCODE_INTEGRATION_TESTS.md)
- **Run Command**: `npm run test:integration`

### 3. Service Tests
- **Location**: `src/test/suite/services/`
- **Purpose**: Test service boundaries
- **Template**: [Service Test Template](../../.github/TEMPLATES/TEST_TEMPLATE.md)
- **Examples**: See service-specific README files

## Directory Structure

```
src/
├── services/           # Service implementations
│   └── service-name/   # Individual service
│       └── __tests__/ # Unit tests
├── test/
│   ├── suite/         # Integration tests
│   │   └── services/  # Service integration tests
│   │       └── service-name/
│   │           ├── feature.test.ts
│   │           └── README.md
│   └── README.md      # This file
└── jest-tests.md      # Jest documentation
```

## Getting Started

1. **New to Testing?**
   - Read [Contributing Guidelines](../../CONTRIBUTING.md)
   - Check test templates
   - Review existing tests

2. **Adding Service Tests?**
   - Use [Test Template](../../.github/TEMPLATES/TEST_TEMPLATE.md)
   - Follow service test structure
   - Add service README

3. **Running Tests**
   ```bash
   # Run all tests
   npm test

   # Run integration tests
   npm run test:integration

   # Run specific tests
   npx jest path/to/test
   ```

## Test Organization

### Unit Tests
- Located next to implementation
- Focus on single components
- Heavy use of mocking
- Fast execution

### Integration Tests
- Located in test/suite/
- Test VSCode features
- Minimal mocking
- Real VSCode instance

### Service Tests
- Located in test/suite/services/
- Test service boundaries
- Mix of unit and integration
- Service-specific README

## Coverage Requirements

All tests should maintain:
- Statements: 80%
- Branches: 80%
- Functions: 80%
- Lines: 80%

Check coverage:
```bash
npm test -- --coverage
```

## Best Practices

1. **Test Organization**
   - Group related tests
   - Clear descriptions
   - Independent tests
   - Follow AAA pattern

2. **Mocking**
   - Mock external dependencies
   - Reset between tests
   - Document mock behavior
   - Use __mocks__ directory

3. **Assertions**
   - Be specific
   - Test edge cases
   - Handle errors
   - Include timeouts

4. **Documentation**
   - Update README files
   - Document patterns
   - Include examples
   - Explain setup

## Common Issues

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

## Need Help?

1. Check documentation:
   - [Contributing Guidelines](../../CONTRIBUTING.md)
   - [Jest Tests](../jest-tests.md)
   - [Integration Tests](./VSCODE_INTEGRATION_TESTS.md)

2. Review examples:
   - Existing service tests
   - Test templates
   - Mock examples

3. Get support:
   - Open an issue
   - Tag with 'question'
   - Include relevant code

## Contributing

1. Follow guidelines
2. Use templates
3. Add documentation
4. Maintain coverage
5. Submit PR