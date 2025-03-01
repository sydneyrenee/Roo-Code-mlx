import * as vscode from "vscode";
import * as assert from "assert";
import { EditorUtils } from "../EditorUtils";
import { TestUtils } from '../../test/testUtils';

// Mock classes for VSCode's Range and Position
class MockPosition {
    constructor(
        public line: number,
        public character: number,
    ) {}
}

class MockRange {
    start: MockPosition;
    end: MockPosition;
    constructor(start: MockPosition, end: MockPosition) {
        this.start = start;
        this.end = end;
    }
}

export async function activateEditorUtilsTests(context: vscode.ExtensionContext): Promise<void> {
    // Create test controller
    const testController = TestUtils.createTestController('editorUtilsTests', 'Editor Utils Tests');
    context.subscriptions.push(testController);

    // Root test suite
    const rootSuite = testController.createTestItem('editor-utils', 'EditorUtils');
    testController.items.add(rootSuite);

    // Test suites
    const effectiveRangeSuite = testController.createTestItem('effective-range', 'getEffectiveRange');
    const intersectingRangeSuite = testController.createTestItem('intersecting-range', 'hasIntersectingRange');
    const filePathSuite = testController.createTestItem('file-path', 'getFilePath');
    
    rootSuite.children.add(effectiveRangeSuite);
    rootSuite.children.add(intersectingRangeSuite);
    rootSuite.children.add(filePathSuite);

    // getEffectiveRange tests
    effectiveRangeSuite.children.add(
        TestUtils.createTest(
            testController,
            'selected-text',
            'should return selected text when available',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Save original vscode classes
                const originalRange = vscode.Range;
                const originalPosition = vscode.Position;
                const originalWorkspace = vscode.workspace;
                const originalWindow = vscode.window;
                const originalLanguages = vscode.languages;
                
                try {
                    // Apply mocks
                    (vscode as any).Range = MockRange;
                    (vscode as any).Position = MockPosition;
                    (vscode as any).workspace = {
                        getWorkspaceFolder: () => null
                    };
                    (vscode as any).window = { activeTextEditor: undefined };
                    (vscode as any).languages = {
                        getDiagnostics: () => []
                    };
                    
                    // Create mock document
                    const mockDocument = {
                        getText: (range: any) => "selected text",
                        lineAt: (line: number) => ({ text: `Line ${line} text`, lineNumber: line }),
                        lineCount: 10,
                        uri: { fsPath: "/test/file.ts" }
                    };
                    
                    // Create mock range
                    const mockRange = new MockRange(new MockPosition(0, 0), new MockPosition(0, 10));
                    
                    // Test the function
                    const result = EditorUtils.getEffectiveRange(mockDocument as any, mockRange as any);
                    
                    // Assertions
                    assert.ok(result !== null, "Result should not be null");
                    assert.strictEqual(result?.range, mockRange);
                    assert.strictEqual(result?.text, "selected text");
                } finally {
                    // Restore original vscode classes
                    (vscode as any).Range = originalRange;
                    (vscode as any).Position = originalPosition;
                    (vscode as any).workspace = originalWorkspace;
                    (vscode as any).window = originalWindow;
                    (vscode as any).languages = originalLanguages;
                }
            }
        )
    );

    effectiveRangeSuite.children.add(
        TestUtils.createTest(
            testController,
            'empty-line',
            'should return null for empty line',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Save original vscode classes
                const originalRange = vscode.Range;
                const originalPosition = vscode.Position;
                const originalWorkspace = vscode.workspace;
                const originalWindow = vscode.window;
                const originalLanguages = vscode.languages;
                
                try {
                    // Apply mocks
                    (vscode as any).Range = MockRange;
                    (vscode as any).Position = MockPosition;
                    (vscode as any).workspace = {
                        getWorkspaceFolder: () => null
                    };
                    (vscode as any).window = { activeTextEditor: undefined };
                    (vscode as any).languages = {
                        getDiagnostics: () => []
                    };
                    
                    // Create mock document
                    const mockDocument = {
                        getText: (range: any) => "",
                        lineAt: (line: number) => ({ text: "", lineNumber: 0 }),
                        lineCount: 10,
                        uri: { fsPath: "/test/file.ts" }
                    };
                    
                    // Create mock range
                    const mockRange = new MockRange(new MockPosition(0, 0), new MockPosition(0, 10));
                    
                    // Test the function
                    const result = EditorUtils.getEffectiveRange(mockDocument as any, mockRange as any);
                    
                    // Assertions
                    assert.strictEqual(result, null);
                } finally {
                    // Restore original vscode classes
                    (vscode as any).Range = originalRange;
                    (vscode as any).Position = originalPosition;
                    (vscode as any).workspace = originalWorkspace;
                    (vscode as any).window = originalWindow;
                    (vscode as any).languages = originalLanguages;
                }
            }
        )
    );

    effectiveRangeSuite.children.add(
        TestUtils.createTest(
            testController,
            'expand-empty-selection',
            'should expand empty selection to full lines',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Save original vscode classes
                const originalRange = vscode.Range;
                const originalPosition = vscode.Position;
                const originalWorkspace = vscode.workspace;
                const originalWindow = vscode.window;
                const originalLanguages = vscode.languages;
                
                try {
                    // Apply mocks
                    (vscode as any).Range = MockRange;
                    (vscode as any).Position = MockPosition;
                    (vscode as any).workspace = {
                        getWorkspaceFolder: () => null
                    };
                    (vscode as any).window = { activeTextEditor: undefined };
                    (vscode as any).languages = {
                        getDiagnostics: () => []
                    };
                    
                    // Create initial range (empty selection)
                    const initialRange = new MockRange(new MockPosition(2, 5), new MockPosition(2, 5));
                    
                    // Create mock document
                    const mockDocument = {
                        getText: (range: any) => {
                            // If the range is exactly the empty initial selection, return an empty string
                            if (
                                range.start.line === initialRange.start.line &&
                                range.start.character === initialRange.start.character &&
                                range.end.line === initialRange.end.line &&
                                range.end.character === initialRange.end.character
                            ) {
                                return "";
                            }
                            return "expanded text";
                        },
                        lineAt: (line: number) => ({ text: `Line ${line} text`, lineNumber: line }),
                        lineCount: 10,
                        uri: { fsPath: "/test/file.ts" }
                    };
                    
                    // Test the function
                    const result = EditorUtils.getEffectiveRange(mockDocument as any, initialRange as any);
                    
                    // Assertions
                    assert.ok(result !== null, "Result should not be null");
                    assert.strictEqual(result?.range.start.line, 1);
                    assert.strictEqual(result?.range.start.character, 0);
                    assert.strictEqual(result?.range.end.line, 3);
                    assert.strictEqual(result?.range.end.character, 11);
                    assert.strictEqual(result?.text, "expanded text");
                } finally {
                    // Restore original vscode classes
                    (vscode as any).Range = originalRange;
                    (vscode as any).Position = originalPosition;
                    (vscode as any).workspace = originalWorkspace;
                    (vscode as any).window = originalWindow;
                    (vscode as any).languages = originalLanguages;
                }
            }
        )
    );

    // hasIntersectingRange tests
    intersectingRangeSuite.children.add(
        TestUtils.createTest(
            testController,
            'touching-boundaries',
            'should return false for ranges that only touch boundaries',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Save original vscode classes
                const originalRange = vscode.Range;
                const originalPosition = vscode.Position;
                
                try {
                    // Apply mocks
                    (vscode as any).Range = MockRange;
                    (vscode as any).Position = MockPosition;
                    
                    // Create mock ranges
                    const range1 = new MockRange(new MockPosition(0, 0), new MockPosition(0, 10));
                    const range2 = new MockRange(new MockPosition(0, 10), new MockPosition(0, 20));
                    
                    // Test the function
                    const result = EditorUtils.hasIntersectingRange(range1 as any, range2 as any);
                    
                    // Assertions
                    assert.strictEqual(result, false);
                } finally {
                    // Restore original vscode classes
                    (vscode as any).Range = originalRange;
                    (vscode as any).Position = originalPosition;
                }
            }
        )
    );

    intersectingRangeSuite.children.add(
        TestUtils.createTest(
            testController,
            'overlapping-ranges',
            'should return true for overlapping ranges',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Save original vscode classes
                const originalRange = vscode.Range;
                const originalPosition = vscode.Position;
                
                try {
                    // Apply mocks
                    (vscode as any).Range = MockRange;
                    (vscode as any).Position = MockPosition;
                    
                    // Create mock ranges
                    const range1 = new MockRange(new MockPosition(0, 0), new MockPosition(0, 15));
                    const range2 = new MockRange(new MockPosition(0, 10), new MockPosition(0, 20));
                    
                    // Test the function
                    const result = EditorUtils.hasIntersectingRange(range1 as any, range2 as any);
                    
                    // Assertions
                    assert.strictEqual(result, true);
                } finally {
                    // Restore original vscode classes
                    (vscode as any).Range = originalRange;
                    (vscode as any).Position = originalPosition;
                }
            }
        )
    );

    intersectingRangeSuite.children.add(
        TestUtils.createTest(
            testController,
            'non-overlapping-ranges',
            'should return false for non-overlapping ranges',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Save original vscode classes
                const originalRange = vscode.Range;
                const originalPosition = vscode.Position;
                
                try {
                    // Apply mocks
                    (vscode as any).Range = MockRange;
                    (vscode as any).Position = MockPosition;
                    
                    // Create mock ranges
                    const range1 = new MockRange(new MockPosition(0, 0), new MockPosition(0, 10));
                    const range2 = new MockRange(new MockPosition(1, 0), new MockPosition(1, 5));
                    
                    // Test the function
                    const result = EditorUtils.hasIntersectingRange(range1 as any, range2 as any);
                    
                    // Assertions
                    assert.strictEqual(result, false);
                } finally {
                    // Restore original vscode classes
                    (vscode as any).Range = originalRange;
                    (vscode as any).Position = originalPosition;
                }
            }
        )
    );

    // getFilePath tests
    filePathSuite.children.add(
        TestUtils.createTest(
            testController,
            'relative-path',
            'should return relative path when in workspace',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Save original vscode classes
                const originalWorkspace = vscode.workspace;
                
                try {
                    // Create mock workspace
                    const mockWorkspaceFolder = {
                        uri: { fsPath: "/test" }
                    };
                    
                    // Apply mocks
                    (vscode as any).workspace = {
                        getWorkspaceFolder: () => mockWorkspaceFolder
                    };
                    
                    // Create mock document
                    const mockDocument = {
                        uri: { fsPath: "/test/file.ts" }
                    };
                    
                    // Test the function
                    const result = EditorUtils.getFilePath(mockDocument as any);
                    
                    // Assertions
                    assert.strictEqual(result, "file.ts");
                } finally {
                    // Restore original vscode classes
                    (vscode as any).workspace = originalWorkspace;
                }
            }
        )
    );

    filePathSuite.children.add(
        TestUtils.createTest(
            testController,
            'absolute-path',
            'should return absolute path when not in workspace',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Save original vscode classes
                const originalWorkspace = vscode.workspace;
                
                try {
                    // Apply mocks
                    (vscode as any).workspace = {
                        getWorkspaceFolder: () => null
                    };
                    
                    // Create mock document
                    const mockDocument = {
                        uri: { fsPath: "/test/file.ts" }
                    };
                    
                    // Test the function
                    const result = EditorUtils.getFilePath(mockDocument as any);
                    
                    // Assertions
                    assert.strictEqual(result, "/test/file.ts");
                } finally {
                    // Restore original vscode classes
                    (vscode as any).workspace = originalWorkspace;
                }
            }
        )
    );
}
