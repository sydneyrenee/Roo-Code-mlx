import * as vscode from 'vscode';
import * as assert from 'assert';
import * as fs from 'fs/promises';
import type { McpHub as McpHubType } from '../../../../services/mcp/McpHub';
import type { ClineProvider } from '../../../../core/webview/ClineProvider';
import type { ExtensionContext, Uri } from 'vscode';
import type { McpConnection } from '../../../../services/mcp/McpHub';
import { StdioConfigSchema } from '../../../../services/mcp/McpHub';
import { createTestController } from '../../testController';
import { TestUtils } from '../../../testUtils';

const { McpHub } = require('../../../../services/mcp/McpHub');

// Mock modules
const mockFs = {
    readFile: async () => JSON.stringify({
        mcpServers: {
            'test-server': {
                command: 'node',
                args: ['test.js'],
                alwaysAllow: ['allowed-tool'],
            },
        },
    }),
    writeFile: async () => {}
};

const controller = createTestController('mcpHubTests', 'McpHub Tests');

// Root test item for McpHub
const mcpHubTests = controller.createTestItem('mcpHub', 'McpHub', vscode.Uri.file(__filename));
controller.items.add(mcpHubTests);

// Create mock provider and URI
const createMockProvider = () => {
    const mockUri: Uri = {
        scheme: 'file',
        authority: '',
        path: '/test/path',
        query: '',
        fragment: '',
        fsPath: '/test/path',
        with: () => mockUri,
        toJSON: () => ({})
    };

    const mockProvider: Partial<ClineProvider> = {
        ensureSettingsDirectoryExists: async () => '/mock/settings/path',
        ensureMcpServersDirectoryExists: async () => '/mock/settings/path',
        postMessageToWebview: async () => {},
        context: {
            subscriptions: [],
            workspaceState: {} as any,
            globalState: {} as any,
            secrets: {} as any,
            extensionUri: mockUri,
            extensionPath: '/test/path',
            storagePath: '/test/storage',
            globalStoragePath: '/test/global-storage',
            environmentVariableCollection: {} as any,
            extension: {
                id: 'test-extension',
                extensionUri: mockUri,
                extensionPath: '/test/path',
                extensionKind: 1,
                isActive: true,
                packageJSON: {
                    version: '1.0.0',
                },
                activate: async () => {},
                exports: undefined,
            } as any,
            asAbsolutePath: (path: string) => path,
            storageUri: mockUri,
            globalStorageUri: mockUri,
            logUri: mockUri,
            extensionMode: 1,
            logPath: '/test/path',
            languageModelAccessInformation: {} as any,
        } as ExtensionContext,
    };

    return mockProvider;
};

// Toggle Tool Always Allow Tests
const toggleToolTests = controller.createTestItem('toggle-tool', 'Toggle Tool Always Allow', vscode.Uri.file(__filename));
mcpHubTests.children.add(toggleToolTests);

// Test for adding tool to always allow list
toggleToolTests.children.add(
    TestUtils.createTest(
        controller,
        'add-tool',
        'should add tool to always allow list when enabling',
        vscode.Uri.file(__filename),
        async run => {
            // Override fs module with mocks
            (fs as any).readFile = mockFs.readFile;
            (fs as any).writeFile = mockFs.writeFile;

            const mockProvider = createMockProvider();
            const mcpHub = new McpHub(mockProvider as ClineProvider);

            const mockConfig = {
                mcpServers: {
                    'test-server': {
                        command: 'node',
                        args: ['test.js'],
                        alwaysAllow: [],
                    },
                },
            };

            // Mock reading initial config
            (fs as any).readFile = async () => JSON.stringify(mockConfig);

            await mcpHub.toggleToolAlwaysAllow('test-server', 'new-tool', true);

            // Create spy for writeFile
            let writtenConfig: any;
            (fs as any).writeFile = async (_path: string, content: string) => {
                writtenConfig = JSON.parse(content);
            };

            // Verify the config was updated correctly
            assert.ok(writtenConfig?.mcpServers['test-server'].alwaysAllow.includes('new-tool'),
                'Tool should be added to always allow list');
        }
    )
);

