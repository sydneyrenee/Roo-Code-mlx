import * as vscode from 'vscode';
import * as assert from 'assert';
import { 
    TEST_TIMEOUTS,
    waitForCondition,
    createTestWorkspace,
    cleanupTestWorkspace,
    resetExtensionState,
    createDisposableTest
} from '../utils/test-setup';
import { ClineProvider } from '../../../core/webview/ClineProvider';
import { createTestController } from '../testController';
import { TestUtils } from '../../testUtils';

// Extend globalThis with our extension types
declare global {
    var provider: {
        viewLaunched: boolean;
        messages: Array<{
            type: string;
            text?: string;
        }>;
        updateGlobalState(key: string, value: any): Promise<void>;
    };
}

// Mock service for template demonstration
class TestService {
    private initialized = false;

    async initialize(): Promise<void> {
        this.initialized = true;
    }

    isInitialized(): boolean {
        return this.initialized;
    }

    async prepare(): Promise<void> {
        // Setup for test
    }

    async cleanup(): Promise<void> {
        // Cleanup after test
    }

    async performOperation(shouldFail: boolean = false): Promise<string> {
        if (shouldFail) {
            throw new Error('Operation failed');
        }
        return 'success';
    }

    async performLongOperation(): Promise<string> {
        await new Promise(resolve => setTimeout(resolve, TEST_TIMEOUTS.LONG));
        return 'completed';
    }

    async dispose(): Promise<void> {
        this.initialized = false;
    }
}

const controller = createTestController('serviceTests', 'Service Tests');

// Root test item for Service
const serviceTests = controller.createTestItem('service', 'Service', vscode.Uri.file(__filename));
controller.items.add(serviceTests);

// Create a shared test service instance
let testService: TestService;

// Test for service initialization
serviceTests.children.add(
    TestUtils.createTest(
        controller,
        'initialize',
        'Service should initialize correctly',
        vscode.Uri.file(__filename),
        async run => {
            // Create workspace for test
            const workspaceUri = await createTestWorkspace();
            
            try {
                // Test setup
                await resetExtensionState(globalThis.provider as unknown as ClineProvider);
                testService = new TestService();
                await testService.initialize();

                assert.ok(testService.isInitialized(), 'Service should be initialized');
            } finally {
                // Test teardown
                if (testService) {
                    await testService.dispose();
                }
                await cleanupTestWorkspace(workspaceUri);
            }
        }
    )
);

// Test for service operations
serviceTests.children.add(
    TestUtils.createTest(
        controller,
        'operations',
        'Service should handle operations',
        vscode.Uri.file(__filename),
        async run => {
            // Create workspace for test
            const workspaceUri = await createTestWorkspace();
            
            try {
                // Test setup
                await resetExtensionState(globalThis.provider as unknown as ClineProvider);
                testService = new TestService();
                await testService.initialize();

                // Setup
                await testService.prepare();

                try {
                    const result = await testService.performOperation();
                    assert.strictEqual(result, 'success', 'Operation should succeed');
                } finally {
                    // Cleanup
                    await testService.cleanup();
                }
            } finally {
                // Test teardown
                if (testService) {
                    await testService.dispose();
                }
                await cleanupTestWorkspace(workspaceUri);
            }
        }
    )
);

// Test for concurrent operations
serviceTests.children.add(
    TestUtils.createTest(
        controller,
        'concurrent',
        'Service should handle concurrent operations',
        vscode.Uri.file(__filename),
        async run => {
            // Create workspace for test
            const workspaceUri = await createTestWorkspace();
            
            try {
                // Test setup
                await resetExtensionState(globalThis.provider as unknown as ClineProvider);
                testService = new TestService();
                await testService.initialize();

                const operations = Array(3).fill(null).map(() => 
                    testService.performOperation()
                );

                const results = await Promise.all(operations);
                results.forEach(result => 
                    assert.strictEqual(result, 'success', 'All operations should succeed')
                );
            } finally {
                // Test teardown
                if (testService) {
                    await testService.dispose();
                }
                await cleanupTestWorkspace(workspaceUri);
            }
        }
    )
);

// Test for error handling
serviceTests.children.add(
    TestUtils.createTest(
        controller,
        'errors',
        'Service should handle errors',
        vscode.Uri.file(__filename),
        async run => {
            // Create workspace for test
            const workspaceUri = await createTestWorkspace();
            
            try {
                // Test setup
                await resetExtensionState(globalThis.provider as unknown as ClineProvider);
                testService = new TestService();
                await testService.initialize();

                await assert.rejects(
                    async () => await testService.performOperation(true),
                    /Operation failed/,
                    'Should throw expected error'
                );
            } finally {
                // Test teardown
                if (testService) {
                    await testService.dispose();
                }
                await cleanupTestWorkspace(workspaceUri);
            }
        }
    )
);

// Test for timeout handling
serviceTests.children.add(
    TestUtils.createTest(
        controller,
        'timeout',
        'Service should respect timeouts',
        vscode.Uri.file(__filename),
        async run => {
            // Create workspace for test
            const workspaceUri = await createTestWorkspace();
            
            try {
                // Test setup
                await resetExtensionState(globalThis.provider as unknown as ClineProvider);
                testService = new TestService();
                await testService.initialize();

                // Start long operation
                const operationPromise = testService.performLongOperation();

                // Wait with timeout
                await assert.rejects(
                    async () => {
                        await Promise.race([
                            operationPromise,
                            new Promise((_, reject) => 
                                setTimeout(() => reject(new Error('Timeout')), TEST_TIMEOUTS.SHORT)
                            )
                        ]);
                    },
                    /Timeout/,
                    'Operation should timeout'
                );
            } finally {
                // Test teardown
                if (testService) {
                    await testService.dispose();
                }
                await cleanupTestWorkspace(workspaceUri);
            }
        }
    )
);

export function activate() {
    return controller;
}