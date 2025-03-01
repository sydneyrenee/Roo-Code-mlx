import * as vscode from "vscode"
import * as assert from "assert"
import { TerminalRegistry } from "../TerminalRegistry"

export async function activateTerminalRegistryTests(context: vscode.ExtensionContext): Promise<void> {
    const testController = vscode.tests.createTestController('terminalRegistryTests', 'Terminal Registry Tests')
    context.subscriptions.push(testController)

    const rootSuite = testController.createTestItem('terminal-registry', 'Terminal Registry')
    testController.items.add(rootSuite)

    // Create test suites
    const createTerminalSuite = testController.createTestItem('create-terminal', 'createTerminal')
    rootSuite.children.add(createTerminalSuite)

    // Add test cases
    createTerminalSuite.children.add(testController.createTestItem(
        'pager-setting',
        'creates terminal with PAGER set to cat'
    ))

    // Create run profile
    testController.createRunProfile('run', vscode.TestRunProfileKind.Run, async (request) => {
        const queue: vscode.TestItem[] = []
        if (request.include) {
            request.include.forEach(test => queue.push(test))
        }

        const run = testController.createTestRun(request)

        // Store original createTerminal
        const originalCreateTerminal = vscode.window.createTerminal

        for (const test of queue) {
            run.started(test)
            try {
                switch (test.id) {
                    case 'pager-setting': {
                        let capturedOptions: any = null
                        
                        // Mock createTerminal
                        vscode.window.createTerminal = (options: any) => {
                            capturedOptions = options
                            return {
                                exitStatus: undefined,
                            } as any
                        }

                        // Call the function being tested
                        TerminalRegistry.createTerminal("/test/path")

                        // Assertions
                        assert.ok(capturedOptions, "createTerminal should have been called")
                        assert.strictEqual(capturedOptions.cwd, "/test/path")
                        assert.strictEqual(capturedOptions.name, "Roo Code")
                        assert.ok(capturedOptions.iconPath, "iconPath should be defined")
                        assert.ok(capturedOptions.env, "env should be defined")
                        assert.strictEqual(capturedOptions.env.PAGER, "cat")
                        
                        break
                    }
                }
                run.passed(test)
            } catch (err) {
                run.failed(test, new vscode.TestMessage(err instanceof Error ? err.message : String(err)))
            } finally {
                // Restore original createTerminal
                vscode.window.createTerminal = originalCreateTerminal
            }
        }
        run.end()
    })
}