// Test for removing tool from always allow list
toggleToolTests.children.add(
    TestUtils.createTest(
        controller,
        'remove-tool',
        'should remove tool from always allow list when disabling',
        vscode.Uri.file(__filename),
        async run => {
            // Override fs module with mocks
            (fs as any).readFile = mockFs.readFile;
            (fs as any).writeFile = mockFs.writeFile;

            const mockProvider = createMockProvider();
            const mcpHub = new McpHub(mockProvider as ClineProvider);

            const mockConfig = {
                mcpServers: {
                    'test-server': {
                        command: 'node',
                        args: ['test.js'],
                        alwaysAllow: ['existing-tool'],
                    },
                },
            };

            // Mock reading initial config
            (fs as any).readFile = async () => JSON.stringify(mockConfig);

            await mcpHub.toggleToolAlwaysAllow('test-server', 'existing-tool', false);

            // Create spy for writeFile
            let writtenConfig: any;
            (fs as any).writeFile = async (_path: string, content: string) => {
                writtenConfig = JSON.parse(content);
            };

            // Verify the config was updated correctly
            assert.ok(!writtenConfig?.mcpServers['test-server'].alwaysAllow.includes('existing-tool'),
                'Tool should be removed from always allow list');
        }
    )
);

// Test for initializing alwaysAllow if it doesn't exist
toggleToolTests.children.add(
    TestUtils.createTest(
        controller,
        'initialize-always-allow',
        'should initialize alwaysAllow if it does not exist',
        vscode.Uri.file(__filename),
        async run => {
            // Override fs module with mocks
            (fs as any).readFile = mockFs.readFile;
            (fs as any).writeFile = mockFs.writeFile;

            const mockProvider = createMockProvider();
            const mcpHub = new McpHub(mockProvider as ClineProvider);

            const mockConfig = {
                mcpServers: {
                    'test-server': {
                        command: 'node',
                        args: ['test.js'],
                    },
                },
            };

            // Mock reading initial config
            (fs as any).readFile = async () => JSON.stringify(mockConfig);

            await mcpHub.toggleToolAlwaysAllow('test-server', 'new-tool', true);

            // Create spy for writeFile
            let writtenConfig: any;
            (fs as any).writeFile = async (_path: string, content: string) => {
                writtenConfig = JSON.parse(content);
            };

            // Verify the config was updated with initialized alwaysAllow
            assert.ok(Array.isArray(writtenConfig?.mcpServers['test-server'].alwaysAllow),
                'alwaysAllow should be initialized as array');
            assert.ok(writtenConfig?.mcpServers['test-server'].alwaysAllow.includes('new-tool'),
                'Tool should be added to initialized always allow list');
        }
    )
);

// Server Disabled State Tests
const serverDisabledTests = controller.createTestItem('server-disabled', 'Server Disabled State', vscode.Uri.file(__filename));
mcpHubTests.children.add(serverDisabledTests);

// Test for toggling server disabled state
serverDisabledTests.children.add(
    TestUtils.createTest(
        controller,
        'toggle-disabled',
        'should toggle server disabled state',
        vscode.Uri.file(__filename),
        async run => {
            // Override fs module with mocks
            (fs as any).readFile = mockFs.readFile;
            (fs as any).writeFile = mockFs.writeFile;

            const mockProvider = createMockProvider();
            const mcpHub = new McpHub(mockProvider as ClineProvider);

            const mockConfig = {
                mcpServers: {
                    'test-server': {
                        command: 'node',
                        args: ['test.js'],
                        disabled: false,
                    },
                },
            };

            // Mock reading initial config
            (fs as any).readFile = async () => JSON.stringify(mockConfig);

            await mcpHub.toggleServerDisabled('test-server', true);

            // Create spy for writeFile
            let writtenConfig: any;
            (fs as any).writeFile = async (_path: string, content: string) => {
                writtenConfig = JSON.parse(content);
            };

            // Verify the config was updated correctly
            assert.strictEqual(writtenConfig?.mcpServers['test-server'].disabled, true,
                'Server should be disabled');
        }
    )
);

// Test for filtering out disabled servers
serverDisabledTests.children.add(
    TestUtils.createTest(
        controller,
        'filter-disabled-servers',
        'should filter out disabled servers from getServers',
        vscode.Uri.file(__filename),
        async run => {
            // Override fs module with mocks
            (fs as any).readFile = mockFs.readFile;
            (fs as any).writeFile = mockFs.writeFile;

            const mockProvider = createMockProvider();
            const mcpHub = new McpHub(mockProvider as ClineProvider);

            const mockConnections: McpConnection[] = [
                {
                    server: {
                        name: 'enabled-server',
                        config: '{}',
                        status: 'connected',
                        disabled: false,
                    },
                    client: {} as any,
                    transport: {} as any,
                },
                {
                    server: {
                        name: 'disabled-server',
                        config: '{}',
                        status: 'connected',
                        disabled: true,
                    },
                    client: {} as any,
                    transport: {} as any,
                },
            ];

            mcpHub.connections = mockConnections;
            const servers = mcpHub.getServers();

            assert.strictEqual(servers.length, 1, 'Should only return enabled servers');
            assert.strictEqual(servers[0].name, 'enabled-server', 'Should return enabled server');
        }
    )
);

