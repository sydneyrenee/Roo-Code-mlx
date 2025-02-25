import * as vscode from 'vscode';
import * as assert from 'assert';
/**
 * Mock VSCode window functionality
 */
export function createMockWindow() {
    const messageResponses = new Map();
    const inputResponses = new Map();
    function createOutputChannelMock(name, options) {
        const baseChannel = {
            name,
            append: jest.fn(),
            appendLine: jest.fn(),
            clear: jest.fn(),
            hide: jest.fn(),
            show: jest.fn(),
            replace: jest.fn(),
            dispose: jest.fn()
        };
        if (typeof options === 'object' && options.log) {
            const emitter = new vscode.EventEmitter();
            return {
                ...baseChannel,
                logLevel: vscode.LogLevel.Info,
                onDidChangeLogLevel: emitter.event,
                trace: jest.fn(),
                debug: jest.fn(),
                info: jest.fn(),
                warn: jest.fn(),
                error: jest.fn()
            };
        }
        return baseChannel;
    }
    return {
        showInformationMessage: jest.fn(async (message) => {
            return messageResponses.get(message);
        }),
        showErrorMessage: jest.fn(async (message) => {
            return messageResponses.get(message);
        }),
        showInputBox: jest.fn(async (options) => {
            return inputResponses.get(options?.prompt || '') || '';
        }),
        createOutputChannel: createOutputChannelMock,
        _setMessageResponse: (message, response) => {
            messageResponses.set(message, response);
        },
        _setInputResponse: (prompt, response) => {
            inputResponses.set(prompt, response);
        }
    };
}
/**
 * Mock VSCode workspace functionality
 */
export function createMockWorkspace() {
    const configValues = new Map();
    const fileContents = new Map();
    const workspace = {
        getConfiguration: jest.fn((section) => ({
            get: jest.fn((key) => configValues.get(`${section}.${key}`)),
            update: jest.fn(async (key, value) => {
                configValues.set(`${section}.${key}`, value);
            }),
            has: jest.fn((key) => configValues.has(`${section}.${key}`)),
            inspect: jest.fn(() => undefined)
        })),
        fs: {
            readFile: jest.fn(async (uri) => {
                const content = fileContents.get(uri.fsPath);
                if (!content)
                    throw vscode.FileSystemError.FileNotFound(uri);
                return content;
            }),
            writeFile: jest.fn(async (uri, content) => {
                fileContents.set(uri.fsPath, content);
            }),
            stat: jest.fn(),
            readDirectory: jest.fn(),
            createDirectory: jest.fn(),
            delete: jest.fn(),
            rename: jest.fn(),
            copy: jest.fn(),
            isWritableFileSystem: (scheme) => true
        }
    };
    // Add test helper methods without exposing them in the type
    const testHelpers = {
        _setConfigValue: (section, key, value) => {
            configValues.set(`${section}.${key}`, value);
        },
        _setFileContent: (path, content) => {
            fileContents.set(path, content);
        }
    };
    return Object.assign(workspace, testHelpers);
}
/**
 * Mock VSCode extension context
 */
export function createMockExtensionContext() {
    const state = new Map();
    return {
        subscriptions: [],
        extensionPath: '',
        globalState: {
            get: jest.fn((key) => state.get(key)),
            update: jest.fn(async (key, value) => {
                state.set(key, value);
                return Promise.resolve();
            }),
            keys: jest.fn(() => Array.from(state.keys()))
        },
        workspaceState: {
            get: jest.fn((key) => state.get(key)),
            update: jest.fn(async (key, value) => {
                state.set(key, value);
                return Promise.resolve();
            }),
            keys: jest.fn(() => Array.from(state.keys()))
        },
        asAbsolutePath: jest.fn((relativePath) => relativePath),
        storageUri: vscode.Uri.file(''),
        globalStorageUri: vscode.Uri.file(''),
        logUri: vscode.Uri.file(''),
        extensionUri: vscode.Uri.file('')
    };
}
/**
 * Mock WebviewPanel
 */
export function createMockWebviewPanel() {
    const messageEmitter = new vscode.EventEmitter();
    return {
        webview: {
            html: '',
            onDidReceiveMessage: messageEmitter.event,
            postMessage: jest.fn(async (message) => {
                messageEmitter.fire(message);
                return true;
            }),
            asWebviewUri: jest.fn((uri) => uri),
            cspSource: '',
            options: {}
        },
        onDidDispose: jest.fn(() => ({ dispose: () => { } })),
        onDidChangeViewState: jest.fn(() => ({ dispose: () => { } })),
        reveal: jest.fn(),
        dispose: jest.fn(),
        active: true,
        visible: true,
        viewColumn: vscode.ViewColumn.One
    };
}
/**
 * Translation helpers for Jest to VSCode assertions
 */
export const assertionTranslators = {
    toBe: (actual, expected, message) => {
        return {
            assertion: () => assert.strictEqual(actual, expected, message),
            message: message || `Expected ${actual} to be ${expected}`
        };
    },
    toBeTruthy: (actual, message) => {
        return {
            assertion: () => assert.ok(actual, message),
            message: message || `Expected ${actual} to be truthy`
        };
    },
    toEqual: (actual, expected, message) => {
        return {
            assertion: () => assert.deepStrictEqual(actual, expected, message),
            message: message || `Expected ${actual} to equal ${expected}`
        };
    },
    toThrow: (fn, expected, message) => {
        return {
            assertion: () => {
                if (expected instanceof RegExp) {
                    assert.throws(fn, { message: expected });
                }
                else if (expected instanceof Error) {
                    assert.throws(fn, { message: expected.message });
                }
                else if (typeof expected === 'function') {
                    assert.throws(fn, expected);
                }
                else if (typeof expected === 'string') {
                    assert.throws(fn, { message: expected });
                }
                else {
                    assert.throws(fn);
                }
            },
            message: message || `Expected function to throw ${expected}`
        };
    }
};
//# sourceMappingURL=mock-helpers.js.map