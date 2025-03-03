import * as assert from 'assert';
import * as vscode from 'vscode';
import { ClineProvider } from '../../../../core/webview/ClineProvider';
import { createMockExtensionContext, createMockOutputChannel } from '../../utils/mock-helpers';
import { TEST_TIMEOUTS, waitForCondition } from '../../utils/test-setup';

suite('ClineProvider Integration', () => {
    let provider: ClineProvider;
    let outputChannel: vscode.OutputChannel;
    let context: vscode.ExtensionContext;
    
    setup(async () => {
        // Create mocks
        outputChannel = createMockOutputChannel();
        context = createMockExtensionContext();
        
        // Create provider instance
        provider = new ClineProvider(context, outputChannel);
    });
    
    teardown(async () => {
        await provider.dispose();
    });
    
    suite('McpManager Integration', () => {
        test('should ensure MCP servers directory exists', async () => {
            const mcpServersDir = await provider.ensureMcpServersDirectoryExists();
            assert.ok(mcpServersDir, 'MCP servers directory path should be returned');
            assert.ok(mcpServersDir.includes('MCP') || mcpServersDir.includes('~/Documents/Cline/MCP'), 
                'Path should include MCP directory');
        });
        
        test('should ensure settings directory exists', async () => {
            const settingsDir = await provider.ensureSettingsDirectoryExists();
            assert.ok(settingsDir, 'Settings directory path should be returned');
            assert.ok(settingsDir.includes('settings'), 'Path should include settings directory');
        });
    });
    
    suite('StateManager Integration', () => {
        test('should update and retrieve global state', async () => {
            const testMode = 'Code';
            await provider.updateGlobalState('mode', testMode);
            const state = await provider.getState();
            assert.strictEqual(state.mode, testMode, 'Mode should be updated in state');
        });
        
        test('should store and retrieve secrets', async () => {
            const testKey = 'apiKey';
            const testValue = 'test-api-key';
            
            await provider.storeSecret(testKey, testValue);
            const state = await provider.getState();
            assert.strictEqual(state.apiConfiguration.apiKey, testValue, 'API key should be stored in state');
        });
    });
    
    suite('TaskManager Integration', () => {
        test('should initialize new task', async () => {
            const testTask = 'Test task';
            await provider.initClineWithTask(testTask);
            
            // Wait for task initialization
            await waitForCondition(
                () => provider.messages.length > 0,
                TEST_TIMEOUTS.MEDIUM,
                1000,
                'Task should be initialized with messages'
            );
            
            assert.ok(provider.messages.length > 0, 'Task should have messages');
        });
        
        test('should clear task', async () => {
            // Initialize a task first
            await provider.initClineWithTask('Test task');
            
            // Clear the task
            await provider.clearTask();
            
            assert.strictEqual(provider.messages.length, 0, 'Messages should be cleared');
        });
    });
    
    suite('Callback Handlers', () => {
        test('should handle Glama callback', async () => {
            const testCode = 'test-glama-code';
            
            // Mock storeSecret to track calls
            let secretKey: string | undefined;
            let secretValue: string | undefined;
            const originalStoreSecret = provider.storeSecret;
            
            provider.storeSecret = async (key, value) => {
                secretKey = key;
                secretValue = value;
                return;
            };
            
            // Mock postStateToWebview to track calls
            let statePosted = false;
            const originalPostStateToWebview = provider.postStateToWebview;
            
            provider.postStateToWebview = async () => {
                statePosted = true;
                return;
            };
            
            try {
                await provider.handleGlamaCallback(testCode);
                
                assert.strictEqual(secretKey, 'glamaApiKey', 'Should store with correct key');
                assert.strictEqual(secretValue, testCode, 'Should store the provided code');
                assert.ok(statePosted, 'Should post state to webview');
            } finally {
                // Restore original methods
                provider.storeSecret = originalStoreSecret;
                provider.postStateToWebview = originalPostStateToWebview;
            }
        });
        
        test('should handle OpenRouter callback', async () => {
            const testCode = 'test-openrouter-code';
            
            // Mock storeSecret to track calls
            let secretKey: string | undefined;
            let secretValue: string | undefined;
            const originalStoreSecret = provider.storeSecret;
            
            provider.storeSecret = async (key, value) => {
                secretKey = key;
                secretValue = value;
                return;
            };
            
            // Mock postStateToWebview to track calls
            let statePosted = false;
            const originalPostStateToWebview = provider.postStateToWebview;
            
            provider.postStateToWebview = async () => {
                statePosted = true;
                return;
            };
            
            try {
                await provider.handleOpenRouterCallback(testCode);
                
                assert.strictEqual(secretKey, 'openRouterApiKey', 'Should store with correct key');
                assert.strictEqual(secretValue, testCode, 'Should store the provided code');
                assert.ok(statePosted, 'Should post state to webview');
            } finally {
                // Restore original methods
                provider.storeSecret = originalStoreSecret;
                provider.postStateToWebview = originalPostStateToWebview;
            }
        });
    });
    
    suite('Component Manager Interactions', () => {
        test('should coordinate between StateManager and TaskManager', async () => {
            // Initialize a task
            const testTask = 'Test task';
            await provider.initClineWithTask(testTask);
            
            // Wait for task initialization
            await waitForCondition(
                () => provider.messages.length > 0,
                TEST_TIMEOUTS.MEDIUM,
                1000,
                'Task should be initialized with messages'
            );
            
            // Update state
            await provider.updateGlobalState('mode', 'Code');
            
            // Get state and verify it includes the task
            const state = await provider.getState();
            assert.strictEqual(state.mode, 'Code', 'Mode should be updated in state');
            assert.ok(provider.messages.length > 0, 'Task should still have messages after state update');
        });
        
        test('should handle McpManager and StateManager interaction', async () => {
            // Ensure settings directory exists
            const settingsDir = await provider.ensureSettingsDirectoryExists();
            assert.ok(settingsDir, 'Settings directory path should be returned');
            
            // Update state
            await provider.updateGlobalState('mode', 'Code');
            
            // Get state and verify
            const state = await provider.getState();
            assert.strictEqual(state.mode, 'Code', 'Mode should be updated in state');
        });
    });
});