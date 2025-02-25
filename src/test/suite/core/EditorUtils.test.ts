import * as assert from 'assert';
import * as vscode from 'vscode';
import { EditorUtils } from '../../../core/EditorUtils';

suite('EditorUtils', () => {
    let mockDocument: vscode.TextDocument;

    setup(() => {
        // Create mock document
        mockDocument = {
            getText: () => '',
            lineAt: (lineOrPosition: number | vscode.Position) => {
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
            version: 1,
            eol: vscode.EndOfLine.LF,
            save: async () => true,
            offsetAt: () => 0,
            positionAt: () => new vscode.Position(0, 0),
            validateRange: (range: vscode.Range) => range,
            validatePosition: (position: vscode.Position) => position,
            getWordRangeAtPosition: (position: vscode.Position, regexp?: RegExp) => undefined
        };
    });

    suite('getEffectiveRange', () => {
        test('should return selected text when available', () => {
            const mockRange = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 10));
            const selectedText = 'selected text';
            const mockDocWithText = {
                ...mockDocument,
                getText: (range?: vscode.Range) => selectedText
            };

            const result = EditorUtils.getEffectiveRange(mockDocWithText as vscode.TextDocument, mockRange);

            assert.ok(result, 'Result should not be null');
            assert.strictEqual(result?.text, selectedText, 'Text should match selected text');
            assert.deepStrictEqual(result?.range, mockRange, 'Range should match input range');
        });

        test('should return null for empty line', () => {
            const mockRange = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 10));
            const mockDocWithEmptyLine = {
                ...mockDocument,
                getText: () => '',
                lineAt: (lineOrPosition: number | vscode.Position) => {
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
                }
            };

            const result = EditorUtils.getEffectiveRange(mockDocWithEmptyLine as vscode.TextDocument, mockRange);

            assert.strictEqual(result, null, 'Result should be null for empty line');
        });

        test('should expand empty selection to full lines', () => {
            // Simulate a caret (empty selection) on line 2 at character 5
            const initialRange = new vscode.Range(new vscode.Position(2, 5), new vscode.Position(2, 5));
            const expandedText = 'expanded text';
            
            const mockDocWithLines = {
                ...mockDocument,
                lineAt: (lineOrPosition: number | vscode.Position) => {
                    const line = typeof lineOrPosition === 'number' 
                        ? lineOrPosition 
                        : lineOrPosition.line;
                    const text = `Line ${line} text`;
                    return {
                        text,
                        lineNumber: line,
                        range: new vscode.Range(line, 0, line, text.length),
                        rangeIncludingLineBreak: new vscode.Range(line, 0, line, text.length + 1),
                        firstNonWhitespaceCharacterIndex: 0,
                        isEmptyOrWhitespace: false
                    };
                },
                getText: (range?: vscode.Range) => {
                    if (range?.start.line === initialRange.start.line &&
                        range?.start.character === initialRange.start.character &&
                        range?.end.line === initialRange.end.line &&
                        range?.end.character === initialRange.end.character) {
                        return '';
                    }
                    return expandedText;
                }
            };

            const result = EditorUtils.getEffectiveRange(mockDocWithLines as vscode.TextDocument, initialRange);

            assert.ok(result, 'Result should not be null');
            assert.strictEqual(result?.text, expandedText, 'Text should be expanded');
            assert.strictEqual(result?.range.start.line, 1, 'Start line should be 1');
            assert.strictEqual(result?.range.start.character, 0, 'Start character should be 0');
            assert.strictEqual(result?.range.end.line, 3, 'End line should be 3');
            assert.strictEqual(result?.range.end.character, 11, 'End character should be 11');
        });
    });

    suite('hasIntersectingRange', () => {
        test('should return false for ranges that only touch boundaries', () => {
            // Range1: [0, 0) - [0, 10) and Range2: [0, 10) - [0, 20)
            const range1 = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 10));
            const range2 = new vscode.Range(new vscode.Position(0, 10), new vscode.Position(0, 20));
            
            assert.strictEqual(
                EditorUtils.hasIntersectingRange(range1, range2),
                false,
                'Ranges that only touch should not intersect'
            );
        });

        test('should return true for overlapping ranges', () => {
            // Range1: [0, 0) - [0, 15) and Range2: [0, 10) - [0, 20)
            const range1 = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 15));
            const range2 = new vscode.Range(new vscode.Position(0, 10), new vscode.Position(0, 20));
            
            assert.strictEqual(
                EditorUtils.hasIntersectingRange(range1, range2),
                true,
                'Overlapping ranges should intersect'
            );
        });

        test('should return false for non-overlapping ranges', () => {
            // Range1: [0, 0) - [0, 10) and Range2: [1, 0) - [1, 5)
            const range1 = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 10));
            const range2 = new vscode.Range(new vscode.Position(1, 0), new vscode.Position(1, 5));
            
            assert.strictEqual(
                EditorUtils.hasIntersectingRange(range1, range2),
                false,
                'Non-overlapping ranges should not intersect'
            );
        });
    });

    suite('getFilePath', () => {
        test('should return relative path when in workspace', () => {
            // Mock workspace folder
            const mockWorkspaceFolder: vscode.WorkspaceFolder = {
                uri: vscode.Uri.file('/test'),
                name: 'test',
                index: 0
            };

            // Override getWorkspaceFolder for this test
            const originalGetWorkspaceFolder = vscode.workspace.getWorkspaceFolder;
            vscode.workspace.getWorkspaceFolder = (uri: vscode.Uri) => mockWorkspaceFolder;

            try {
                const result = EditorUtils.getFilePath(mockDocument);
                assert.strictEqual(result, 'file.ts', 'Should return relative path');
            } finally {
                // Restore original function
                vscode.workspace.getWorkspaceFolder = originalGetWorkspaceFolder;
            }
        });

        test('should return absolute path when not in workspace', () => {
            // Override getWorkspaceFolder for this test
            const originalGetWorkspaceFolder = vscode.workspace.getWorkspaceFolder;
            vscode.workspace.getWorkspaceFolder = (uri: vscode.Uri) => undefined;

            try {
                const result = EditorUtils.getFilePath(mockDocument);
                assert.strictEqual(result, '/test/file.ts', 'Should return absolute path');
            } finally {
                // Restore original function
                vscode.workspace.getWorkspaceFolder = originalGetWorkspaceFolder;
            }
        });
    });
});