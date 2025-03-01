import * as vscode from 'vscode'
import * as assert from 'assert'
import { SYSTEM_PROMPT } from '../system'
import { McpHub } from '../../../services/mcp/McpHub'
import { McpServer } from '../../../shared/mcp'
import { ClineProvider } from '../../../core/webview/ClineProvider'
import { SearchReplaceDiffStrategy } from '../../../core/diff/strategies/search-replace'
import fs from 'fs/promises'
import os from 'os'
import { defaultModeSlug, modes } from '../../../shared/modes'
// Import path utils to get access to toPosix string extension
import '../../../utils/path'
import { addCustomInstructions } from '../sections/custom-instructions'
import * as modesSection from '../sections/modes'
import { EXPERIMENT_IDS } from '../../../shared/experiments'

// Mock modules
const mockFs = {
    _mockDirectories: new Set<string>(),
    _setInitialMockData: () => {},
    mkdir: (path: string) => {
        if (path.startsWith('/test')) {
            mockFs._mockDirectories.add(path)
            return Promise.resolve()
        }
        throw new Error(`ENOENT: no such file or directory, mkdir '${path}'`)
    }
}

// Mock the sections
const mockModesSection = {
    getModesSection: async () => `====\n\nMODES\n\n- Test modes section`
}

// Create a minimal mock of ClineProvider
const mockProvider = {
    ensureMcpServersDirectoryExists: async () => '/mock/mcp/path',
    ensureSettingsDirectoryExists: async () => '/mock/settings/path',
    postMessageToWebview: async () => {},
    context: {
        extensionPath: '/mock/extension/path',
        globalStoragePath: '/mock/storage/path',
        storagePath: '/mock/storage/path',
        logPath: '/mock/log/path',
        subscriptions: [],
        workspaceState: {
            get: () => undefined,
            update: () => Promise.resolve(),
        },
        globalState: {
            get: () => undefined,
            update: () => Promise.resolve(),
            setKeysForSync: () => {},
        },
        extensionUri: { fsPath: '/mock/extension/path' },
        globalStorageUri: { fsPath: '/mock/settings/path' },
        asAbsolutePath: (relativePath: string) => `/mock/extension/path/${relativePath}`,
        extension: {
            packageJSON: {
                version: '1.0.0',
            },
        },
    } as unknown as vscode.ExtensionContext
} as unknown as ClineProvider

// Instead of extending McpHub, create a mock that implements just what we need
const createMockMcpHub = (): McpHub => ({
    getServers: () => [],
    getMcpServersPath: async () => '/mock/mcp/path',
    getMcpSettingsFilePath: async () => '/mock/settings/path',
    dispose: async () => {},
    restartConnection: async () => {},
    readResource: async () => ({ contents: [] }),
    callTool: async () => ({ content: [] }),
    toggleServerDisabled: async () => {},
    toggleToolAlwaysAllow: async () => {},
    isConnecting: false,
    connections: [],
}) as unknown as McpHub

