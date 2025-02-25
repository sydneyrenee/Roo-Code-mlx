import * as vscode from 'vscode';
import * as assert from 'assert';
import * as path from 'path';
/**
 * Common timeout values for tests
 */
export const TEST_TIMEOUTS = {
    SHORT: 5000,
    MEDIUM: 15000,
    LONG: 30000,
    EXTENDED: 60000
};
/**
 * Wait for a condition to be true with timeout
 */
export async function waitForCondition(condition, timeout = TEST_TIMEOUTS.MEDIUM, interval = 1000, message = 'Condition not met within timeout') {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        if (await condition())
            return;
        await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error(message);
}
/**
 * Create a test workspace with optional files
 */
export async function createTestWorkspace(files) {
    const workspaceDir = path.join(__dirname, `test-workspace-${Date.now()}`);
    const workspaceUri = vscode.Uri.file(workspaceDir);
    if (files) {
        const edit = new vscode.WorkspaceEdit();
        for (const [filePath, content] of Object.entries(files)) {
            const fileUri = vscode.Uri.joinPath(workspaceUri, filePath);
            edit.createFile(fileUri, { ignoreIfExists: true });
            edit.insert(fileUri, new vscode.Position(0, 0), content);
        }
        await vscode.workspace.applyEdit(edit);
    }
    return workspaceUri;
}
/**
 * Clean up test workspace
 */
export async function cleanupTestWorkspace(workspaceUri) {
    try {
        await vscode.workspace.fs.delete(workspaceUri, { recursive: true });
    }
    catch (error) {
        console.error(`Failed to cleanup workspace: ${error}`);
    }
}
/**
 * Execute command and wait for completion
 */
export async function executeCommandAndWait(command, ...args) {
    await vscode.commands.executeCommand(command, ...args);
    // Give time for command effects to propagate
    await new Promise(resolve => setTimeout(resolve, 100));
}
/**
 * Reset extension state
 */
export async function resetExtensionState(provider) {
    await provider.updateGlobalState("mode", "Ask");
    await provider.updateGlobalState("alwaysAllowModeSwitch", true);
    await provider.updateGlobalState("soundEnabled", false);
    await provider.updateGlobalState("soundVolume", 0.5);
}
/**
 * Create a disposable test that handles setup and cleanup
 */
export function createDisposableTest(setup, cleanup, testFn) {
    return async function wrappedTest() {
        try {
            await setup();
            await testFn();
        }
        finally {
            await cleanup();
        }
    };
}
/**
 * Common test assertions
 */
export const assertions = {
    commandExists: async (command) => {
        const commands = await vscode.commands.getCommands();
        assert.ok(commands.includes(command), `Command ${command} should be registered`);
    },
    textDocumentContains: (document, expected) => {
        const content = document.getText();
        assert.ok(content.includes(expected), `Document should contain "${expected}"`);
    },
    configurationEquals: async (section, value) => {
        const config = vscode.workspace.getConfiguration('roo-code');
        const actual = config.get(section);
        assert.deepStrictEqual(actual, value, `Configuration ${section} should equal ${value}`);
    }
};
//# sourceMappingURL=test-setup.js.map