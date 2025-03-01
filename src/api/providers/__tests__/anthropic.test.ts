import * as vscode from 'vscode'
import * as assert from 'assert'
import { AnthropicHandler } from "../anthropic"
import { ApiHandlerOptions } from "../../../shared/api"
import { ApiStream } from "../../transform/stream"
import { Anthropic } from "@anthropic-ai/sdk"
import { ApiStreamChunk } from "../../transform/stream"

export async function activateAnthropicTests(context: vscode.ExtensionContext): Promise<void> {
    const testController = vscode.tests.createTestController('anthropicTests', 'Anthropic Tests')
    context.subscriptions.push(testController)

    // Root test item
    const rootSuite = testController.createTestItem('anthropic', 'Anthropic')
    testController.items.add(rootSuite)

    // Create test suites
    const anthropichandlerSuite = testController.createTestItem('anthropichandler', 'AnthropicHandler')
    rootSuite.children.add(anthropichandlerSuite)

    // Add test cases
    anthropichandlerSuite.children.add(testController.createTestItem(
        'should-initialize-with-provided-options',
        'should initialize with provided options'
    ))
    anthropichandlerSuite.children.add(testController.createTestItem(
        'should-initialize-with-undefined-api-key',
        'should initialize with undefined API key'
    ))
    anthropichandlerSuite.children.add(testController.createTestItem(
        'should-use-custom-base-url-if-provided',
        'should use custom base URL if provided'
    ))
    anthropichandlerSuite.children.add(testController.createTestItem(
        'should-handle-prompt-caching-for-supported-models',
        'should handle prompt caching for supported models'
    ))
    anthropichandlerSuite.children.add(testController.createTestItem(
        'should-complete-prompt-successfully',
        'should complete prompt successfully'
    ))
    anthropichandlerSuite.children.add(testController.createTestItem(
        'should-handle-api-errors',
        'should handle API errors'
    ))
    anthropichandlerSuite.children.add(testController.createTestItem(
        'should-handle-non-text-content',
        'should handle non-text content'
    ))
    anthropichandlerSuite.children.add(testController.createTestItem(
        'should-handle-empty-response',
        'should handle empty response'
    ))
    anthropichandlerSuite.children.add(testController.createTestItem(
        'should-return-default-model-if-no-model-id-is-provided',
        'should return default model if no model ID is provided'
    ))
    anthropichandlerSuite.children.add(testController.createTestItem(
        'should-return-specified-model-if-valid-model-id-is-provided',
        'should return specified model if valid model ID is provided'
    ))

    // Create run profile
    testController.createRunProfile('run', vscode.TestRunProfileKind.Run, async (request) => {
        const queue: vscode.TestItem[] = []
        if (request.include) {
            request.include.forEach(test => queue.push(test))
        }

        const run = testController.createTestRun(request)

        // Mock Anthropic client
        const mockBetaCreate = async () => ({
            async *[Symbol.asyncIterator]() {
                yield {
                    type: "message_start",
                    message: {
                        usage: {
                            input_tokens: 100,
                            output_tokens: 50,
                            cache_creation_input_tokens: 20,
                            cache_read_input_tokens: 10,
                        },
                    },
                }
                yield {
                    type: "content_block_start",
                    index: 0,
                    content_block: {
                        type: "text",
                        text: "Hello",
                    },
                }
                yield {
                    type: "content_block_delta",
                    delta: {
                        type: "text_delta",
                        text: " world",
                    },
                }
            },
        })

        // Default mock implementation
        let mockCreateImpl = async (options: any) => {
            if (!options.stream) {
                return {
                    id: "test-completion",
                    content: [{ type: "text", text: "Test response" }],
                    role: "assistant",
                    model: options.model,
                    usage: {
                        input_tokens: 10,
                        output_tokens: 5,
                    },
                }
            }
            return {
                async *[Symbol.asyncIterator]() {
                    yield {
                        type: "message_start",
                        message: {
                            usage: {
                                input_tokens: 10,
                                output_tokens: 5,
                            },
                        },
                    }
                    yield {
                        type: "content_block_start",
                        content_block: {
                            type: "text",
                            text: "Test response",
                        },
                    }
                },
            }
        }

        // Create a wrapper function that can be modified for different test cases
        const mockCreate = async (options: any) => {
            return mockCreateImpl(options)
        }

        // Mock Anthropic SDK
        const mockAnthropicClient = {
            beta: {
                promptCaching: {
                    messages: {
                        create: mockBetaCreate
                    },
                },
            },
            messages: {
                create: mockCreate
            },
        }

        // Mock Anthropic constructor
        const originalAnthropicConstructor = Anthropic
        // @ts-ignore - We're mocking the constructor
        Anthropic = function() {
            return mockAnthropicClient
        }

        for (const test of queue) {
            run.started(test)
            try {
                // Setup common test fixtures
                let mockOptions: ApiHandlerOptions
                let handler: AnthropicHandler

                // Reset mocks for each test
                mockOptions = {
                    apiKey: "test-api-key",
                    apiModelId: "claude-3-5-sonnet-20241022",
                }
                handler = new AnthropicHandler(mockOptions)

                switch (test.id) {
                    case 'should-initialize-with-provided-options': {
                        assert.ok(handler instanceof AnthropicHandler, "Handler should be an instance of AnthropicHandler")
                        assert.strictEqual(handler.getModel().id, mockOptions.apiModelId, "Model ID should match")
                        break
                    }
                    case 'should-initialize-with-undefined-api-key': {
                        // The SDK will handle API key validation, so we just verify it initializes
                        const handlerWithoutKey = new AnthropicHandler({
                            ...mockOptions,
                            apiKey: undefined,
                        })
                        assert.ok(handlerWithoutKey instanceof AnthropicHandler, "Handler should initialize with undefined API key")
                        break
                    }
                    case 'should-use-custom-base-url-if-provided': {
                        const customBaseUrl = "https://custom.anthropic.com"
                        const handlerWithCustomUrl = new AnthropicHandler({
                            ...mockOptions,
                            anthropicBaseUrl: customBaseUrl,
                        })
                        assert.ok(handlerWithCustomUrl instanceof AnthropicHandler, "Handler should initialize with custom base URL")
                        break
                    }
                    case 'should-handle-prompt-caching-for-supported-models': {
                        const systemPrompt = "You are a helpful assistant."
                        const stream = handler.createMessage(systemPrompt, [
                            {
                                role: "user",
                                content: [{ type: "text" as const, text: "First message" }],
                            },
                            {
                                role: "assistant",
                                content: [{ type: "text" as const, text: "Response" }],
                            },
                            {
                                role: "user",
                                content: [{ type: "text" as const, text: "Second message" }],
                            },
                        ])

                        const chunks: any[] = []
                        for await (const chunk of stream) {
                            chunks.push(chunk)
                        }

                        // Verify usage information
                        const usageChunk = chunks.find((chunk) => chunk.type === "usage")
                        assert.ok(usageChunk, "Should have usage chunk")
                        assert.strictEqual(usageChunk?.inputTokens, 100, "Input tokens should match")
                        assert.strictEqual(usageChunk?.outputTokens, 50, "Output tokens should match")
                        assert.strictEqual(usageChunk?.cacheWriteTokens, 20, "Cache write tokens should match")
                        assert.strictEqual(usageChunk?.cacheReadTokens, 10, "Cache read tokens should match")

                        // Verify text content
                        const textChunks = chunks.filter((chunk) => chunk.type === "text")
                        assert.strictEqual(textChunks.length, 2, "Should have 2 text chunks")
                        assert.strictEqual(textChunks[0].text, "Hello", "First text chunk should match")
                        assert.strictEqual(textChunks[1].text, " world", "Second text chunk should match")
                        break
                    }
                    case 'should-complete-prompt-successfully': {
                        const result = await handler.completePrompt("Test prompt")
                        assert.strictEqual(result, "Test response", "Response should match")
                        break
                    }
                    case 'should-handle-api-errors': {
                        // Save original implementation
                        const originalImpl = mockCreateImpl
                        
                        // Set implementation to throw an error
                        mockCreateImpl = async () => {
                            throw new Error("API Error")
                        }
                        
                        try {
                            await handler.completePrompt("Test prompt")
                            assert.fail("Should have thrown an error")
                        } catch (err) {
                            assert.ok(err instanceof Error, "Should throw an error")
                            assert.strictEqual(err.message, "Anthropic completion error: API Error", "Error message should match")
                        }
                        
                        // Restore original implementation
                        mockCreateImpl = originalImpl
                        break
                    }
                    case 'should-handle-non-text-content': {
                        // Save original implementation
                        const originalImpl = mockCreateImpl
                        
                        // Set implementation to return non-text content with a text property to satisfy TypeScript
                        // The handler should still treat it as non-text content based on the type
                        mockCreateImpl = async () => {
                            return {
                                id: "test-completion",
                                content: [{ type: "image", text: "" }],
                                role: "assistant",
                                model: "claude-3-5-sonnet-20241022",
                                usage: {
                                    input_tokens: 10,
                                    output_tokens: 5,
                                },
                            }
                        }
                        
                        const result = await handler.completePrompt("Test prompt")
                        assert.strictEqual(result, "", "Should return empty string for non-text content")
                        
                        // Restore original implementation
                        mockCreateImpl = originalImpl
                        break
                    }
                    case 'should-handle-empty-response': {
                        // Save original implementation
                        const originalImpl = mockCreateImpl
                        
                        // Set implementation to return empty response
                        mockCreateImpl = async () => {
                            return {
                                id: "test-completion",
                                content: [{ type: "text", text: "" }],
                                role: "assistant",
                                model: "claude-3-5-sonnet-20241022",
                                usage: {
                                    input_tokens: 10,
                                    output_tokens: 5,
                                },
                            }
                        }
                        
                        const result = await handler.completePrompt("Test prompt")
                        assert.strictEqual(result, "", "Should return empty string for empty response")
                        
                        // Restore original implementation
                        mockCreateImpl = originalImpl
                        break
                    }
                    case 'should-return-default-model-if-no-model-id-is-provided': {
                        const handlerWithoutModel = new AnthropicHandler({
                            ...mockOptions,
                            apiModelId: undefined,
                        })
                        const model = handlerWithoutModel.getModel()
                        assert.ok(model.id, "Model ID should be defined")
                        assert.ok(model.info, "Model info should be defined")
                        break
                    }
                    case 'should-return-specified-model-if-valid-model-id-is-provided': {
                        const model = handler.getModel()
                        assert.strictEqual(model.id, mockOptions.apiModelId, "Model ID should match")
                        assert.ok(model.info, "Model info should be defined")
                        assert.strictEqual(model.info.maxTokens, 8192, "Max tokens should match")
                        assert.strictEqual(model.info.contextWindow, 200_000, "Context window should match")
                        assert.strictEqual(model.info.supportsImages, true, "Supports images should match")
                        assert.strictEqual(model.info.supportsPromptCache, true, "Supports prompt cache should match")
                        break
                    }
                }
                run.passed(test)
            } catch (err) {
                run.failed(test, new vscode.TestMessage(err instanceof Error ? err.message : String(err)))
            }
        }
        
        // Restore original Anthropic constructor
        // @ts-ignore - We're restoring the constructor
        Anthropic = originalAnthropicConstructor
        
        run.end()
    })
}
