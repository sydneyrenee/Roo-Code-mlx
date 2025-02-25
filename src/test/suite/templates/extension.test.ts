import * as vscode from 'vscode'
import * as assert from 'assert'
import { 
    TEST_TIMEOUTS,
    waitForCondition,
    createTestWorkspace,
    cleanupTestWorkspace,
    resetExtensionState,
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

export async function activateExtensionTests(context: vscode.ExtensionContext): Promise<void> {
    const testController = vscode.tests.createTestController('extensionTests', 'Extension Tests')
    context.subscriptions.push(testController)

    const rootSuite = testController.createTestItem('extension', 'Extension')
    testController.items.add(rootSuite)

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

                    switch (test.id) {
                        case 'extension.present': {
                            const extension = vscode.extensions.getExtension('RooVeterinaryInc.roo-cline')
                            assert.ok(extension, 'Extension should be available')
                            break
                        }

                        case 'extension.activate': {
                            const extension = vscode.extensions.getExtension('RooVeterinaryInc.roo-cline')
                            await extension?.activate()
                            assert.ok(extension?.isActive, 'Extension should be active')
                            break
                        }

                        case 'extension.commands': {
                            await assertions.commandExists('roo-cline.plusButtonClicked')
                            await assertions.commandExists('roo-cline.mcpButtonClicked')
                            await assertions.commandExists('roo-cline.startNewTask')
                            break
                        }

                        case 'extension.workspace': {
                            const files = {
                                'test.txt': 'Initial content'
                            }
                            const testWorkspace = await createTestWorkspace(files)

                            try {
                                const testFile = vscode.Uri.joinPath(testWorkspace, 'test.txt')
                                const content = await vscode.workspace.fs.readFile(testFile)
                                assert.strictEqual(Buffer.from(content).toString(), 'Initial content')

                                const edit = new vscode.WorkspaceEdit()
                                edit.insert(testFile, new vscode.Position(0, 0), 'Modified ')
                                await vscode.workspace.applyEdit(edit)

                                const document = await vscode.workspace.openTextDocument(testFile)
                                assertions.textDocumentContains(document, 'Modified Initial content')
                            } finally {
                                await cleanupTestWorkspace(testWorkspace)
                            }
                            break
                        }

                        case 'extension.config': {
                            const config = vscode.workspace.getConfiguration('roo-code')
                            await config.update('setting', 'test-value', vscode.ConfigurationTarget.Global)

                            await assertions.configurationEquals('setting', 'test-value')

                            await config.update('setting', undefined, vscode.ConfigurationTarget.Global)
                            break
                        }

                        case 'extension.async': {
                            let operationComplete = false
                            setTimeout(() => { operationComplete = true }, 1000)

                            await waitForCondition(
                                () => operationComplete,
                                TEST_TIMEOUTS.SHORT,
                                100,
                                'Operation did not complete in time'
                            )

                            assert.ok(operationComplete, 'Operation should complete')
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
            if (workspaceUri) {
                await cleanupTestWorkspace(workspaceUri)
            }
        }

        run.end()
    })

    // Add test items
    rootSuite.children.add(testController.createTestItem(
        'extension.present',
        'Extension should be present'
    ))

    rootSuite.children.add(testController.createTestItem(
        'extension.activate',
        'Extension should activate'
    ))

    rootSuite.children.add(testController.createTestItem(
        'extension.commands',
        'Commands should be registered'
    ))

    rootSuite.children.add(testController.createTestItem(
        'extension.workspace',
        'Should handle workspace operations'
    ))

    rootSuite.children.add(testController.createTestItem(
        'extension.config',
        'Should handle configuration changes'
    ))

    rootSuite.children.add(testController.createTestItem(
        'extension.async',
        'Should handle async operations'
    ))
}