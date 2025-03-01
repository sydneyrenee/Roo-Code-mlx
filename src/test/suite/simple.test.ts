import * as vscode from 'vscode';
import * as assert from 'assert';
import { createTestController } from './testController';
import { TestUtils } from '../testUtils';

// Create a test controller for simple tests
const controller = createTestController('simpleTests', 'Simple Tests');

// Root test item for simple tests
const simpleTests = controller.createTestItem('simple', 'Simple', vscode.Uri.file(__filename));
controller.items.add(simpleTests);

// Test for basic assertion
simpleTests.children.add(
    TestUtils.createTest(
        controller,
        'basic',
        'Basic assertion should pass',
        vscode.Uri.file(__filename),
        async run => {
            assert.strictEqual(1 + 1, 2, 'Basic math should work');
        }
    )
);

// Test for async operation
simpleTests.children.add(
    TestUtils.createTest(
        controller,
        'async',
        'Async operation should complete',
        vscode.Uri.file(__filename),
        async run => {
            const result = await Promise.resolve('success');
            assert.strictEqual(result, 'success', 'Async operation should resolve');
        }
    )
);

// Test for VS Code API
simpleTests.children.add(
    TestUtils.createTest(
        controller,
        'vscode-api',
        'VS Code API should be available',
        vscode.Uri.file(__filename),
        async run => {
            assert.ok(vscode.window, 'VS Code window should be available');
            assert.ok(vscode.workspace, 'VS Code workspace should be available');
        }
    )
);

export function activate() {
    return controller;
}