// Test for preventing tool calls on disabled servers
serverDisabledTests.children.add(
    TestUtils.createTest(
        controller,
        'prevent-tool-calls',
        'should prevent calling tools on disabled servers',
        vscode.Uri.file(__filename),
        async run => {
            // Override fs module with mocks
            (fs as any).readFile = mockFs.readFile;
            (fs as any).writeFile = mockFs.writeFile;

            const mockProvider = createMockProvider();
            const mcpHub = new McpHub(mockProvider as ClineProvider);

            const mockConnection: McpConnection = {
                server: {
                    name: 'disabled-server',
                    config: '{}',
                    status: 'connected',
                    disabled: true,
                },
                client: {
                    request: async () => ({ result: 'success' }),
                } as any,
                transport: {} as any,
            };

            mcpHub.connections = [mockConnection];

            await assert.rejects(
                () => mcpHub.callTool('disabled-server', 'some-tool', {}),
                /Server "disabled-server" is disabled and cannot be used/,
                'Should reject calls to disabled servers'
            );
        }
    )
);

// Test for preventing resource reads from disabled servers
serverDisabledTests.children.add(
    TestUtils.createTest(
        controller,
        'prevent-resource-reads',
        'should prevent reading resources from disabled servers',
        vscode.Uri.file(__filename),
        async run => {
            // Override fs module with mocks
            (fs as any).readFile = mockFs.readFile;
            (fs as any).writeFile = mockFs.writeFile;

            const mockProvider = createMockProvider();
            const mcpHub = new McpHub(mockProvider as ClineProvider);

            const mockConnection: McpConnection = {
                server: {
                    name: 'disabled-server',
                    config: '{}',
                    status: 'connected',
                    disabled: true,
                },
                client: {
                    request: async () => {},
                } as any,
                transport: {} as any,
            };

            mcpHub.connections = [mockConnection];

            await assert.rejects(
                () => mcpHub.readResource('disabled-server', 'some/uri'),
                /Server "disabled-server" is disabled/,
                'Should reject resource reads from disabled servers'
            );
        }
    )
);

// Call Tool Tests
const callToolTests = controller.createTestItem('call-tool', 'Call Tool', vscode.Uri.file(__filename));
mcpHubTests.children.add(callToolTests);

// Test for executing tool successfully
callToolTests.children.add(
    TestUtils.createTest(
        controller,
        'execute-tool',
        'should execute tool successfully',
        vscode.Uri.file(__filename),
        async run => {
            // Override fs module with mocks
            (fs as any).readFile = mockFs.readFile;
            (fs as any).writeFile = mockFs.writeFile;

            const mockProvider = createMockProvider();
            const mcpHub = new McpHub(mockProvider as ClineProvider);

            let requestArgs: any;
            const mockConnection: McpConnection = {
                server: {
                    name: 'test-server',
                    config: JSON.stringify({}),
                    status: 'connected' as const,
                },
                client: {
                    request: async (...args: any[]) => {
                        requestArgs = args;
                        return { result: 'success' };
                    },
                } as any,
                transport: {
                    start: async () => {},
                    close: async () => {},
                    stderr: { on: () => {} },
                } as any,
            };

            mcpHub.connections = [mockConnection];

            await mcpHub.callTool('test-server', 'some-tool', {});

            // Verify the request was made with correct parameters
            assert.deepStrictEqual(requestArgs[0], {
                method: 'tools/call',
                params: {
                    name: 'some-tool',
                    arguments: {},
                },
            }, 'Request should have correct method and params');

            assert.ok(requestArgs[2]?.timeout === 60000, 'Should use default 60 second timeout');
        }
    )
);

// Test for throwing error if server not found
callToolTests.children.add(
    TestUtils.createTest(
        controller,
        'server-not-found',
        'should throw error if server not found',
        vscode.Uri.file(__filename),
        async run => {
            // Override fs module with mocks
            (fs as any).readFile = mockFs.readFile;
            (fs as any).writeFile = mockFs.writeFile;

            const mockProvider = createMockProvider();
            const mcpHub = new McpHub(mockProvider as ClineProvider);

            await assert.rejects(
                () => mcpHub.callTool('non-existent-server', 'some-tool', {}),
                /No connection found for server: non-existent-server/,
                'Should reject when server not found'
            );
        }
    )
);

