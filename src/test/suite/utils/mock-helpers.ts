import * as vscode from 'vscode';

/**
 * Interface for mock function tracking
 */
interface MockFunctionState<T extends (...args: any[]) => any> {
    calls: Parameters<T>[];
    lastCall: Parameters<T> | undefined;
    results: ReturnType<T>[];
    instances: any[];
    mockClear(): void;
}

/**
 * Type for a mocked function
 */
type MockFunction<T extends (...args: any[]) => any> = T & {
    mock: MockFunctionState<T>;
};

/**
 * Creates a mock function that can be called and tracked
 */
function createMockFn<T extends (...args: any[]) => any>(): MockFunction<T> {
    const mockFn = ((...args: Parameters<T>) => {
        mockFn.mock.calls.push(args);
        mockFn.mock.lastCall = args;
        return undefined as ReturnType<T>;
    }) as MockFunction<T>;

    mockFn.mock = {
        calls: [],
        lastCall: undefined,
        results: [],
        instances: [],
        mockClear() {
            this.calls = [];
            this.lastCall = undefined;
            this.results = [];
            this.instances = [];
        }
    };
    return mockFn;
}

/**
 * Creates a mock VS Code decoration type
 */
export function createMockDecorationType(): vscode.TextEditorDecorationType {
    return {
        key: 'mock-decoration',
        dispose: createMockFn<() => void>(),
    };
}

/**
 * Creates a mock VS Code output channel
 */
export function createMockOutputChannel(): vscode.OutputChannel {
    const showFn = ((columnOrPreserveFocus?: vscode.ViewColumn | boolean, preserveFocus?: boolean) => {
        // Implementation handles both overloads
    }) as unknown as vscode.OutputChannel['show'];

    return {
        name: 'mock-output',
        append: createMockFn<(value: string) => void>(),
        appendLine: createMockFn<(value: string) => void>(),
        clear: createMockFn<() => void>(),
        show: showFn,
        hide: createMockFn<() => void>(),
        dispose: createMockFn<() => void>(),
        replace: createMockFn<(value: string) => void>(),
    };
}

/**
 * Creates a mock VS Code extension context
 */
export function createMockExtensionContext(): vscode.ExtensionContext {
    const state = new Map<string, any>();
    const secrets = new Map<string, string>();

    return {
        subscriptions: [],
        workspaceState: {
            get: (key: string) => state.get(key),
            update: async (key: string, value: any) => {
                state.set(key, value);
            },
            keys: () => Array.from(state.keys()),
        },
        globalState: {
            get: (key: string) => state.get(key),
            update: async (key: string, value: any) => {
                state.set(key, value);
            },
            keys: () => Array.from(state.keys()),
            setKeysForSync: createMockFn<(keys: string[]) => void>(),
        },
        secrets: {
            get: (key: string) => Promise.resolve(secrets.get(key) || ''),
            store: (key: string, value: string) => {
                secrets.set(key, value);
                return Promise.resolve();
            },
            delete: (key: string) => {
                secrets.delete(key);
                return Promise.resolve();
            },
            onDidChange: createMockFn<vscode.Event<vscode.SecretStorageChangeEvent>>(),
        },
        extensionPath: '',
        asAbsolutePath: (relativePath: string) => relativePath,
        extensionUri: vscode.Uri.file(''),
        environmentVariableCollection: {
            persistent: true,
            description: undefined,
            replace: createMockFn<(variable: string, value: string) => void>(),
            append: createMockFn<(variable: string, value: string) => void>(),
            prepend: createMockFn<(variable: string, value: string) => void>(),
            get: createMockFn<(variable: string) => vscode.EnvironmentVariableMutator | undefined>(),
            forEach: ((callback: (variable: string, mutator: vscode.EnvironmentVariableMutator, collection: vscode.EnvironmentVariableCollection) => void, thisArg?: any) => {
                // Empty implementation
            }) as vscode.EnvironmentVariableCollection['forEach'],
            delete: createMockFn<(variable: string) => void>(),
            clear: createMockFn<() => void>(),
            getScoped: createMockFn<(scope: vscode.EnvironmentVariableScope) => vscode.EnvironmentVariableCollection>(),
            [Symbol.iterator]: function* () {
                yield* [];
            },
        },
        extensionMode: vscode.ExtensionMode.Test,
        globalStorageUri: vscode.Uri.file(''),
        logUri: vscode.Uri.file(''),
        storagePath: '',
        globalStoragePath: '',
        logPath: '',
        storageUri: vscode.Uri.file(''),
        extension: {
            id: 'mock-extension',
            extensionUri: vscode.Uri.file(''),
            extensionPath: '',
            isActive: true,
            packageJSON: {},
            exports: undefined,
            activate: () => Promise.resolve(),
            extensionKind: vscode.ExtensionKind.UI,
        },
        languageModelAccessInformation: {
            // Mock implementation - exact shape not critical for tests
        } as any,
    };
}

/**
 * Creates a mock VS Code webview
 */
export function createMockWebview(): vscode.Webview {
    return {
        cspSource: '',
        html: '',
        options: {
            enableScripts: false,
            enableForms: false,
            enableCommandUris: false,
        },
        onDidReceiveMessage: createMockFn<vscode.Event<any>>(),
        postMessage: createMockFn<(message: any) => Thenable<boolean>>(),
        asWebviewUri: (uri: vscode.Uri) => uri,
    };
}

/**
 * Creates a mock VS Code webview panel
 */
export function createMockWebviewPanel(): vscode.WebviewPanel {
    return {
        active: true,
        webview: createMockWebview(),
        viewType: 'mock-webview',
        title: 'Mock Webview',
        visible: true,
        options: {
            enableFindWidget: false,
            retainContextWhenHidden: false,
        },
        viewColumn: vscode.ViewColumn.One,
        onDidDispose: createMockFn<vscode.Event<void>>(),
        onDidChangeViewState: createMockFn<vscode.Event<vscode.WebviewPanelOnDidChangeViewStateEvent>>(),
        reveal: createMockFn<(viewColumn?: vscode.ViewColumn, preserveFocus?: boolean) => void>(),
        dispose: createMockFn<() => void>(),
    };
}