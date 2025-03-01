import * as vscode from 'vscode'
import * as assert from 'assert'
import { MistralHandler } from "../mistral"
import { ApiHandlerOptions } from "../../../shared/api"

export async function activateMistralTests(context: vscode.ExtensionContext): Promise<void> {
    const testController = vscode.tests.createTestController('mistralTests', 'Mistral Tests')
    context.subscriptions.push(testController)

    const rootSuite = testController.createTestItem('mistral', 'Mistral')
    testController.items.add(rootSuite)

    // Create test suites
    const constructorSuite = testController.createTestItem('constructor', 'Constructor')
    rootSuite.children.add(constructorSuite)

    const modelSuite = testController.createTestItem('model', 'Model Info')
    rootSuite.children.add(modelSuite)

    // Constructor tests
    constructorSuite.children.add(testController.createTestItem(
        'initialize-with-options',
        'should initialize with provided options'
    ))
    constructorSuite.children.add(testController.createTestItem(
        'missing-api-key',
        'should throw error if API key is missing'
    ))

    // Model info tests
    modelSuite.children.add(testController.createTestItem(
        'correct-model-info',
        'should return correct model info'
    ))
    modelSuite.children.add(testController.createTestItem(
        'default-model',
        'should use default model if none specified'
    ))

    // Create run profile
    testController.createRunProfile('run', vscode.TestRunProfileKind.Run, async (request) => {
        const queue: vscode.TestItem[] = []
        if (request.include) {
            request.include.forEach(test => queue.push(test))
        }

        const run = testController.createTestRun(request)

        const mockOptions: ApiHandlerOptions = {
            apiModelId: "codestral-latest",
            mistralApiKey: "test-api-key",
        }

        for (const test of queue) {
            run.started(test)
            try {
                switch (test.id) {
                    case 'initialize-with-options': {
                        const handler = new MistralHandler(mockOptions)
                        assert.ok(handler instanceof MistralHandler)
                        assert.strictEqual(handler.getModel().id, mockOptions.apiModelId)
                        break
                    }

                    case 'missing-api-key': {
                        assert.throws(() => {
                            new MistralHandler({
                                apiModelId: "codestral-latest",
                                mistralApiKey: "",
                            })
                        }, /Mistral API key is required/)
                        break
                    }

                    case 'correct-model-info': {
                        const handler = new MistralHandler(mockOptions)
                        const model = handler.getModel()
                        assert.strictEqual(model.id, mockOptions.apiModelId)
                        assert.ok(model.info)
                        assert.strictEqual(model.info.supportsPromptCache, false)
                        assert.strictEqual(model.info.maxTokens, 256_000)
                        assert.strictEqual(model.info.contextWindow, 256_000)
                        assert.strictEqual(model.info.inputPrice, 0.3)
                        assert.strictEqual(model.info.outputPrice, 0.9)
                        break
                    }

                    case 'default-model': {
                        const handlerWithoutModel = new MistralHandler({
                            mistralApiKey: "test-api-key",
                        })
                        const model = handlerWithoutModel.getModel()
                        assert.strictEqual(model.id, "codestral-latest")
                        assert.ok(model.info)
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
