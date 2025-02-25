import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
    suiteSetup(async () => {
        // Wait for extension to activate
        const ext = vscode.extensions.getExtension('RooVeterinaryInc.roo-cline');
        if (!ext) {
            throw new Error('Extension not found');
        }
        await ext.activate();
    });

    test('Extension should be present', () => {
        const extension = vscode.extensions.getExtension('RooVeterinaryInc.roo-cline');
        assert.ok(extension, 'Extension should be available');
    });

    test('Extension should activate', () => {
        const extension = vscode.extensions.getExtension('RooVeterinaryInc.roo-cline');
        assert.ok(extension?.isActive, 'Extension should be active');
    });

    test('Extension should register commands', async () => {
        const commands = await vscode.commands.getCommands();
        assert.ok(
            commands.includes('roo-cline.SidebarProvider.focus'),
            'Sidebar focus command should be registered'
        );
        assert.ok(
            commands.includes('roo-cline.clearTask'),
            'Clear task command should be registered'
        );
    });

    test('Extension should have configuration', () => {
        const config = vscode.workspace.getConfiguration('roo-cline');
        assert.ok(config, 'Configuration should exist');
        
        // Test default settings
        const allowedCommands = config.get<string[]>('allowedCommands');
        assert.ok(Array.isArray(allowedCommands), 'allowedCommands should be an array');
        assert.strictEqual(allowedCommands?.length, 0, 'allowedCommands should be empty by default');
    });
});
