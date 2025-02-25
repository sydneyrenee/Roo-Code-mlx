import * as vscode from 'vscode';
import * as assert from 'assert';
import * as path from 'path';
import * as os from 'os';
import { Cline } from '../../../core/Cline';
import { ClineProvider } from '../../../core/webview/ClineProvider';
import { ApiConfiguration } from '../../../shared/configuration-types';

suite('Cline Tests', () => {
    const testController = vscode.test.createTestController('clineTests', 'Cline Tests');
    const rootSuite = testController.createTestItem('root', 'Cline Core Tests');

    let mockProvider: any;
    let mockApiConfig: ApiConfiguration;
    let mockExtensionContext: vscode.ExtensionContext;

    setup(() => {
        // Setup mock extension context
        const storageUri = {
            fsPath: path.join(os.tmpdir(), 'test-storage')
        };

        mockExtensionContext = {
            globalState: {
                get: (key: string) => key === 'taskHistory' ? [{
                    id: '123',
                    ts: Date.now(),
                    task: 'historical task',
                    tokensIn: 100,
                    tokensOut: 200,
                    cacheWrites: 0,
                    cacheReads: 0,
                    totalCost: 0.001
                }] : undefined,
                update: () => Promise.resolve()
            },
            globalStorageUri: storageUri,
            extensionUri: { fsPath: '/mock/extension/path' },
            extension: { packageJSON: { version: '1.0.0' } }
        } as any;

        // Setup mock provider
        mockProvider = new ClineProvider(mockExtensionContext, {
            appendLine: () => {},
            append: () => {},
            clear: () => {},
            show: () => {},
            hide: () => {},
            dispose: () => {}
        });

        // Setup mock API configuration
        mockApiConfig = {
            apiProvider: 'anthropic',
            apiModelId: 'claude-3-sonnet',
            apiKey: 'test-api-key'
        };

        // Mock provider methods
        mockProvider.postMessageToWebview = () => Promise.resolve();
        mockProvider.postStateToWebview = () => Promise.resolve();
        mockProvider.getTaskWithId = async (id: string) => ({
            historyItem: {
                id,
                ts: Date.now(),
                task: 'historical task',
                tokensIn: 100,
                tokensOut: 200,
                cacheWrites: 0,
                cacheReads: 0,
                totalCost: 0.001
            },
            taskDirPath: '/mock/storage/path/tasks/123',
            apiConversationHistoryFilePath: '/mock/storage/path/tasks/123/api_conversation_history.json',
            uiMessagesFilePath: '/mock/storage/path/tasks/123/ui_messages.json',
            apiConversationHistory: []
        });
    });

    const constructorSuite = testController.createTestItem('constructor', 'Constructor Tests');
    rootSuite.children.add(constructorSuite);

    constructorSuite.children.add(
        testController.createTestItem('basicSettings', 'initializes with basic settings', async run => {
            const cline = new Cline(
                mockProvider,
                mockApiConfig,
                'custom instructions',
                false,
                false,
                0.95,
                'test task'
            );

            assert.strictEqual(cline.customInstructions, 'custom instructions');
            assert.strictEqual(cline.diffEnabled, false);
            assert.strictEqual(cline.checkpointsEnabled, false);
            assert.strictEqual(cline.fuzzyMatchThreshold, 0.95);
            
            run.passed();
        })
    );

    constructorSuite.children.add(
        testController.createTestItem('taskRequired', 'requires task or history item', async run => {
            assert.throws(() => {
                new Cline(
                    mockProvider,
                    mockApiConfig,
                    undefined,
                    false,
                    false,
                    undefined,
                    undefined
                );
            }, /Either historyItem or task\/images must be provided/);
            
            run.passed();
        })
    );

    const conversationSuite = testController.createTestItem('conversation', 'Conversation Tests');
    rootSuite.children.add(conversationSuite);

    conversationSuite.children.add(
        testController.createTestItem('imageHandling', 'handles images in conversations', async run => {
            const cline = new Cline(
                mockProvider,
                mockApiConfig,
                undefined,
                false,
                false,
                undefined,
                'test task'
            );

            // Mock API model info to indicate image support
            const mockGetModel = () => ({
                id: 'claude-3-sonnet',
                info: {
                    supportsImages: true,
                    supportsPromptCache: true,
                    supportsComputerUse: true,
                    contextWindow: 200000,
                    maxTokens: 4096,
                    inputPrice: 0.25,
                    outputPrice: 0.75
                }
            });

            (cline as any).api = { getModel: mockGetModel };
            
            // Set up conversation with image
            cline.apiConversationHistory = [{
                role: 'user',
                content: [
                    { type: 'text', text: 'Here is an image' },
                    { 
                        type: 'image',
                        source: {
                            type: 'base64',
                            media_type: 'image/jpeg',
                            data: 'base64data'
                        }
                    }
                ]
            }];

            assert.ok(cline.hasImages);
            assert.ok(cline.supportsImages);
            
            run.passed();
        })
    );

    // Add tests to controller
    testController.items.add(rootSuite);
});