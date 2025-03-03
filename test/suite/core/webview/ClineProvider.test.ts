import * as vscode from 'vscode';
import * as assert from 'assert';
import * as path from 'path';
import * as os from 'os';
import { MockClineProvider } from '../../../../src/core/webview/__mocks__/ClineProvider.mock';
import { createTestSuite, addTest } from '../../testUtils';
import { logger } from '../../../../src/utils/logging';

suite('ClineProvider Tests', () => {
    const testController = vscode.tests.createTestController('clineProviderTests', 'ClineProvider Tests');
    const rootSuite = createTestSuite(testController, 'root', 'ClineProvider Tests');

    let mockExtensionContext: vscode.ExtensionContext;
    let mockOutputChannel: vscode.OutputChannel;
    let clineProvider: MockClineProvider;

    setup(() => {
        // Setup mock extension context
        const storageUri = {
            fsPath: path.join(os.tmpdir(), 'test-storage')
        };

        mockExtensionContext = {
            globalState: {
                get: (key: string) => {
                    if (key === 'taskHistory') {
                        return [{
                            id: '123',
                            ts: Date.now(),
                            task: 'test task',
                            tokensIn: 100,
                            tokensOut: 200,
                            cacheWrites: 0,
                            cacheReads: 0,
                            totalCost: 0.001
                        }];
                    }
                    return undefined;
                },
                update: () => Promise.resolve(),
                keys: () => ['taskHistory']
            },
            workspaceState: {
                get: () => undefined,
                update: () => Promise.resolve(),
                keys: () => []
            },
            secrets: {
                get: () => Promise.resolve(undefined),
                store: () => Promise.resolve(),
                delete: () => Promise.resolve()
            },
            globalStorageUri: storageUri,
            extensionUri: { fsPath: '/mock/extension/path' },
            extension: { packageJSON: { version: '1.0.0' } },
            extensionMode: vscode.ExtensionMode.Test,
            subscriptions: []
        } as any;

        // Setup mock output channel
        mockOutputChannel = {
            name: 'Test Output',
            append: () => {},
            appendLine: () => {},
            clear: () => {},
            show: () => {},
            hide: () => {},
            dispose: () => {},
            replace: () => {}
        } as any;

        // Create ClineProvider instance
        clineProvider = new MockClineProvider(mockExtensionContext, mockOutputChannel);
    });

    teardown(async () => {
        await clineProvider.dispose();
    });

    const constructorSuite = createTestSuite(testController, 'constructor', 'Constructor Tests');
    rootSuite.children.add(constructorSuite);

    addTest(
        constructorSuite,
        testController,
        'initialization',
        'initializes with required components',
        async (run) => {
            assert.ok(clineProvider, 'ClineProvider should be initialized');
            assert.strictEqual(typeof clineProvider.log, 'function', 'log method should be defined');
            assert.strictEqual(clineProvider.viewLaunched, false, 'viewLaunched should be false initially');
        }
    );

    const stateSuite = createTestSuite(testController, 'state', 'State Management Tests');
    rootSuite.children.add(stateSuite);

    addTest(
        stateSuite,
        testController,
        'getState',
        'retrieves state correctly',
        async (run) => {
            const state = await clineProvider.getState();
            
            // Verify default state values
            assert.strictEqual(state.diffEnabled, true, 'diffEnabled should default to true');
            assert.strictEqual(state.soundEnabled, false, 'soundEnabled should default to false');
            assert.strictEqual(state.alwaysAllowReadOnly, false, 'alwaysAllowReadOnly should default to false');
        }
    );

    addTest(
        stateSuite,
        testController,
        'updateState',
        'updates state correctly',
        async (run) => {
            await clineProvider.updateGlobalState('diffEnabled', false);
            const state = await clineProvider.getState();
            
            assert.strictEqual(state.diffEnabled, false, 'diffEnabled should be updated to false');
        }
    );

    const taskSuite = createTestSuite(testController, 'tasks', 'Task Management Tests');
    rootSuite.children.add(taskSuite);

    addTest(
        taskSuite,
        testController,
        'clearTask',
        'clears current task',
        async (run) => {
            // Mock cline instance
            (clineProvider as any).cline = {
                abortTask: () => {
                    logger.debug('Mock abortTask called');
                },
                taskId: '123'
            };
            
            const result = await clineProvider.clearTask();
            
            assert.strictEqual((clineProvider as any).cline, undefined, 'cline should be undefined after clearTask');
            assert.strictEqual(result, true, 'clearTask should return true');
        }
    );

    addTest(
        taskSuite,
        testController,
        'postStateToWebview',
        'posts state to webview',
        async (run) => {
            let messagePosted = false;
            
            // Mock postMessageToWebview
            clineProvider.postMessageToWebview = async (message) => {
                assert.strictEqual(message.type, 'state', 'Message type should be state');
                assert.ok(message.state, 'State should be defined');
                messagePosted = true;
                return Promise.resolve();
            };
            
            await clineProvider.postStateToWebview();
            
            assert.strictEqual(messagePosted, true, 'Message should have been posted');
        }
    );
});