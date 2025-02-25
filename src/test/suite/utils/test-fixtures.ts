import * as vscode from 'vscode';

/**
 * Common test fixtures for VSCode tests
 */
export const TEST_FIXTURES = {
    // Command fixtures
    COMMANDS: {
        CORE: [
            'roo-cline.plusButtonClicked',
            'roo-cline.mcpButtonClicked',
            'roo-cline.startNewTask'
        ],
        MODE: [
            'roo-cline.switchMode',
            'roo-cline.confirmModeSwitch'
        ],
        EDITOR: [
            'roo-cline.applyDiff',
            'roo-cline.insertContent',
            'roo-cline.writeToFile'
        ]
    },

    // Mode fixtures
    MODES: {
        DEFAULT: 'Ask',
        AVAILABLE: ['Ask', 'Code', 'Architect'],
        RESTRICTED: {
            'Ask': ['read'],
            'Code': ['read', 'edit', 'execute'],
            'Architect': ['read', 'edit']
        }
    },

    // Message fixtures
    MESSAGES: {
        WEBVIEW: {
            MODE_SWITCH: { type: 'switchMode', mode: 'Code' },
            NEW_TASK: { type: 'newTask', message: 'Test task' },
            TOOL_USE: { type: 'toolUse', tool: 'read_file', params: { path: 'test.txt' } }
        },
        NOTIFICATIONS: {
            MODE_SWITCH: 'Switched to Code mode',
            TASK_START: 'Starting new task',
            ERROR: 'An error occurred'
        }
    },

    // File fixtures
    FILES: {
        CONTENT: {
            TYPESCRIPT: `
import * as vscode from 'vscode';

export function testFunction(): void {
    console.log('test');
}`,
            PYTHON: `
def test_function():
    print('test')`,
            MARKDOWN: `
# Test Document

This is a test document.`
        },
        PATHS: {
            TYPESCRIPT: 'src/test.ts',
            PYTHON: 'src/test.py',
            MARKDOWN: 'docs/test.md'
        }
    },

    // Configuration fixtures
    CONFIG: {
        DEFAULT: {
            'roo-code.defaultMode': 'Ask',
            'roo-code.alwaysAllowModeSwitch': true,
            'roo-code.soundEnabled': false,
            'roo-code.soundVolume': 0.5
        },
        CUSTOM: {
            'roo-code.defaultMode': 'Code',
            'roo-code.alwaysAllowModeSwitch': false,
            'roo-code.soundEnabled': true,
            'roo-code.soundVolume': 0.8
        }
    },

    // State fixtures
    STATE: {
        GLOBAL: {
            mode: 'Ask',
            alwaysAllowModeSwitch: true,
            soundEnabled: false,
            soundVolume: 0.5
        },
        WORKSPACE: {
            lastTask: null,
            taskHistory: []
        }
    }
};

/**
 * Create a test document with specified content
 */
export function createTestDocument(content: string, language: string = 'typescript'): Partial<vscode.TextDocument> {
    const lines = content.split('\n');
    
    function createTextLine(lineNumber: number): vscode.TextLine {
        const text = lines[lineNumber] || '';
        const range = new vscode.Range(
            new vscode.Position(lineNumber, 0),
            new vscode.Position(lineNumber, text.length)
        );
        const rangeIncludingLineBreak = new vscode.Range(
            new vscode.Position(lineNumber, 0),
            new vscode.Position(lineNumber, text.length + 1)
        );
        const firstNonWhitespace = text.search(/\S/);
        
        return {
            lineNumber,
            text,
            range,
            rangeIncludingLineBreak,
            firstNonWhitespaceCharacterIndex: firstNonWhitespace === -1 ? text.length : firstNonWhitespace,
            isEmptyOrWhitespace: text.trim().length === 0
        };
    }

    return {
        getText: () => content,
        languageId: language,
        uri: vscode.Uri.file(`test.${language}`),
        fileName: `test.${language}`,
        lineCount: lines.length,
        lineAt: (lineOrPosition: number | vscode.Position) => {
            const line = typeof lineOrPosition === 'number' 
                ? lineOrPosition 
                : lineOrPosition.line;
            if (line < 0 || line >= lines.length) {
                throw new Error('Invalid line number');
            }
            return createTextLine(line);
        }
    };
}

/**
 * Create test workspace folders
 */
export function createTestWorkspaceFolders(): vscode.WorkspaceFolder[] {
    return [{
        uri: vscode.Uri.file('/test-workspace'),
        name: 'Test Workspace',
        index: 0
    }];
}

/**
 * Create test configuration
 */
export function createTestConfiguration(custom: boolean = false): any {
    return custom ? TEST_FIXTURES.CONFIG.CUSTOM : TEST_FIXTURES.CONFIG.DEFAULT;
}

/**
 * Create test state
 */
export function createTestState(scope: 'global' | 'workspace' = 'global'): any {
    return scope === 'global' ? TEST_FIXTURES.STATE.GLOBAL : TEST_FIXTURES.STATE.WORKSPACE;
}