import * as vscode from 'vscode'
import * as assert from 'assert'
import { LmStudioHandler } from "../lmstudio"
import { ApiHandlerOptions } from "../../../shared/api"
import OpenAI from "openai"
import { Anthropic } from "@anthropic-ai/sdk"
import { ChatCompletionCreateParams } from "openai/resources"

// Mock OpenAI client
const mockCreate = async function(options: ChatCompletionCreateParams) {
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

// Override the OpenAI module for testing
const originalModule = OpenAI;
const MockOpenAI = function() {
    return {
        chat: {
            completions: {
                create: mockCreate
            }
        }
    }
} as any;

export async function activateLmStudioTests(context: vscode.ExtensionContext): Promise<void> {
    const testController = vscode.tests.createTestController('lmStudioTests', 'LM Studio Tests')
    context.subscriptions.push(testController)

    const rootSuite = testController.createTestItem('lm-studio', 'LM Studio')
    testController.items.add(rootSuite)

    // Create test suites
    const constructorSuite = testController.createTestItem('constructor', 'Constructor')
    rootSuite.children.add(constructorSuite)

    const createMessageSuite = testController.createTestItem('create-message', 'createMessage')
    rootSuite.children.add(createMessageSuite)

    const completePromptSuite = testController.createTestItem('complete-prompt', 'completePrompt')
    rootSuite.children.add(completePromptSuite)

    const modelSuite = testController.createTestItem('model', 'getModel')
    rootSuite.children.add(modelSuite)

    // Add constructor test cases
    constructorSuite.children.add(testController.createTestItem(
        'initialize-with-options',
        'should initialize with provided options'
    ))

    constructorSuite.children.add(testController.createTestItem(
        'default-base-url',
        'should use default base URL if not provided'
    ))

    // Add createMessage test cases
    createMessageSuite.children.add(testController.createTestItem(
        'handle-streaming',
        'should handle streaming responses'
    ))

    createMessageSuite.children.add(testController.createTestItem(
        'handle-errors',
        'should handle API errors'
    ))

    // Add completePrompt test cases
    completePromptSuite.children.add(testController.createTestItem(
        'complete-successfully',
        'should complete prompt successfully'
    ))

    completePromptSuite.children.add(testController.createTestItem(
        'handle-errors',
        'should handle API errors'
    ))

    completePromptSuite.children.add(testController.createTestItem(
        'handle-empty',
        'should handle empty response'
    ))

    // Add getModel test cases
    modelSuite.children.add(testController.createTestItem(
        'return-model-info',
        'should return model info'
    ))

    // Create run profile
    testController.createRunProfile('run', vscode.TestRunProfileKind.Run, async (request) => {
        const queue: vscode.TestItem[] = []
        if (request.include) {
            request.include.forEach(test => queue.push(test))
        }

        const run = testController.createTestRun(request)

        // Mock OpenAI before running tests
        OpenAI.prototype = MockOpenAI.prototype;
        let lastMockOptions: ChatCompletionCreateParams | undefined;
        let mockError: Error | undefined;
        let mockResponse: any;
        
        for (const test of queue) {
            run.started(test)
            try {
                const mockOptions: ApiHandlerOptions = {
                    apiModelId: "local-model",
                    lmStudioModelId: "local-model",
                    lmStudioBaseUrl: "http://localhost:1234/v1",
                }
                lastMockOptions = undefined;
                mockError = undefined;
                mockResponse = undefined;

                // Override mockCreate for each test as needed
                mockCreate.prototype = async function(options: ChatCompletionCreateParams) {
                    lastMockOptions = options;
                    if (mockError) throw mockError;
                    if (mockResponse) return mockResponse;
                    return mockCreate(options);
                }

                switch (test.id) {
                    case 'initialize-with-options': {
                        const handler = new LmStudioHandler(mockOptions)
                        assert.ok(handler instanceof LmStudioHandler)
                        assert.strictEqual(handler.getModel().id, mockOptions.lmStudioModelId)
                        break
                    }

                    case 'default-base-url': {
                        const handlerWithoutUrl = new LmStudioHandler({
                            apiModelId: "local-model",
                            lmStudioModelId: "local-model",
                        })
                        assert.ok(handlerWithoutUrl instanceof LmStudioHandler)
                        break
                    }

                    case 'handle-streaming': {
                        const handler = new LmStudioHandler(mockOptions)
                        const systemPrompt = "You are a helpful assistant."
                        const messages: Anthropic.Messages.MessageParam[] = [
                            { role: "user", content: "Hello!" }
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

                    case 'handle-errors': {
                        const handler = new LmStudioHandler(mockOptions)
                        const systemPrompt = "You are a helpful assistant."
                        const messages: Anthropic.Messages.MessageParam[] = [
                            { role: "user", content: "Hello!" }
                        ]

                        mockError = new Error("API Error")
                        const stream = handler.createMessage(systemPrompt, messages)
                        
                        await assert.rejects(async () => {
                            for await (const chunk of stream) {
                                // Should not reach here
                            }
                        }, /Please check the LM Studio developer logs to debug what went wrong/)
                        break
                    }

                    case 'complete-successfully': {
                        const handler = new LmStudioHandler(mockOptions)
                        const result = await handler.completePrompt("Test prompt")
                        assert.strictEqual(result, "Test response")
                        assert.deepStrictEqual(lastMockOptions, {
                            model: mockOptions.lmStudioModelId,
                            messages: [{ role: "user", content: "Test prompt" }],
                            temperature: 0,
                            stream: false,
                        })
                        break
                    }

                    case 'handle-errors': {
                        const handler = new LmStudioHandler(mockOptions)
                        mockError = new Error("API Error")
                        await assert.rejects(
                            () => handler.completePrompt("Test prompt"),
                            /Please check the LM Studio developer logs to debug what went wrong/
                        )
                        break
                    }

                    case 'handle-empty': {
                        const handler = new LmStudioHandler(mockOptions)
                        mockResponse = {
                            choices: [{ message: { content: "" } }],
                        }
                        const result = await handler.completePrompt("Test prompt")
                        assert.strictEqual(result, "")
                        break
                    }

                    case 'return-model-info': {
                        const handler = new LmStudioHandler(mockOptions)
                        const modelInfo = handler.getModel()
                        assert.strictEqual(modelInfo.id, mockOptions.lmStudioModelId)
                        assert.ok(modelInfo.info)
                        assert.strictEqual(modelInfo.info.maxTokens, -1)
                        assert.strictEqual(modelInfo.info.contextWindow, 128_000)
                        break
                    }
                }
                run.passed(test)
            } catch (err) {
                run.failed(test, new vscode.TestMessage(err instanceof Error ? err.message : String(err)))
            }
        }
        
        // Restore original OpenAI module after tests
        OpenAI.prototype = originalModule.prototype;
        
        run.end()
    })
}
