# Contributing to Roo Code

This guide will help you contribute to the Roo Code VSCode extension, with a focus on testing practices and code organization.

## Test Organization

### Directory Structure

```
src/
├── core/              # Core functionality
│   └── __tests__/     # Core unit tests
├── services/          # Service implementations
│   └── service-name/  # Individual service
│       ├── index.ts   # Service implementation
│       ├── types.ts   # Service types
│       └── __tests__/ # Unit tests
└── test/
    └── suite/         # Integration tests
        ├── core/      # Core integration tests
        │   ├── Cline.test.ts
        │   └── mode-validator.test.ts
        ├── services/  # Service integration tests
        │   └── service-name/
        │       ├── feature.test.ts
        │       └── README.md
        └── integration/ # Integration tests
            └── extension.test.ts
```

### Test Types

#### 1. Unit Tests
- **Location**: `src/**/__tests__/` directories and `src/test/suite/core/`
- **Purpose**: Test individual components in isolation
- **Tools**: Currently using Jest, migrating to VS Code Testing API
- **Examples**: Service methods, utilities
- **Documentation**: [Unit Testing Guide](docs/technical/testing/unit-tests.md)

Example unit test (Jest):
```typescript
// services/utils/__tests__/parser.test.ts
import { parseConfig } from '../parser'

describe('parseConfig', () => {
    it('should parse valid config', () => {
        const result = parseConfig({ key: 'value' })
        expect(result).toBeDefined()
    })

    it('should handle invalid input', () => {
        expect(() => parseConfig(null)).toThrow()
    })
})
```

Example unit test (VS Code Testing API):
```typescript
// src/test/suite/core/parser.test.ts
import * as assert from 'assert';
import * as vscode from 'vscode';
import { parseConfig } from '../../../services/utils/parser';

const testController = vscode.test.createTestController('parserTests', 'Parser Tests');

// Create test hierarchy
const rootTest = testController.createTestItem('root', 'Parser Tests', vscode.Uri.file(__filename));
testController.items.add(rootTest);

// Add test cases
rootTest.children.add(
    createTest('valid-config', 'should parse valid config', async run => {
        const result = parseConfig({ key: 'value' });
        assert.ok(result);
        run.passed();
    })
);

rootTest.children.add(
    createTest('invalid-input', 'should handle invalid input', async run => {
        try {
            parseConfig(null);
            run.failed(new Error('Expected function to throw'));
        } catch (e) {
            run.passed();
        }
    })
);
```

#### 2. Integration Tests (VS Code Test Runner)
- **Location**: `test/suite/integration/`
- **Purpose**: Test VSCode integration and extension features
- **Tools**: VS Code Testing API, @vscode/test-electron
- **Examples**: Extension activation, commands, UI interactions
- **Documentation**: [Integration Testing Guide](docs/technical/testing/integration-tests.md)

Example integration test:
```typescript
// test/suite/integration/extension.test.ts
import * as assert from 'assert';
import * as vscode from 'vscode';

const testController = vscode.test.createTestController('extensionTests', 'Extension Tests');

// Create test hierarchy
const rootTest = testController.createTestItem('root', 'Extension Tests', vscode.Uri.file(__filename));
testController.items.add(rootTest);

// Add test cases
rootTest.children.add(
    createTest('activation', 'Extension should activate', async run => {
        const ext = vscode.extensions.getExtension('rooveterinaryinc.roo-cline');
        await ext?.activate();
        assert.ok(ext?.isActive);
        run.passed();
    })
);
```

#### 3. Service Tests
- **Location**: `test/suite/services/`
- **Purpose**: Test service boundaries and integration
- **Tools**: VS Code Testing API
- **Documentation**: [Service Testing Guide](docs/technical/testing/service-tests.md)
- **Examples**: API integration, caching, state management
- **Organization**: Contract tests, integration tests, boundary tests

Example service test:
```typescript
// test/suite/services/cache/cache-tracker.test.ts
import * as assert from 'assert';
import * as vscode from 'vscode';
import { CacheTracker } from '../../../../services/cache/cache-tracker';

const testController = vscode.test.createTestController('cacheTests', 'Cache Tests');

// Create test hierarchy
const rootTest = testController.createTestItem('root', 'Cache Tests', vscode.Uri.file(__filename));
testController.items.add(rootTest);

// Add test cases
rootTest.children.add(
    createTest('track-usage', 'should track cache usage', async run => {
        const tracker = new CacheTracker();
        await tracker.trackUsage('request-id', {
            input_tokens: 100,
            cache_hits: 50
        });
        const metrics = tracker.getMetrics('request-id');
        assert.strictEqual(metrics.hits, 50);
        run.passed();
    })
);
```

### Documentation Requirements

#### 1. Service Documentation (README.md)
Each service directory should include:
- Service purpose and responsibilities
- API documentation
- Dependencies and requirements
- Test coverage requirements
- Example usage

Example service README:
```markdown
# Cache Service

## Purpose
Manages caching of API responses for improved performance.

## API
- `trackUsage(requestId, metrics)`: Track cache usage
- `getMetrics(requestId)`: Get cache metrics

## Testing
- Unit tests: Cache operations
- Integration tests: Cache persistence
- Coverage: >80% required
```

