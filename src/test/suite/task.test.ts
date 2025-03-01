import * as vscode from 'vscode';
import * as assert from 'assert';
import { createTestController } from './testController';
import { TestUtils } from '../testUtils';

// Extend globalThis with our extension types
declare global {
    var extension: boolean;
    var provider: {
        viewLaunched: boolean;
        messages: Array<{
            type: string;
            text?: string;
        }>;
        updateGlobalState(key: string, value: any): Promise<void>;
    };
    var api: {
        startNewTask(prompt: string): Promise<void>;
    };
}

const controller = createTestController('taskTests', 'Task Tests');

// Root test item for Task
const taskTests = controller.createTestItem('task', 'Task', vscode.Uri.file(__filename));
controller.items.add(taskTests);

// Task prompt tests
const promptTests = controller.createTestItem('prompt', 'Prompt', vscode.Uri.file(__filename));
taskTests.children.add(promptTests);

// Test for handling prompt and response
promptTests.children.add(
    TestUtils.createTest(
        controller,
        'handle-prompt',
        'Should handle prompt and response correctly',
        vscode.Uri.file(__filename),
        async run => {
            const timeout = 30000;
            const interval = 1000;

            if (!globalThis.extension) {
                assert.fail("Extension not found");
            }

            // Ensure the webview is launched
            let startTime = Date.now();

            while (Date.now() - startTime < timeout) {
                if (globalThis.provider.viewLaunched) {
                    break;
                }

                await new Promise((resolve) => setTimeout(resolve, interval));
            }

            await globalThis.provider.updateGlobalState("mode", "Code");
            await globalThis.provider.updateGlobalState("alwaysAllowModeSwitch", true);
            await globalThis.provider.updateGlobalState("autoApprovalEnabled", true);

            await globalThis.api.startNewTask("Hello world, what is your name? Respond with 'My name is ...'");

            // Wait for task to appear in history with tokens
            startTime = Date.now();

            while (Date.now() - startTime < timeout) {
                const messages = globalThis.provider.messages;

                if (messages.some(({ type, text }) => type === "say" && text?.includes("My name is Roo"))) {
                    break;
                }

                await new Promise((resolve) => setTimeout(resolve, interval));
            }

            if (globalThis.provider.messages.length === 0) {
                assert.fail("No messages received");
            }

            assert.ok(
                globalThis.provider.messages.some(
                    ({ type, text }) => type === "say" && text?.includes("My name is Roo")
                ),
                "Did not receive expected response containing 'My name is Roo'"
            );
        }
    )
);

// Task management tests
const managementTests = controller.createTestItem('management', 'Management', vscode.Uri.file(__filename));
taskTests.children.add(managementTests);

// Test for task creation
managementTests.children.add(
    TestUtils.createTest(
        controller,
        'task-creation',
        'Should create a new task',
        vscode.Uri.file(__filename),
        async run => {
            const timeout = 10000;
            const interval = 500;

            if (!globalThis.extension) {
                assert.fail("Extension not found");
            }

            // Ensure the webview is launched
            let startTime = Date.now();

            while (Date.now() - startTime < timeout) {
                if (globalThis.provider.viewLaunched) {
                    break;
                }

                await new Promise((resolve) => setTimeout(resolve, interval));
            }

            // Clear existing messages
            globalThis.provider.messages = [];

            // Start a new task
            await globalThis.api.startNewTask("This is a test task");

            // Wait for response
            startTime = Date.now();

            while (Date.now() - startTime < timeout) {
                if (globalThis.provider.messages.length > 0) {
                    break;
                }

                await new Promise((resolve) => setTimeout(resolve, interval));
            }

            assert.ok(globalThis.provider.messages.length > 0, "No messages received for new task");
        }
    )
);

export function activate() {
    return controller;
}