// Timeout Configuration Tests
const timeoutConfigTests = controller.createTestItem('timeout-config', 'Timeout Configuration', vscode.Uri.file(__filename));
callToolTests.children.add(timeoutConfigTests);

// Test for validating timeout values
timeoutConfigTests.children.add(
    TestUtils.createTest(
        controller,
        'validate-timeout',
        'should validate timeout values',
        vscode.Uri.file(__filename),
        async run => {
            // Test valid timeout values
            const validConfig = {
                command: 'test',
                timeout: 60,
            };
            assert.doesNotThrow(
                () => StdioConfigSchema.parse(validConfig),
                'Should accept valid timeout'
            );

            // Test invalid timeout values
            const invalidConfigs = [
                { command: 'test', timeout: 0 }, // Too low
                { command: 'test', timeout: 3601 }, // Too high
                { command: 'test', timeout: -1 }, // Negative
            ];

            for (const config of invalidConfigs) {
                assert.throws(
                    () => StdioConfigSchema.parse(config),
                    'Should reject invalid timeout'
                );
            }
        }
    )
);

// Test for using default timeout
timeoutConfigTests.children.add(
    TestUtils.createTest(
        controller,
        'default-timeout',
        'should use default timeout of 60 seconds if not specified',
        vscode.Uri.file(__filename),
        async run => {
            // Override fs module with mocks
            (fs as any).readFile = mockFs.readFile;
            (fs as any).writeFile = mockFs.writeFile;

            const mockProvider = createMockProvider();
            const mcpHub = new McpHub(mockProvider as ClineProvider);

            let requestOptions: any;
            const mockConnection: McpConnection = {
                server: {
                    name: 'test-server',
                    config: JSON.stringify({ command: 'test' }), // No timeout specified
                    status: 'connected',
                },
                client: {
                    request: async (_req: any, _params: any, options: any) => {
                        requestOptions = options;
                        return { content: [] };
                    },
                } as any,
                transport: {} as any,
            };

            mcpHub.connections = [mockConnection];
            await mcpHub.callTool('test-server', 'test-tool');

            assert.strictEqual(requestOptions?.timeout, 60000,
                'Should use default 60 second timeout');
        }
    )
);

// Test for applying configured timeout
timeoutConfigTests.children.add(
    TestUtils.createTest(
        controller,
        'configured-timeout',
        'should apply configured timeout to tool calls',
        vscode.Uri.file(__filename),
        async run => {
            // Override fs module with mocks
            (fs as any).readFile = mockFs.readFile;
            (fs as any).writeFile = mockFs.writeFile;

            const mockProvider = createMockProvider();
            const mcpHub = new McpHub(mockProvider as ClineProvider);

            let requestOptions: any;
            const mockConnection: McpConnection = {
                server: {
                    name: 'test-server',
                    config: JSON.stringify({ command: 'test', timeout: 120 }), // 2 minutes
                    status: 'connected',
                },
                client: {
                    request: async (_req: any, _params: any, options: any) => {
                        requestOptions = options;
                        return { content: [] };
                    },
                } as any,
                transport: {} as any,
            };

            mcpHub.connections = [mockConnection];
            await mcpHub.callTool('test-server', 'test-tool');

            assert.strictEqual(requestOptions?.timeout, 120000,
                'Should use configured 120 second timeout');
        }
    )
);

// Update Server Timeout Tests
const updateTimeoutTests = controller.createTestItem('update-timeout', 'Update Server Timeout', vscode.Uri.file(__filename));
mcpHubTests.children.add(updateTimeoutTests);

// Test for updating server timeout
updateTimeoutTests.children.add(
    TestUtils.createTest(
        controller,
        'update-timeout-value',
        'should update server timeout in settings file',
        vscode.Uri.file(__filename),
        async run => {
            // Override fs module with mocks
            (fs as any).readFile = mockFs.readFile;
            (fs as any).writeFile = mockFs.writeFile;

            const mockProvider = createMockProvider();
            const mcpHub = new McpHub(mockProvider as ClineProvider);

            const mockConfig = {
                mcpServers: {
                    'test-server': {
                        command: 'node',
                        args: ['test.js'],
                        timeout: 60,
                    },
                },
            };

            // Mock reading initial config
            (fs as any).readFile = async () => JSON.stringify(mockConfig);

            let writtenConfig: any;
            (fs as any).writeFile = async (_path: string, content: string) => {
                writtenConfig = JSON.parse(content);
            };

            await mcpHub.updateServerTimeout('test-server', 120);

            assert.strictEqual(writtenConfig?.mcpServers['test-server'].timeout, 120,
                'Should update timeout value');
        }
    )
);