#### 2. Test Documentation
Each test file should include:
- Clear test descriptions
- Setup and teardown explanations
- Test data organization
- Mock configurations

Example test documentation:
```typescript
/**
 * Tests for the cache tracking system.
 * 
 * Setup:
 * - Creates temporary cache directory
 * - Initializes mock metrics
 * 
 * Teardown:
 * - Cleans up temporary files
 * - Resets mock data
 */
const testController = vscode.test.createTestController('cacheTests', 'Cache Tests');
// Tests follow...
```

### Best Practices

#### 1. Test Organization
- Group related tests using test hierarchies
- Use clear, descriptive test names
- Keep tests independent
- Follow AAA pattern (Arrange, Act, Assert)

```typescript
const testController = vscode.test.createTestController('userTests', 'User Tests');

// Create test hierarchy
const rootTest = testController.createTestItem('root', 'User Tests', vscode.Uri.file(__filename));
testController.items.add(rootTest);

// Authentication tests
const authTests = testController.createTestItem('auth', 'Authentication Tests', vscode.Uri.file(__filename));
rootTest.children.add(authTests);

// Add test cases
authTests.children.add(
    createTest('valid-credentials', 'should authenticate valid credentials', async run => {
        // Arrange
        const service = new UserService();
        const credentials = { username: 'test', password: 'valid' };

        // Act
        const result = await service.authenticate(credentials);

        // Assert
        assert.strictEqual(result.authenticated, true);
        run.passed();
    })
);
```

#### 2. Mocking
- Mock external dependencies
- Document mock behavior
- Use `__mocks__` directory for module mocks
- Reset mocks between tests

```typescript
// Using VS Code Testing API with mocks
const testController = vscode.test.createTestController('serviceTests', 'Service Tests');
const rootTest = testController.createTestItem('root', 'Service Tests', vscode.Uri.file(__filename));
testController.items.add(rootTest);

rootTest.children.add(
    createTest('api-response', 'should handle API response', async run => {
        // Setup mock
        const apiClient = {
            getData: async () => ({ success: true })
        };
        
        // Create service with mock
        const service = new Service(apiClient);
        
        // Test implementation
        const result = await service.process();
        assert.strictEqual(result.success, true);
        run.passed();
    })
);
```

#### 3. Assertions
- Use VS Code's assert module
- Test edge cases
- Handle async operations properly
- Include error cases

```typescript
// Using VS Code Testing API with assertions
const testController = vscode.test.createTestController('processorTests', 'Processor Tests');
const rootTest = testController.createTestItem('root', 'Processor Tests', vscode.Uri.file(__filename));
testController.items.add(rootTest);

// Valid data test
rootTest.children.add(
    createTest('valid-data', 'should process valid data', async run => {
        const processor = new DataProcessor();
        const result = await processor.process(validData);
        assert.strictEqual(result.status, 'success');
        assert.strictEqual(result.items.length, 2);
        assert.ok(typeof result.items[0].id === 'number');
        assert.ok(typeof result.items[0].name === 'string');
        run.passed();
    })
);

// Invalid data test
rootTest.children.add(
    createTest('invalid-data', 'should handle invalid data', async run => {
        const processor = new DataProcessor();
        try {
            await processor.process(null);
            run.failed(new Error('Expected function to throw'));
        } catch (e) {
            assert.ok(e.message.includes('Invalid data'));
            run.passed();
        }
    })
);
```

#### 4. Test Coverage
- Maintain high coverage (>80%)
- Focus on critical paths
- Include error handling
- Test edge cases

```bash
# Run coverage report
npm test -- --coverage

# Coverage requirements
- Statements: 80%
- Branches: 80%
- Functions: 80%
- Lines: 80%
```

### Pull Request Guidelines

#### 1. Test Requirements
- Add tests for new features
- Update affected tests
- Maintain coverage levels
- Include test documentation

#### 2. Review Process
- Run full test suite
- Check coverage reports
- Review test organization
- Verify documentation

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Run tests: `npm test`
4. Create feature branch
5. Add tests and implementation
6. Submit pull request

## Testing Framework Migration

The project is currently migrating from Jest to VS Code's native Testing API, which provides:
- Better integration with VS Code
- Richer test discovery and execution
- Improved result reporting
- Native debugging capabilities

For detailed information about the migration, refer to:
- [Test Migration Plan](docs/technical/testing/test-migration-plan.md)
- [VS Code Test Runner Guide](docs/technical/testing/vscode-test-runner.md)

## Resources

- [Testing Guide](docs/TESTING.md)
- [Unit Testing Guide](docs/technical/testing/unit-tests.md)
- [Integration Testing Guide](docs/technical/testing/integration-tests.md)
- [Service Testing Guide](docs/technical/testing/service-tests.md)
- [VS Code Test Runner Guide](docs/technical/testing/vscode-test-runner.md)
- [VS Code Testing API Guide](https://code.visualstudio.com/api/extension-guides/testing)

## Questions?

- Open an issue for questions
- Tag with 'question' label
- Include relevant code/tests