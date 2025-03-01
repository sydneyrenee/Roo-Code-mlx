import * as vscode from 'vscode'
import * as assert from 'assert'
import { OpenAiHandler } from "../openai"
import { ApiHandlerOptions } from "../../../shared/api"
import { Anthropic } from "@anthropic-ai/sdk"

// Mock OpenAI client with proper types
type MockResponse = {
    choices?: { message?: { content: string }; delta?: { content?: string } }[];
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
    [Symbol.asyncIterator]?: () => AsyncIterableIterator<any>;
}

const mockCreate = { value: async (): Promise<MockResponse> => ({}) }

const mockOpenAI = {
    chat: {
        completions: {
            create: async () => mockCreate.value()
        }
    }
}

// Replace jest.mock with direct mock
const OpenAI = () => mockOpenAI

export async function activateOpenAiTests(context: vscode.ExtensionContext): Promise<void> {
    const testController = vscode.tests.createTestController('openAiTests', 'OpenAI Tests')
    context.subscriptions.push(testController)

    // Root test item
    const rootSuite = testController.createTestItem('openai', 'OpenAI')
    testController.items.add(rootSuite)

    // Create test suites
    const constructorSuite = testController.createTestItem('constructor', 'Constructor')
    rootSuite.children.add(constructorSuite)

    const createMessageSuite = testController.createTestItem('create-message', 'Create Message')
    rootSuite.children.add(createMessageSuite)

    const errorHandlingSuite = testController.createTestItem('error-handling', 'Error Handling')
    rootSuite.children.add(errorHandlingSuite)

    const completePromptSuite = testController.createTestItem('complete-prompt', 'Complete Prompt')
    rootSuite.children.add(completePromptSuite)

    const getModelSuite = testController.createTestItem('get-model', 'Get Model')
    rootSuite.children.add(getModelSuite)

    // Add test cases
    constructorSuite.children.add(testController.createTestItem(
        'initialize-with-options',
        'should initialize with provided options'
    ))

    constructorSuite.children.add(testController.createTestItem(
        'use-custom-base-url',
        'should use custom base URL if provided'
    ))

    createMessageSuite.children.add(testController.createTestItem(
        'handle-non-streaming',
        'should handle non-streaming mode'
    ))

    createMessageSuite.children.add(testController.createTestItem(
        'handle-streaming',
        'should handle streaming responses'
    ))

    errorHandlingSuite.children.add(testController.createTestItem(
        'handle-api-errors',
        'should handle API errors'
    ))

    errorHandlingSuite.children.add(testController.createTestItem(
        'handle-rate-limiting',
        'should handle rate limiting'
    ))

    completePromptSuite.children.add(testController.createTestItem(
        'complete-successfully',
        'should complete prompt successfully'
    ))

    completePromptSuite.children.add(testController.createTestItem(
        'handle-completion-errors',
        'should handle API errors'
    ))

    completePromptSuite.children.add(testController.createTestItem(
        'handle-empty-response',
        'should handle empty response'
    ))

    getModelSuite.children.add(testController.createTestItem(
        'return-model-info',
        'should return model info with sane defaults'
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
                const mockOptions: ApiHandlerOptions = {
                    openAiApiKey: "test-api-key",
                    openAiModelId: "gpt-4",
                    openAiBaseUrl: "https://api.openai.com/v1",
                }

                switch (test.id) {
                    case 'initialize-with-options': {
                        const handler = new OpenAiHandler(mockOptions)
                        assert.ok(handler instanceof OpenAiHandler)
                        assert.strictEqual(handler.getModel().id, mockOptions.openAiModelId)
                        break
                    }

                    case 'use-custom-base-url': {
                        const customBaseUrl = "https://custom.openai.com/v1"
                        const handlerWithCustomUrl = new OpenAiHandler({
                            ...mockOptions,
                            openAiBaseUrl: customBaseUrl,
                        })
                        assert.ok(handlerWithCustomUrl instanceof OpenAiHandler)
                        break
                    }

                    case 'handle-non-streaming': {
                        mockCreate.value = async () => ({
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
                        })

                        const handler = new OpenAiHandler({
                            ...mockOptions,
                            openAiStreamingEnabled: false,
                        })

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
                        const textChunk = chunks.find((chunk) => chunk.type === "text")
                        const usageChunk = chunks.find((chunk) => chunk.type === "usage")

                        assert.ok(textChunk)
                        assert.strictEqual(textChunk?.text, "Test response")
                        assert.ok(usageChunk)
                        assert.strictEqual(usageChunk?.inputTokens, 10)
                        assert.strictEqual(usageChunk?.outputTokens, 5)
                        break
                    }

                    case 'handle-streaming': {
                        mockCreate.value = async () => ({
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
                        })

                        const handler = new OpenAiHandler(mockOptions)
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

                    case 'handle-api-errors': {
                        mockCreate.value = async () => {
                            throw new Error("API Error")
                        }

                        const handler = new OpenAiHandler(mockOptions)
                        const testMessages: Anthropic.Messages.MessageParam[] = [
                            {
                                role: "user",
                                content: [
                                    {
                                        type: "text" as const,
                                        text: "Hello",
                                    },
                                ],
                            },
                        ]

                        const stream = handler.createMessage("system prompt", testMessages)
                        await assert.rejects(async () => {
                            for await (const chunk of stream) {
                                // Should not reach here
                            }
                        }, /API Error/)
                        break
                    }

                    case 'handle-rate-limiting': {
                        const rateLimitError = new Error("Rate limit exceeded")
                        rateLimitError.name = "Error"
                        ;(rateLimitError as any).status = 429
                        mockCreate.value = async () => {
                            throw rateLimitError
                        }

                        const handler = new OpenAiHandler(mockOptions)
                        const testMessages: Anthropic.Messages.MessageParam[] = [
                            {
                                role: "user",
                                content: [
                                    {
                                        type: "text" as const,
                                        text: "Hello",
                                    },
                                ],
                            },
                        ]

                        const stream = handler.createMessage("system prompt", testMessages)
                        await assert.rejects(async () => {
                            for await (const chunk of stream) {
                                // Should not reach here
                            }
                        }, /Rate limit exceeded/)
                        break
                    }

                    case 'complete-successfully': {
                        mockCreate.value = async () => ({
                            choices: [{ message: { content: "Test response" } }],
                        })

                        const handler = new OpenAiHandler(mockOptions)
                        const result = await handler.completePrompt("Test prompt")
                        assert.strictEqual(result, "Test response")
                        break
                    }

                    case 'handle-completion-errors': {
                        mockCreate.value = async () => {
                            throw new Error("API Error")
                        }

                        const handler = new OpenAiHandler(mockOptions)
                        await assert.rejects(
                            () => handler.completePrompt("Test prompt"),
                            /OpenAI completion error: API Error/
                        )
                        break
                    }

                    case 'handle-empty-response': {
                        mockCreate.value = async () => ({
                            choices: [{ message: { content: "" } }],
                        })

                        const handler = new OpenAiHandler(mockOptions)
                        const result = await handler.completePrompt("Test prompt")
                        assert.strictEqual(result, "")
                        break
                    }

                    case 'return-model-info': {
                        const handler = new OpenAiHandler(mockOptions)
                        const model = handler.getModel()
                        assert.strictEqual(model.id, mockOptions.openAiModelId)
                        assert.ok(model.info)
                        assert.strictEqual(model.info.contextWindow, 128_000)
                        assert.strictEqual(model.info.supportsImages, true)
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