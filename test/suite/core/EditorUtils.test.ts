import * as assert from 'assert';
import * as vscode from 'vscode';
import { EditorUtils } from '../../../core/EditorUtils';

suite('EditorUtils Tests', () => {
    const testController = vscode.test.createTestController('editorUtilsTests', 'Editor Utils Tests');
    const rootSuite = testController.createTestItem('root', 'Editor Utils Tests');

    let mockDocument: vscode.TextDocument;

    setup(() => {
        // Create mock document
        mockDocument = {
            getText: () => '',
            lineAt: (lineOrPosition) => {
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
            },
            lineCount: 10,
            uri: vscode.Uri.file('/test/file.ts'),
            fileName: '/test/file.ts',
            isDirty: false,
            isUntitled: false,
            isClosed: false,
            languageId: 'typescript',
            version: 1
        } as any;
    });

    const rangeSuite = testController.createTestItem('ranges', 'Range Operations');
    rootSuite.children.add(rangeSuite);

    rangeSuite.children.add(
        testController.createTestItem('getEffectiveRange', 'gets effective range correctly', async run => {
            const selection = new vscode.Selection(1, 0, 3, 10);
            const result = EditorUtils.getEffectiveRange(mockDocument, selection);
            
            assert.ok(result);
            assert.ok(result.range instanceof vscode.Range);
            assert.strictEqual(result.range.start.line, 1);
            assert.strictEqual(result.range.end.line, 3);
            
            run.passed();
        })
    );

    rangeSuite.children.add(
        testController.createTestItem('expandSelection', 'expands selection to line boundaries', async run => {
            const selection = new vscode.Selection(1, 5, 2, 5);
            const expanded = EditorUtils.expandSelectionToLineBoundaries(mockDocument, selection);
            
            assert.strictEqual(expanded.start.character, 0);
            assert.ok(expanded.end.character > 5);
            
            run.passed();
        })
    );

    const fileSuite = testController.createTestItem('files', 'File Operations');
    rootSuite.children.add(fileSuite);

    fileSuite.children.add(
        testController.createTestItem('getFilePath', 'gets file path correctly', async run => {
            const result = EditorUtils.getFilePath(mockDocument);
            assert.strictEqual(result, '/test/file.ts');
            run.passed();
        })
    );

    fileSuite.children.add(
        testController.createTestItem('hasIntersectingRange', 'checks range intersection correctly', async run => {
            const range1 = new vscode.Range(0, 0, 2, 0);
            const range2 = new vscode.Range(1, 0, 3, 0);
            
            assert.ok(EditorUtils.hasIntersectingRange(range1, [range2]));
            
            const nonIntersecting = new vscode.Range(5, 0, 6, 0);
            assert.ok(!EditorUtils.hasIntersectingRange(range1, [nonIntersecting]));
            
            run.passed();
        })
    );

    // Add tests to controller
    testController.items.add(rootSuite);
});