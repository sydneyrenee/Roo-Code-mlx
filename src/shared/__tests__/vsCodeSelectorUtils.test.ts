import * as vscode from 'vscode'
import * as assert from 'assert'
import { stringifyVsCodeLmModelSelector, SELECTOR_SEPARATOR } from "../vsCodeSelectorUtils"
import { LanguageModelChatSelector } from "vscode"

export async function activateVsCodeSelectorUtilsTests(context: vscode.ExtensionContext): Promise<void> {
    const testController = vscode.tests.createTestController('vsCodeSelectorUtilsTests', 'VS Code Selector Utils Tests')
    context.subscriptions.push(testController)

    const rootSuite = testController.createTestItem('vscode-selector-utils', 'VS Code Selector Utils')
    testController.items.add(rootSuite)

    // Create test suite
    const stringifySuite = testController.createTestItem('stringify-selector', 'stringifyVsCodeLmModelSelector')
    rootSuite.children.add(stringifySuite)

    // Add test cases
    stringifySuite.children.add(testController.createTestItem(
        'all-properties',
        'should join all defined selector properties with separator'
    ))

    stringifySuite.children.add(testController.createTestItem(
        'skip-undefined',
        'should skip undefined properties'
    ))

    stringifySuite.children.add(testController.createTestItem(
        'empty-selector',
        'should handle empty selector'
    ))

    stringifySuite.children.add(testController.createTestItem(
        'one-property',
        'should handle selector with only one property'
    ))

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
                switch (test.id) {
                    case 'all-properties': {
                        const selector: LanguageModelChatSelector = {
                            vendor: "test-vendor",
                            family: "test-family",
                            version: "v1",
                            id: "test-id",
                        }

                        const result = stringifyVsCodeLmModelSelector(selector)
                        assert.strictEqual(result, "test-vendor/test-family/v1/test-id")
                        break
                    }
                    case 'skip-undefined': {
                        const selector: LanguageModelChatSelector = {
                            vendor: "test-vendor",
                            family: "test-family",
                        }

                        const result = stringifyVsCodeLmModelSelector(selector)
                        assert.strictEqual(result, "test-vendor/test-family")
                        break
                    }
                    case 'empty-selector': {
                        const selector: LanguageModelChatSelector = {}

                        const result = stringifyVsCodeLmModelSelector(selector)
                        assert.strictEqual(result, "")
                        break
                    }
                    case 'one-property': {
                        const selector: LanguageModelChatSelector = {
                            vendor: "test-vendor",
                        }

                        const result = stringifyVsCodeLmModelSelector(selector)
                        assert.strictEqual(result, "test-vendor")
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
