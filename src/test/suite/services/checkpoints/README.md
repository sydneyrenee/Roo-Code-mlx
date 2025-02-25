# Checkpoint Service Tests

This directory contains tests for the Checkpoint Service implementations.

## Test Files

- `LocalCheckpointService.test.ts`: Tests for the local Git-based checkpoint implementation
- `ShadowCheckpointService.test.ts`: Tests for the shadow repository checkpoint implementation

## Test Organization

The tests are organized by service implementation, with each test file covering:

1. Basic Operations
   - Creating checkpoints
   - Restoring checkpoints
   - Getting diffs between checkpoints

2. File Operations
   - Handling new files
   - Handling deleted files
   - Managing tracked vs untracked files

3. Git State Management
   - Preserving workspace state
   - Managing staged/unstaged changes
   - Branch validation

## Test Setup

Both test suites use temporary directories for testing:
- `LocalCheckpointService` uses a single temporary directory for the workspace
- `ShadowCheckpointService` uses two temporary directories:
  - One for the workspace
  - One for the shadow repository

### Common Test Utilities

Both test suites share similar setup patterns:
```typescript
const initRepo = async ({
    workspaceDir,
    userName = "Roo Code",
    userEmail = "support@roocode.com",
    testFileName = "test.txt",
    textFileContent = "Hello, world!",
}) => {
    // Initialize test repository
    // Create test files
    // Make initial commit
}
```

### Cleanup

All tests clean up their temporary directories in the `afterEach` block to prevent test pollution:
```typescript
afterEach(async () => {
    await fs.rm(service.workspaceDir, { recursive: true, force: true })
    jest.restoreAllMocks()
})
```

## Running Tests

Run all checkpoint service tests:
```bash
npx jest src/test/suite/services/checkpoints --verbose
```

Run specific test file:
```bash
npx jest src/test/suite/services/checkpoints/LocalCheckpointService.test.ts --verbose
```

## Test Coverage

The test suite covers:
- ✓ Basic checkpoint operations
- ✓ File system operations
- ✓ Git state management
- ✓ Error handling
- ✓ Edge cases (empty repos, malformed states)
- ✓ Concurrent operations

## Notes

- Tests use Jest's fake timers for time-dependent operations
- Git operations are performed on real repositories (not mocked)
- File system operations use real temporary directories
- Each test is isolated with its own repository instance