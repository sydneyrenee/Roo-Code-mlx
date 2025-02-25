import * as vscode from 'vscode'
import * as assert from 'assert'
import { 
    TEST_TIMEOUTS,
    waitForCondition,
    createTestWorkspace,
    cleanupTestWorkspace,
    resetExtensionState,
    createDisposableTest
} from '../utils/test-setup'
import { ClineProvider } from '../../../core/webview/ClineProvider'

// Extend globalThis with our extension types
declare global {
    var provider: {
        viewLaunched: boolean
        messages: Array<{
            type: string
            text?: string
        }>
        updateGlobalState(key: string, value: any): Promise<void>
    }
}

// Mock service for template demonstration
class TestService {
    private initialized = false

    async initialize(): Promise<void> {
        this.initialized = true
    }

    isInitialized(): boolean {
        return this.initialized
    }

    async prepare(): Promise<void> {
        // Setup for test
    }

    async cleanup(): Promise<void> {
        // Cleanup after test
    }

    async performOperation(shouldFail: boolean = false): Promise<string> {
        if (shouldFail) {
            throw new Error('Operation failed')
        }
        return 'success'
    }

    async performLongOperation(): Promise<string> {
        await new Promise(resolve => setTimeout(resolve, TEST_TIMEOUTS.LONG))
        return 'completed'
    }

    async dispose(): Promise<void> {
        this.initialized = false
    }
}

export async function activateServiceTests(context: vscode.ExtensionContext): Promise<void> {
    const testController = vscode.tests.createTestController('serviceTests', 'Service Tests')
    context.subscriptions.push(testController)

    const rootSuite = testController.createTestItem('service', 'Service')
    testController.items.add(rootSuite)

    // Create workspace URI for tests
    let workspaceUri: vscode.Uri | undefined
    let testService: TestService | undefined

    testController.createRunProfile('run', vscode.TestRunProfileKind.Run, async (request) => {
        const queue: vscode.TestItem[] = []

        if (request.include) {
            request.include.forEach(test => queue.push(test))
        }

        const run = testController.createTestRun(request)

        try {
            // Suite setup
            workspaceUri = await createTestWorkspace()
            testService = new TestService()
            await testService.initialize()

            for (const test of queue) {
                run.started(test)

                try {
                    // Test setup
                    await resetExtensionState(globalThis.provider as unknown as ClineProvider)

                    switch (test.id) {
                        case 'service.initialize': {
                            assert.ok(testService.isInitialized(), 'Service should be initialized')
                            break
                        }

                        case 'service.operations': {
                            // Setup
                            await testService.prepare()

                            try {
                                const result = await testService.performOperation()
                                assert.strictEqual(result, 'success', 'Operation should succeed')
                            } finally {
                                // Cleanup
                                await testService.cleanup()
                            }
                            break
                        }

                        case 'service.concurrent': {
                            const operations = Array(3).fill(null).map(() => 
                                testService!.performOperation()
                            )

                            const results = await Promise.all(operations)
                            results.forEach(result => 
                                assert.strictEqual(result, 'success', 'All operations should succeed')
                            )
                            break
                        }

                        case 'service.errors': {
                            await assert.rejects(
                                async () => await testService!.performOperation(true),
                                /Operation failed/,
                                'Should throw expected error'
                            )
                            break
                        }

                        case 'service.timeout': {
                            // Start long operation
                            const operationPromise = testService!.performLongOperation()

                            // Wait with timeout
                            await assert.rejects(
                                async () => {
                                    await Promise.race([
                                        operationPromise,
                                        new Promise((_, reject) => 
                                            setTimeout(() => reject(new Error('Timeout')), TEST_TIMEOUTS.SHORT)
                                        )
                                    ])
                                },
                                /Timeout/,
                                'Operation should timeout'
                            )
                            break
                        }
                    }

                    run.passed(test)
                } catch (err) {
                    run.failed(test, new vscode.TestMessage(`Test failed: ${err}`))
                }
            }
        } finally {
            // Suite teardown
            if (testService) {
                await testService.dispose()
            }
            if (workspaceUri) {
                await cleanupTestWorkspace(workspaceUri)
            }
        }

        run.end()
    })

    // Add test items
    rootSuite.children.add(testController.createTestItem(
        'service.initialize',
        'Service should initialize correctly'
    ))

    rootSuite.children.add(testController.createTestItem(
        'service.operations',
        'Service should handle operations'
    ))

    rootSuite.children.add(testController.createTestItem(
        'service.concurrent',
        'Service should handle concurrent operations'
    ))

    rootSuite.children.add(testController.createTestItem(
        'service.errors',
        'Service should handle errors'
    ))

    rootSuite.children.add(testController.createTestItem(
        'service.timeout',
        'Service should respect timeouts'
    ))
}