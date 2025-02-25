import * as assert from 'assert';
import * as fs from 'fs/promises';
import type { McpHub as McpHubType } from '../../../../services/mcp/McpHub';
import type { ClineProvider } from '../../../../core/webview/ClineProvider';
import type { ExtensionContext, Uri } from 'vscode';
import type { McpConnection } from '../../../../services/mcp/McpHub';
import { StdioConfigSchema } from '../../../../services/mcp/McpHub';
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

suite('McpHub', () => {
    let mcpHub: McpHubType;
    let mockProvider: Partial<ClineProvider>;
    const mockSettingsPath = '/mock/settings/path/cline_mcp_settings.json';

    setup(() => {
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

        mockProvider = {
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

        // Override fs module with mocks
        (fs as any).readFile = mockFs.readFile;
        (fs as any).writeFile = mockFs.writeFile;

        mcpHub = new McpHub(mockProvider as ClineProvider);
    });

    suite('toggleToolAlwaysAllow', () => {
        test('should add tool to always allow list when enabling', async () => {
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
        });

        test('should remove tool from always allow list when disabling', async () => {
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
        });

        test('should initialize alwaysAllow if it does not exist', async () => {
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
        });
    });

    suite('server disabled state', () => {
        test('should toggle server disabled state', async () => {
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
        });

        test('should filter out disabled servers from getServers', () => {
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
        });

        test('should prevent calling tools on disabled servers', async () => {
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
        });

        test('should prevent reading resources from disabled servers', async () => {
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
        });
    });

    suite('callTool', () => {
        test('should execute tool successfully', async () => {
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
        });

        test('should throw error if server not found', async () => {
            await assert.rejects(
                () => mcpHub.callTool('non-existent-server', 'some-tool', {}),
                /No connection found for server: non-existent-server/,
                'Should reject when server not found'
            );
        });

        suite('timeout configuration', () => {
            test('should validate timeout values', () => {
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
            });

            test('should use default timeout of 60 seconds if not specified', async () => {
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
            });

            test('should apply configured timeout to tool calls', async () => {
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
            });
        });

        suite('updateServerTimeout', () => {
            test('should update server timeout in settings file', async () => {
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
            });

            test('should fallback to default timeout when config has invalid timeout', async () => {
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
            });

            test('should accept valid timeout values', async () => {
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
            });

            test('should notify webview after updating timeout', async () => {
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
            });
        });
    });
});