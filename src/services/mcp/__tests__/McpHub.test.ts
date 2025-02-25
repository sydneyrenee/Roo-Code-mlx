import * as vscode from 'vscode'
import * as assert from 'assert'
import type { McpHub as McpHubType } from "../McpHub"
import type { ClineProvider } from "../../../core/webview/ClineProvider"
import type { ExtensionContext, Uri } from "vscode"
import type { McpConnection } from "../McpHub"
import { StdioConfigSchema } from "../McpHub"
import * as fs from "fs/promises"

// Mock classes
class MockMemento implements vscode.Memento {
    private storage = new Map<string, any>()

    get<T>(key: string): T | undefined {
        return this.storage.get(key)
    }

    update(key: string, value: any): Thenable<void> {
        this.storage.set(key, value)
        return Promise.resolve()
    }

    keys(): readonly string[] {
        return Array.from(this.storage.keys())
    }
}

class MockGlobalMemento extends MockMemento implements vscode.Memento {
    setKeysForSync(keys: readonly string[]): void {
        // No-op for testing
    }
}

class MockSecretStorage implements vscode.SecretStorage {
    private secrets = new Map<string, string>()
    private _onDidChange = new vscode.EventEmitter<vscode.SecretStorageChangeEvent>()
    readonly onDidChange = this._onDidChange.event

    get(key: string): Thenable<string | undefined> {
        return Promise.resolve(this.secrets.get(key))
    }

    store(key: string, value: string): Thenable<void> {
        this.secrets.set(key, value)
        return Promise.resolve()
    }

    delete(key: string): Thenable<void> {
        this.secrets.delete(key)
        return Promise.resolve()
    }
}

class MockEnvironmentVariableCollection implements vscode.EnvironmentVariableCollection {
    private variables = new Map<string, vscode.EnvironmentVariableMutator>()
    readonly persistent: boolean = true
    readonly description: string | undefined = undefined

    replace(variable: string, value: string): void {
        this.variables.set(variable, {
            value,
            type: vscode.EnvironmentVariableMutatorType.Replace,
            options: { applyAtProcessCreation: true }
        })
    }

    append(variable: string, value: string): void {
        this.variables.set(variable, {
            value,
            type: vscode.EnvironmentVariableMutatorType.Append,
            options: { applyAtProcessCreation: true }
        })
    }

    prepend(variable: string, value: string): void {
        this.variables.set(variable, {
            value,
            type: vscode.EnvironmentVariableMutatorType.Prepend,
            options: { applyAtProcessCreation: true }
        })
    }

    get(variable: string): vscode.EnvironmentVariableMutator | undefined {
        return this.variables.get(variable)
    }

    forEach(callback: (variable: string, mutator: vscode.EnvironmentVariableMutator, collection: vscode.EnvironmentVariableCollection) => void): void {
        this.variables.forEach((mutator, variable) => callback(variable, mutator, this))
    }

    delete(variable: string): void {
        this.variables.delete(variable)
    }

    clear(): void {
        this.variables.clear()
    }

    [Symbol.iterator](): Iterator<[string, vscode.EnvironmentVariableMutator]> {
        return this.variables.entries()
    }

    getScoped(scope: vscode.EnvironmentVariableScope): vscode.EnvironmentVariableCollection {
        return this
    }
}

