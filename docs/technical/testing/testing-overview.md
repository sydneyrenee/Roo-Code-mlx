# Testing Documentation

Welcome to the Roo Code testing documentation. This guide provides comprehensive information about testing practices, requirements, and guidelines.

## Test Types

### [Unit Tests](./unit-tests.md)
- Located in `src/**/__tests__/`
- Test individual components
- Heavy use of mocking
- Fast execution

### [Integration Tests](./integration-tests.md)
- Located in `src/test/suite/`
- Test VSCode integration
- Minimal mocking
- Real VSCode instance

### [Service Tests](./service-tests.md)
- Located in `src/test/suite/services/`
- Test service boundaries
- Mix of unit and integration
- Service-specific documentation

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
```

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

```bash
# Run all tests
npm test

# Run integration tests
npm run test:integration

# Run specific tests
npx jest path/to/test
```

## Best Practices

### 1. Test Organization
- Group related tests
- Clear descriptions
- Independent tests
- Follow AAA pattern (Arrange, Act, Assert)

### 2. Mocking
- Mock external dependencies
- Reset between tests
- Document mock behavior
- Use __mocks__ directory

### 3. Assertions
- Be specific
- Test edge cases
- Handle errors
- Include timeouts

### 4. Documentation
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

## Getting Help

1. Review documentation:
   - [Unit Testing Guide](./unit-tests.md)
   - [Integration Testing Guide](./integration-tests.md)
   - [Service Testing Guide](./service-tests.md)

2. Check examples:
   - Existing test files
   - Mock examples
   - Test templates

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

For detailed information about specific test types, please refer to their respective documentation:
- [Unit Testing Guide](./unit-tests.md)
- [Integration Testing Guide](./integration-tests.md)
- [Service Testing Guide](./service-tests.md)