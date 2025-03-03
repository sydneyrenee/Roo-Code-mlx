import * as assert from 'assert';
import * as vscode from 'vscode';
import { StateManager } from '../../../../core/webview/ClineProviderState';
import { createMockExtensionContext } from '../../utils/mock-helpers';
import { HistoryItem } from '../../../../shared/HistoryItem';

suite('ClineProviderState', () => {
    let stateManager: StateManager;
    let context: vscode.ExtensionContext;

    setup(() => {
        context = createMockExtensionContext();
        stateManager = new StateManager(context);
    });

    suite('Global State Management', () => {
        test('should update and retrieve global state', async () => {
            const testKey = 'mode';
            const testValue = 'Code';
            
            await stateManager.updateGlobalState(testKey, testValue);
            const retrievedValue = await stateManager.getGlobalState(testKey);
            
            assert.strictEqual(retrievedValue, testValue, 'Retrieved value should match stored value');
        });

        test('should handle undefined values', async () => {
            const testKey = 'customInstructions';
            const retrievedValue = await stateManager.getGlobalState(testKey);
            
            assert.strictEqual(retrievedValue, undefined, 'Non-existent key should return undefined');
        });
    });

    suite('Secret Storage', () => {
        test('should store and retrieve secrets', async () => {
            const testKey = 'apiKey';
            const testValue = 'test-api-key';
            
            await stateManager.storeSecret(testKey, testValue);
            const retrievedValue = await stateManager.getSecret(testKey);
            
            assert.strictEqual(retrievedValue, testValue, 'Retrieved secret should match stored secret');
        });

        test('should delete secrets when value is undefined', async () => {
            const testKey = 'apiKey';
            const testValue = 'test-api-key';
            
            // First store a value
            await stateManager.storeSecret(testKey, testValue);
            
            // Then delete it by passing undefined
            await stateManager.storeSecret(testKey, undefined);
            
            const retrievedValue = await stateManager.getSecret(testKey);
            assert.strictEqual(retrievedValue, '', 'Secret should be deleted');
        });
    });

    suite('Task History', () => {
        test('should update task history with new item', async () => {
            const testItem: HistoryItem = {
                id: 'test-id',
                ts: Date.now(),
                task: 'Test task',
                tokensIn: 0,
                tokensOut: 0,
                totalCost: 0
            };
            
            await stateManager.updateTaskHistory(testItem);
            
            const state = await stateManager.getState();
            assert.ok(state.taskHistory, 'Task history should exist');
            assert.ok(state.taskHistory!.some(item => item.id === testItem.id), 'Task history should contain the new item');
        });

        test('should update existing task history item', async () => {
            const testItem: HistoryItem = {
                id: 'test-id',
                ts: Date.now(),
                task: 'Test task',
                tokensIn: 0,
                tokensOut: 0,
                totalCost: 0
            };
            
            // Add the item first
            await stateManager.updateTaskHistory(testItem);
            
            // Update the item
            const updatedItem: HistoryItem = {
                ...testItem,
                task: 'Updated test task',
                tokensIn: 0,
                tokensOut: 0,
                totalCost: 0
            };
            
            await stateManager.updateTaskHistory(updatedItem);
            
            const state = await stateManager.getState();
            const foundItem = state.taskHistory!.find(item => item.id === testItem.id);
            
            assert.ok(foundItem, 'Task history should contain the item');
            assert.strictEqual(foundItem!.task, 'Updated test task', 'Task should be updated');
        });
    });

    suite('State Retrieval', () => {
        test('should retrieve complete state', async () => {
            // Set up some state
            await stateManager.updateGlobalState('mode', 'Code');
            await stateManager.storeSecret('apiKey', 'test-api-key');
            
            const state = await stateManager.getState();
            
            assert.strictEqual(state.mode, 'Code', 'State should include mode');
            assert.strictEqual(state.apiConfiguration.apiKey, 'test-api-key', 'State should include API key');
            assert.ok(state.diffEnabled, 'State should include default values');
        });
    });
});