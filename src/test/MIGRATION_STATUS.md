# Test Migration Status

## Overview

This document tracks the migration of tests from Jest to the VS Code Testing API. The VS Code Testing API provides richer test discovery, execution, and result reporting capabilities directly integrated with VS Code.

## Migration Progress Summary

| Category | Total Tests | Migrated | Registered & Working | Status |
|----------|-------------|----------|---------------------|--------|
| Core Tests | 15 | 3 | 1 | ⚠️ Partially Working |
| API Tests | 15 | 3 | 1 | ⚠️ Partially Working |
| Integration Tests | 36 | 0 | 0 | ❌ Not Started |
| Service Tests | 9 | 1 | 0 | ⚠️ Partially Working |
| Utility Tests | 6 | 5 | 1 | ⚠️ Partially Working |
| Shared Module Tests | 4 | 4 | 0 | ⚠️ Partially Working |
| Jest Tests | 97 | 0 | 0 | ❌ Not Started |
| **Total** | **149** | **16** | **3** | **⚠️ 10.74% Migrated, 2.01% Working** |

## Test Registration Status

Currently, only 3 tests are properly registered in the `registerTests.ts` file:
- ✓ activateBasicTests from './suite/basic.test'
- ✓ activatePathTests from '../utils/__tests__/path.test.migrated.migrated'
- ✓ activateVsCodeLmTests from '../api/providers/__tests__/vscode-lm.test'

The following 13 tests have been migrated to the VS Code Testing API format but are not registered:
- ⚠️ src/utils/__tests__/shell.test.ts
- ⚠️ src/utils/__tests__/git.test.ts
- ⚠️ src/utils/__tests__/enhance-prompt.test.ts
- ⚠️ src/utils/__tests__/cost.test.ts
- ⚠️ src/shared/__tests__/vsCodeSelectorUtils.test.ts
- ⚠️ src/shared/__tests__/support-prompts.test.ts
- ⚠️ src/shared/__tests__/modes.test.ts
- ⚠️ src/shared/__tests__/checkExistApiConfig.test.ts
- ⚠️ src/core/__tests__/CodeActionProvider.test.ts
- ⚠️ src/services/mcp/__tests__/McpHub.test.ts
- ⚠️ src/core/prompts/__tests__/system.test.ts
- ⚠️ src/core/prompts/__tests__/sections.test.ts
- ⚠️ src/api/transform/__tests__/bedrock-converse-format.test.ts

**Important Note**: While 16 tests have been migrated to use the VS Code Testing API format, only 3 of them are being discovered and run because they are registered in the `registerTests.ts` file. This explains why running `npm test` only shows a few tests passing.

## Phase 1: Core Tests Migration ⚠️ (Partially Migrated, Partially Registered)

### Migrated
- ✓ Core functionality tests:
  - ⚠️ Code action provider tests (src/core/__tests__/CodeActionProvider.test.ts) - Not Registered
- ✓ Prompts tests:
  - ⚠️ System prompts tests (src/core/prompts/__tests__/system.test.ts) - Not Registered
  - ⚠️ Sections prompts tests (src/core/prompts/__tests__/sections.test.ts) - Not Registered

### Not Yet Migrated
- ❌ Core functionality tests:
  - ❌ Cline core tests (src/core/__tests__/Cline.test.js)
  - ❌ Mode validator tests (src/core/__tests__/mode-validator.test.js)
  - ❌ Editor utils tests (src/core/__tests__/EditorUtils.test.js)
- ❌ Diff strategy tests
- ❌ Config tests
- ❌ Mentions tests

### Key Changes
- Replaced Jest mocks with VSCode test mocks
- Converted expect assertions to assert
- Added proper TypeScript types for all test data
- Improved test organization and readability
- Added better error messages for assertions

## Phase 2: API Tests Migration ⚠️ (Partially Migrated, Partially Registered)

### Migrated
- ✓ API Provider Tests:
  - ✓ VSCode LM provider tests (src/api/providers/__tests__/vscode-lm.test.js) - ✓ Registered
- ✓ API Transform Tests:
  - ⚠️ Bedrock converse format tests (src/api/transform/__tests__/bedrock-converse-format.test.ts) - Not Registered

### Not Yet Migrated
- ❌ Most API Provider Tests (14 remaining)
- ❌ Most API Transform Tests (5 remaining)

### Key Changes
- Migrated some API provider tests to VS Code Testing API
- Implemented proper mocking for API requests
- Added better error handling and assertions

## Phase 3: Integration Tests Migration ❌ (Not Started)

### Not Yet Migrated
- ❌ Core Integration Tests
- ❌ Editor Integration Tests
- ❌ Terminal Integration Tests
- ❌ Workspace Integration Tests
- ❌ Misc Integration Tests

