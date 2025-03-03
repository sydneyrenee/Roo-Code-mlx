import * as assert from 'assert';
import * as vscode from 'vscode';
import { ClineProvider } from '../../../../core/webview/ClineProvider';
import { createMockExtensionContext, createMockOutputChannel } from '../../utils/mock-helpers';

suite('ClineProvider Callbacks', () => {
    let provider: ClineProvider;
    let outputChannel: vscode.OutputChannel;
    let context: vscode.ExtensionContext;
    let postMessageCalled: boolean;
    let storedSecrets: Map<string, string>;

    setup(() => {
        // Create mocks
        outputChannel = createMockOutputChannel();
        context = createMockExtensionContext();
        
        // Create provider instance
        provider = new ClineProvider(context, outputChannel);
        
        // Track stored secrets
        storedSecrets = new Map<string, string>();
        
        // Mock storeSecret method
        provider.storeSecret = async (key, value) => {
            storedSecrets.set(key, value || '');
            return;
        };
        
        // Mock postStateToWebview method
        postMessageCalled = false;
        provider.postStateToWebview = async () => {
            postMessageCalled = true;
            return;
        };
    });

    teardown(async () => {
        await provider.dispose();
    });

    suite('Glama Callback Handler', () => {
        test('should store Glama API key', async () => {
            const testCode = 'test-glama-code-123';
            
            await provider.handleGlamaCallback(testCode);
            
            assert.strictEqual(storedSecrets.get('glamaApiKey'), testCode, 
                'API key should be stored with correct key');
        });

        test('should update UI after storing Glama API key', async () => {
            const testCode = 'test-glama-code-123';
            
            await provider.handleGlamaCallback(testCode);
            
            assert.ok(postMessageCalled, 'Should post state to webview');
        });

        test('should handle empty Glama API key', async () => {
            const testCode = '';
            
            await provider.handleGlamaCallback(testCode);
            
            assert.strictEqual(storedSecrets.get('glamaApiKey'), '', 
                'Empty API key should be stored');
            assert.ok(postMessageCalled, 'Should post state to webview');
        });
    });

    suite('OpenRouter Callback Handler', () => {
        test('should store OpenRouter API key', async () => {
            const testCode = 'test-openrouter-code-456';
            
            await provider.handleOpenRouterCallback(testCode);
            
            assert.strictEqual(storedSecrets.get('openRouterApiKey'), testCode, 
                'API key should be stored with correct key');
        });

        test('should update UI after storing OpenRouter API key', async () => {
            const testCode = 'test-openrouter-code-456';
            
            await provider.handleOpenRouterCallback(testCode);
            
            assert.ok(postMessageCalled, 'Should post state to webview');
        });

        test('should handle empty OpenRouter API key', async () => {
            const testCode = '';
            
            await provider.handleOpenRouterCallback(testCode);
            
            assert.strictEqual(storedSecrets.get('openRouterApiKey'), '', 
                'Empty API key should be stored');
            assert.ok(postMessageCalled, 'Should post state to webview');
        });
    });

    suite('Integration with State Manager', () => {
        test('should update state after storing API keys', async () => {
            // Create a real instance with mocked methods to test integration
            const realProvider = new ClineProvider(context, outputChannel);
            
            // Mock only the methods we need for this test
            let stateUpdated = false;
            realProvider.postStateToWebview = async () => {
                stateUpdated = true;
                return;
            };
            
            // Store original method
            const originalStoreSecret = realProvider.storeSecret;
            
            try {
                // Test Glama callback
                await realProvider.handleGlamaCallback('test-glama-key');
                assert.ok(stateUpdated, 'State should be updated after Glama callback');
                
                // Reset flag
                stateUpdated = false;
                
                // Test OpenRouter callback
                await realProvider.handleOpenRouterCallback('test-openrouter-key');
                assert.ok(stateUpdated, 'State should be updated after OpenRouter callback');
            } finally {
                // Restore original method
                realProvider.storeSecret = originalStoreSecret;
                await realProvider.dispose();
            }
        });
    });
});