import * as assert from 'assert';
import * as vscode from 'vscode';
import { TEST_TIMEOUTS, createTestWorkspace, cleanupTestWorkspace, resetExtensionState, executeCommandAndWait, assertions } from '../utils/test-setup';
suite('Command Test Template', () => {
    let workspaceUri;
    suiteSetup(async () => {
        workspaceUri = await createTestWorkspace();
    });
    suiteTeardown(async () => {
        await cleanupTestWorkspace(workspaceUri);
    });
    setup(async () => {
        await resetExtensionState(globalThis.provider);
    });
    test('Command should be registered', async () => {
        await assertions.commandExists('roo-cline.testCommand');
    });
    test('Command should execute successfully', async () => {
        // Setup test data
        const testData = { value: 'test' };
        // Execute command
        await executeCommandAndWait('roo-cline.testCommand', testData);
        // Verify command effects
        const config = vscode.workspace.getConfiguration('roo-code');
        const result = config.get('testResult');
        assert.strictEqual(result, 'test', 'Command should update configuration');
    });
    test('Command should handle workspace changes', async () => {
        // Create test file
        const files = {
            'test.txt': 'Initial content'
        };
        const testWorkspace = await createTestWorkspace(files);
        try {
            const testFile = vscode.Uri.joinPath(testWorkspace, 'test.txt');
            // Execute command that modifies file
            await executeCommandAndWait('roo-cline.testCommand', {
                file: testFile.fsPath,
                content: 'Modified content'
            });
            // Verify file was modified
            const document = await vscode.workspace.openTextDocument(testFile);
            assertions.textDocumentContains(document, 'Modified content');
        }
        finally {
            await cleanupTestWorkspace(testWorkspace);
        }
    });
    test('Command should handle user input', async () => {
        // Mock user input
        const inputSpy = jest.spyOn(vscode.window, 'showInputBox');
        inputSpy.mockResolvedValue('user input');
        try {
            // Execute command that requires input
            await executeCommandAndWait('roo-cline.testCommand');
            // Verify input was requested
            assert.strictEqual(inputSpy.mock.calls.length, 1, 'Should prompt for input');
            // Verify command used input
            const config = vscode.workspace.getConfiguration('roo-code');
            const result = config.get('userInput');
            assert.strictEqual(result, 'user input', 'Command should use user input');
        }
        finally {
            inputSpy.mockRestore();
        }
    });
    test('Command should handle cancellation', async () => {
        // Mock cancelled input
        const inputSpy = jest.spyOn(vscode.window, 'showInputBox');
        inputSpy.mockResolvedValue(undefined); // User cancelled
        try {
            // Execute command
            await executeCommandAndWait('roo-cline.testCommand');
            // Verify command handled cancellation gracefully
            const config = vscode.workspace.getConfiguration('roo-code');
            const result = config.get('commandCancelled');
            assert.strictEqual(result, true, 'Command should handle cancellation');
        }
        finally {
            inputSpy.mockRestore();
        }
    });
    test('Command should handle errors', async () => {
        // Setup error condition
        const errorData = { shouldError: true };
        // Execute command that will error
        await assert.rejects(async () => await executeCommandAndWait('roo-cline.testCommand', errorData), /Command failed/, 'Command should throw expected error');
        // Verify error was handled properly
        const config = vscode.workspace.getConfiguration('roo-code');
        const errorHandled = config.get('errorHandled');
        assert.strictEqual(errorHandled, true, 'Command should handle errors');
    });
    test('Command should respect timeout', async () => {
        // Setup long-running command data
        const longRunningData = { delay: TEST_TIMEOUTS.LONG };
        // Execute command with timeout
        await assert.rejects(async () => {
            await Promise.race([
                executeCommandAndWait('roo-cline.testCommand', longRunningData),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Command timeout')), TEST_TIMEOUTS.SHORT))
            ]);
        }, /Command timeout/, 'Command should timeout');
    });
});
//# sourceMappingURL=command.test.js.map