## Phase 4: Service Tests Migration ⚠️ (Partially Migrated, Not Registered)

### Migrated
- ✓ MCP Service Tests:
  - ⚠️ McpHub tests (src/services/mcp/__tests__/McpHub.test.ts) - Not Registered

### Not Yet Migrated
- ❌ Checkpoint Service Tests
- ❌ Tree-sitter Service Tests
- ❌ Vertex Service Tests

## Phase 5: Utility Tests Migration ✓ (Mostly Migrated, Partially Registered)

### Migrated
- ✓ Utility Tests:
  - ✓ Path utility tests (src/utils/__tests__/path.test.migrated.migrated) - ✓ Registered
  - ⚠️ Git utility tests (src/utils/__tests__/git.test.ts) - Not Registered
  - ⚠️ Cost utility tests (src/utils/__tests__/cost.test.ts) - Not Registered
  - ⚠️ Shell utility tests (src/utils/__tests__/shell.test.ts) - Not Registered
  - ⚠️ Enhance prompt utility tests (src/utils/__tests__/enhance-prompt.test.ts) - Not Registered

### Not Yet Migrated
- ❌ Other utility tests

## Phase 6: Shared Module Tests Migration ✓ (Migrated, Not Registered)

### Migrated
- ✓ Shared Module Tests:
  - ⚠️ Support prompts tests (src/shared/__tests__/support-prompts.test.ts) - Not Registered
  - ⚠️ Modes tests (src/shared/__tests__/modes.test.ts) - Not Registered
  - ⚠️ Check exist API config tests (src/shared/__tests__/checkExistApiConfig.test.ts) - Not Registered
  - ⚠️ VSCode selector utils tests (src/shared/__tests__/vsCodeSelectorUtils.test.ts) - Not Registered

## Phase 7: Template Tests Migration ❌ (Not Started)

### Not Yet Migrated
- ❌ Template Tests

## Phase 8: End-to-End Tests Migration ❌ (Not Started)

### To Do
- [ ] Full extension E2E tests
- [ ] Webview E2E tests
- [ ] Command E2E tests
- [ ] Settings E2E tests

## Migration Challenges

During the migration, we encountered several challenges:

1. **Module System Incompatibilities**: Some dependencies (e.g., globby) are ES modules but are imported using CommonJS require(). This caused errors when running tests.

2. **Duplicate Controller IDs**: When multiple test files create controllers with the same ID, VS Code throws an error. We solved this by adding a unique ID generation mechanism.

3. **Test Discovery**: The VS Code Testing API uses a different approach to test discovery than Jest. Instead of using glob patterns, tests are registered with controllers.

4. **Test Execution**: Tests are executed by the VS Code Test Runner, not by Jest. This means that Jest-specific features like mocking and spying need to be replaced with VS Code-compatible alternatives.

5. **Test Registration**: Tests need to be explicitly registered in the `registerTests.ts` file to be discovered and run. Currently, only 3 tests are registered.

For detailed information on these challenges and how to address them, see the [VS Code Testing API Guide](../../docs/technical/testing/vscode-testing-api.md).

## Next Steps

1. **Register Migrated Tests**: Update the `registerTests.ts` file to register the 13 tests that have been migrated but are not registered.

2. **Continue Migration**: Migrate the remaining 97 tests that are still using Jest's describe/it pattern.

3. **Run Tests Incrementally**: Register and run tests in small batches to verify they work.

4. **Update Documentation**: Keep this document updated as tests are migrated and registered.

5. **Address Module System Incompatibilities**: Fix any remaining issues with ES modules.

6. **Optimize Test Performance**: Improve test execution speed.

## How to Register a Test

To register a test with the VS Code Testing API:

1. Ensure your test file exports an activation function:
   ```typescript
   export async function activateYourTestName(context) {
       const testController = createTestController('your-test-id', 'Your Test Label');
       // Test implementation
       return controller;
   }
   ```

2. Add an import and registration call in `registerTests.ts`:
   ```typescript
   import { activateYourTestName } from "../path/to/your/test";
   
   async function registerTests(context) {
       // ...
       await activateYourTestName(context);
       // ...
   }
   ```

3. Run the tests to verify they work:
   ```
   npm test
   ```

## How to Migrate a Jest Test

To migrate a Jest test to the VS Code Testing API:

1. Use the generate-test-migration.js script:
   ```
   npm run test:generate-migration <path-to-test-file>
   ```

2. Update the generated file with your test implementation.

3. Register the test in `registerTests.ts`.

4. Run the tests to verify they work:
   ```
   npm test
   ```

## Recent Updates

- Updated this document to accurately reflect the current state of test migration based on the find-unregistered-tests.js script output.
- Current migration progress: 10.74% (16/149 tests migrated)
- Only 3 tests are properly registered and working.