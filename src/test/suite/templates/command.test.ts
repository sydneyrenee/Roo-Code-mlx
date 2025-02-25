import * as vscode from 'vscode'
import * as assert from 'assert'
import { 
    TEST_TIMEOUTS,
    waitForCondition,
    createTestWorkspace,
    cleanupTestWorkspace,
    resetExtensionState,
    executeCommandAndWait,
    assertions
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

// Mock classes
class MockInputBox {
    private value: string | undefined = undefined
    private _showCount = 0

    setValue(value: string | undefined) {
        this.value = value
    }

    get showCount(): number {
        return this._showCount
    }

    showInputBox(): Promise<string | undefined> {
        this._showCount++
        return Promise.resolve(this.value)
    }

    reset() {
        this.value = undefined
        this._showCount = 0
    }
}

export async function activateCommandTests(context: vscode.ExtensionContext): Promise<void> {
    const testController = vscode.tests.createTestController('commandTests', 'Command Tests')
    context.subscriptions.push(testController)

    const rootSuite = testController.createTestItem('command', 'Command')
    testController.items.add(rootSuite)

    // Store original functions
    const originalShowInputBox = vscode.window.showInputBox
    const mockInputBox = new MockInputBox()

    // Create workspace URI for tests
    let workspaceUri: vscode.Uri | undefined

    testController.createRunProfile('run', vscode.TestRunProfileKind.Run, async (request) => {
        const queue: vscode.TestItem[] = []

        if (request.include) {
            request.include.forEach(test => queue.push(test))
        }

        const run = testController.createTestRun(request)

        try {
            // Suite setup
            workspaceUri = await createTestWorkspace()

            for (const test of queue) {
                run.started(test)

                try {
                    // Test setup
                    await resetExtensionState(globalThis.provider as unknown as ClineProvider)
                    mockInputBox.reset()
                    vscode.window.showInputBox = mockInputBox.showInputBox.bind(mockInputBox)

                    switch (test.id) {
                        case 'command.registered': {
                            await assertions.commandExists('roo-cline.testCommand')
                            break
                        }

                        case 'command.execute': {
                            const testData = { value: 'test' }
                            await executeCommandAndWait('roo-cline.testCommand', testData)

                            const config = vscode.workspace.getConfiguration('roo-code')
                            const result = config.get('testResult')
                            assert.strictEqual(result, 'test', 'Command should update configuration')
                            break
                        }

                        case 'command.workspace': {
                            const files = {
                                'test.txt': 'Initial content'
                            }
                            const testWorkspace = await createTestWorkspace(files)

                            try {
                                const testFile = vscode.Uri.joinPath(testWorkspace, 'test.txt')
                                
                                await executeCommandAndWait('roo-cline.testCommand', {
                                    file: testFile.fsPath,
                                    content: 'Modified content'
                                })

                                const document = await vscode.workspace.openTextDocument(testFile)
                                assertions.textDocumentContains(document, 'Modified content')
                            } finally {
                                await cleanupTestWorkspace(testWorkspace)
                            }
                            break
                        }

                        case 'command.input': {
                            mockInputBox.setValue('user input')

                            await executeCommandAndWait('roo-cline.testCommand')

                            assert.strictEqual(mockInputBox.showCount, 1, 'Should prompt for input')

                            const config = vscode.workspace.getConfiguration('roo-code')
                            const result = config.get('userInput')
                            assert.strictEqual(result, 'user input', 'Command should use user input')
                            break
                        }

                        case 'command.cancel': {
                            mockInputBox.setValue(undefined) // User cancelled

                            await executeCommandAndWait('roo-cline.testCommand')

                            const config = vscode.workspace.getConfiguration('roo-code')
                            const result = config.get('commandCancelled')
                            assert.strictEqual(result, true, 'Command should handle cancellation')
                            break
                        }

                        case 'command.error': {
                            const errorData = { shouldError: true }

                            await assert.rejects(
                                async () => await executeCommandAndWait('roo-cline.testCommand', errorData),
                                /Command failed/,
                                'Command should throw expected error'
                            )

                            const config = vscode.workspace.getConfiguration('roo-code')
                            const errorHandled = config.get('errorHandled')
                            assert.strictEqual(errorHandled, true, 'Command should handle errors')
                            break
                        }

                        case 'command.timeout': {
                            const longRunningData = { delay: TEST_TIMEOUTS.LONG }

                            await assert.rejects(
                                async () => {
                                    await Promise.race([
                                        executeCommandAndWait('roo-cline.testCommand', longRunningData),
                                        new Promise((_, reject) => 
                                            setTimeout(() => reject(new Error('Command timeout')), TEST_TIMEOUTS.SHORT)
                                        )
                                    ])
                                },
                                /Command timeout/,
                                'Command should timeout'
                            )
                            break
                        }
                    }

                    run.passed(test)
                } catch (err) {
                    run.failed(test, new vscode.TestMessage(`Test failed: ${err}`))
                } finally {
                    // Test teardown
                    vscode.window.showInputBox = originalShowInputBox
                }
            }
        } finally {
            // Suite teardown
            if (workspaceUri) {
                await cleanupTestWorkspace(workspaceUri)
            }
        }

        run.end()
    })

    // Add test items
    rootSuite.children.add(testController.createTestItem(
        'command.registered',
        'Command should be registered'
    ))

    rootSuite.children.add(testController.createTestItem(
        'command.execute',
        'Command should execute successfully'
    ))

    rootSuite.children.add(testController.createTestItem(
        'command.workspace',
        'Command should handle workspace changes'
    ))

    rootSuite.children.add(testController.createTestItem(
        'command.input',
        'Command should handle user input'
    ))

    rootSuite.children.add(testController.createTestItem(
        'command.cancel',
        'Command should handle cancellation'
    ))

    rootSuite.children.add(testController.createTestItem(
        'command.error',
        'Command should handle errors'
    ))

    rootSuite.children.add(testController.createTestItem(
        'command.timeout',
        'Command should respect timeout'
    ))
}