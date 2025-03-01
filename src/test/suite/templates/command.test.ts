import * as vscode from 'vscode';
import * as assert from 'assert';
import { 
    TEST_TIMEOUTS,
    waitForCondition,
    createTestWorkspace,
    cleanupTestWorkspace,
    resetExtensionState,
    executeCommandAndWait,
    assertions
} from '../utils/test-setup';
import { ClineProvider } from '../../../core/webview/ClineProvider';
import { createTestController } from '../testController';
import { TestUtils } from '../../testUtils';

// Extend globalThis with our extension types
declare global {
    var provider: {
        viewLaunched: boolean;
        messages: Array<{
            type: string;
            text?: string;
        }>;
        updateGlobalState(key: string, value: any): Promise<void>;
    };
}

// Mock classes
class MockInputBox {
    private value: string | undefined = undefined;
    private _showCount = 0;

    setValue(value: string | undefined) {
        this.value = value;
    }

    get showCount(): number {
        return this._showCount;
    }

    showInputBox(): Promise<string | undefined> {
        this._showCount++;
        return Promise.resolve(this.value);
    }

    reset() {
        this.value = undefined;
        this._showCount = 0;
    }
}

const controller = createTestController('commandTests', 'Command Tests');

// Root test item for Command
const commandTests = controller.createTestItem('command', 'Command', vscode.Uri.file(__filename));
controller.items.add(commandTests);

// Store original functions
const originalShowInputBox = vscode.window.showInputBox;
const mockInputBox = new MockInputBox();

// Test for command registration
commandTests.children.add(
    TestUtils.createTest(
        controller,
        'registered',
        'Command should be registered',
        vscode.Uri.file(__filename),
        async run => {
            try {
                // Test setup
                await resetExtensionState(globalThis.provider as unknown as ClineProvider);
                mockInputBox.reset();
                vscode.window.showInputBox = mockInputBox.showInputBox.bind(mockInputBox);

                await assertions.commandExists('roo-cline.testCommand');
            } finally {
                // Test teardown
                vscode.window.showInputBox = originalShowInputBox;
            }
        }
    )
);

// Test for command execution
commandTests.children.add(
    TestUtils.createTest(
        controller,
        'execute',
        'Command should execute successfully',
        vscode.Uri.file(__filename),
        async run => {
            try {
                // Test setup
                await resetExtensionState(globalThis.provider as unknown as ClineProvider);
                mockInputBox.reset();
                vscode.window.showInputBox = mockInputBox.showInputBox.bind(mockInputBox);

                const testData = { value: 'test' };
                await executeCommandAndWait('roo-cline.testCommand', testData);

                const config = vscode.workspace.getConfiguration('roo-code');
                const result = config.get('testResult');
                assert.strictEqual(result, 'test', 'Command should update configuration');
            } finally {
                // Test teardown
                vscode.window.showInputBox = originalShowInputBox;
            }
        }
    )
);

// Test for workspace changes
commandTests.children.add(
    TestUtils.createTest(
        controller,
        'workspace',
        'Command should handle workspace changes',
        vscode.Uri.file(__filename),
        async run => {
            try {
                // Test setup
                await resetExtensionState(globalThis.provider as unknown as ClineProvider);
                mockInputBox.reset();
                vscode.window.showInputBox = mockInputBox.showInputBox.bind(mockInputBox);

                const files = {
                    'test.txt': 'Initial content'
                };
                const testWorkspace = await createTestWorkspace(files);

                try {
                    const testFile = vscode.Uri.joinPath(testWorkspace, 'test.txt');
                    
                    await executeCommandAndWait('roo-cline.testCommand', {
                        file: testFile.fsPath,
                        content: 'Modified content'
                    });

                    const document = await vscode.workspace.openTextDocument(testFile);
                    assertions.textDocumentContains(document, 'Modified content');
                } finally {
                    await cleanupTestWorkspace(testWorkspace);
                }
            } finally {
                // Test teardown
                vscode.window.showInputBox = originalShowInputBox;
            }
        }
    )
);

// Test for user input
commandTests.children.add(
    TestUtils.createTest(
        controller,
        'input',
        'Command should handle user input',
        vscode.Uri.file(__filename),
        async run => {
            try {
                // Test setup
                await resetExtensionState(globalThis.provider as unknown as ClineProvider);
                mockInputBox.reset();
                vscode.window.showInputBox = mockInputBox.showInputBox.bind(mockInputBox);

                mockInputBox.setValue('user input');

                await executeCommandAndWait('roo-cline.testCommand');

                assert.strictEqual(mockInputBox.showCount, 1, 'Should prompt for input');

                const config = vscode.workspace.getConfiguration('roo-code');
                const result = config.get('userInput');
                assert.strictEqual(result, 'user input', 'Command should use user input');
            } finally {
                // Test teardown
                vscode.window.showInputBox = originalShowInputBox;
            }
        }
    )
);

// Test for cancellation
commandTests.children.add(
    TestUtils.createTest(
        controller,
        'cancel',
        'Command should handle cancellation',
        vscode.Uri.file(__filename),
        async run => {
            try {
                // Test setup
                await resetExtensionState(globalThis.provider as unknown as ClineProvider);
                mockInputBox.reset();
                vscode.window.showInputBox = mockInputBox.showInputBox.bind(mockInputBox);

                mockInputBox.setValue(undefined); // User cancelled

                await executeCommandAndWait('roo-cline.testCommand');

                const config = vscode.workspace.getConfiguration('roo-code');
                const result = config.get('commandCancelled');
                assert.strictEqual(result, true, 'Command should handle cancellation');
            } finally {
                // Test teardown
                vscode.window.showInputBox = originalShowInputBox;
            }
        }
    )
);

// Test for error handling
commandTests.children.add(
    TestUtils.createTest(
        controller,
        'error',
        'Command should handle errors',
        vscode.Uri.file(__filename),
        async run => {
            try {
                // Test setup
                await resetExtensionState(globalThis.provider as unknown as ClineProvider);
                mockInputBox.reset();
                vscode.window.showInputBox = mockInputBox.showInputBox.bind(mockInputBox);

                const errorData = { shouldError: true };

                await assert.rejects(
                    async () => await executeCommandAndWait('roo-cline.testCommand', errorData),
                    /Command failed/,
                    'Command should throw expected error'
                );

                const config = vscode.workspace.getConfiguration('roo-code');
                const errorHandled = config.get('errorHandled');
                assert.strictEqual(errorHandled, true, 'Command should handle errors');
            } finally {
                // Test teardown
                vscode.window.showInputBox = originalShowInputBox;
            }
        }
    )
);

// Test for timeout
commandTests.children.add(
    TestUtils.createTest(
        controller,
        'timeout',
        'Command should respect timeout',
        vscode.Uri.file(__filename),
        async run => {
            try {
                // Test setup
                await resetExtensionState(globalThis.provider as unknown as ClineProvider);
                mockInputBox.reset();
                vscode.window.showInputBox = mockInputBox.showInputBox.bind(mockInputBox);

                const longRunningData = { delay: TEST_TIMEOUTS.LONG };

                await assert.rejects(
                    async () => {
                        await Promise.race([
                            executeCommandAndWait('roo-cline.testCommand', longRunningData),
                            new Promise((_, reject) => 
                                setTimeout(() => reject(new Error('Command timeout')), TEST_TIMEOUTS.SHORT)
                            )
                        ]);
                    },
                    /Command timeout/,
                    'Command should timeout'
                );
            } finally {
                // Test teardown
                vscode.window.showInputBox = originalShowInputBox;
            }
        }
    )
);

export function activate() {
    return controller;
}