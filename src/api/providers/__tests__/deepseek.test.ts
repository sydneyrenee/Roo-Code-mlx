import * as vscode from 'vscode'
import * as assert from 'assert'
import { DeepSeekHandler } from "../deepseek"
import { ApiHandlerOptions, deepSeekDefaultModelId } from "../../../shared/api"
import OpenAI from "openai"
import { Anthropic } from "@anthropic-ai/sdk"

export async function activateDeepSeekTests(context: vscode.ExtensionContext): Promise<void> {
    const testController = vscode.tests.createTestController('deepSeekTests', 'DeepSeek Tests')
    context.subscriptions.push(testController)

    const rootSuite = testController.createTestItem('deepseek', 'DeepSeek')
    testController.items.add(rootSuite)

    // Create test suites
    const constructorSuite = testController.createTestItem('constructor', 'Constructor')
    rootSuite.children.add(constructorSuite)

    const modelInfoSuite = testController.createTestItem('model-info', 'Model Info')
    rootSuite.children.add(modelInfoSuite)

    const messageSuite = testController.createTestItem('message', 'Message Creation')
    rootSuite.children.add(messageSuite)

    // Constructor tests
    constructorSuite.children.add(testController.createTestItem(
        'initialize-with-options',
        'should initialize with provided options'
    ))
    constructorSuite.children.add(testController.createTestItem(
        'use-default-model',
        'should use default model ID if not provided'
    ))
    constructorSuite.children.add(testController.createTestItem(
        'use-default-base-url',
        'should use default base URL if not provided'
    ))
    constructorSuite.children.add(testController.createTestItem(
        'use-custom-base-url',
        'should use custom base URL if provided'
    ))
    constructorSuite.children.add(testController.createTestItem(
        'include-max-tokens',
        'should set includeMaxTokens to true'
    ))

    // Model info tests
    modelInfoSuite.children.add(testController.createTestItem(
        'valid-model-info',
        'should return model info for valid model ID'
    ))
    modelInfoSuite.children.add(testController.createTestItem(
        'invalid-model-info',
        'should return provided model ID with default model info if model does not exist'
    ))
    modelInfoSuite.children.add(testController.createTestItem(
        'default-model',
        'should return default model if no model ID is provided'
    ))

    // Message creation tests
    messageSuite.children.add(testController.createTestItem(
        'handle-streaming',
        'should handle streaming responses'
    ))
    messageSuite.children.add(testController.createTestItem(
        'include-usage',
        'should include usage information'
    ))

    // Create run profile
    testController.createRunProfile('run', vscode.TestRunProfileKind.Run, async (request) => {
        const queue: vscode.TestItem[] = []
        if (request.include) {
            request.include.forEach(test => queue.push(test))
        }

        const run = testController.createTestRun(request)

        // Store original OpenAI for cleanup
        const originalOpenAI = (global as any).OpenAI

        // Mock OpenAI implementation
        const mockCreate = async (options: any) => {
            if (!options.stream) {
                return {
                    id: "test-completion",
                    choices: [
                        {
                            message: { role: "assistant", content: "Test response", refusal: null },
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
            // Return async iterator for streaming
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

        ;(global as any).OpenAI = class {
            constructor() {
                return {
                    chat: {
                        completions: {
                            create: mockCreate
                        }
                    }
                }
            }
        }

        const mockOptions: ApiHandlerOptions = {
            deepSeekApiKey: "test-api-key",
            apiModelId: "deepseek-chat",
            deepSeekBaseUrl: "https://api.deepseek.com/v1",
        }

        for (const test of queue) {
            run.started(test)
            try {
                switch (test.id) {
                    case 'initialize-with-options': {
                        const handler = new DeepSeekHandler(mockOptions)
                        assert.ok(handler instanceof DeepSeekHandler)
                        assert.strictEqual(handler.getModel().id, mockOptions.apiModelId)
                        break
                    }

                    case 'use-default-model': {
                        const handlerWithoutModel = new DeepSeekHandler({
                            ...mockOptions,
                            apiModelId: undefined,
                        })
                        assert.strictEqual(handlerWithoutModel.getModel().id, deepSeekDefaultModelId)
                        break
                    }

                    case 'use-default-base-url': {
                        const handlerWithoutBaseUrl = new DeepSeekHandler({
                            ...mockOptions,
                            deepSeekBaseUrl: undefined,
                        })
                        assert.ok(handlerWithoutBaseUrl instanceof DeepSeekHandler)
                        break
                    }

                    case 'use-custom-base-url': {
                        const customBaseUrl = "https://custom.deepseek.com/v1"
                        const handlerWithCustomUrl = new DeepSeekHandler({
                            ...mockOptions,
                            deepSeekBaseUrl: customBaseUrl,
                        })
                        assert.ok(handlerWithCustomUrl instanceof DeepSeekHandler)
                        break
                    }

                    case 'include-max-tokens': {
                        new DeepSeekHandler(mockOptions)
                        break
                    }

                    case 'valid-model-info': {
                        const handler = new DeepSeekHandler(mockOptions)
                        const model = handler.getModel()
                        assert.strictEqual(model.id, mockOptions.apiModelId)
                        assert.ok(model.info)
                        assert.strictEqual(model.info.maxTokens, 8192)
                        assert.strictEqual(model.info.contextWindow, 64_000)
                        assert.strictEqual(model.info.supportsImages, false)
                        assert.strictEqual(model.info.supportsPromptCache, false)
                        break
                    }

                    case 'invalid-model-info': {
                        const handler = new DeepSeekHandler(mockOptions)
                        const handlerWithInvalidModel = new DeepSeekHandler({
                            ...mockOptions,
                            apiModelId: "invalid-model",
                        })
                        const model = handlerWithInvalidModel.getModel()
                        assert.strictEqual(model.id, "invalid-model")
                        assert.ok(model.info)
                        assert.deepStrictEqual(model.info, handler.getModel().info)
                        break
                    }

                    case 'default-model': {
                        const handlerWithoutModel = new DeepSeekHandler({
                            ...mockOptions,
                            apiModelId: undefined,
                        })
                        const model = handlerWithoutModel.getModel()
                        assert.strictEqual(model.id, deepSeekDefaultModelId)
                        assert.ok(model.info)
                        break
                    }

                    case 'handle-streaming': {
                        const handler = new DeepSeekHandler(mockOptions)
                        const systemPrompt = "You are a helpful assistant."
                        const messages: Anthropic.Messages.MessageParam[] = [
                            {
                                role: "user",
                                content: [
                                    {
                                        type: "text" as const,
                                        text: "Hello!",
                                    },
                                ],
                            },
                        ]

                        const stream = handler.createMessage(systemPrompt, messages)
                        const chunks: any[] = []
                        for await (const chunk of stream) {
                            chunks.push(chunk)
                        }
                        assert.ok(chunks.length > 0)
                        const textChunks = chunks.filter((chunk) => chunk.type === "text")
                        assert.strictEqual(textChunks.length, 1)
                        assert.strictEqual(textChunks[0].text, "Test response")
                        break
                    }

                    case 'include-usage': {
                        const handler = new DeepSeekHandler(mockOptions)
                        const systemPrompt = "You are a helpful assistant."
                        const messages: Anthropic.Messages.MessageParam[] = [
                            {
                                role: "user",
                                content: [
                                    {
                                        type: "text" as const,
                                        text: "Hello!",
                                    },
                                ],
                            },
                        ]

                        const stream = handler.createMessage(systemPrompt, messages)
                        const chunks: any[] = []
                        for await (const chunk of stream) {
                            chunks.push(chunk)
                        }
                        const usageChunks = chunks.filter((chunk) => chunk.type === "usage")
                        assert.ok(usageChunks.length > 0)
                        assert.strictEqual(usageChunks[0].inputTokens, 10)
                        assert.strictEqual(usageChunks[0].outputTokens, 5)
                        break
                    }
                }
                run.passed(test)
            } catch (err) {
                run.failed(test, new vscode.TestMessage(err instanceof Error ? err.message : String(err)))
            }
        }

        // Restore original OpenAI
        (global as any).OpenAI = originalOpenAI

        run.end()
    })
}
