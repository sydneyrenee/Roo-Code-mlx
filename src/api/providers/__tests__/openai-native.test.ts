import * as vscode from 'vscode'
import * as assert from 'assert'
import { OpenAiNativeHandler } from "../openai-native"
import { ApiHandlerOptions } from "../../../shared/api"
import { Anthropic } from "@anthropic-ai/sdk"
import { TestUtils } from '../../../test/testUtils'

// Mock OpenAI for testing
const mockCreate = async (options: any) => {
    if (!options.stream) {
        return {
            id: "test-completion",
            choices: [
                {
                    message: { role: "assistant", content: "Test response" },
                    finish_reason: "stop",
                    index: 0,
                },
            ],
            usage: {
                prompt_tokens: 10,
                completion_tokens: 5,
                total_tokens: 15,
            },
        }
    }
    return {
        [Symbol.asyncIterator]: async function* () {
            yield {
                choices: [
                    {
                        delta: { content: "Test response" },
                        index: 0,
                    },
                ],
                usage: null,
            }
            yield {
                choices: [
                    {
                        delta: {},
                        index: 0,
                    },
                ],
                usage: {
                    prompt_tokens: 10,
                    completion_tokens: 5,
                    total_tokens: 15,
                },
            }
        },
    }
}

export async function activateOpenAiNativeTests(context: vscode.ExtensionContext): Promise<void> {
    const testController = TestUtils.createTestController('openAiNativeTests', 'OpenAI Native Handler Tests')
    context.subscriptions.push(testController)

    const rootSuite = testController.createTestItem('openai-native', 'OpenAI Native Handler')
    testController.items.add(rootSuite)

    // Setup common test data
    const systemPrompt = "You are a helpful assistant."
    const messages: Anthropic.Messages.MessageParam[] = [
        {
            role: "user",
            content: "Hello!",
        },
    ]
    const mockOptions: ApiHandlerOptions = {
        apiModelId: "gpt-4o",
        openAiNativeApiKey: "test-api-key",
    }

    // Constructor tests
    const constructorSuite = testController.createTestItem('constructor', 'Constructor')
    rootSuite.children.add(constructorSuite)

    constructorSuite.children.add(
        TestUtils.createTest(
            testController,
            'init',
            'should initialize with provided options',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const handler = new OpenAiNativeHandler(mockOptions)
                assert.ok(handler instanceof OpenAiNativeHandler)
                assert.strictEqual(handler.getModel().id, mockOptions.apiModelId)
            }
        )
    )

    constructorSuite.children.add(
        TestUtils.createTest(
            testController,
            'empty-key',
            'should initialize with empty API key',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const handlerWithoutKey = new OpenAiNativeHandler({
                    apiModelId: "gpt-4o",
                    openAiNativeApiKey: "",
                })
                assert.ok(handlerWithoutKey instanceof OpenAiNativeHandler)
            }
        )
    )

    // Message creation tests
    const messageSuite = testController.createTestItem('messages', 'Message Creation')
    rootSuite.children.add(messageSuite)

    messageSuite.children.add(
        TestUtils.createTest(
            testController,
            'streaming',
            'should handle streaming responses',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const handler = new OpenAiNativeHandler(mockOptions)
                const stream = handler.createMessage(systemPrompt, messages)
                const chunks: any[] = []
                
                for await (const chunk of stream) {
                    chunks.push(chunk)
                }

                assert.ok(chunks.length > 0)
                const textChunks = chunks.filter(chunk => chunk.type === "text")
                assert.strictEqual(textChunks.length, 1)
                assert.strictEqual(textChunks[0].text, "Test response")
            }
        )
    )

    // Model tests
    const modelSuite = testController.createTestItem('models', 'Model Info')
    rootSuite.children.add(modelSuite)

    modelSuite.children.add(
        TestUtils.createTest(
            testController,
            'model-info',
            'should return correct model info',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const handler = new OpenAiNativeHandler(mockOptions)
                const modelInfo = handler.getModel()
                
                assert.strictEqual(modelInfo.id, mockOptions.apiModelId)
                assert.ok(modelInfo.info)
                assert.strictEqual(modelInfo.info.maxTokens, 4096)
                assert.strictEqual(modelInfo.info.contextWindow, 128_000)
                assert.strictEqual(modelInfo.info.supportsImages, true)
                assert.strictEqual(modelInfo.info.supportsPromptCache, false)
                assert.strictEqual(modelInfo.info.inputPrice, 5)
                assert.strictEqual(modelInfo.info.outputPrice, 15)
            }
        )
    )

    // Prompt completion tests
    const promptSuite = testController.createTestItem('prompts', 'Prompt Completion')
    rootSuite.children.add(promptSuite)

    promptSuite.children.add(
        TestUtils.createTest(
            testController,
            'complete-prompt',
            'should complete prompt successfully',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const handler = new OpenAiNativeHandler(mockOptions)
                const result = await handler.completePrompt("Test prompt")
                assert.strictEqual(result, "Test response")
            }
        )
    )

    promptSuite.children.add(
        TestUtils.createTest(
            testController,
            'empty-response',
            'should handle empty response',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const emptyResponseMock = async () => ({
                    choices: [{ message: { content: "" } }]
                })

                const handler = new OpenAiNativeHandler(mockOptions)
                const result = await handler.completePrompt("Test prompt")
                assert.strictEqual(result, "")
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
