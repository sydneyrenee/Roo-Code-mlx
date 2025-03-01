# Test Guidelines Implementation Plan

## 1. Create CONTRIBUTING.md

### File Structure
```markdown
# Contributing to Roo Code

## Test Organization Guidelines

### Directory Structure
```
src/
├── core/              # Core functionality
│   └── __tests__/    # Core unit tests
├── services/         # Service implementations
│   └── service-name/ # Individual service
│       └── README.md # Service documentation
└── test/
    └── suite/        # Integration tests
        └── services/ # Service integration tests
```

### Test Types
1. Unit Tests (VS Code Testing API)
   - Location: Next to implementation in __tests__ directories
   - Purpose: Test individual components
   - Tools: VS Code Testing API
   - Examples: Service methods, utilities

2. Integration Tests (VS Code Testing API)
   - Location: test/suite/
   - Purpose: Test VS Code integration
   - Tools: VS Code Testing API
   - Examples: Extension activation, commands

3. Service Tests (VS Code Testing API)
   - Location: test/suite/services/
   - Purpose: Test service boundaries
   - Documentation: README.md per service
   - Examples: API integration, caching

### Documentation Requirements
1. Service Tests
   - README.md in test directory
   - Test coverage requirements
   - Setup instructions
   - Common patterns

2. Test Files
   - Clear descriptions
   - Setup/teardown
   - Error cases
   - Edge cases

### Best Practices
1. Test Organization
   - Group by feature
   - Clear descriptions
   - Independent tests

2. Test Discovery
   - Implement proper discovery patterns
   - Use workspace events
   - Configure lazy loading

3. Assertions
   - Be specific
   - Test edge cases
   - Handle errors

4. Documentation
   - Update READMEs
   - Document patterns
   - Include examples
```

## 2. Create Service Test Template

### Template Structure
```typescript
// src/test/suite/services/template/service-name.test.ts

import * as vscode from 'vscode';
import { ServiceName } from '../../../../services/service-name';
import type { Dependencies } from '../../../../services/service-name/types';

const testController = vscode.test.createTestController('serviceName', 'Service Name Tests');

// Create root test item
const rootTest = testController.createTestItem('service-tests', 'Service Tests', vscode.Uri.file(__filename));
testController.items.add(rootTest);

// Feature test group
const featureTests = testController.createTestItem('feature-tests', 'Feature Tests', vscode.Uri.file(__filename));
rootTest.children.add(featureTests);

// Individual test cases
featureTests.children.add(testController.createTestItem(
    'test-happy-path',
    'should work correctly',
    vscode.Uri.file(__filename)
));

featureTests.children.add(testController.createTestItem(
    'test-error-handling',
    'should handle errors',
    vscode.Uri.file(__filename)
));

featureTests.children.add(testController.createTestItem(
    'test-edge-cases',
    'should handle edge cases',
    vscode.Uri.file(__filename)
));
```

### Template README
```markdown
# Service Name Tests

## Overview
Tests for the Service Name implementation.

## Test Categories
1. Feature Tests
   - Basic functionality
   - Error handling
   - Edge cases

2. Integration Tests
   - Service boundaries
   - External dependencies

## Setup
1. Requirements
2. Configuration
3. Running tests

## Common Patterns
1. Test discovery patterns
2. Test organization
3. Best practices
```

## 3. Update Project Documentation

### Update README.md
Add section about testing:
```markdown
## Testing

The project uses VS Code's Testing API for all tests:

1. Unit Tests
   - Located in __tests__ directories
   - Run via Test Explorer

2. Integration Tests
   - Located in test/suite/
   - Run via Test Explorer

3. Service Tests
   - Located in test/suite/services/
   - See [Contributing Guidelines](CONTRIBUTING.md)
```

### Create Test Index
Create `src/test/README.md`:
```markdown
# Test Documentation Index

1. [Unit Tests](../test/README.md)
   - Component testing
   - Service methods
   - Utilities

2. [Integration Tests](./suite/README.md)
   - Extension features
   - VS Code integration
   - UI interactions

3. [Contributing Guidelines](../../CONTRIBUTING.md)
   - Test organization
   - Best practices
   - Templates
```

## Implementation Steps

1. Documentation Creation
   - Create CONTRIBUTING.md
   - Create test templates
   - Update README.md
   - Create test index

2. Template Distribution
   - Add templates to .github/
   - Document template usage
   - Add to project scaffolding

3. Documentation Integration
   - Link documents together
   - Update existing READMEs
   - Add to onboarding docs

4. Validation
   - Review with team
   - Test template usage
   - Update based on feedback

## Success Criteria

1. Documentation
   - ✓ Clear guidelines
   - ✓ Easy to follow
   - ✓ Well-organized
   - ✓ Cross-referenced

2. Templates
   - ✓ Easy to use
   - ✓ Well-documented
   - ✓ Follow best practices
   - ✓ Include examples

3. Integration
   - ✓ Part of workflow
   - ✓ Referenced in CI
   - ✓ Used in reviews
   - ✓ Part of onboarding

## Next Steps

1. Create CONTRIBUTING.md
2. Create test templates
3. Update project documentation
4. Review with team