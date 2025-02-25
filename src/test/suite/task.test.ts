import * as vscode from 'vscode'
import * as assert from 'assert'

// Extend globalThis with our extension types
declare global {
    var extension: boolean
    var provider: {
        viewLaunched: boolean
        messages: Array<{
            type: string
            text?: string
        }>
        updateGlobalState(key: string, value: any): Promise<void>
    }
    var api: {
        startNewTask(prompt: string): Promise<void>
    }
}

export async function activateTaskTests(context: vscode.ExtensionContext): Promise<void> {
    const testController = vscode.tests.createTestController('taskTests', 'Task Tests')
    context.subscriptions.push(testController)

    const rootSuite = testController.createTestItem('task', 'Task')
    testController.items.add(rootSuite)

    testController.createRunProfile('run', vscode.TestRunProfileKind.Run, async (request) => {
        const queue: vscode.TestItem[] = []

        if (request.include) {
            request.include.forEach(test => queue.push(test))
        }

        const run = testController.createTestRun(request)

        for (const test of queue) {
            run.started(test)

            try {
                switch (test.id) {
                    case 'task.prompt': {
                        const timeout = 30000
                        const interval = 1000

                        if (!globalThis.extension) {
                            throw new Error("Extension not found")
                        }

                        // Ensure the webview is launched
                        let startTime = Date.now()

                        while (Date.now() - startTime < timeout) {
                            if (globalThis.provider.viewLaunched) {
                                break
                            }

                            await new Promise((resolve) => setTimeout(resolve, interval))
                        }

                        await globalThis.provider.updateGlobalState("mode", "Code")
                        await globalThis.provider.updateGlobalState("alwaysAllowModeSwitch", true)
                        await globalThis.provider.updateGlobalState("autoApprovalEnabled", true)

                        await globalThis.api.startNewTask("Hello world, what is your name? Respond with 'My name is ...'")

                        // Wait for task to appear in history with tokens
                        startTime = Date.now()

                        while (Date.now() - startTime < timeout) {
                            const messages = globalThis.provider.messages

                            if (messages.some(({ type, text }) => type === "say" && text?.includes("My name is Roo"))) {
                                break
                            }

                            await new Promise((resolve) => setTimeout(resolve, interval))
                        }

                        if (globalThis.provider.messages.length === 0) {
                            throw new Error("No messages received")
                        }

                        assert.ok(
                            globalThis.provider.messages.some(
                                ({ type, text }) => type === "say" && text?.includes("My name is Roo")
                            ),
                            "Did not receive expected response containing 'My name is Roo'"
                        )
                        break
                    }
                }

                run.passed(test)
            } catch (err) {
                run.failed(test, new vscode.TestMessage(`Test failed: ${err}`))
            }
        }

        run.end()
    })

    // Add test items
    rootSuite.children.add(testController.createTestItem(
        'task.prompt',
        'Should handle prompt and response correctly'
    ))
}
