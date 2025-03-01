import * as vscode from 'vscode';
import * as assert from 'assert';
import { createTestController } from './testController';
import { TestUtils } from '../testUtils';

const controller = createTestController('extensionTests', 'Extension Tests');

// Root test item for Extension
const extensionTests = controller.createTestItem('extension', 'Extension', vscode.Uri.file(__filename));
controller.items.add(extensionTests);

// Activation tests
const activationTests = controller.createTestItem('activation', 'Activation', vscode.Uri.file(__filename));
extensionTests.children.add(activationTests);

// Extension presence test
activationTests.children.add(
    TestUtils.createTest(
        controller,
        'extension-presence',
        'Extension should be present',
        vscode.Uri.file(__filename),
        async run => {
            const extension = vscode.extensions.getExtension('RooVeterinaryInc.roo-cline');
            assert.ok(extension, 'Extension should be available');
        }
    )
);

// Extension activation test
activationTests.children.add(
    TestUtils.createTest(
        controller,
        'extension-activation',
        'Extension should activate',
        vscode.Uri.file(__filename),
        async run => {
            const extension = vscode.extensions.getExtension('RooVeterinaryInc.roo-cline');
            assert.ok(extension?.isActive, 'Extension should be active');
        }
    )
);

// Command tests
const commandTests = controller.createTestItem('commands', 'Commands', vscode.Uri.file(__filename));
extensionTests.children.add(commandTests);

// Command registration test
commandTests.children.add(
    TestUtils.createTest(
        controller,
        'command-registration',
        'Extension should register commands',
        vscode.Uri.file(__filename),
        async run => {
            const commands = await vscode.commands.getCommands();
            assert.ok(
                commands.includes('roo-cline.SidebarProvider.focus'),
                'Sidebar focus command should be registered'
            );
            assert.ok(
                commands.includes('roo-cline.clearTask'),
                'Clear task command should be registered'
            );
        }
    )
);

// Configuration tests
const configTests = controller.createTestItem('configuration', 'Configuration', vscode.Uri.file(__filename));
extensionTests.children.add(configTests);

// Configuration existence test
configTests.children.add(
    TestUtils.createTest(
        controller,
        'config-existence',
        'Extension should have configuration',
        vscode.Uri.file(__filename),
        async run => {
            const config = vscode.workspace.getConfiguration('roo-cline');
            assert.ok(config, 'Configuration should exist');
            
            // Test default settings
            const allowedCommands = config.get<string[]>('allowedCommands');
            assert.ok(Array.isArray(allowedCommands), 'allowedCommands should be an array');
            assert.strictEqual(allowedCommands?.length, 0, 'allowedCommands should be empty by default');
        }
    )
);

// Setup function to ensure extension is activated before tests run
extensionTests.children.add(
    TestUtils.createTest(
        controller,
        'setup',
        'Setup extension for testing',
        vscode.Uri.file(__filename),
        async run => {
            // Wait for extension to activate
            const ext = vscode.extensions.getExtension('RooVeterinaryInc.roo-cline');
            if (!ext) {
                throw new Error('Extension not found');
            }
            await ext.activate();
            assert.ok(ext.isActive, 'Extension should be active after setup');
        }
    )
);

export function activate() {
    return controller;
}
