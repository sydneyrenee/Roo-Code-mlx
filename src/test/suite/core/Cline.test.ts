import * as vscode from 'vscode';
import * as assert from 'assert';
import { Cline } from './mock-cline';
import { TestClineProvider } from './mock-provider';
import { createTestController } from '../testController';
import { TestUtils } from '../../testUtils';

const controller = createTestController('clineTests', 'Cline Tests');

// Root test item for Cline
const clineTests = controller.createTestItem('cline', 'Cline', vscode.Uri.file(__filename));
controller.items.add(clineTests);

// Constructor tests
const constructorTests = controller.createTestItem('constructor', 'Constructor', vscode.Uri.file(__filename));
clineTests.children.add(constructorTests);

// Mock provider
const mockProvider = new TestClineProvider();

// Mock API config
const mockApiConfig = {
    apiProvider: 'anthropic',
    id: 'claude-3-sonnet'
};

// Basic settings test
constructorTests.children.add(
    TestUtils.createTest(
        controller,
        'init',
        'should initialize with basic settings',
        vscode.Uri.file(__filename),
        async run => {
            const cline = new Cline(mockProvider, mockApiConfig, undefined, false, false, undefined, "test task");
            assert.strictEqual(cline.diffEnabled, false);
            assert.strictEqual(cline.customInstructions, undefined);
            assert.strictEqual(cline.fuzzyMatchThreshold, 1.0);
            assert.strictEqual(cline.checkpointsEnabled, false);
        }
    )
);

// Custom instructions test
constructorTests.children.add(
    TestUtils.createTest(
        controller,
        'custom-instructions',
        'should respect custom instructions',
        vscode.Uri.file(__filename),
        async run => {
            const customInstructions = "custom instructions";
            const cline = new Cline(mockProvider, mockApiConfig, customInstructions, false, false, undefined, "test task");
            assert.strictEqual(cline.customInstructions, customInstructions);
        }
    )
);

// Required parameters test
constructorTests.children.add(
    TestUtils.createTest(
        controller,
        'required-params',
        'should require either task or historyItem',
        vscode.Uri.file(__filename),
        async run => {
            assert.throws(() => {
                new Cline(mockProvider, mockApiConfig, undefined, false, false, undefined, undefined);
            }, /Either historyItem or task\/images must be provided/);
        }
    )
);

// Task Management Tests
const taskTests = controller.createTestItem('task-management', 'Task Management', vscode.Uri.file(__filename));
clineTests.children.add(taskTests);

// Unique task ID test
taskTests.children.add(
    TestUtils.createTest(
        controller,
        'unique-task-id',
        'should generate unique task IDs',
        vscode.Uri.file(__filename),
        async run => {
            const cline1 = new Cline(mockProvider, mockApiConfig, undefined, false, false, undefined, "task 1");
            const cline2 = new Cline(mockProvider, mockApiConfig, undefined, false, false, undefined, "task 2");
            assert.notStrictEqual(cline1.taskId, cline2.taskId);
        }
    )
);

// History item ID test
taskTests.children.add(
    TestUtils.createTest(
        controller,
        'history-item-id',
        'should use provided task ID from history item',
        vscode.Uri.file(__filename),
        async run => {
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
        }
    )
);

// Abort Handling Tests
const abortTests = controller.createTestItem('abort-handling', 'Abort Handling', vscode.Uri.file(__filename));
clineTests.children.add(abortTests);

// Abort operations test
abortTests.children.add(
    TestUtils.createTest(
        controller,
        'abort-operations',
        'should abort task operations after abort',
        vscode.Uri.file(__filename),
        async run => {
            const cline = new Cline(mockProvider, mockApiConfig, undefined, false, false, undefined, "test task");
            await cline.abortTask();
            await assert.rejects(() => cline.say('text', 'test message'), /Roo Code instance aborted/);
        }
    )
);

// Mark abandoned test
abortTests.children.add(
    TestUtils.createTest(
        controller,
        'mark-abandoned',
        'should mark task as abandoned after abort',
        vscode.Uri.file(__filename),
        async run => {
            const cline = new Cline(mockProvider, mockApiConfig, undefined, false, false, undefined, "test task");
            await cline.abortTask();
            assert.strictEqual(cline.abandoned, true);
        }
    )
);

export function activate() {
    return controller;
}