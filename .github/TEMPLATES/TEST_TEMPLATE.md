# Service Test Template

This template provides a structure for creating service tests in the Roo Code project.

## Directory Structure

```
src/test/suite/services/your-service/
├── README.md                  # Service test documentation
├── feature-name.test.ts      # Feature-specific tests
└── integration.test.ts       # Integration tests
```

## Test File Template

```typescript
/**
 * Tests for YourService feature
 * 
 * These tests verify:
 * - Core functionality
 * - Error handling
 * - Edge cases
 * - Integration with dependencies
 */

import { YourService } from "../../../../services/your-service"
import type { Dependencies } from "../../../../services/your-service/types"

describe("YourService", () => {
    // Test variables
    let service: YourService
    let mockDependencies: jest.Mocked<Dependencies>

    // Common test data
    const testData = {
        validInput: {},
        invalidInput: {},
        expectedOutput: {}
    }

    beforeEach(() => {
        // Setup mocks
        mockDependencies = {
            dependency1: jest.fn(),
            dependency2: jest.fn()
        }

        // Initialize service
        service = new YourService(mockDependencies)
    })

    afterEach(() => {
        // Cleanup
        jest.clearAllMocks()
    })

    describe("mainFeature", () => {
        describe("happy path", () => {
            it("should process valid input correctly", async () => {
                // Arrange
                mockDependencies.dependency1.mockResolvedValue(testData.expectedOutput)

                // Act
                const result = await service.mainFeature(testData.validInput)

                // Assert
                expect(result).toEqual(testData.expectedOutput)
                expect(mockDependencies.dependency1).toHaveBeenCalledWith(testData.validInput)
            })
        })

        describe("error handling", () => {
            it("should handle invalid input", async () => {
                // Arrange
                const expectedError = new Error("Invalid input")

                // Act & Assert
                await expect(service.mainFeature(testData.invalidInput))
                    .rejects.toThrow(expectedError)
            })

            it("should handle dependency failures", async () => {
                // Arrange
                mockDependencies.dependency1.mockRejectedValue(new Error("Network error"))

                // Act & Assert
                await expect(service.mainFeature(testData.validInput))
                    .rejects.toThrow("Network error")
            })
        })

        describe("edge cases", () => {
            it("should handle empty input", async () => {
                // Test empty input
            })

            it("should handle maximum values", async () => {
                // Test maximum values
            })
        })
    })

    describe("integration", () => {
        it("should integrate with other services", async () => {
            // Test integration scenarios
        })
    })
})
```

## README Template

```markdown
# YourService Tests

## Overview
Tests for the YourService implementation, focusing on [main features].

## Test Categories

### 1. Unit Tests
- Feature functionality
- Input validation
- Error handling
- Edge cases

### 2. Integration Tests
- Service interactions
- External dependencies
- State management

## Setup

### Requirements
- Node.js 16+
- Required dependencies
- Environment variables

### Configuration
1. Install dependencies
   ```bash
   npm install
   ```

2. Set up environment
   ```bash
   cp .env.example .env
   ```

### Running Tests
```bash
# Run all service tests
npm test src/test/suite/services/your-service

# Run specific test file
npx jest path/to/test.test.ts
```

## Test Data

### Test Cases
1. Valid inputs
   ```typescript
   const validInput = {
       // Test data
   }
   ```

2. Invalid inputs
   ```typescript
   const invalidInput = {
       // Test data
   }
   ```

### Mock Examples
```typescript
const mockDependency = {
    method: jest.fn().mockResolvedValue(result)
}
```

## Common Patterns

### 1. Dependency Mocking
```typescript
jest.mock("../../../../services/dependency", () => ({
    Dependency: jest.fn().mockImplementation(() => ({
        method: jest.fn()
    }))
}))
```

### 2. Error Handling
```typescript
it("should handle errors", async () => {
    const error = new Error("Test error")
    mockDependency.method.mockRejectedValue(error)
    await expect(service.method()).rejects.toThrow(error)
})
```

### 3. Async Testing
```typescript
it("should handle async operations", async () => {
    const result = await service.asyncMethod()
    expect(result).toBeDefined()
})
```

## Best Practices

1. Test Organization
   - Group related tests
   - Clear descriptions
   - Independent tests

2. Mocking
   - Mock external dependencies
   - Reset mocks between tests
   - Document mock behavior

3. Assertions
   - Be specific
   - Test edge cases
   - Include error cases

4. Documentation
   - Update README
   - Document patterns
   - Include examples

## Coverage Requirements

- Statements: 80%
- Branches: 80%
- Functions: 80%
- Lines: 80%

## Troubleshooting

### Common Issues
1. Test timeouts
   - Increase timeout in jest.config.js
   - Check async operations
   - Verify mock implementations

2. Mock issues
   - Clear mocks between tests
   - Verify mock setup
   - Check import paths

### Debug Tips
1. Use console.log for debugging
2. Set breakpoints in VSCode
3. Use jest --verbose flag
```

## Usage

1. Copy template files to your service test directory
2. Update file names and content for your service
3. Add your specific test cases
4. Update README with service-specific details
5. Verify coverage requirements are met

## Questions?

- Check existing test examples
- Review CONTRIBUTING.md
- Open an issue with questions