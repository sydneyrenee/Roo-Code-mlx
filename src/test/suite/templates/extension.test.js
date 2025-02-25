import * as assert from 'assert';
import * as vscode from 'vscode';
import { TEST_TIMEOUTS, waitForCondition, createTestWorkspace, cleanupTestWorkspace, resetExtensionState, assertions } from '../utils/test-setup';
suite('Extension Test Template', () => {
    let workspaceUri;
    suiteSetup(async () => {
        // Setup before all tests
        workspaceUri = await createTestWorkspace();
    });
    suiteTeardown(async () => {
        // Cleanup after all tests
        await cleanupTestWorkspace(workspaceUri);
    });
    setup(async () => {
        // Reset state before each test
        await resetExtensionState(globalThis.provider);
    });
    test('Extension should be present', async () => {
        const extension = vscode.extensions.getExtension('RooVeterinaryInc.roo-cline');
        assert.ok(extension, 'Extension should be available');
    });
    test('Extension should activate', async () => {
        const extension = vscode.extensions.getExtension('RooVeterinaryInc.roo-cline');
        await extension?.activate();
        assert.ok(extension?.isActive, 'Extension should be active');
    });
    test('Commands should be registered', async () => {
        // Verify core commands are registered
        await assertions.commandExists('roo-cline.plusButtonClicked');
        await assertions.commandExists('roo-cline.mcpButtonClicked');
        await assertions.commandExists('roo-cline.startNewTask');
    });
    test('Should handle workspace operations', async () => {
        // Create test file
        const files = {
            'test.txt': 'Initial content'
        };
        const testWorkspace = await createTestWorkspace(files);
        try {
            // Verify file was created
            const testFile = vscode.Uri.joinPath(testWorkspace, 'test.txt');
            const content = await vscode.workspace.fs.readFile(testFile);
            assert.strictEqual(Buffer.from(content).toString(), 'Initial content');
            // Test file modifications
            const edit = new vscode.WorkspaceEdit();
            edit.insert(testFile, new vscode.Position(0, 0), 'Modified ');
            await vscode.workspace.applyEdit(edit);
            // Verify modifications
            const document = await vscode.workspace.openTextDocument(testFile);
            assertions.textDocumentContains(document, 'Modified Initial content');
        }
        finally {
            await cleanupTestWorkspace(testWorkspace);
        }
    });
    test('Should handle configuration changes', async () => {
        // Update configuration
        const config = vscode.workspace.getConfiguration('roo-code');
        await config.update('setting', 'test-value', vscode.ConfigurationTarget.Global);
        // Verify configuration
        await assertions.configurationEquals('setting', 'test-value');
        // Reset configuration
        await config.update('setting', undefined, vscode.ConfigurationTarget.Global);
    });
    test('Should handle async operations', async () => {
        // Setup condition to wait for
        let operationComplete = false;
        setTimeout(() => { operationComplete = true; }, 1000);
        // Wait for condition
        await waitForCondition(() => operationComplete, TEST_TIMEOUTS.SHORT, 100, 'Operation did not complete in time');
        assert.ok(operationComplete, 'Operation should complete');
    });
});
//# sourceMappingURL=extension.test.js.map