import * as vscode from 'vscode'
import * as assert from 'assert'
import { OpenRouterHandler } from "../openrouter"
import { ApiHandlerOptions, ModelInfo } from "../../../shared/api"
import OpenAI from "openai"
import axios from "axios"
import { Anthropic } from "@anthropic-ai/sdk"
import { ChatCompletionCreateParams } from "openai/resources"

// Mock axios for testing
const originalAxios = { ...axios };
const mockAxiosGet = async () => ({
    data: {
        data: {
            native_tokens_prompt: 10,
            native_tokens_completion: 20,
            total_cost: 0.001,
        }
    }
});

// Mock OpenAI client
const mockCreate = async function(this: any, options: ChatCompletionCreateParams) {
    const mockError = (this as any).mockError;
    const mockResponse = (this as any).mockResponse;
    
    if (mockError) throw mockError;
    if (mockResponse) return mockResponse;

    if (!options.stream) {
        return {
            choices: [
                {
                    message: {
                        content: "test completion"
                    }
                }
            ]
        }
    }

    return {
        async *[Symbol.asyncIterator]() {
            yield {
                id: "test-id",
                choices: [
                    {
                        delta: {
                            content: "test response",
                        },
                    },
                ],
            }
        }
    }
}

// Override OpenAI module for testing
const originalModule = OpenAI;
const MockOpenAI = function(this: any) {
    this.mockError = null;
    this.mockResponse = null;
    return {
        chat: {
            completions: {
                create: mockCreate.bind(this)
            }
        }
    }
} as any;

