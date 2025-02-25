import * as assert from 'assert';
import { ClineProvider } from '../../../../core/webview/ClineProvider';
import { TEST_TIMEOUTS, waitForCondition } from '../../utils/test-setup';
import { createMockExtensionContext, createMockWebviewPanel } from '../../utils/mock-helpers';
suite('ClineProvider', () => {
    let provider;
    let outputChannel;
    let context;
    let webviewPanel;
    setup(async () => {
        // Create mocks
        outputChannel = {
            name: 'Test Output',
            append: () => { },
            appendLine: () => { },
            clear: () => { },
            hide: () => { },
            show: () => { },
            replace: () => { },
            dispose: () => { }
        };
        context = createMockExtensionContext();
        webviewPanel = createMockWebviewPanel();
        // Create provider instance
        provider = new ClineProvider(context, outputChannel);
    });
    teardown(async () => {
        await provider.dispose();
    });
    suite('Initialization', () => {
        test('should initialize provider', async () => {
            assert.ok(provider, 'Provider should be created');
            assert.strictEqual(provider.viewLaunched, false, 'View should not be launched initially');
        });
        test('should resolve webview', async () => {
            await provider.resolveWebviewView(webviewPanel);
            assert.strictEqual(provider.viewLaunched, true, 'View should be launched after resolution');
        });
    });
    suite('State Management', () => {
        test('should update global state', async () => {
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
    suite('Task Management', () => {
        test('should initialize new task', async () => {
            const testTask = 'Test task';
            await provider.initClineWithTask(testTask);
            // Wait for task initialization
            await waitForCondition(() => provider.messages.length > 0, TEST_TIMEOUTS.MEDIUM, 1000, 'Task should be initialized with messages');
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
    suite('Message Handling', () => {
        test('should post message to webview', async () => {
            const testMessage = {
                type: 'action',
                action: 'chatButtonClicked'
            };
            let receivedMessage;
            webviewPanel.webview.postMessage = async (message) => {
                receivedMessage = message;
                return true;
            };
            await provider.postMessageToWebview(testMessage);
            assert.ok(receivedMessage, 'Message should be received');
            assert.deepStrictEqual(receivedMessage, testMessage, 'Message should match sent message');
        });
    });
});
//# sourceMappingURL=ClineProvider.test.js.map