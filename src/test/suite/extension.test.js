import * as assert from 'assert';
import * as vscode from 'vscode';
suite('Extension Test Suite', () => {
    // Runs before all tests
    suiteSetup(async () => {
        // Wait for extension to activate
        const ext = vscode.extensions.getExtension('RooVeterinaryInc.roo-cline');
        await ext?.activate();
    });
    // Runs after all tests
    suiteTeardown(() => {
        vscode.window.showInformationMessage('All tests done!');
    });
    test('Extension should be present', () => {
        const extension = vscode.extensions.getExtension('RooVeterinaryInc.roo-cline');
        assert.ok(extension, 'Extension should be available');
    });
    test('Extension should activate', async () => {
        const extension = vscode.extensions.getExtension('RooVeterinaryInc.roo-cline');
        assert.ok(extension?.isActive, 'Extension should be active');
    });
    test('Sidebar command should be registered', async () => {
        const commands = await vscode.commands.getCommands();
        assert.ok(commands.includes('roo-cline.SidebarProvider.focus'), 'Sidebar focus command should be registered');
    });
    test('Sidebar should open', async () => {
        try {
            await vscode.commands.executeCommand('roo-cline.SidebarProvider.focus');
            // Give it a moment to open
            await new Promise(resolve => setTimeout(resolve, 1000));
            assert.ok(true, 'Sidebar opened successfully');
        }
        catch (error) {
            assert.fail(`Failed to open sidebar: ${error instanceof Error ? error.message : String(error)}`);
        }
    });
    test('Configuration should be available', async () => {
        const config = vscode.workspace.getConfiguration('roo-cline');
        assert.ok(config, 'Configuration should exist');
        const allowedCommands = config.get('allowedCommands');
        assert.ok(Array.isArray(allowedCommands), 'allowedCommands should be an array');
    });
    test('Configuration should update', async () => {
        const config = vscode.workspace.getConfiguration('roo-cline');
        const originalCommands = config.get('allowedCommands');
        try {
            await config.update('allowedCommands', ['test-command'], vscode.ConfigurationTarget.Global);
            const updatedCommands = config.get('allowedCommands');
            assert.deepStrictEqual(updatedCommands, ['test-command'], 'Configuration should update correctly');
        }
        finally {
            // Restore original value
            await config.update('allowedCommands', originalCommands, vscode.ConfigurationTarget.Global);
        }
    });
});
//# sourceMappingURL=extension.test.js.map