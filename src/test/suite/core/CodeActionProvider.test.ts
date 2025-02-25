import * as assert from 'assert';
import * as vscode from 'vscode';
import { CodeActionProvider, ACTION_NAMES } from '../../../core/CodeActionProvider';
import { EditorUtils } from '../../../core/EditorUtils';
import type { EffectiveRange } from '../../../core/EditorUtils';

suite('CodeActionProvider', () => {
    let provider: CodeActionProvider;
    let mockDocument: vscode.TextDocument;
    let mockRange: vscode.Range;
    let mockContext: vscode.CodeActionContext;
    let originalEditorUtils: any;

    setup(() => {
        provider = new CodeActionProvider();

        // Store original EditorUtils methods
        originalEditorUtils = {
            getEffectiveRange: EditorUtils.getEffectiveRange,
            getFilePath: EditorUtils.getFilePath,
            hasIntersectingRange: EditorUtils.hasIntersectingRange,
            createDiagnosticData: EditorUtils.createDiagnosticData,
            getEditorContext: EditorUtils.getEditorContext,
            prototype: EditorUtils.prototype
        };

        // Mock document
        mockDocument = {
            getText: () => '',
            lineAt: ((lineOrPosition: number | vscode.Position) => {
                const line = typeof lineOrPosition === 'number' 
                    ? lineOrPosition 
                    : lineOrPosition.line;
                return {
                    text: '',
                    lineNumber: line,
                    range: new vscode.Range(line, 0, line, 0),
                    rangeIncludingLineBreak: new vscode.Range(line, 0, line, 0),
                    firstNonWhitespaceCharacterIndex: 0,
                    isEmptyOrWhitespace: true
                };
            }) as any,
            lineCount: 10,
            uri: vscode.Uri.file('/test/file.ts'),
            fileName: '/test/file.ts',
            isDirty: false,
            isUntitled: false,
            isClosed: false,
            languageId: 'typescript',
            version: 1,
            eol: vscode.EndOfLine.LF,
            save: async () => true,
            offsetAt: () => 0,
            positionAt: () => new vscode.Position(0, 0),
            validateRange: (range: vscode.Range) => range,
            validatePosition: (position: vscode.Position) => position,
            getWordRangeAtPosition: () => undefined
        };

        // Mock range
        mockRange = new vscode.Range(0, 0, 0, 10);

        // Mock context
        mockContext = {
            diagnostics: [],
            only: undefined,
            triggerKind: vscode.CodeActionTriggerKind.Invoke
        };

        // Mock EditorUtils methods
        EditorUtils.getEffectiveRange = () => ({
            range: mockRange,
            text: 'test code'
        });
        EditorUtils.getFilePath = () => '/test/file.ts';
        EditorUtils.hasIntersectingRange = () => true;
        EditorUtils.createDiagnosticData = (d: any) => d;
    });

    teardown(() => {
        // Restore original EditorUtils methods
        Object.assign(EditorUtils, originalEditorUtils);
    });

    suite('provideCodeActions', () => {
        test('should provide explain, improve, fix logic, and add to context actions by default', async () => {
            const actions = await provider.provideCodeActions(mockDocument, mockRange, mockContext);
            assert.ok(actions, 'Actions should not be null');
            assert.strictEqual(actions.length, 7, 'Should provide 7 actions');

            const actionTitles = actions.map(a => a.title);
            assert.ok(actionTitles.includes(`${ACTION_NAMES.EXPLAIN} in New Task`));
            assert.ok(actionTitles.includes(`${ACTION_NAMES.EXPLAIN} in Current Task`));
            assert.ok(actionTitles.includes(`${ACTION_NAMES.FIX_LOGIC} in New Task`));
            assert.ok(actionTitles.includes(`${ACTION_NAMES.FIX_LOGIC} in Current Task`));
            assert.ok(actionTitles.includes(`${ACTION_NAMES.IMPROVE} in New Task`));
            assert.ok(actionTitles.includes(`${ACTION_NAMES.IMPROVE} in Current Task`));
            assert.ok(actionTitles.includes(ACTION_NAMES.ADD_TO_CONTEXT));
        });

        test('should provide fix action instead of fix logic when diagnostics exist', async () => {
            const diagnostic: vscode.Diagnostic = {
                message: 'test error',
                severity: vscode.DiagnosticSeverity.Error,
                range: mockRange,
                source: 'test'
            };

            // Create new context with diagnostics
            const contextWithDiagnostics: vscode.CodeActionContext = {
                diagnostics: [diagnostic],
                only: undefined,
                triggerKind: vscode.CodeActionTriggerKind.Invoke
            };

            const actions = await provider.provideCodeActions(mockDocument, mockRange, contextWithDiagnostics);
            assert.ok(actions, 'Actions should not be null');
            assert.strictEqual(actions.length, 7, 'Should provide 7 actions');

            const actionTitles = actions.map(a => a.title);
            assert.ok(actionTitles.includes(`${ACTION_NAMES.FIX} in New Task`));
            assert.ok(actionTitles.includes(`${ACTION_NAMES.FIX} in Current Task`));
            assert.ok(!actionTitles.includes(`${ACTION_NAMES.FIX_LOGIC} in New Task`));
            assert.ok(!actionTitles.includes(`${ACTION_NAMES.FIX_LOGIC} in Current Task`));
        });

        test('should return empty array when no effective range', async () => {
            EditorUtils.getEffectiveRange = () => null;

            const actions = await provider.provideCodeActions(mockDocument, mockRange, mockContext);
            assert.ok(Array.isArray(actions), 'Should return an array');
            assert.strictEqual(actions.length, 0, 'Should return empty array');
        });

        test('should handle errors gracefully', async () => {
            let errorMessage: string | undefined;
            const originalConsoleError = console.error;
            console.error = (msg: string, error: Error) => {
                errorMessage = `${msg}${error.message}`;
            };

            EditorUtils.getEffectiveRange = () => {
                throw new Error('Test error');
            };

            const actions = await provider.provideCodeActions(mockDocument, mockRange, mockContext);
            assert.ok(Array.isArray(actions), 'Should return an array');
            assert.strictEqual(actions.length, 0, 'Should return empty array on error');
            assert.ok(
                errorMessage?.includes('Error providing code actions:Test error'),
                'Should log error message'
            );

            console.error = originalConsoleError;
        });
    });
});