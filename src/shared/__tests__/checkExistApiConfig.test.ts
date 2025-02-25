import * as vscode from 'vscode'
import * as assert from 'assert'
import { checkExistKey } from "../checkExistApiConfig"
import { ApiConfiguration } from "../api"

export async function activateCheckExistApiConfigTests(context: vscode.ExtensionContext): Promise<void> {
    const testController = vscode.tests.createTestController('checkExistApiConfigTests', 'Check Exist API Config Tests')
    context.subscriptions.push(testController)

    const rootSuite = testController.createTestItem('check-exist-api-config', 'Check Exist API Config')
    testController.items.add(rootSuite)

    // Create test suite
    const checkExistKeySuite = testController.createTestItem('check-exist-key', 'checkExistKey')
    rootSuite.children.add(checkExistKeySuite)

    // Add test cases
    checkExistKeySuite.children.add(testController.createTestItem(
        'undefined-config',
        'should return false for undefined config'
    ))

    checkExistKeySuite.children.add(testController.createTestItem(
        'empty-config',
        'should return false for empty config'
    ))

    checkExistKeySuite.children.add(testController.createTestItem(
        'one-key-defined',
        'should return true when one key is defined'
    ))

    checkExistKeySuite.children.add(testController.createTestItem(
        'multiple-keys-defined',
        'should return true when multiple keys are defined'
    ))

    checkExistKeySuite.children.add(testController.createTestItem(
        'non-key-fields-undefined',
        'should return true when only non-key fields are undefined'
    ))

    checkExistKeySuite.children.add(testController.createTestItem(
        'all-key-fields-undefined',
        'should return false when all key fields are undefined'
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
                    case 'undefined-config': {
                        assert.strictEqual(checkExistKey(undefined), false)
                        break
                    }
                    case 'empty-config': {
                        const config: ApiConfiguration = {}
                        assert.strictEqual(checkExistKey(config), false)
                        break
                    }
                    case 'one-key-defined': {
                        const config: ApiConfiguration = {
                            apiKey: "test-key",
                        }
                        assert.strictEqual(checkExistKey(config), true)
                        break
                    }
                    case 'multiple-keys-defined': {
                        const config: ApiConfiguration = {
                            apiKey: "test-key",
                            glamaApiKey: "glama-key",
                            openRouterApiKey: "openrouter-key",
                        }
                        assert.strictEqual(checkExistKey(config), true)
                        break
                    }
                    case 'non-key-fields-undefined': {
                        const config: ApiConfiguration = {
                            apiKey: "test-key",
                            apiProvider: undefined,
                            anthropicBaseUrl: undefined,
                        }
                        assert.strictEqual(checkExistKey(config), true)
                        break
                    }
                    case 'all-key-fields-undefined': {
                        const config: ApiConfiguration = {
                            apiKey: undefined,
                            glamaApiKey: undefined,
                            openRouterApiKey: undefined,
                            awsRegion: undefined,
                            vertexProjectId: undefined,
                            openAiApiKey: undefined,
                            ollamaModelId: undefined,
                            lmStudioModelId: undefined,
                            geminiApiKey: undefined,
                            openAiNativeApiKey: undefined,
                            deepSeekApiKey: undefined,
                            mistralApiKey: undefined,
                            vsCodeLmModelSelector: undefined,
                            requestyApiKey: undefined,
                            unboundApiKey: undefined,
                        }
                        assert.strictEqual(checkExistKey(config), false)
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
