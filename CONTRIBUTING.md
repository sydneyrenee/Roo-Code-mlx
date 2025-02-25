# Contributing to Roo Code

This guide will help you contribute to the Roo Code VSCode extension, with a focus on testing practices and code organization.

## Test Organization

### Directory Structure

```
src/
├── services/           # Service implementations
│   └── service-name/   # Individual service
│       ├── index.ts    # Service implementation
│       ├── types.ts    # Service types
│       └── README.md   # Service documentation
├── test/
│   ├── suite/         # Integration tests
│   │   └── services/  # Service integration tests
│   │       └── service-name/
│   │           ├── feature.test.ts
│   │           └── README.md
│   └── __tests__/     # Unit tests
└── __mocks__/         # Global mocks
```

### Test Types

#### 1. Unit Tests (Jest)
- **Location**: Next to implementation in `__tests__` directories
- **Purpose**: Test individual components in isolation
- **Tools**: Jest, mocking
- **Examples**: Service methods, utilities

Example unit test:
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

#### 2. Integration Tests (VSCode Test Runner)
- **Location**: `test/suite/`
- **Purpose**: Test VSCode integration and extension features
- **Tools**: @vscode/test-electron
- **Examples**: Extension activation, commands, UI interactions

Example integration test:
```typescript
// test/suite/extension.test.ts
suite('Extension Test Suite', () => {
    test('Extension should activate', async () => {
        const ext = vscode.extensions.getExtension('rooveterinaryinc.roo-cline')
        await ext?.activate()
        assert.ok(ext?.isActive)
    })
})
```

#### 3. Service Tests
- **Location**: `test/suite/services/`
- **Purpose**: Test service boundaries and integration
- **Documentation**: README.md per service
- **Examples**: API integration, caching, state management

Example service test:
```typescript
// test/suite/services/cache/cache-tracker.test.ts
describe('CacheTracker', () => {
    it('should track cache usage', async () => {
        const tracker = new CacheTracker()
        await tracker.trackUsage('request-id', {
            input_tokens: 100,
            cache_hits: 50
        })
        const metrics = tracker.getMetrics('request-id')
        expect(metrics.hits).toBe(50)
    })
})
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
describe('CacheTracker', () => {
    // Tests follow...
})
```

### Best Practices

#### 1. Test Organization
- Group related tests using `describe` blocks
- Use clear, descriptive test names
- Keep tests independent
- Follow AAA pattern (Arrange, Act, Assert)

```typescript
describe('UserService', () => {
    describe('authentication', () => {
        it('should authenticate valid credentials', async () => {
            // Arrange
            const service = new UserService()
            const credentials = { username: 'test', password: 'valid' }

            // Act
            const result = await service.authenticate(credentials)

            // Assert
            expect(result.authenticated).toBe(true)
        })
    })
})
```

#### 2. Mocking
- Mock external dependencies
- Document mock behavior
- Use `__mocks__` directory for module mocks
- Reset mocks between tests

```typescript
jest.mock('../api-client')

describe('Service', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('should handle API response', async () => {
        apiClient.getData.mockResolvedValue({ success: true })
        // Test implementation
    })
})
```

#### 3. Assertions
- Use specific assertions
- Test edge cases
- Handle async operations properly
- Include error cases

```typescript
describe('DataProcessor', () => {
    it('should process valid data', async () => {
        const result = await processor.process(validData)
        expect(result.status).toBe('success')
        expect(result.items).toHaveLength(2)
        expect(result.items[0]).toMatchObject({
            id: expect.any(Number),
            name: expect.any(String)
        })
    })

    it('should handle invalid data', async () => {
        await expect(processor.process(null))
            .rejects.toThrow('Invalid data')
    })
})
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

## Resources

- [Jest Tests Documentation](src/jest-tests.md)
- [VSCode Integration Tests](src/test/VSCODE_INTEGRATION_TESTS.md)
- [Test Templates](.github/TEMPLATES/TEST_TEMPLATE.md)

## Questions?

- Open an issue for questions
- Tag with 'question' label
- Include relevant code/tests