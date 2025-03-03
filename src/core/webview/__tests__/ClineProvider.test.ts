import * as vscode from 'vscode'
import * as assert from 'assert'
import { ClineProvider } from "../ClineProvider"
import { StateManager } from "../ClineProviderState"
import { TaskManager } from "../ClineProviderTasks"
import { HtmlGenerator } from "../ClineProviderHtml"
import { McpHub } from "../../../services/mcp/McpHub"
import { ConfigManager } from "../../config/ConfigManager"
import { CustomModesManager } from "../../config/CustomModesManager"
import { logger } from "../../../utils/logging"
import { ExtensionMessage } from "../../../shared/ExtensionMessage"

export async function activateClineProviderTests(context: vscode.ExtensionContext): Promise<void> {
    const testController = vscode.tests.createTestController('clineProviderTests', 'ClineProvider Tests')
    context.subscriptions.push(testController)

    // Root test item
    const rootSuite = testController.createTestItem('clineProvider', 'ClineProvider')
    testController.items.add(rootSuite)

    // Create test suites
    const clineProviderSuite = testController.createTestItem('clineProviderTests', 'ClineProvider Tests')
    rootSuite.children.add(clineProviderSuite)

    // Add test cases
    clineProviderSuite.children.add(testController.createTestItem(
        'should-initialize-correctly',
        'should initialize correctly'
    ))
    clineProviderSuite.children.add(testController.createTestItem(
        'should-resolve-webview-view',
        'should resolve webview view'
    ))
    clineProviderSuite.children.add(testController.createTestItem(
        'should-dispose-resources',
        'should dispose resources'
    ))
    clineProviderSuite.children.add(testController.createTestItem(
        'should-get-visible-instance',
        'should get visible instance'
    ))
    clineProviderSuite.children.add(testController.createTestItem(
        'should-get-instance',
        'should get instance'
    ))
    clineProviderSuite.children.add(testController.createTestItem(
        'should-check-active-task',
        'should check active task'
    ))
    clineProviderSuite.children.add(testController.createTestItem(
        'should-post-message-to-webview',
        'should post message to webview'
    ))
    clineProviderSuite.children.add(testController.createTestItem(
        'should-clear-task',
        'should clear task'
    ))
    clineProviderSuite.children.add(testController.createTestItem(
        'should-get-mcp-hub',
        'should get mcp hub'
    ))

    // Create run profile
    testController.createRunProfile('run', vscode.TestRunProfileKind.Run, async (request) => {
        const queue: vscode.TestItem[] = []
        if (request.include) {
            request.include.forEach(test => queue.push(test))
        }

        const run = testController.createTestRun(request)

        // Mock dependencies
        const mockOutputChannel = {
            name: 'Test Output Channel',
            appendLine: () => {},
            append: () => {},
            replace: () => {},
            clear: () => {},
            show: () => {},
            hide: () => {},
            dispose: () => {},
        } as vscode.OutputChannel

        // Mock webview
        const mockWebview = {
            onDidReceiveMessage: () => ({ dispose: () => {} }),
            postMessage: async () => true,
            html: "",
            options: {},
            cspSource: "https://test.com",
            asWebviewUri: (uri: vscode.Uri) => uri,
        } as unknown as vscode.Webview

        // Mock webview view
        const mockWebviewView = {
            webview: mockWebview,
            onDidChangeVisibility: () => ({ dispose: () => {} }),
            onDidDispose: () => ({ dispose: () => {} }),
            visible: true,
            dispose: () => {},
        } as unknown as vscode.WebviewView

        // Mock HtmlGenerator
        const originalHtmlGenerator = HtmlGenerator.prototype.getHtmlContent
        HtmlGenerator.prototype.getHtmlContent = function() {
            return "<html></html>"
        }

        for (const test of queue) {
            run.started(test)
            try {
                // Create a new provider for each test
                const provider = new ClineProvider(context, mockOutputChannel)

                switch (test.id) {
                    case 'should-initialize-correctly': {
                        assert.ok(provider instanceof ClineProvider, "Provider should be an instance of ClineProvider")
                        break
                    }
                    case 'should-resolve-webview-view': {
                        await provider.resolveWebviewView(mockWebviewView)
                        assert.ok(true, "Webview view should be resolved without errors")
                        break
                    }
                    case 'should-dispose-resources': {
                        provider["view"] = mockWebviewView
                        await provider.dispose()
                        assert.ok(true, "Provider should dispose without errors")
                        break
                    }
                    case 'should-get-visible-instance': {
                        // Add the provider to the active instances
                        ClineProvider["activeInstances"].add(provider)
                        provider["view"] = mockWebviewView

                        const result = ClineProvider.getVisibleInstance()
                        assert.strictEqual(result, provider, "Should return the visible instance")

                        // Clean up
                        ClineProvider["activeInstances"].delete(provider)
                        break
                    }
                    case 'should-get-instance': {
                        // Add the provider to the active instances
                        ClineProvider["activeInstances"].add(provider)
                        provider["view"] = mockWebviewView

                        const result = await ClineProvider.getInstance()
                        assert.strictEqual(result, provider, "Should return the instance")

                        // Clean up
                        ClineProvider["activeInstances"].delete(provider)
                        break
                    }
                    case 'should-check-active-task': {
                        // Add the provider to the active instances
                        ClineProvider["activeInstances"].add(provider)
                        provider["view"] = mockWebviewView
                        provider["cline"] = {} as any

                        const result = await ClineProvider.isActiveTask()
                        assert.strictEqual(result, true, "Should return true when there is an active task")

                        // Clean up
                        ClineProvider["activeInstances"].delete(provider)
                        break
                    }
                    case 'should-post-message-to-webview': {
                        provider["view"] = mockWebviewView

                        const message: ExtensionMessage = { type: "action", action: "didBecomeVisible" }
                        await provider.postMessageToWebview(message)
                        assert.ok(true, "Should post message to webview without errors")
                        break
                    }
                    case 'should-clear-task': {
                        // Set up a mock cline with an abortTask method
                        provider["cline"] = {
                            abortTask: () => {},
                        } as any

                        await provider.clearTask()
                        assert.strictEqual(provider["cline"], undefined, "Should clear the cline")
                        break
                    }
                    case 'should-get-mcp-hub': {
                        const mockMcpHub = {} as McpHub
                        provider["mcpHub"] = mockMcpHub

                        const result = provider.getMcpHub()
                        assert.strictEqual(result, mockMcpHub, "Should return the mcpHub")
                        break
                    }
                }
                run.passed(test)
            } catch (err) {
                run.failed(test, new vscode.TestMessage(err instanceof Error ? err.message : String(err)))
            }
        }

        // Restore original implementation
        HtmlGenerator.prototype.getHtmlContent = originalHtmlGenerator

        run.end()
    })
}