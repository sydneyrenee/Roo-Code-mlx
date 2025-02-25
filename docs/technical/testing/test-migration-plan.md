# VS Code Testing API Migration Plan

## Overview

This document outlines the plan for migrating from Jest to VS Code's native Testing API. Rather than attempting to maintain compatibility with Jest patterns, we're opting for a clean-slate approach that fully embraces VS Code's testing capabilities.

## Phase 1: Cleanup

1. Remove Jest Infrastructure:
   - Delete all Jest-based test files in `src/**/__tests__/`
   - Remove Jest dependencies from package.json
   - Remove Jest configuration files
   - Clean up any Jest-specific test utilities

2. Setup VS Code Testing:
   ```json
   // package.json updates
   {
     "scripts": {
       "test": "vscode-test",
       "test:unit": "vscode-test --label unitTests",
       "test:integration": "vscode-test --label integrationTests"
     },
     "devDependencies": {
       "@vscode/test-cli": "^0.0.4",
       "@vscode/test-electron": "^2.3.9"
     }
   }
   ```

## Phase 2: New Test Infrastructure

1. Test Directory Structure:
   ```
   src/test/
   ├── suite/
   │   ├── core/               # Core functionality tests
   │   │   ├── Cline.test.ts
   │   │   └── mode-validator.test.ts
   │   ├── services/          # Service tests
   │   │   └── api.test.ts
   │   └── integration/       # Integration tests
   │       └── extension.test.ts
   └── testUtils.ts           # Shared test utilities
   ```

2. Test Utilities:
   ```typescript
   // src/test/testUtils.ts
   export class TestUtils {
       static async assertThrows(fn: () => Promise<any>, message?: string) {
           try {
               await fn();
               assert.fail('Expected function to throw');
           } catch (e) {
               // Test passed
           }
       }

       static createMockProvider() {
           return {
               postMessageToWebview: async () => {},
               postStateToWebview: async () => {},
               // Add other mock implementations as needed
           };
       }
   }
   ```

3. Base Test Controller:
   ```typescript
   // src/test/suite/testController.ts
   import * as vscode from 'vscode';

   export function createTestController(id: string, label: string) {
       const controller = vscode.tests.createTestController(id, label);
       
       controller.createRunProfile(
           'Run Tests',
           vscode.TestRunProfileKind.Run,
           async (request, token) => {
               const run = controller.createTestRun(request);
               const queue: vscode.TestItem[] = [];
               
               request.include?.forEach(test => queue.push(test));
               
               while (queue.length > 0 && !token.isCancellationRequested) {
                   const test = queue.pop()!;
                   await test.run?.(run);
               }
               
               run.end();
           }
       );

       return controller;
   }
   ```

## Phase 3: Test Implementation

1. Core Tests:
   ```typescript
   // src/test/suite/core/Cline.test.ts
   import * as vscode from 'vscode';
   import * as assert from 'assert';
   import { Cline } from '../../../core/Cline';
   import { createTestController } from '../testController';

   const controller = createTestController('clineTests', 'Cline Tests');

   // Root test item for Cline
   const clineTests = controller.createTestItem('cline', 'Cline', vscode.Uri.file(__filename));
   controller.items.add(clineTests);

   // Constructor tests
   const constructorTests = controller.createTestItem('constructor', 'Constructor', vscode.Uri.file(__filename));
   constructorTests.children.add(
       createTest('init', 'should initialize with basic settings', async run => {
           const cline = new Cline(mockProvider, mockApiConfig, undefined, false, false, undefined, "test task");
           assert.strictEqual(cline.diffEnabled, false);
           run.passed(test);
       })
   );
   ```

2. Service Tests:
   ```typescript
   // src/test/suite/services/api.test.ts
   const controller = createTestController('apiTests', 'API Tests');
   const apiTests = controller.createTestItem('api', 'API', vscode.Uri.file(__filename));
   
   apiTests.children.add(
       createTest('requests', 'should handle API requests', async run => {
           // Test implementation
       })
   );
   ```

3. Integration Tests:
   ```typescript
   // src/test/suite/integration/extension.test.ts
   const controller = createTestController('integrationTests', 'Integration Tests');
   
   // Test extension activation
   controller.items.add(
       createTest('activation', 'should activate extension', async run => {
           const ext = vscode.extensions.getExtension('RooVeterinaryInc.roo-cline');
           assert.ok(ext);
           await ext.activate();
           assert.ok(ext.isActive);
       })
   );
   ```

## Phase 4: Migration Process

1. Core Functionality (Week 1):
   - Implement Cline tests
   - Test mode validation
   - Test configuration handling
   - Verify core functionality coverage

2. Service Layer (Week 2):
   - Implement API tests
   - Add service integration tests
   - Test external service interactions
   - Verify service layer coverage

3. Integration Testing (Week 3):
   - Add extension tests
   - Test VS Code integration
   - Verify command handling
   - Test UI interactions

4. Documentation & Cleanup (Week 4):
   - Update test documentation
   - Remove any remaining Jest references
   - Verify test coverage
   - Team training on new test patterns

## Success Criteria

1. Test Coverage:
   - All critical paths tested
   - Core functionality verified
   - Service interactions covered
   - UI/extension integration tested

2. Performance:
   - Fast test execution
   - Efficient test discovery
   - No unnecessary test overhead

3. Maintainability:
   - Clear test patterns
   - Easy to add new tests
   - Well-documented approach
   - Team understanding of new system

## Next Steps

1. Begin cleanup phase
2. Set up new test infrastructure
3. Start with core tests
4. Progress through implementation phases
5. Regular review and validation