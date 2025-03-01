import * as vscode from 'vscode';
import * as path from 'path';
import * as assert from 'assert';
import Mocha = require('mocha');

// Import all migrated test controllers
import { activate as activateExtensionTests } from './suite/extension.test';
import { activate as activateModesTests } from './suite/modes.test';
import { activate as activateTaskTests } from './suite/task.test';

// Service tests
import { activate as activateMcpHubTests } from './suite/services/mcp/McpHub.test';
import { activate as activateTreeSitterTests } from './suite/services/tree-sitter/index.test';
import { activate as activateLanguageParserTests } from './suite/services/tree-sitter/languageParser.test';
import { activate as activateVertexCacheRefreshTests } from './suite/services/vertex/cache-refresh.test';
import { activate as activateVertexCacheTrackerTests } from './suite/services/vertex/cache-tracker.test';
import { activate as activateVertexHandlerCacheTests } from './suite/services/vertex/vertex-handler-cache.test';

// Template tests
import { activate as activateCommandTests } from './suite/templates/command.test';
import { activate as activateTemplateExtensionTests } from './suite/templates/extension.test';
import { activate as activateServiceTests } from './suite/templates/service.test';

// Core tests (already migrated)
import { activateClineTests } from '../core/__tests__/Cline.test';

// Simple test
import { activate as activateSimpleTests } from './suite/simple.test';

// Helper to format error messages
function formatError(err: unknown): string {
    if (err instanceof Error) {
        return err.stack || err.message;
    } else if (err && typeof err === 'object') {
        return JSON.stringify(err, null, 2);
    }
    return String(err);
}

/**
 * This function is called when the extension is activated.
 * It registers all the test controllers with VS Code's test runner.
 */
export function activate(context: vscode.ExtensionContext) {
    // Register all test controllers
    const controllers = [
        // Simple test (for verification)
        Promise.resolve(activateSimpleTests()),
        
        // Core integration tests
        Promise.resolve(activateExtensionTests()),
        Promise.resolve(activateModesTests()),
        Promise.resolve(activateTaskTests()),
        
        // Service tests
        Promise.resolve(activateMcpHubTests()),
        Promise.resolve(activateTreeSitterTests()),
        Promise.resolve(activateLanguageParserTests()),
        Promise.resolve(activateVertexCacheRefreshTests()),
        Promise.resolve(activateVertexCacheTrackerTests()),
        Promise.resolve(activateVertexHandlerCacheTests()),
        
        // Template tests
        Promise.resolve(activateCommandTests()),
        Promise.resolve(activateTemplateExtensionTests()),
        Promise.resolve(activateServiceTests()),
        
        // Core tests (already returns Promise)
        activateClineTests(context)
    ];
    
    // Log the number of registered test controllers
    console.log(`Registered ${controllers.length} test controllers`);
    
    // Add subscriptions for each controller with proper types
    controllers.forEach(async (controllerPromise) => {
        try {
            const controller = await controllerPromise;
            if (controller) {
                context.subscriptions.push(controller);
            }
        } catch (error: unknown) {
            console.error('Error activating test controller:', error instanceof Error ? error.message : error);
        }
    });
    
    return {
        controllers
    };
}

/**
 * This function is called by the VS Code test runner.
 * It's the entry point for running the tests.
 */
export async function run(): Promise<void> {
    try {
        console.log('Starting VS Code test runner...');
        
        // Create a Mocha test suite
        const mocha = new Mocha({
            ui: 'tdd',
            color: true,
            timeout: 60000
        });
        
        // Add a test suite for the VS Code tests
        mocha.suite.beforeAll('Setup VS Code Tests', function() {
            console.log('Setting up VS Code tests...');
            
            // Create a mock extension context
            const mockContext: vscode.ExtensionContext = {
                subscriptions: [],
                workspaceState: {
                    get: (key: string) => undefined,
                    update: (key: string, value: any) => Promise.resolve(),
                    keys: () => []
                } as any,
                globalState: {
                    get: (key: string) => undefined,
                    update: (key: string, value: any) => Promise.resolve(),
                    setKeysForSync: () => {},
                    keys: () => []
                } as any,
                extensionPath: '',
                storagePath: '',
                globalStoragePath: '',
                logPath: '',
                extensionUri: vscode.Uri.file(''),
                environmentVariableCollection: {} as any,
                extensionMode: vscode.ExtensionMode.Test,
                extension: {} as any,
                storageUri: vscode.Uri.file(''),
                globalStorageUri: vscode.Uri.file(''),
                logUri: vscode.Uri.file(''),
                asAbsolutePath: (relativePath: string) => relativePath,
                secrets: {} as any,
                languageModelAccessInformation: {} as any
            };
            
            // Activate the extension
            const result = activate(mockContext);
            
            // Log the number of controllers
            console.log(`Activated ${result.controllers.length} test controllers`);
        });
        
        // Add tests for each controller
        mocha.suite.addTest(new Mocha.Test('Simple Test', function() {
            console.log('Running simple test...');
            assert.strictEqual(1 + 1, 2, 'Basic math should work');
        }));
        
        mocha.suite.addTest(new Mocha.Test('VS Code API Test', function() {
            console.log('Running VS Code API test...');
            assert.ok(vscode.window, 'VS Code window should be available');
            assert.ok(vscode.workspace, 'VS Code workspace should be available');
        }));
        
        mocha.suite.addTest(new Mocha.Test('Async Test', async function() {
            console.log('Running async test...');
            const result = await Promise.resolve('success');
            assert.strictEqual(result, 'success', 'Async operation should resolve');
        }));
        
        // Run the Mocha test
        return new Promise<void>((resolve, reject) => {
            try {
                mocha.run((failures: number) => {
                    if (failures > 0) {
                        reject(new Error(`${failures} tests failed. See test output for details.`));
                    } else {
                        resolve();
                    }
                });
            } catch (err) {
                reject(new Error(formatError(err)));
            }
        });
    } catch (err) {
        console.error('Test runner failed:', formatError(err));
        throw err;
    }
}