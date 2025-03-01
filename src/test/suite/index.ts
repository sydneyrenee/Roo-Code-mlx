import * as path from 'path';
import * as Mocha from 'mocha';
import { glob } from 'glob';
import * as vscode from 'vscode';
import { activateBasicTests } from './basic.test';
import { activatePathTests } from '../../utils/__tests__/path.test.migrated.migrated';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    // Register test modules
    await activateBasicTests(context);
    await activatePathTests(context);
}

// This will be called by the test runner to bootstrap tests
export function run(): Promise<void> {
    // Create a simple extension host
    const context = {
        subscriptions: [],
        workspaceState: new Map(),
        globalState: new Map(),
        extensionPath: __dirname,
        asAbsolutePath: (relativePath: string) => relativePath,
        storagePath: __dirname,
        logPath: __dirname,
        globalStoragePath: __dirname,
        extensionUri: vscode.Uri.file(__dirname),
        environmentVariableCollection: new Map(),
        extensionMode: vscode.ExtensionMode.Test,
        secrets: new Map(),
    };

    return activate(context as unknown as vscode.ExtensionContext);
}
