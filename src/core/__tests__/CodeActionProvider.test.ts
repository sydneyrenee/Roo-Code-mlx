import * as vscode from "vscode"
import * as assert from "assert"
import { CodeActionProvider, ACTION_NAMES } from "../CodeActionProvider"
import { EditorUtils } from "../EditorUtils"

export async function activateCodeActionProviderTests(context: vscode.ExtensionContext): Promise<void> {
    const testController = vscode.tests.createTestController('codeActionProviderTests', 'Code Action Provider Tests')
    context.subscriptions.push(testController)

    const rootSuite = testController.createTestItem('code-action-provider', 'Code Action Provider')
    testController.items.add(rootSuite)

    // Add test cases
    rootSuite.children.add(testController.createTestItem(
        'default-actions',
        'should provide explain, improve, fix logic, and add to context actions by default'
    ))

    rootSuite.children.add(testController.createTestItem(
        'diagnostic-actions',
        'should provide fix action instead of fix logic when diagnostics exist'
    ))

    rootSuite.children.add(testController.createTestItem(
        'no-range',
        'should return empty array when no effective range'
    ))

    rootSuite.children.add(testController.createTestItem(
        'error-handling',
        'should handle errors gracefully'
    ))

    // Create run profile
    testController.createRunProfile('run', vscode.TestRunProfileKind.Run, async (request) => {
        const queue: vscode.TestItem[] = []
        if (request.include) {
            request.include.forEach(test => queue.push(test))
        }

        const run = testController.createTestRun(request)

        // Create a complete mock TextDocument
        const mockDocument = {
            getText: (_range?: vscode.Range): string => "test code",
            lineAt: (_line: number) => ({ text: "test code" }),
            lineCount: 10,
            uri: { fsPath: "/test/file.ts" },
            fileName: "/test/file.ts",
            isUntitled: false,
            languageId: "typescript",
            version: 1,
            isDirty: false,
            isClosed: false,
            save: () => Promise.resolve(true),
            eol: vscode.EndOfLine.LF,
            offsetAt: (_position: vscode.Position): number => 0,
            positionAt: (_offset: number): vscode.Position => new vscode.Position(0, 0),
            getWordRangeAtPosition: (_position: vscode.Position, _regex?: RegExp): vscode.Range | undefined => 
                new vscode.Range(0, 0, 0, 0),
            validateRange: (range: vscode.Range): vscode.Range => range,
            validatePosition: (position: vscode.Position): vscode.Position => position
        } as unknown as vscode.TextDocument

        const mockRange = new vscode.Range(0, 0, 0, 10)

        // Create a mutable diagnostics array for testing
        const mockDiagnostics: vscode.Diagnostic[] = [];
        
        // Create a complete mock CodeActionContext
        const mockContext: vscode.CodeActionContext = {
            diagnostics: mockDiagnostics,
            triggerKind: vscode.CodeActionTriggerKind.Automatic,
            only: undefined
        };

        // Mock EditorUtils methods
        EditorUtils.getEffectiveRange = () => ({
            range: mockRange,
            text: "test code"
        })
        EditorUtils.getFilePath = () => "/test/file.ts"
        EditorUtils.hasIntersectingRange = () => true
        EditorUtils.createDiagnosticData = (d: any) => d

        for (const test of queue) {
            run.started(test)
            try {
                const provider = new CodeActionProvider()

                switch (test.id) {
                    case 'default-actions': {
                        // Ensure we're working with a non-Promise result
                        const actionsResult = provider.provideCodeActions(mockDocument, mockRange, mockContext)
                        const actions = Array.isArray(actionsResult) ? actionsResult : [];
                        
                        assert.strictEqual(actions.length, 7, "Expected 7 actions")
                        assert.strictEqual(actions[0].title, `${ACTION_NAMES.EXPLAIN} in New Task`)
                        assert.strictEqual(actions[1].title, `${ACTION_NAMES.EXPLAIN} in Current Task`)
                        assert.strictEqual(actions[2].title, `${ACTION_NAMES.FIX_LOGIC} in New Task`)
                        assert.strictEqual(actions[3].title, `${ACTION_NAMES.FIX_LOGIC} in Current Task`)
                        assert.strictEqual(actions[4].title, `${ACTION_NAMES.IMPROVE} in New Task`)
                        assert.strictEqual(actions[5].title, `${ACTION_NAMES.IMPROVE} in Current Task`)
                        assert.strictEqual(actions[6].title, ACTION_NAMES.ADD_TO_CONTEXT)
                        break
                    }
                    case 'diagnostic-actions': {
                        // Add a diagnostic to the array
                        mockDiagnostics.push({
                            message: "test error",
                            severity: vscode.DiagnosticSeverity.Error,
                            range: mockRange
                        } as vscode.Diagnostic);

                        // Ensure we're working with a non-Promise result
                        const actionsResult = provider.provideCodeActions(mockDocument, mockRange, mockContext)
                        const actions = Array.isArray(actionsResult) ? actionsResult : [];
                        
                        assert.strictEqual(actions.length, 7, "Expected 7 actions")
                        
                        const hasFix = actions.some(a => a.title === `${ACTION_NAMES.FIX} in New Task`);
                        const hasFixCurrent = actions.some(a => a.title === `${ACTION_NAMES.FIX} in Current Task`);
                        const hasFixLogic = actions.some(a => a.title === `${ACTION_NAMES.FIX_LOGIC} in New Task`);
                        const hasFixLogicCurrent = actions.some(a => a.title === `${ACTION_NAMES.FIX_LOGIC} in Current Task`);
                        
                        assert.ok(hasFix, "Should have 'Fix' action")
                        assert.ok(hasFixCurrent, "Should have 'Fix in Current Task' action")
                        assert.ok(!hasFixLogic, "Should not have 'Fix Logic' action")
                        assert.ok(!hasFixLogicCurrent, "Should not have 'Fix Logic in Current Task' action")
                        
                        // Clear diagnostics for other tests
                        mockDiagnostics.length = 0;
                        break
                    }
                    case 'no-range': {
                        EditorUtils.getEffectiveRange = () => null
                        const actionsResult = provider.provideCodeActions(mockDocument, mockRange, mockContext)
                        const actions = Array.isArray(actionsResult) ? actionsResult : [];
                        assert.deepStrictEqual(actions, [])
                        break
                    }
                    case 'error-handling': {
                        const consoleError = console.error
                        const errors: any[] = []
                        console.error = (...args: any[]) => errors.push(args)

                        EditorUtils.getEffectiveRange = () => {
                            throw new Error("Test error")
                        }

                        const actionsResult = provider.provideCodeActions(mockDocument, mockRange, mockContext)
                        const actions = Array.isArray(actionsResult) ? actionsResult : [];
                        
                        assert.deepStrictEqual(actions, [])
                        assert.ok(errors.some(args => 
                            args[0] === "Error providing code actions:" && 
                            args[1] instanceof Error
                        ))

                        console.error = consoleError
                        break
                    }
                }
                run.passed(test)
            } catch (err) {
                run.failed(test, new vscode.TestMessage(err instanceof Error ? err.message : String(err)))
            }
        }
        run.end()
    })
}
