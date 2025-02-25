# Unit Testing Guide

This guide covers writing and running unit tests for Roo Code using Jest.

## Overview

Unit tests in Roo Code:
- Use Jest as the testing framework
- Are located next to the implementation in `__tests__` directories
- Focus on testing individual components in isolation
- Heavily utilize mocking for dependencies

## Writing Unit Tests

### Basic Test Structure

```typescript
describe('ComponentName', () => {
    beforeEach(() => {
        // Setup for each test
    });

    afterEach(() => {
        // Cleanup after each test
        jest.resetAllMocks();
    });

    it('should perform specific action', () => {
        // Arrange
        const input = 'test';

        // Act
        const result = someFunction(input);

        // Assert
        expect(result).toBe('expected');
    });
});
```

### Mocking

#### 1. Function Mocks
```typescript
jest.mock('../path/to/module', () => ({
    someFunction: jest.fn().mockReturnValue('mocked value')
}));
```

#### 2. Class Mocks
```typescript
jest.mock('../path/to/class', () => {
    return jest.fn().mockImplementation(() => ({
        method: jest.fn().mockResolvedValue('result')
    }));
});
```

#### 3. VSCode API Mocks
```typescript
jest.mock('vscode', () => ({
    window: {
        showInformationMessage: jest.fn()
    },
    workspace: {
        getConfiguration: jest.fn()
    }
}), { virtual: true });
```

### Async Testing

```typescript
it('should handle async operations', async () => {
    // Arrange
    const mockData = { result: 'success' };
    jest.spyOn(api, 'fetch').mockResolvedValue(mockData);

    // Act
    const result = await someAsyncFunction();

    // Assert
    expect(result).toEqual(mockData);
    expect(api.fetch).toHaveBeenCalled();
});
```

## Test Organization

### File Structure
```
src/
└── component/
    ├── index.ts
    └── __tests__/
        └── index.test.ts
```

### Test Grouping
```typescript
describe('ComponentName', () => {
    describe('methodName', () => {
        describe('when condition', () => {
            it('should behavior', () => {
                // Test
            });
        });
    });
});
```

## Best Practices

### 1. Test Isolation
- Each test should be independent
- Reset mocks between tests
- Clean up any side effects

### 2. Naming Conventions
- Describe blocks: component/feature name
- It blocks: specific behavior
- Use clear, descriptive names

### 3. Assertions
- Test one concept per test
- Make specific assertions
- Include edge cases
- Test error conditions

### 4. Mocking
- Mock at the lowest level possible
- Document mock behavior
- Verify mock calls when relevant
- Reset mocks after each test

## Common Patterns

### 1. Testing Error Handling
```typescript
it('should handle errors', async () => {
    // Arrange
    const error = new Error('Test error');
    jest.spyOn(api, 'fetch').mockRejectedValue(error);

    // Act & Assert
    await expect(someAsyncFunction()).rejects.toThrow('Test error');
});
```

### 2. Testing Event Handlers
```typescript
it('should handle events', () => {
    // Arrange
    const handler = jest.fn();
    const component = new Component();
    component.on('event', handler);

    // Act
    component.emit('event', 'data');

    // Assert
    expect(handler).toHaveBeenCalledWith('data');
});
```

### 3. Testing State Changes
```typescript
it('should update state', () => {
    // Arrange
    const component = new Component();
    
    // Act
    component.setState({ value: 'new' });

    // Assert
    expect(component.getState()).toEqual({ value: 'new' });
});
```

## Running Tests

### Basic Commands
```bash
# Run all tests
npm test

# Run specific test file
npm test path/to/test

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

### Coverage Requirements
- Statements: 80%
- Branches: 80%
- Functions: 80%
- Lines: 80%

## Troubleshooting

### Common Issues

1. **Mocks Not Working**
   - Check mock path is correct
   - Verify mock is before test
   - Check for proper reset

2. **Async Test Failures**
   - Use proper async/await
   - Check promise chains
   - Verify timeout settings

3. **Coverage Issues**
   - Check for untested branches
   - Verify error paths
   - Test edge cases

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Examples](../../../src/__tests__/)
- [Mock Examples](../../../src/__mocks__)