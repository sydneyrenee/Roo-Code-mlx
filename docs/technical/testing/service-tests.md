# Service Testing Guide

This guide covers testing service boundaries and interactions in Roo Code.

## Overview

Service tests in Roo Code:
- Test service boundaries and interactions
- Located in `src/test/suite/services/`
- Combine unit and integration testing approaches
- Focus on service contracts and behavior

## Service Test Types

### 1. Contract Tests
- Verify service interface compliance
- Test input/output contracts
- Validate error handling
- Check type safety

### 2. Integration Tests
- Test service interactions
- Verify dependency handling
- Test real-world scenarios
- Check error propagation

### 3. Boundary Tests
- Test service limits
- Verify edge cases
- Check resource handling
- Test performance boundaries

## Writing Service Tests

### Basic Service Test Structure

```typescript
describe('ServiceName', () => {
    let service: Service;
    let dependencies: Dependencies;

    beforeEach(() => {
        dependencies = {
            dependency1: mock(),
            dependency2: mock()
        };
        service = new Service(dependencies);
    });

    describe('contract', () => {
        it('should implement required interface', () => {
            // Verify interface implementation
            expect(service).toHaveProperty('method1');
            expect(service).toHaveProperty('method2');
        });
    });

    describe('integration', () => {
        it('should interact with dependencies', async () => {
            // Test dependency interaction
            await service.method1();
            expect(dependencies.dependency1.method).toHaveBeenCalled();
        });
    });

    describe('boundaries', () => {
        it('should handle edge cases', () => {
            // Test edge cases
            expect(() => service.method2(invalidInput))
                .toThrow(ValidationError);
        });
    });
});
```

## Test Organization

### Directory Structure
```
src/
└── test/
    └── suite/
        └── services/
            └── service-name/
                ├── contract.test.ts
                ├── integration.test.ts
                ├── boundaries.test.ts
                └── README.md
```

### Service-Specific README
Each service test directory should include a README.md:
```markdown
# Service Name Tests

## Test Categories
1. Contract Tests
2. Integration Tests
3. Boundary Tests

## Setup Requirements
- Dependencies
- Configuration
- Resources

## Running Tests
- Commands
- Environment
- Prerequisites
```

## Best Practices

### 1. Test Independence
- Isolate tests from each other
- Clean up resources
- Reset state between tests
- Use fresh instances

### 2. Dependency Management
- Mock external services
- Use dependency injection
- Document dependencies
- Handle async operations

### 3. Error Handling
- Test error conditions
- Verify error propagation
- Check error recovery
- Test cleanup on errors

### 4. Resource Management
- Clean up resources
- Handle timeouts
- Check memory usage
- Monitor performance

## Common Patterns

### 1. Testing Service Creation
```typescript
describe('Service Creation', () => {
    it('should create with valid config', () => {
        const config = { /* valid config */ };
        const service = new Service(config);
        expect(service).toBeInstanceOf(Service);
    });

    it('should throw on invalid config', () => {
        const config = { /* invalid config */ };
        expect(() => new Service(config)).toThrow(ConfigError);
    });
});
```

### 2. Testing Service Interactions
```typescript
describe('Service Interactions', () => {
    it('should interact with dependency', async () => {
        const mockDep = {
            method: jest.fn().mockResolvedValue('result')
        };
        const service = new Service(mockDep);
        
        await service.operation();
        
        expect(mockDep.method).toHaveBeenCalled();
    });
});
```

### 3. Testing Resource Management
```typescript
describe('Resource Management', () => {
    it('should clean up resources', async () => {
        const service = new Service();
        const resource = await service.acquireResource();
        
        await service.releaseResource(resource);
        
        expect(await service.getActiveResources()).toHaveLength(0);
    });
});
```

## Running Tests

### Commands
```bash
# Run all service tests
npm run test:services

# Run specific service tests
npm run test:services -- --grep "ServiceName"

# Run with coverage
npm run test:services -- --coverage
```

## Service Test Template

```typescript
import { Service } from '../service';
import { Dependencies } from '../types';

describe('ServiceName', () => {
    let service: Service;
    let dependencies: Dependencies;

    beforeEach(() => {
        dependencies = createMockDependencies();
        service = new Service(dependencies);
    });

    afterEach(async () => {
        await service.cleanup();
    });

    describe('Contract', () => {
        // Contract tests
    });

    describe('Integration', () => {
        // Integration tests
    });

    describe('Boundaries', () => {
        // Boundary tests
    });

    describe('Resources', () => {
        // Resource management tests
    });
});
```

## Troubleshooting

### Common Issues

1. **Resource Leaks**
   - Check cleanup in afterEach
   - Monitor resource usage
   - Verify cleanup on errors

2. **Dependency Issues**
   - Check mock setup
   - Verify dependency injection
   - Check async operations

3. **Performance Issues**
   - Profile test execution
   - Check resource usage
   - Monitor test duration

## Resources

- [Service Test Examples](../../../src/test/suite/services/)
- [Test Templates](../../../.github/TEMPLATES/TEST_TEMPLATE.md)
- [Service Documentation](../../services/README.md)