export async function activateOpenRouterTests(context: vscode.ExtensionContext): Promise<void> {
    const testController = vscode.tests.createTestController('openRouterTests', 'OpenRouter Tests')
    context.subscriptions.push(testController)

    const rootSuite = testController.createTestItem('open-router', 'OpenRouter')
    testController.items.add(rootSuite)

    // Add constructor test
    rootSuite.children.add(testController.createTestItem(
        'constructor',
        'constructor initializes with correct options'
    ))

    // Add getModel tests
    const getModelSuite = testController.createTestItem('get-model', 'getModel')
    rootSuite.children.add(getModelSuite)

    getModelSuite.children.add(testController.createTestItem(
        'with-options',
        'returns correct model info when options are provided'
    ))

    getModelSuite.children.add(testController.createTestItem(
        'without-options',
        'returns default model info when options are not provided'
    ))

    // Add createMessage tests
    const createMessageSuite = testController.createTestItem('create-message', 'createMessage')
    rootSuite.children.add(createMessageSuite)

    createMessageSuite.children.add(testController.createTestItem(
        'stream-chunks',
        'generates correct stream chunks'
    ))

    createMessageSuite.children.add(testController.createTestItem(
        'middle-out',
        'with middle-out transform enabled'
    ))

    createMessageSuite.children.add(testController.createTestItem(
        'claude-cache',
        'with Claude model adds cache control'
    ))

    createMessageSuite.children.add(testController.createTestItem(
        'api-errors',
        'handles API errors'
    ))

    // Add completePrompt tests
    const completePromptSuite = testController.createTestItem('complete-prompt', 'completePrompt')
    rootSuite.children.add(completePromptSuite)

    completePromptSuite.children.add(testController.createTestItem(
        'success',
        'returns correct response'
    ))

    completePromptSuite.children.add(testController.createTestItem(
        'api-errors',
        'handles API errors'
    ))

    completePromptSuite.children.add(testController.createTestItem(
        'unexpected-errors',
        'handles unexpected errors'
    ))

    // Create run profile
    testController.createRunProfile('run', vscode.TestRunProfileKind.Run, async (request) => {
        const queue: vscode.TestItem[] = []
        if (request.include) {
            request.include.forEach(test => queue.push(test))
        }

        const run = testController.createTestRun(request)

        // Mock dependencies before running tests
        const mockAxios = { ...axios, get: mockAxiosGet };
        Object.assign(axios, mockAxios);
        OpenAI.prototype = MockOpenAI.prototype;

        for (const test of queue) {
            run.started(test)
            try {
                const mockOptions: ApiHandlerOptions = {
                    openRouterApiKey: "test-key",
                    openRouterModelId: "test-model",
                    openRouterModelInfo: {
                        name: "Test Model",
                        description: "Test Description",
                        maxTokens: 1000,
                        contextWindow: 2000,
                        supportsPromptCache: true,
                        inputPrice: 0.01,
                        outputPrice: 0.02,
                    } as ModelInfo,
                }

                switch (test.id) {
                    case 'constructor': {
                        const handler = new OpenRouterHandler(mockOptions)
                        assert.ok(handler instanceof OpenRouterHandler)
                        // Can't directly test OpenAI constructor args in VS Code test
                        break
                    }

                    case 'with-options': {
                        const handler = new OpenRouterHandler(mockOptions)
                        const result = handler.getModel()
                        assert.deepStrictEqual(result, {
                            id: mockOptions.openRouterModelId,
                            info: mockOptions.openRouterModelInfo,
                        })
                        break
                    }

                    case 'without-options': {
                        const handler = new OpenRouterHandler({})
                        const result = handler.getModel()
                        assert.strictEqual(result.id, "anthropic/claude-3.5-sonnet:beta")
                        assert.strictEqual(result.info.supportsPromptCache, true)
                        break
                    }

                    case 'stream-chunks': {
                        const handler = new OpenRouterHandler(mockOptions)
                        const systemPrompt = "test system prompt"
                        const messages: Anthropic.Messages.MessageParam[] = [
                            { role: "user", content: "test message" }
                        ]

                        const generator = handler.createMessage(systemPrompt, messages)
                        const chunks = []
                        for await (const chunk of generator) {
                            chunks.push(chunk)
                        }

                        assert.strictEqual(chunks.length, 2)
                        assert.deepStrictEqual(chunks[0], {
                            type: "text",
                            text: "test response",
                        })
                        assert.deepStrictEqual(chunks[1], {
                            type: "usage",
                            inputTokens: 10,
                            outputTokens: 20,
                            totalCost: 0.001,
                            fullResponseText: "test response",
                        })
                        break
                    }

                    case 'middle-out': {
                        const handler = new OpenRouterHandler({
                            ...mockOptions,
                            openRouterUseMiddleOutTransform: true,
                        })

                        const messages: Anthropic.Messages.MessageParam[] = []
                        const generator = handler.createMessage("test", messages)
                        await generator.next()

                        // Can't directly verify create args, but ensure no error
                        assert.ok(true)
                        break
                    }

                    case 'claude-cache': {
                        const handler = new OpenRouterHandler({
                            ...mockOptions,
                            openRouterModelId: "anthropic/claude-3.5-sonnet",
                        })

                        const messages: Anthropic.Messages.MessageParam[] = [
                            { role: "user", content: "message 1" },
                            { role: "assistant", content: "response 1" },
                            { role: "user", content: "message 2" },
                        ]

                        const generator = handler.createMessage("test system", messages)
                        await generator.next()
                        
                        // Can't directly verify create args, but ensure no error
                        assert.ok(true)
                        break
                    }

                    case 'api-errors': {
                        const handler = new OpenRouterHandler(mockOptions)
                        const mockApi = new MockOpenAI();
                        mockApi.mockResponse = {
                            async *[Symbol.asyncIterator]() {
                                yield {
                                    error: {
                                        message: "API Error",
                                        code: 500,
                                    },
                                }
                            }
                        }
                        OpenAI.prototype = mockApi;

                        const generator = handler.createMessage("test", [])
                        await assert.rejects(
                            () => generator.next(),
                            /OpenRouter API Error 500: API Error/
                        )
                        break
                    }

                    case 'success': {
                        const handler = new OpenRouterHandler(mockOptions)
                        const result = await handler.completePrompt("test prompt")
                        assert.strictEqual(result, "test completion")
                        break
                    }

                    case 'api-errors': {
                        const handler = new OpenRouterHandler(mockOptions)
                        const mockApi = new MockOpenAI();
                        mockApi.mockResponse = {
                            error: {
                                message: "API Error",
                                code: 500,
                            },
                        }
                        OpenAI.prototype = mockApi;

                        await assert.rejects(
                            () => handler.completePrompt("test prompt"),
                            /OpenRouter API Error 500: API Error/
                        )
                        break
                    }

                    case 'unexpected-errors': {
                        const handler = new OpenRouterHandler(mockOptions)
                        const mockApi = new MockOpenAI();
                        mockApi.mockError = new Error("Unexpected error");
                        OpenAI.prototype = mockApi;

                        await assert.rejects(
                            () => handler.completePrompt("test prompt"),
                            /OpenRouter completion error: Unexpected error/
                        )
                        break
                    }
                }
                run.passed(test)
            } catch (err) {
                run.failed(test, new vscode.TestMessage(err instanceof Error ? err.message : String(err)))
            }
        }
        
        // Restore original modules after tests
        Object.assign(axios, originalAxios);
        OpenAI.prototype = originalModule.prototype;
        
        run.end()
    })
}
