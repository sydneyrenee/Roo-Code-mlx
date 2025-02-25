import * as assert from 'assert';
import { TEST_TIMEOUTS, createTestWorkspace, cleanupTestWorkspace, resetExtensionState, createDisposableTest } from '../utils/test-setup';
suite('Service Test Template', () => {
    let workspaceUri;
    let testService;
    suiteSetup(async () => {
        workspaceUri = await createTestWorkspace();
        testService = new TestService();
        await testService.initialize();
    });
    suiteTeardown(async () => {
        await testService.dispose();
        await cleanupTestWorkspace(workspaceUri);
    });
    setup(async () => {
        await resetExtensionState(globalThis.provider);
    });
    test('Service should initialize correctly', async () => {
        assert.ok(testService.isInitialized(), 'Service should be initialized');
    });
    test('Service should handle operations', createDisposableTest(
    // Setup
    async () => {
        await testService.prepare();
    }, 
    // Cleanup
    async () => {
        await testService.cleanup();
    }, 
    // Test
    async () => {
        const result = await testService.performOperation();
        assert.strictEqual(result, 'success', 'Operation should succeed');
    }));
    test('Service should handle concurrent operations', async () => {
        const operations = Array(3).fill(null).map(() => testService.performOperation());
        const results = await Promise.all(operations);
        results.forEach(result => assert.strictEqual(result, 'success', 'All operations should succeed'));
    });
    test('Service should handle errors', async () => {
        await assert.rejects(async () => await testService.performOperation(true), /Operation failed/, 'Should throw expected error');
    });
    test('Service should respect timeouts', async () => {
        // Start long operation
        const operationPromise = testService.performLongOperation();
        // Wait with timeout
        await assert.rejects(async () => {
            await Promise.race([
                operationPromise,
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), TEST_TIMEOUTS.SHORT))
            ]);
        }, /Timeout/, 'Operation should timeout');
    });
});
// Mock service for template demonstration
class TestService {
    initialized = false;
    async initialize() {
        this.initialized = true;
    }
    isInitialized() {
        return this.initialized;
    }
    async prepare() {
        // Setup for test
    }
    async cleanup() {
        // Cleanup after test
    }
    async performOperation(shouldFail = false) {
        if (shouldFail) {
            throw new Error('Operation failed');
        }
        return 'success';
    }
    async performLongOperation() {
        await new Promise(resolve => setTimeout(resolve, TEST_TIMEOUTS.LONG));
        return 'completed';
    }
    async dispose() {
        this.initialized = false;
    }
}
//# sourceMappingURL=service.test.js.map