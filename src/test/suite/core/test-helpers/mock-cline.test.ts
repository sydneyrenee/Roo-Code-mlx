import * as vscode from 'vscode';
import * as assert from 'assert';
import { Cline } from './mock-cline';
import { ApiProvider } from './mock-types';
import { TestClineProvider } from './mock-provider';

suite('Cline Tests', () => {
    const mockProvider = new TestClineProvider();
    const mockApiConfig: ApiProvider = {
        apiProvider: 'anthropic',
        id: 'claude-3-sonnet'
    };

    test('should initialize with basic settings', async () => {
        const cline = new Cline(mockProvider, mockApiConfig, undefined, false, false, undefined, "test task");
        assert.strictEqual(cline.diffEnabled, false);
        assert.strictEqual(cline.customInstructions, undefined);
        assert.strictEqual(cline.fuzzyMatchThreshold, 1.0);
        assert.strictEqual(cline.checkpointsEnabled, false);
    });

    test('should respect custom instructions', async () => {
        const customInstructions = "custom instructions";
        const cline = new Cline(mockProvider, mockApiConfig, customInstructions, false, false, undefined, "test task");
        assert.strictEqual(cline.customInstructions, customInstructions);
    });

    test('should require either task or historyItem', () => {
        assert.throws(() => {
            new Cline(mockProvider, mockApiConfig, undefined, false, false, undefined, undefined);
        }, /Either historyItem or task\/images must be provided/);
    });

    test('should generate unique task IDs', () => {
        const cline1 = new Cline(mockProvider, mockApiConfig, undefined, false, false, undefined, "task 1");
        const cline2 = new Cline(mockProvider, mockApiConfig, undefined, false, false, undefined, "task 2");
        assert.notStrictEqual(cline1.taskId, cline2.taskId);
    });

    test('should use provided task ID from history item', () => {
        const historyItem = {
            id: 'test-id',
            ts: Date.now(),
            task: 'test task',
            tokensIn: 0,
            tokensOut: 0,
            cacheWrites: 0,
            cacheReads: 0,
            totalCost: 0
        };
        const cline = new Cline(mockProvider, mockApiConfig, undefined, false, false, undefined, undefined, undefined, historyItem);
        assert.strictEqual(cline.taskId, historyItem.id);
    });

    test('should abort task operations after abort', async () => {
        const cline = new Cline(mockProvider, mockApiConfig, undefined, false, false, undefined, "test task");
        await cline.abortTask();
        await assert.rejects(() => cline.say('text', 'test message'), /Roo Code instance aborted/);
    });

    test('should mark task as abandoned after abort', async () => {
        const cline = new Cline(mockProvider, mockApiConfig, undefined, false, false, undefined, "test task");
        await cline.abortTask();
        assert.strictEqual(cline.abandoned, true);
    });
});