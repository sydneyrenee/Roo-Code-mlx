import * as vscode from 'vscode';
import * as assert from 'assert';
import { CodeActionProvider, ACTION_NAMES } from '../../../core/CodeActionProvider';
import { EditorUtils } from '../../../core/EditorUtils';

suite('CodeActionProvider Tests', () => {
    const testController = vscode.test.createTestController('codeActionTests', 'Code Action Tests');
    const rootSuite = testController.createTestItem('root', 'Code Action Provider Tests');
    
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
            createDiagnosticData: EditorUtils.createDiagnosticData
        };

        // Mock document
        mockDocument = {
            getText: () => '',
            lineAt: ((lineOrPosition) => {
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
            uri: { fsPath: '/test/file.ts' }
        } as any;

        // Mock range and context
        mockRange = new vscode.Range(0, 0, 0, 10);
        mockContext = { diagnostics: [], only: undefined, triggerKind: vscode.CodeActionTriggerKind.Invoke };

        // Mock EditorUtils methods
        EditorUtils.getEffectiveRange = () => ({
            range: mockRange,
            text: 'test code'
        });
        EditorUtils.getFilePath = () => '/test/file.ts';
        EditorUtils.hasIntersectingRange = () => true;
        EditorUtils.createDiagnosticData = (d) => d;
    });

    teardown(() => {
        // Restore original EditorUtils methods
        Object.assign(EditorUtils, originalEditorUtils);
    });

    const basicActionsSuite = testController.createTestItem('basicActions', 'Basic Actions');
    rootSuite.children.add(basicActionsSuite);

    basicActionsSuite.children.add(
        testController.createTestItem('defaultActions', 'provides default actions', async run => {
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

            run.passed();
        })
    );

    basicActionsSuite.children.add(
        testController.createTestItem('noRange', 'returns empty array when no effective range', async run => {
            EditorUtils.getEffectiveRange = () => null;
            const actions = await provider.provideCodeActions(mockDocument, mockRange, mockContext);
            assert.deepStrictEqual(actions, []);
            run.passed();
        })
    );

    basicActionsSuite.children.add(
        testController.createTestItem('errorHandling', 'handles errors gracefully', async run => {
            EditorUtils.getEffectiveRange = () => {
                throw new Error('Test error');
            };
            const actions = await provider.provideCodeActions(mockDocument, mockRange, mockContext);
            assert.deepStrictEqual(actions, []);
            run.passed();
        })
    );

    // Add tests to controller
    testController.items.add(rootSuite);
});