export async function activateMcpHubTests(context: vscode.ExtensionContext): Promise<void> {
    const testController = vscode.tests.createTestController('mcpHubTests', 'MCP Hub Tests')
    context.subscriptions.push(testController)

    const rootSuite = testController.createTestItem('mcpHub', 'MCP Hub')
    testController.items.add(rootSuite)

    // Store original functions
    const originalReadFile = fs.readFile
    const originalWriteFile = fs.writeFile

    testController.createRunProfile('run', vscode.TestRunProfileKind.Run, async (request) => {
        const queue: vscode.TestItem[] = []

        if (request.include) {
            request.include.forEach(test => queue.push(test))
        }

        const run = testController.createTestRun(request)

        for (const test of queue) {
            run.started(test)

            try {
                // Setup mock provider and context
                const mockUri: Uri = {
                    scheme: "file",
                    authority: "",
                    path: "/test/path",
                    query: "",
                    fragment: "",
                    fsPath: "/test/path",
                    with: () => mockUri,
                    toJSON: () => ({})
                }

                const mockContext: ExtensionContext = {
                    subscriptions: [],
                    workspaceState: new MockMemento(),
                    globalState: new MockGlobalMemento(),
                    secrets: new MockSecretStorage(),
                    extensionUri: mockUri,
                    extensionPath: "/test/path",
                    environmentVariableCollection: new MockEnvironmentVariableCollection(),
                    asAbsolutePath: (relativePath: string) => relativePath,
                    storagePath: "/test/storage",
                    globalStoragePath: "/test/global-storage",
                    logPath: "/test/log",
                    extensionMode: vscode.ExtensionMode.Test,
                    extension: {
                        id: "test-extension",
                        extensionUri: mockUri,
                        extensionPath: "/test/path",
                        isActive: true,
                        packageJSON: { version: "1.0.0" },
                        extensionKind: vscode.ExtensionKind.Workspace,
                        exports: undefined,
                        activate: () => Promise.resolve()
                    },
                    storageUri: mockUri,
                    globalStorageUri: mockUri,
                    logUri: mockUri,
                    languageModelAccessInformation: {} as vscode.LanguageModelAccessInformation
                }

                const mockProvider: Partial<ClineProvider> = {
                    ensureSettingsDirectoryExists: async () => "/mock/settings/path",
                    ensureMcpServersDirectoryExists: async () => "/mock/settings/path",
                    postMessageToWebview: async () => {},
                    context: mockContext
                }

                // Mock fs functions
                let mockFileContent = JSON.stringify({
                    mcpServers: {
                        "test-server": {
                            command: "node",
                            args: ["test.js"],
                            alwaysAllow: ["allowed-tool"]
                        }
                    }
                })

                let writtenContent: string | undefined

                ;(global as any).fs = {
                    readFile: async () => mockFileContent,
                    writeFile: async (_path: string, content: string) => {
                        writtenContent = content
                    }
                }

                // Create McpHub instance
                const { McpHub } = require("../McpHub")
                const mcpHub = new McpHub(mockProvider as ClineProvider)

                switch (test.id) {
                    case 'tool.alwaysAllow.enable': {
                        mockFileContent = JSON.stringify({
                            mcpServers: {
                                "test-server": {
                                    command: "node",
                                    args: ["test.js"],
                                    alwaysAllow: []
                                }
                            }
                        })

                        await mcpHub.toggleToolAlwaysAllow("test-server", "new-tool", true)

                        const writtenConfig = JSON.parse(writtenContent!)
                        assert.ok(writtenConfig.mcpServers["test-server"].alwaysAllow.includes("new-tool"))
                        break
                    }

                    case 'tool.alwaysAllow.disable': {
                        mockFileContent = JSON.stringify({
                            mcpServers: {
                                "test-server": {
                                    command: "node",
                                    args: ["test.js"],
                                    alwaysAllow: ["existing-tool"]
                                }
                            }
                        })

                        await mcpHub.toggleToolAlwaysAllow("test-server", "existing-tool", false)

                        const writtenConfig = JSON.parse(writtenContent!)
                        assert.ok(!writtenConfig.mcpServers["test-server"].alwaysAllow.includes("existing-tool"))
                        break
                    }

                    case 'server.disabled.toggle': {
                        mockFileContent = JSON.stringify({
                            mcpServers: {
                                "test-server": {
                                    command: "node",
                                    args: ["test.js"],
                                    disabled: false
                                }
                            }
                        })

                        await mcpHub.toggleServerDisabled("test-server", true)

                        const writtenConfig = JSON.parse(writtenContent!)
                        assert.strictEqual(writtenConfig.mcpServers["test-server"].disabled, true)
                        break
                    }

                    case 'server.disabled.filter': {
                        const mockConnections: McpConnection[] = [
                            {
                                server: {
                                    name: "enabled-server",
                                    config: "{}",
                                    status: "connected",
                                    disabled: false
                                },
                                client: {} as any,
                                transport: {} as any
                            },
                            {
                                server: {
                                    name: "disabled-server",
                                    config: "{}",
                                    status: "connected",
                                    disabled: true
                                },
                                client: {} as any,
                                transport: {} as any
                            }
                        ]

                        mcpHub.connections = mockConnections
                        const servers = mcpHub.getServers()

                        assert.strictEqual(servers.length, 1)
                        assert.strictEqual(servers[0].name, "enabled-server")
                        break
                    }

                    case 'server.timeout.update': {
                        mockFileContent = JSON.stringify({
                            mcpServers: {
                                "test-server": {
                                    command: "node",
                                    args: ["test.js"],
                                    timeout: 60
                                }
                            }
                        })

                        await mcpHub.updateServerTimeout("test-server", 120)

                        const writtenConfig = JSON.parse(writtenContent!)
                        assert.strictEqual(writtenConfig.mcpServers["test-server"].timeout, 120)
                        break
                    }

                    case 'server.timeout.validate': {
                        // Test valid timeout values
                        const validConfig = {
                            command: "test",
                            timeout: 60
                        }
                        assert.doesNotThrow(() => StdioConfigSchema.parse(validConfig))

                        // Test invalid timeout values
                        const invalidConfigs = [
                            { command: "test", timeout: 0 },
                            { command: "test", timeout: 3601 },
                            { command: "test", timeout: -1 }
                        ]

                        for (const config of invalidConfigs) {
                            assert.throws(() => StdioConfigSchema.parse(config))
                        }
                        break
                    }

                    case 'server.timeout.default': {
                        const mockConnection: McpConnection = {
                            server: {
                                name: "test-server",
                                config: JSON.stringify({ command: "test" }),
                                status: "connected"
                            },
                            client: {
                                request: async () => ({ content: [] })
                            } as any,
                            transport: {} as any
                        }

                        let requestOptions: any
                        mockConnection.client.request = async (_req: any, _ctx: any, options: any) => {
                            requestOptions = options
                            return { content: [] }
                        }

                        mcpHub.connections = [mockConnection]
                        await mcpHub.callTool("test-server", "test-tool")

                        assert.strictEqual(requestOptions.timeout, 60000)
                        break
                    }
                }

                run.passed(test)
            } catch (err) {
                run.failed(test, new vscode.TestMessage(`Test failed: ${err}`))
            } finally {
                // Restore original functions
                ;(global as any).fs.readFile = originalReadFile
                ;(global as any).fs.writeFile = originalWriteFile
            }
        }

        run.end()
    })

    // Tool Always Allow tests
    const toolSuite = testController.createTestItem('tool', 'Tool Always Allow')
    rootSuite.children.add(toolSuite)

    toolSuite.children.add(testController.createTestItem(
        'tool.alwaysAllow.enable',
        'should add tool to always allow list when enabling'
    ))

    toolSuite.children.add(testController.createTestItem(
        'tool.alwaysAllow.disable',
        'should remove tool from always allow list when disabling'
    ))

    // Server Disabled State tests
    const serverSuite = testController.createTestItem('server', 'Server State')
    rootSuite.children.add(serverSuite)

    serverSuite.children.add(testController.createTestItem(
        'server.disabled.toggle',
        'should toggle server disabled state'
    ))

    serverSuite.children.add(testController.createTestItem(
        'server.disabled.filter',
        'should filter out disabled servers from getServers'
    ))

    // Server Timeout tests
    const timeoutSuite = testController.createTestItem('timeout', 'Server Timeout')
    rootSuite.children.add(timeoutSuite)

    timeoutSuite.children.add(testController.createTestItem(
        'server.timeout.update',
        'should update server timeout in settings file'
    ))

    timeoutSuite.children.add(testController.createTestItem(
        'server.timeout.validate',
        'should validate timeout values'
    ))

    timeoutSuite.children.add(testController.createTestItem(
        'server.timeout.default',
        'should use default timeout of 60 seconds if not specified'
    ))
}
