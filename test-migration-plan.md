# Test Migration Plan: Moving to VS Code Testing API

## Overview

This document outlines the plan for migrating all tests to use VS Code's native Testing API, which provides richer test discovery, execution, and result reporting capabilities directly integrated with VS Code.

## Current State

### Tests in src/
1. Core Tests:
   - `src/core/__tests__/`
   - `src/core/diff/strategies/__tests__/`
   - `src/services/__tests__/`
2. Integration Tests:
   - `src/test/suite/extension.test.ts`
   - `src/test/suite/modes.test.ts`
   - `src/test/suite/task.test.ts`
3. Service Tests:
   - `src/test/suite/services/*`

## Migration Strategy

### Phase 1: Setup and Preparation

1. Set Up VS Code Testing Infrastructure
   - Configure test controller
   - Set up test discovery patterns
   - Create test utilities and helpers
   - Implement shared test fixtures

2. Create Migration Templates
   - Test controller setup patterns
   - Test item creation templates
   - Assertion pattern translations
   - Test organization structures

3. Document Current Test Coverage
   - Map all existing test cases
   - Identify critical test paths
   - Document test dependencies

### Phase 2: Migration Execution

1. Core Tests Migration
   - Migrate core functionality tests
   - Migrate service tests
   - Update test discovery patterns
   - Implement VS Code-specific test helpers

2. Integration Tests Migration
   - Migrate extension tests
   - Migrate mode tests
   - Migrate task tests
   - Update test utilities

3. Test Coverage Verification
   - Implement coverage tracking
   - Ensure equivalent coverage
   - Document any coverage gaps

### Phase 3: Cleanup and Documentation

1. Remove Legacy Test Configuration
   - Remove Jest dependencies
   - Update package.json scripts
   - Remove unused test files

2. Update Documentation
   - Update test running instructions
   - Document new test patterns
   - Update CI/CD configuration

## Migration Guidelines

### Test Pattern Translations

1. Basic Test Structure:
```typescript
// Old Pattern (Jest)
describe('Component', () => {
  it('should work', () => {
    expect(result).toBe(true);
  });
});

// New VS Code Pattern
const testController = vscode.test.createTestController('componentTests', 'Component Tests');
const testItem = testController.createTestItem('test-id', 'should work', uri);
testItem.run = async () => {
  assert.strictEqual(result, true);
};
```

2. Test Organization:
```typescript
// Create test hierarchy
const rootTest = testController.createTestItem('root', 'Component Tests', uri);
const featureTest = testController.createTestItem('feature', 'Feature Tests', uri);
rootTest.children.add(featureTest);

// Add test cases
featureTest.children.add(testController.createTestItem('test1', 'should work', uri));
```

### Best Practices

1. Test Organization
   - Use clear test hierarchies
   - Group related tests
   - Maintain clear descriptions
   - Follow VS Code testing conventions

2. Test Discovery
   - Implement proper discovery patterns
   - Use workspace events
   - Configure lazy loading

3. Assertion Patterns
   - Use VS Code's assert module
   - Maintain explicit assertions
   - Include meaningful error messages

## Timeline and Milestones

### Week 1: Preparation
- Set up VS Code Testing API infrastructure
- Create migration templates
- Document current test coverage

### Week 2-3: Core Migration
- Migrate core functionality tests
- Migrate integration tests
- Verify test coverage

### Week 4: Cleanup
- Remove legacy configuration
- Update documentation
- Final verification

## Risk Mitigation

1. Testing Strategy
   - Migrate tests incrementally
   - Verify each migration
   - Regular coverage checks

2. Rollback Plan
   - Maintain backups
   - Version control checkpoints
   - Staged migration approach

## Success Criteria

1. Coverage Metrics
   - Maintain current coverage levels
   - All critical paths tested
   - No regression in test quality

2. Performance
   - Fast test execution
   - Efficient test discovery
   - Resource optimization

3. Maintainability
   - Clear test patterns
   - Updated documentation
   - Team understanding

## Next Steps

1. Immediate Actions
   - Set up VS Code Testing API
   - Create migration templates
   - Schedule team review

2. Team Communication
   - Share migration plan
   - Schedule training sessions
   - Establish feedback channels

3. Monitoring
   - Set up progress tracking
   - Define success metrics
   - Plan regular reviews