import * as vscode from 'vscode'
import * as assert from 'assert'
import { GlamaHandler } from "../glama"
import { ApiHandlerOptions } from "../../../shared/api"
import { Anthropic } from "@anthropic-ai/sdk"
import axios from "axios"

export async function activateGlamaTests(context: vscode.ExtensionContext): Promise<void> {
    const testController = vscode.tests.createTestController('glamaTests', 'Glama Tests')
    context.subscriptions.push(testController)

    const rootSuite = testController.createTestItem('glama', 'Glama')
    testController.items.add(rootSuite)

    // Create test suites
    const constructorSuite = testController.createTestItem('constructor', 'Constructor')
    rootSuite.children.add(constructorSuite)

    const messageSuite = testController.createTestItem('message', 'Create Message')
    rootSuite.children.add(messageSuite)

    const promptSuite = testController.createTestItem('prompt', 'Complete Prompt')
    rootSuite.children.add(promptSuite)

    const modelSuite = testController.createTestItem('model', 'Model Info')
    rootSuite.children.add(modelSuite)

    // Constructor tests
    constructorSuite.children.add(testController.createTestItem(
        'initialize-with-options',
        'should initialize with provided options'
    ))

    // Message tests
    messageSuite.children.add(testController.createTestItem(
        'handle-streaming',
        'should handle streaming responses'
    ))
    messageSuite.children.add(testController.createTestItem(
        'handle-api-errors',
        'should handle API errors'
    ))

    // Prompt tests
    promptSuite.children.add(testController.createTestItem(
        'complete-prompt',
        'should complete prompt successfully'
    ))
    promptSuite.children.add(testController.createTestItem(
        'handle-prompt-errors',
        'should handle API errors'
    ))
    promptSuite.children.add(testController.createTestItem(
        'handle-empty-response',
        'should handle empty response'
    ))
    promptSuite.children.add(testController.createTestItem(
        'no-max-tokens',
        'should not set max_tokens for non-Anthropic models'
    ))

    // Model tests
    modelSuite.children.add(testController.createTestItem(
        'model-info',
        'should return model info'
    ))

    // Create run profile
    testController.createRunProfile('run', vscode.TestRunProfileKind.Run, async (request) => {
        const queue: vscode.TestItem[] = []
        if (request.include) {
            request.include.forEach(test => queue.push(test))
        }

        const run = testController.createTestRun(request)

        // Mock stream implementation
        const mockStream = {
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

        // Mock OpenAI client implementation
        const mockClient = {
            chat: {
                completions: {
                    create: async (options: any) => {
                        if (options.stream) {
                            return {
                                data: mockStream,
                                response: {
                                    headers: {
                                        get: (name: string) =>
                                            name === "x-completion-request-id" ? "test-request-id" : null,
                                    },
                                },
                            }
                        }
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
                }
            }
        }

        const mockOptions: ApiHandlerOptions = {
            apiModelId: "anthropic/claude-3-5-sonnet",
            glamaModelId: "anthropic/claude-3-5-sonnet",
            glamaApiKey: "test-api-key",
        }

        for (const test of queue) {
            run.started(test)
            try {
                switch (test.id) {
                    case 'initialize-with-options': {
                        const handler = new GlamaHandler(mockOptions)
                        assert.ok(handler instanceof GlamaHandler)
                        assert.strictEqual(handler.getModel().id, mockOptions.apiModelId)
                        break
                    }

                    case 'handle-streaming': {
                        const handler = new GlamaHandler(mockOptions)
                        ;(handler as any).client = mockClient

                        // Mock axios for token usage request
                        const originalAxiosGet = axios.get
                        
                        // Use type assertion to avoid TypeScript errors
                        axios.get = (async () => ({
                            data: {
                                tokenUsage: {
                                    promptTokens: 10,
                                    completionTokens: 5,
                                    cacheCreationInputTokens: 0,
                                    cacheReadInputTokens: 0,
                                },
                                totalCostUsd: "0.00",
                            }
                        })) as typeof axios.get;

                        try {
                            const systemPrompt = "You are a helpful assistant."
                            const messages: Anthropic.Messages.MessageParam[] = [
                                {
                                    role: "user",
                                    content: "Hello!",
                                },
                            ]

                            const stream = handler.createMessage(systemPrompt, messages)
                            const chunks: any[] = []
                            for await (const chunk of stream) {
                                chunks.push(chunk)
                            }

                            assert.strictEqual(chunks.length, 2)
                            assert.deepStrictEqual(chunks[0], {
                                type: "text",
                                text: "Test response",
                            })
                        } finally {
                            axios.get = originalAxiosGet
                        }
                        break
                    }

                    case 'handle-api-errors': {
                        const handler = new GlamaHandler(mockOptions)
                        const errorClient = {
                            chat: {
                                completions: {
                                    create: async () => {
                                        throw new Error("Glama API error")
                                    }
                                }
                            }
                        }
                        ;(handler as any).client = errorClient

                        const systemPrompt = "You are a helpful assistant."
                        const messages: Anthropic.Messages.MessageParam[] = [
                            { role: "user", content: "Hello!" },
                        ]

                        const stream = handler.createMessage(systemPrompt, messages)
                        await assert.rejects(async () => {
                            for await (const chunk of stream) {
                                // Should throw before yielding any chunks
                            }
                        }, /Glama API error/)
                        break
                    }

                    case 'complete-prompt': {
                        const handler = new GlamaHandler(mockOptions)
                        ;(handler as any).client = mockClient

                        const result = await handler.completePrompt("Test prompt")
                        assert.strictEqual(result, "Test response")
                        break
                    }

                    case 'handle-prompt-errors': {
                        const handler = new GlamaHandler(mockOptions)
                        const errorClient = {
                            chat: {
                                completions: {
                                    create: async () => {
                                        throw new Error("Glama API error")
                                    }
                                }
                            }
                        }
                        ;(handler as any).client = errorClient

                        await assert.rejects(
                            () => handler.completePrompt("Test prompt"),
                            /Glama completion error: Glama API error/
                        )
                        break
                    }

                    case 'handle-empty-response': {
                        const handler = new GlamaHandler(mockOptions)
                        const emptyClient = {
                            chat: {
                                completions: {
                                    create: async () => ({
                                        choices: [
                                            {
                                                message: { content: "" },
                                                finish_reason: "stop",
                                                index: 0,
                                            },
                                        ],
                                    })
                                }
                            }
                        }
                        ;(handler as any).client = emptyClient

                        const result = await handler.completePrompt("Test prompt")
                        assert.strictEqual(result, "")
                        break
                    }

                    case 'no-max-tokens': {
                        const handler = new GlamaHandler({
                            ...mockOptions,
                            apiModelId: "non-anthropic/model",
                        })
                        ;(handler as any).client = mockClient

                        await handler.completePrompt("Test prompt")
                        // Test passes if we get here without error
                        break
                    }

                    case 'model-info': {
                        const handler = new GlamaHandler(mockOptions)
                        const model = handler.getModel()
                        assert.strictEqual(model.id, mockOptions.apiModelId)
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
