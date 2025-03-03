import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { TaskManager } from '../../../../core/webview/ClineProviderTasks';
import { StateManager } from '../../../../core/webview/ClineProviderState';
import { createMockExtensionContext, createMockOutputChannel } from '../../utils/mock-helpers';
import { HistoryItem } from '../../../../shared/HistoryItem';
import { GlobalFileNames } from '../../../../core/webview/ClineProviderTypes';

suite('ClineProviderTasks', () => {
    let taskManager: TaskManager;
    let stateManager: StateManager;
    let context: vscode.ExtensionContext;
    let outputChannel: vscode.OutputChannel;
    let testTaskId: string;
    let testTaskDirPath: string;

    setup(async () => {
        context = createMockExtensionContext();
        outputChannel = createMockOutputChannel();
        stateManager = new StateManager(context);
        taskManager = new TaskManager(context, stateManager, outputChannel);
        
        // Create a test task
        testTaskId = 'test-task-id';
        testTaskDirPath = path.join(context.globalStorageUri.fsPath, 'tasks', testTaskId);
        
        // Create test task directory
        try {
            await fs.mkdir(testTaskDirPath, { recursive: true });
        } catch (error) {
            console.error('Error creating test directory:', error);
        }
        
        // Create test history item
        const testItem: HistoryItem = {
            id: testTaskId,
            ts: Date.now(),
            task: 'Test task',
            tokensIn: 0,
            tokensOut: 0,
            totalCost: 0
        };
        
        // Add to state
        await stateManager.updateTaskHistory(testItem);
        
        // Create test API conversation history file
        const apiConversationHistoryFilePath = path.join(testTaskDirPath, GlobalFileNames.apiConversationHistory);
        await fs.writeFile(apiConversationHistoryFilePath, JSON.stringify([
            { role: 'user', content: 'Test message' }
        ]));
    });
    
    teardown(async () => {
        // Clean up test files
        try {
            await fs.rm(testTaskDirPath, { recursive: true, force: true });
        } catch (error) {
            console.error('Error cleaning up test directory:', error);
        }
    });

    test('should get task with ID', async () => {
        const taskData = await taskManager.getTaskWithId(testTaskId);
        
        assert.strictEqual(taskData.historyItem.id, testTaskId, 'Task ID should match');
        assert.strictEqual(taskData.historyItem.task, 'Test task', 'Task text should match');
        assert.ok(taskData.apiConversationHistory.length > 0, 'API conversation history should exist');
    });

    test('should show task with ID', async () => {
        const historyItem = await taskManager.showTaskWithId(testTaskId);
        
        assert.ok(historyItem, 'History item should be returned');
        assert.strictEqual(historyItem!.id, testTaskId, 'Task ID should match');
    });

    test('should delete task from state', async () => {
        await taskManager.deleteTaskFromState(testTaskId);
        
        // Get state and verify task is gone
        const state = await stateManager.getState();
        const taskExists = state.taskHistory?.some(item => item.id === testTaskId);
        
        assert.strictEqual(taskExists, false, 'Task should be removed from history');
    });

    test('should delete task with ID', async () => {
        const shouldClearCurrentTask = await taskManager.deleteTaskWithId(testTaskId);
        
        // Verify task is gone from state
        const state = await stateManager.getState();
        const taskExists = state.taskHistory?.some(item => item.id === testTaskId);
        
        assert.strictEqual(taskExists, false, 'Task should be removed from history');
        assert.strictEqual(shouldClearCurrentTask, false, 'Should not clear current task');
        
        // Verify files are gone
        const apiConversationHistoryFilePath = path.join(testTaskDirPath, GlobalFileNames.apiConversationHistory);
        let fileExists = true;
        try {
            await fs.access(apiConversationHistoryFilePath);
        } catch (error) {
            fileExists = false;
        }
        
        assert.strictEqual(fileExists, false, 'Task files should be deleted');
    });
});