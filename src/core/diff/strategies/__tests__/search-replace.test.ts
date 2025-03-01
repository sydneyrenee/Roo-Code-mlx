import * as vscode from 'vscode'
import * as assert from 'assert'
import { SearchReplaceDiffStrategy } from "../search-replace"
import { TestUtils } from '../../../../test/testUtils'

export async function activateSearchReplaceTests(context: vscode.ExtensionContext): Promise<void> {
    const testController = TestUtils.createTestController('searchReplaceDiffTests', 'Search Replace Diff Tests')
    context.subscriptions.push(testController)

    const rootSuite = testController.createTestItem('search-replace', 'Search Replace Strategy')
    testController.items.add(rootSuite)

    // Create test suites
    const exactMatchSuite = testController.createTestItem('exact-matching', 'Exact Matching')
    rootSuite.children.add(exactMatchSuite)

    // Add match tests
    exactMatchSuite.children.add(
        TestUtils.createTest(
            testController,
            'replace-matching-content',
            'should replace matching content',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const strategy = new SearchReplaceDiffStrategy(1.0, 5)
                const originalContent = 'function hello() {\n    console.log("hello")\n}\n'
                // Note: Have to format search/replace on new lines for parser
                const diffContent = `test.ts
<<<<<<< SEARCH
function hello() {
    console.log("hello")
}
=======
function hello() {
    console.log("hello world")
}
>>>>>>> REPLACE`
                const result = await strategy.applyDiff(originalContent, diffContent)
                assert.ok(result.success)
                if (result.success) {
                    assert.strictEqual(result.content, 'function hello() {\n    console.log("hello world")\n}\n')
                }
            }
        )
    )

    exactMatchSuite.children.add(
        TestUtils.createTest(
            testController,
            'match-whitespace',
            'should match content with different whitespace',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const strategy = new SearchReplaceDiffStrategy(1.0, 5)
                const originalContent = "\nfunction example() {\n    return 42;\n}\n\n"
                const diffContent = `test.ts
<<<<<<< SEARCH
function example() {
    return 42;
}
=======
function example() {
    return 43;
}
>>>>>>> REPLACE`
                const result = await strategy.applyDiff(originalContent, diffContent)
                assert.ok(result.success)
                if (result.success) {
                    assert.strictEqual(result.content, "\nfunction example() {\n    return 43;\n}\n\n")
                }
            }
        )
    )

    exactMatchSuite.children.add(
        TestUtils.createTest(
            testController,
            'line-numbers',
            'should handle line numbers',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const strategy = new SearchReplaceDiffStrategy()
                const originalContent = "function test() {\n    return true;\n}\n"
                const diffContent = `test.ts
<<<<<<< SEARCH
1 | function test() {
2 |     return true;
3 | }
=======
1 | function test() {
2 |     return false;
3 | }
>>>>>>> REPLACE`
                const result = await strategy.applyDiff(originalContent, diffContent)
                assert.ok(result.success)
                if (result.success) {
                    assert.strictEqual(result.content, "function test() {\n    return false;\n}\n")
                }
            }
        )
    )

    // Add tool description tests
    const toolDescriptionSuite = testController.createTestItem('tool-description', 'Tool Description')
    rootSuite.children.add(toolDescriptionSuite)

    toolDescriptionSuite.children.add(
        TestUtils.createTest(
            testController,
            'includes-format-info',
            'should include required format information',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const strategy = new SearchReplaceDiffStrategy()
                const result = await strategy.getToolDescription({ cwd: "/test" })
                assert.ok(result.includes("<<<<<<< SEARCH"))
                assert.ok(result.includes("======="))
                assert.ok(result.includes(">>>>>>> REPLACE"))
            }
        )
    )

    // Create run profile
    testController.createRunProfile('run', vscode.TestRunProfileKind.Run, async (request) => {
        const queue: vscode.TestItem[] = []
        if (request.include) {
            request.include.forEach(test => queue.push(test))
        }

        const run = testController.createTestRun(request)

        for (const test of queue) {
            run.started(test)
            try {
                await (test as any).run?.(run)
                run.passed(test)
            } catch (err) {
                run.failed(test, new vscode.TestMessage(err instanceof Error ? err.message : String(err)))
            }
        }

        run.end()
    })
}