export async function activateSystemPromptTests(context: vscode.ExtensionContext): Promise<void> {
    const testController = vscode.tests.createTestController('systemPromptTests', 'System Prompt Tests')
    context.subscriptions.push(testController)

    const rootSuite = testController.createTestItem('system-prompt', 'System Prompt')
    testController.items.add(rootSuite)

    // Main test suites
    const basePromptSuite = testController.createTestItem('base-prompt', 'Base System Prompt')
    rootSuite.children.add(basePromptSuite)

    const browserSuite = testController.createTestItem('browser', 'Browser Support')
    rootSuite.children.add(browserSuite)

    const mcpSuite = testController.createTestItem('mcp', 'MCP Integration')
    rootSuite.children.add(mcpSuite)

    const diffStrategySuite = testController.createTestItem('diff-strategy', 'Diff Strategy')
    rootSuite.children.add(diffStrategySuite)

    const languageSuite = testController.createTestItem('language', 'Language Support')
    rootSuite.children.add(languageSuite)

    const customModesSuite = testController.createTestItem('custom-modes', 'Custom Modes')
    rootSuite.children.add(customModesSuite)

    const experimentalSuite = testController.createTestItem('experimental', 'Experimental Features')
    rootSuite.children.add(experimentalSuite)

    // Add test cases
    basePromptSuite.children.add(testController.createTestItem(
        'consistent-prompt',
        'should maintain consistent system prompt'
    ))

    browserSuite.children.add(testController.createTestItem(
        'browser-actions',
        'should include browser actions when supportsComputerUse is true'
    ))

    browserSuite.children.add(testController.createTestItem(
        'viewport-size',
        'should handle different browser viewport sizes'
    ))

    mcpSuite.children.add(testController.createTestItem(
        'mcp-info',
        'should include MCP server info when mcpHub is provided'
    ))

    mcpSuite.children.add(testController.createTestItem(
        'mcp-undefined',
        'should explicitly handle undefined mcpHub'
    ))

    diffStrategySuite.children.add(testController.createTestItem(
        'diff-enabled',
        'should include diff strategy tool description when diffEnabled is true'
    ))

    diffStrategySuite.children.add(testController.createTestItem(
        'diff-disabled',
        'should exclude diff strategy tool description when diffEnabled is false'
    ))

    languageSuite.children.add(testController.createTestItem(
        'preferred-language',
        'should include preferred language in custom instructions'
    ))

    customModesSuite.children.add(testController.createTestItem(
        'custom-mode-role',
        'should include custom mode role definition at top and instructions at bottom'
    ))

    experimentalSuite.children.add(testController.createTestItem(
        'experimental-disabled',
        'should disable experimental tools by default'
    ))

    experimentalSuite.children.add(testController.createTestItem(
        'experimental-enabled',
        'should enable experimental tools when explicitly enabled'
    ))

    // Create run profile
    testController.createRunProfile('run', vscode.TestRunProfileKind.Run, async (request) => {
        const queue: vscode.TestItem[] = []
        if (request.include) {
            request.include.forEach(test => queue.push(test))
        }

        const run = testController.createTestRun(request)

        for (const test of queue) {
            run.started(test)

            try {
                const mockContext = {
                    extensionPath: '/mock/extension/path',
                    globalStoragePath: '/mock/storage/path',
                    storagePath: '/mock/storage/path',
                    logPath: '/mock/log/path',
                    subscriptions: [],
                    workspaceState: {
                        get: () => undefined,
                        update: () => Promise.resolve(),
                    },
                    globalState: {
                        get: () => undefined,
                        update: () => Promise.resolve(),
                        setKeysForSync: () => {},
                    },
                    extensionUri: { fsPath: '/mock/extension/path' },
                    globalStorageUri: { fsPath: '/mock/settings/path' },
                    asAbsolutePath: (relativePath: string) => `/mock/extension/path/${relativePath}`,
                    extension: {
                        packageJSON: {
                            version: '1.0.0',
                        },
                    },
                } as unknown as vscode.ExtensionContext

                const experiments = {
                    [EXPERIMENT_IDS.SEARCH_AND_REPLACE]: false,
                    [EXPERIMENT_IDS.INSERT_BLOCK]: false,
                }

                switch (test.id) {
                    case 'consistent-prompt': {
                        const prompt = await SYSTEM_PROMPT(
                            mockContext,
                            '/test/path',
                            false,
                            undefined,
                            undefined,
                            undefined,
                            defaultModeSlug,
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            experiments,
                            true
                        )
                        assert.ok(prompt.includes('TOOL USE'))
                        assert.ok(prompt.includes('MODES'))
                        break
                    }

                    case 'browser-actions': {
                        const prompt = await SYSTEM_PROMPT(
                            mockContext,
                            '/test/path',
                            true,
                            undefined,
                            undefined,
                            '1280x800',
                            defaultModeSlug,
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            experiments,
                            true
                        )
                        assert.ok(prompt.includes('browser_action'))
                        assert.ok(prompt.includes('1280x800'))
                        break
                    }

                    case 'viewport-size': {
                        const prompt = await SYSTEM_PROMPT(
                            mockContext,
                            '/test/path',
                            true,
                            undefined,
                            undefined,
                            '900x600',
                            defaultModeSlug,
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            experiments,
                            true
                        )
                        assert.ok(prompt.includes('900x600'))
                        break
                    }

                    case 'mcp-info': {
                        const mockMcpHub = createMockMcpHub()
                        const prompt = await SYSTEM_PROMPT(
                            mockContext,
                            '/test/path',
                            false,
                            mockMcpHub,
                            undefined,
                            undefined,
                            defaultModeSlug,
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            experiments,
                            true
                        )
                        assert.ok(prompt.includes('MCP'))
                        await mockMcpHub.dispose()
                        break
                    }

                    case 'mcp-undefined': {
                        const prompt = await SYSTEM_PROMPT(
                            mockContext,
                            '/test/path',
                            false,
                            undefined,
                            undefined,
                            undefined,
                            defaultModeSlug,
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            experiments,
                            true
                        )
                        assert.ok(!prompt.includes('Creating an MCP Server'))
                        break
                    }

                    case 'diff-enabled': {
                        const prompt = await SYSTEM_PROMPT(
                            mockContext,
                            '/test/path',
                            false,
                            undefined,
                            new SearchReplaceDiffStrategy(),
                            undefined,
                            defaultModeSlug,
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            true,
                            experiments,
                            true
                        )
                        assert.ok(prompt.includes('apply_diff'))
                        break
                    }

                    case 'diff-disabled': {
                        const prompt = await SYSTEM_PROMPT(
                            mockContext,
                            '/test/path',
                            false,
                            undefined,
                            new SearchReplaceDiffStrategy(),
                            undefined,
                            defaultModeSlug,
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            false,
                            experiments,
                            true
                        )
                        assert.ok(!prompt.includes('apply_diff'))
                        break
                    }

                    case 'preferred-language': {
                        const prompt = await SYSTEM_PROMPT(
                            mockContext,
                            '/test/path',
                            false,
                            undefined,
                            undefined,
                            undefined,
                            defaultModeSlug,
                            undefined,
                            undefined,
                            undefined,
                            'Spanish',
                            undefined,
                            experiments,
                            true
                        )
                        assert.ok(prompt.includes('Language Preference:'))
                        assert.ok(prompt.includes('You should always speak and think in the Spanish language'))
                        break
                    }

                    case 'custom-mode-role': {
                        const modeCustomInstructions = 'Custom mode instructions'
                        const customModes = [
                            {
                                slug: 'custom-mode',
                                name: 'Custom Mode',
                                roleDefinition: 'Custom role definition',
                                customInstructions: modeCustomInstructions,
                                groups: ['read'] as const,
                            },
                        ]
                        const prompt = await SYSTEM_PROMPT(
                            mockContext,
                            '/test/path',
                            false,
                            undefined,
                            undefined,
                            undefined,
                            'custom-mode',
                            undefined,
                            customModes,
                            'Global instructions',
                            undefined,
                            undefined,
                            experiments,
                            true
                        )
                        const roleDefIndex = prompt.indexOf('Custom role definition')
                        const toolUseIndex = prompt.indexOf('TOOL USE')
                        const customInstrIndex = prompt.indexOf('Custom mode instructions')
                        const userInstrHeader = prompt.indexOf('USER\'S CUSTOM INSTRUCTIONS')

                        assert.ok(roleDefIndex < toolUseIndex, 'Role definition should be before TOOL USE')
                        assert.ok(customInstrIndex > userInstrHeader, 'Custom instructions should be after header')
                        break
                    }

                    case 'experimental-disabled': {
                        const prompt = await SYSTEM_PROMPT(
                            mockContext,
                            '/test/path',
                            false,
                            undefined,
                            undefined,
                            undefined,
                            defaultModeSlug,
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            { 
                                [EXPERIMENT_IDS.SEARCH_AND_REPLACE]: false,
                                [EXPERIMENT_IDS.INSERT_BLOCK]: false
                            },
                            true
                        )
                        assert.ok(!prompt.includes(EXPERIMENT_IDS.SEARCH_AND_REPLACE))
                        assert.ok(!prompt.includes(EXPERIMENT_IDS.INSERT_BLOCK))
                        break
                    }

                    case 'experimental-enabled': {
                        const prompt = await SYSTEM_PROMPT(
                            mockContext,
                            '/test/path',
                            false,
                            undefined,
                            undefined,
                            undefined,
                            defaultModeSlug,
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            {
                                [EXPERIMENT_IDS.SEARCH_AND_REPLACE]: true,
                                [EXPERIMENT_IDS.INSERT_BLOCK]: true
                            },
                            true
                        )
                        assert.ok(prompt.includes(EXPERIMENT_IDS.SEARCH_AND_REPLACE))
                        assert.ok(prompt.includes(EXPERIMENT_IDS.INSERT_BLOCK))
                        break
                    }
                }
                run.passed(test)
            } catch (err) {
                run.failed(test, new vscode.TestMessage(err instanceof Error ? err.message : String(err)))
            }
        }
        run.end()
    })
}