// Test for fallback to default timeout
updateTimeoutTests.children.add(
    TestUtils.createTest(
        controller,
        'fallback-timeout',
        'should fallback to default timeout when config has invalid timeout',
        vscode.Uri.file(__filename),
        async run => {
            // Override fs module with mocks
            (fs as any).readFile = mockFs.readFile;
            (fs as any).writeFile = mockFs.writeFile;

            const mockProvider = createMockProvider();
            const mcpHub = new McpHub(mockProvider as ClineProvider);

            const mockConfig = {
                mcpServers: {
                    'test-server': {
                        command: 'node',
                        args: ['test.js'],
                        timeout: 60,
                    },
                },
            };

            // Mock initial read
            (fs as any).readFile = async () => JSON.stringify(mockConfig);

            // Update with invalid timeout
            await mcpHub.updateServerTimeout('test-server', 3601);

            let requestOptions: any;
            const mockConnection: McpConnection = {
                server: {
                    name: 'test-server',
                    config: JSON.stringify({
                        command: 'node',
                        args: ['test.js'],
                        timeout: 3601, // Invalid timeout
                    }),
                    status: 'connected',
                },
                client: {
                    request: async (_req: any, _params: any, options: any) => {
                        requestOptions = options;
                        return { content: [] };
                    },
                } as any,
                transport: {} as any,
            };

            mcpHub.connections = [mockConnection];

            // Call tool - should use default timeout
            await mcpHub.callTool('test-server', 'test-tool');

            assert.strictEqual(requestOptions?.timeout, 60000,
                'Should fallback to default 60 second timeout');
        }
    )
);

// Test for accepting valid timeout values
updateTimeoutTests.children.add(
    TestUtils.createTest(
        controller,
        'accept-valid-timeouts',
        'should accept valid timeout values',
        vscode.Uri.file(__filename),
        async run => {
            // Override fs module with mocks
            (fs as any).readFile = mockFs.readFile;
            (fs as any).writeFile = mockFs.writeFile;

            const mockProvider = createMockProvider();
            const mcpHub = new McpHub(mockProvider as ClineProvider);

            const mockConfig = {
                mcpServers: {
                    'test-server': {
                        command: 'node',
                        args: ['test.js'],
                        timeout: 60,
                    },
                },
            };

            // Mock reading initial config
            (fs as any).readFile = async () => JSON.stringify(mockConfig);

            let writtenConfig: any;
            (fs as any).writeFile = async (_path: string, content: string) => {
                writtenConfig = JSON.parse(content);
            };

            // Test valid timeout values
            const validTimeouts = [1, 60, 3600];
            for (const timeout of validTimeouts) {
                await mcpHub.updateServerTimeout('test-server', timeout);
                assert.strictEqual(writtenConfig?.mcpServers['test-server'].timeout, timeout,
                    `Should accept timeout value ${timeout}`);
            }
        }
    )
);

// Test for notifying webview after updating timeout
updateTimeoutTests.children.add(
    TestUtils.createTest(
        controller,
        'notify-webview',
        'should notify webview after updating timeout',
        vscode.Uri.file(__filename),
        async run => {
            // Override fs module with mocks
            (fs as any).readFile = mockFs.readFile;
            (fs as any).writeFile = mockFs.writeFile;

            const mockProvider = createMockProvider();
            const mcpHub = new McpHub(mockProvider as ClineProvider);

            const mockConfig = {
                mcpServers: {
                    'test-server': {
                        command: 'node',
                        args: ['test.js'],
                        timeout: 60,
                    },
                },
            };

            // Mock reading initial config
            (fs as any).readFile = async () => JSON.stringify(mockConfig);

            let postedMessage: any;
            mockProvider.postMessageToWebview = async (message: any) => {
                postedMessage = message;
            };

            await mcpHub.updateServerTimeout('test-server', 120);

            assert.strictEqual(postedMessage?.type, 'mcpServers',
                'Should post mcpServers message to webview');
        }
    )
);

export function activate() {
    return controller;
}