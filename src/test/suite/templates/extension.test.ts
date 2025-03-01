import * as vscode from 'vscode';
import * as assert from 'assert';
import { 
    TEST_TIMEOUTS,
    waitForCondition,
    createTestWorkspace,
    cleanupTestWorkspace,
    resetExtensionState,
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

const controller = createTestController('extensionTests', 'Extension Tests');

// Root test item for Extension
const extensionTests = controller.createTestItem('extension', 'Extension', vscode.Uri.file(__filename));
controller.items.add(extensionTests);

// Test for extension presence
extensionTests.children.add(
    TestUtils.createTest(
        controller,
        'present',
        'Extension should be present',
        vscode.Uri.file(__filename),
        async run => {
            // Test setup
            await resetExtensionState(globalThis.provider as unknown as ClineProvider);

            const extension = vscode.extensions.getExtension('RooVeterinaryInc.roo-cline');
            assert.ok(extension, 'Extension should be available');
        }
    )
);

// Test for extension activation
extensionTests.children.add(
    TestUtils.createTest(
        controller,
        'activate',
        'Extension should activate',
        vscode.Uri.file(__filename),
        async run => {
            // Test setup
            await resetExtensionState(globalThis.provider as unknown as ClineProvider);

            const extension = vscode.extensions.getExtension('RooVeterinaryInc.roo-cline');
            await extension?.activate();
            assert.ok(extension?.isActive, 'Extension should be active');
        }
    )
);

// Test for command registration
extensionTests.children.add(
    TestUtils.createTest(
        controller,
        'commands',
        'Commands should be registered',
        vscode.Uri.file(__filename),
        async run => {
            // Test setup
            await resetExtensionState(globalThis.provider as unknown as ClineProvider);

            await assertions.commandExists('roo-cline.plusButtonClicked');
            await assertions.commandExists('roo-cline.mcpButtonClicked');
            await assertions.commandExists('roo-cline.startNewTask');
        }
    )
);

// Test for workspace operations
extensionTests.children.add(
    TestUtils.createTest(
        controller,
        'workspace',
        'Should handle workspace operations',
        vscode.Uri.file(__filename),
        async run => {
            // Test setup
            await resetExtensionState(globalThis.provider as unknown as ClineProvider);

            const files = {
                'test.txt': 'Initial content'
            };
            const testWorkspace = await createTestWorkspace(files);

            try {
                const testFile = vscode.Uri.joinPath(testWorkspace, 'test.txt');
                const content = await vscode.workspace.fs.readFile(testFile);
                assert.strictEqual(Buffer.from(content).toString(), 'Initial content');

                const edit = new vscode.WorkspaceEdit();
                edit.insert(testFile, new vscode.Position(0, 0), 'Modified ');
                await vscode.workspace.applyEdit(edit);

                const document = await vscode.workspace.openTextDocument(testFile);
                assertions.textDocumentContains(document, 'Modified Initial content');
            } finally {
                await cleanupTestWorkspace(testWorkspace);
            }
        }
    )
);

// Test for configuration changes
extensionTests.children.add(
    TestUtils.createTest(
        controller,
        'config',
        'Should handle configuration changes',
        vscode.Uri.file(__filename),
        async run => {
            // Test setup
            await resetExtensionState(globalThis.provider as unknown as ClineProvider);

            const config = vscode.workspace.getConfiguration('roo-code');
            await config.update('setting', 'test-value', vscode.ConfigurationTarget.Global);

            await assertions.configurationEquals('setting', 'test-value');

            await config.update('setting', undefined, vscode.ConfigurationTarget.Global);
        }
    )
);

// Test for async operations
extensionTests.children.add(
    TestUtils.createTest(
        controller,
        'async',
        'Should handle async operations',
        vscode.Uri.file(__filename),
        async run => {
            // Test setup
            await resetExtensionState(globalThis.provider as unknown as ClineProvider);

            let operationComplete = false;
            setTimeout(() => { operationComplete = true; }, 1000);

            await waitForCondition(
                () => operationComplete,
                TEST_TIMEOUTS.SHORT,
                100,
                'Operation did not complete in time'
            );

            assert.ok(operationComplete, 'Operation should complete');
        }
    )
);

export function activate() {
    return controller;
}