import * as vscode from 'vscode';
import * as assert from 'assert';
import { UnboundHandler } from "../unbound";
import { ApiHandlerOptions } from "../../../shared/api";
import { Anthropic } from "@anthropic-ai/sdk";
import { TestUtils } from '../../../test/testUtils';

export async function activateUnboundTests(context: vscode.ExtensionContext): Promise<void> {
    // Create test controller
    const testController = TestUtils.createTestController('unboundTests', 'Unbound Handler Tests');
    context.subscriptions.push(testController);

    // Root test suite
    const rootSuite = testController.createTestItem('unbound-handler', 'UnboundHandler');
    testController.items.add(rootSuite);

    // Default options for tests
    const defaultOptions: ApiHandlerOptions = {
        apiModelId: "anthropic/claude-3-5-sonnet-20241022",
        unboundApiKey: "test-api-key",
        unboundModelId: "anthropic/claude-3-5-sonnet-20241022",
        unboundModelInfo: {
            description: "Anthropic's Claude 3 Sonnet model",
            maxTokens: 8192,
            contextWindow: 200000,
            supportsPromptCache: true,
            inputPrice: 0.01,
            outputPrice: 0.02,
        },
    };

    // Constructor tests
    const constructorSuite = testController.createTestItem('constructor', 'Constructor');
    rootSuite.children.add(constructorSuite);

    constructorSuite.children.add(
        TestUtils.createTest(
            testController,
            'init',
            'should initialize with provided options',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Save original modules
                const originalOpenAI = (global as any).OpenAI;
                
                // Setup mock
                let mockCreate: any = {
                    mock: { calls: [] },
                    mockClear: function() { this.mock.calls = []; },
                    mockResolvedValue: function(value: any) { 
                        this.resolvedValue = value; 
                        return this; 
                    },
                    mockRejectedValueOnce: function(error: any) {
                        this.rejectedValue = error;
                        return this;
                    },
                    mockImplementationOnce: function(impl: any) {
                        this.implementationOnce = impl;
                        return this;
                    }
                };
                
                mockCreate = mockCreate.mockResolvedValue({
                    id: "test-completion",
                    choices: [
                        {
                            message: { role: "assistant", content: "Test response" },
                            finish_reason: "stop",
                            index: 0,
                        },
                    ],
                });
                
                let mockWithResponse: any = {
                    mock: { calls: [] },
                    mockClear: function() { this.mock.calls = []; },
                    mockReturnValue: function(value: any) {
                        this.returnValue = value;
                        return this;
                    }
                };
                
                // Mock OpenAI
                (global as any).OpenAI = function() {
                    return {
                        chat: {
                            completions: {
                                create: function(...args: any[]) {
                                    mockCreate.mock.calls.push(args);
                                    
                                    if (args[0].stream) {
                                        const stream = {
                                            [Symbol.asyncIterator]: async function* () {
                                                // First chunk with content
                                                yield {
                                                    choices: [
                                                        {
                                                            delta: { content: "Test response" },
                                                            index: 0,
                                                        },
                                                    ],
                                                };
                                                // Second chunk with usage data
                                                yield {
                                                    choices: [{ delta: {}, index: 0 }],
                                                    usage: {
                                                        prompt_tokens: 10,
                                                        completion_tokens: 5,
                                                        total_tokens: 15,
                                                    },
                                                };
                                                // Third chunk with cache usage data
                                                yield {
                                                    choices: [{ delta: {}, index: 0 }],
                                                    usage: {
                                                        prompt_tokens: 8,
                                                        completion_tokens: 4,
                                                        total_tokens: 12,
                                                        cache_creation_input_tokens: 3,
                                                        cache_read_input_tokens: 2,
                                                    },
                                                };
                                            },
                                        };
                                        
                                        mockWithResponse.mockReturnValue(
                                            Promise.resolve({
                                                data: stream,
                                                response: { headers: new Map() },
                                            })
                                        );
                                        
                                        const result = mockCreate.resolvedValue || {};
                                        result.withResponse = mockWithResponse;
                                        return result;
                                    }
                                    
                                    if (mockCreate.implementationOnce) {
                                        const impl = mockCreate.implementationOnce;
                                        mockCreate.implementationOnce = null;
                                        return impl();
                                    }
                                    
                                    if (mockCreate.rejectedValue) {
                                        const error = mockCreate.rejectedValue;
                                        mockCreate.rejectedValue = null;
                                        throw error;
                                    }
                                    
                                    return mockCreate.resolvedValue;
                                }
                            },
                        },
                    };
                };
                
                try {
                    // Create handler
                    const handler = new UnboundHandler(defaultOptions);
                    
                    // Verify handler
                    assert.ok(handler instanceof UnboundHandler);
                    assert.strictEqual(handler.getModel().id, defaultOptions.apiModelId);
                } finally {
                    // Restore original modules
                    (global as any).OpenAI = originalOpenAI;
                }
            }
        )
    );

    // createMessage tests
    const messageSuite = testController.createTestItem('messages', 'Message Creation');
    rootSuite.children.add(messageSuite);

    messageSuite.children.add(
        TestUtils.createTest(
            testController,
            'streaming-response',
            'should handle streaming responses with text and usage data',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Save original modules
                const originalOpenAI = (global as any).OpenAI;
                
                // Setup mock
                let mockCreate: any = {
                    mock: { calls: [] },
                    mockClear: function() { this.mock.calls = []; }
                };
                
                let mockWithResponse: any = {
                    mock: { calls: [] },
                    mockClear: function() { this.mock.calls = []; },
                    mockReturnValue: function(value: any) {
                        this.returnValue = value;
                        return this;
                    }
                };
                
                // Mock OpenAI
                (global as any).OpenAI = function() {
                    return {
                        chat: {
                            completions: {
                                create: function(...args: any[]) {
                                    mockCreate.mock.calls.push(args);
                                    
                                    if (args[0].stream) {
                                        const stream = {
                                            [Symbol.asyncIterator]: async function* () {
                                                // First chunk with content
                                                yield {
                                                    choices: [
                                                        {
                                                            delta: { content: "Test response" },
                                                            index: 0,
                                                        },
                                                    ],
                                                };
                                                // Second chunk with usage data
                                                yield {
                                                    choices: [{ delta: {}, index: 0 }],
                                                    usage: {
                                                        prompt_tokens: 10,
                                                        completion_tokens: 5,
                                                        total_tokens: 15,
                                                    },
                                                };
                                                // Third chunk with cache usage data
                                                yield {
                                                    choices: [{ delta: {}, index: 0 }],
                                                    usage: {
                                                        prompt_tokens: 8,
                                                        completion_tokens: 4,
                                                        total_tokens: 12,
                                                        cache_creation_input_tokens: 3,
                                                        cache_read_input_tokens: 2,
                                                    },
                                                };
                                            },
                                        };
                                        
                                        mockWithResponse.mockReturnValue(
                                            Promise.resolve({
                                                data: stream,
                                                response: { headers: new Map() },
                                            })
                                        );
                                        
                                        const result: any = {};
                                        result.withResponse = mockWithResponse;
                                        return result;
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
                                    };
                                }
                            },
                        },
                    };
                };
                
                try {
                    // Create handler
                    const handler = new UnboundHandler(defaultOptions);
                    
                    // Test streaming response
                    const systemPrompt = "You are a helpful assistant.";
                    const messages: Anthropic.Messages.MessageParam[] = [
                        {
                            role: "user",
                            content: "Hello!",
                        },
                    ];
                    
                    const stream = handler.createMessage(systemPrompt, messages);
                    const chunks: Array<{ type: string } & Record<string, any>> = [];
                    
                    for await (const chunk of stream) {
                        chunks.push(chunk);
                    }
                    
                    assert.strictEqual(chunks.length, 3);
                    
                    // Verify text chunk
                    assert.deepStrictEqual(chunks[0], {
                        type: "text",
                        text: "Test response",
                    });
                    
                    // Verify regular usage data
                    assert.deepStrictEqual(chunks[1], {
                        type: "usage",
                        inputTokens: 10,
                        outputTokens: 5,
                    });
                    
                    // Verify usage data with cache information
                    assert.deepStrictEqual(chunks[2], {
                        type: "usage",
                        inputTokens: 8,
                        outputTokens: 4,
                        cacheWriteTokens: 3,
                        cacheReadTokens: 2,
                    });
                    
                    // Verify call arguments
                    assert.strictEqual(mockCreate.mock.calls.length, 1);
                    const callArgs = mockCreate.mock.calls[0][0];
                    assert.strictEqual(callArgs.model, "claude-3-5-sonnet-20241022");
                    assert.ok(Array.isArray(callArgs.messages));
                    assert.strictEqual(callArgs.stream, true);
                    
                    // Verify headers
                    const headers = mockCreate.mock.calls[0][1]?.headers;
                    assert.ok(headers);
                    assert.ok(headers["X-Unbound-Metadata"].includes("roo-code"));
                } finally {
                    // Restore original modules
                    (global as any).OpenAI = originalOpenAI;
                }
            }
        )
    );

    messageSuite.children.add(
        TestUtils.createTest(
            testController,
            'api-errors',
            'should handle API errors',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Save original modules
                const originalOpenAI = (global as any).OpenAI;
                
                // Mock OpenAI
                (global as any).OpenAI = function() {
                    return {
                        chat: {
                            completions: {
                                create: function() {
                                    throw new Error("API Error");
                                }
                            },
                        },
                    };
                };
                
                try {
                    // Create handler
                    const handler = new UnboundHandler(defaultOptions);
                    
                    // Test API error
                    const systemPrompt = "You are a helpful assistant.";
                    const messages: Anthropic.Messages.MessageParam[] = [
                        {
                            role: "user",
                            content: "Hello!",
                        },
                    ];
                    
                    const stream = handler.createMessage(systemPrompt, messages);
                    const chunks = [];
                    
                    try {
                        for await (const chunk of stream) {
                            chunks.push(chunk);
                        }
                        assert.fail("Expected error to be thrown");
                    } catch (error) {
                        assert.ok(error instanceof Error);
                        assert.strictEqual((error as Error).message, "API Error");
                    }
                } finally {
                    // Restore original modules
                    (global as any).OpenAI = originalOpenAI;
                }
            }
        )
    );

    // completePrompt tests
    const promptSuite = testController.createTestItem('prompts', 'Prompt Completion');
    rootSuite.children.add(promptSuite);

    promptSuite.children.add(
        TestUtils.createTest(
            testController,
            'complete-prompt',
            'should complete prompt successfully',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Save original modules
                const originalOpenAI = (global as any).OpenAI;
                
                // Setup mock
                let mockCreate: any = {
                    mock: { calls: [] },
                    mockClear: function() { this.mock.calls = []; }
                };
                
                // Mock OpenAI
                (global as any).OpenAI = function() {
                    return {
                        chat: {
                            completions: {
                                create: function(...args: any[]) {
                                    mockCreate.mock.calls.push(args);
                                    
                                    return {
                                        id: "test-completion",
                                        choices: [
                                            {
                                                message: { role: "assistant", content: "Test response" },
                                                finish_reason: "stop",
                                                index: 0,
                                            },
                                        ],
                                    };
                                }
                            },
                        },
                    };
                };
                
                try {
                    // Create handler
                    const handler = new UnboundHandler(defaultOptions);
                    
                    // Test completePrompt
                    const result = await handler.completePrompt("Test prompt");
                    
                    assert.strictEqual(result, "Test response");
                    
                    // Verify call arguments
                    assert.strictEqual(mockCreate.mock.calls.length, 1);
                    const callArgs = mockCreate.mock.calls[0][0];
                    assert.strictEqual(callArgs.model, "claude-3-5-sonnet-20241022");
                    assert.deepStrictEqual(callArgs.messages, [{ role: "user", content: "Test prompt" }]);
                    assert.strictEqual(callArgs.temperature, 0);
                    assert.strictEqual(callArgs.max_tokens, 8192);
                } finally {
                    // Restore original modules
                    (global as any).OpenAI = originalOpenAI;
                }
            }
        )
    );

    promptSuite.children.add(
        TestUtils.createTest(
            testController,
            'api-errors',
            'should handle API errors',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Save original modules
                const originalOpenAI = (global as any).OpenAI;
                
                // Mock OpenAI
                (global as any).OpenAI = function() {
                    return {
                        chat: {
                            completions: {
                                create: function() {
                                    throw new Error("API Error");
                                }
                            },
                        },
                    };
                };
                
                try {
                    // Create handler
                    const handler = new UnboundHandler(defaultOptions);
                    
                    // Test error handling
                    try {
                        await handler.completePrompt("Test prompt");
                        assert.fail("Expected error to be thrown");
                    } catch (error) {
                        assert.ok(error instanceof Error);
                        assert.strictEqual((error as Error).message, "Unbound completion error: API Error");
                    }
                } finally {
                    // Restore original modules
                    (global as any).OpenAI = originalOpenAI;
                }
            }
        )
    );

    promptSuite.children.add(
        TestUtils.createTest(
            testController,
            'empty-response',
            'should handle empty response',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Save original modules
                const originalOpenAI = (global as any).OpenAI;
                
                // Mock OpenAI
                (global as any).OpenAI = function() {
                    return {
                        chat: {
                            completions: {
                                create: function() {
                                    return {
                                        choices: [{ message: { content: "" } }],
                                    };
                                }
                            },
                        },
                    };
                };
                
                try {
                    // Create handler
                    const handler = new UnboundHandler(defaultOptions);
                    
                    // Test empty response
                    const result = await handler.completePrompt("Test prompt");
                    assert.strictEqual(result, "");
                } finally {
                    // Restore original modules
                    (global as any).OpenAI = originalOpenAI;
                }
            }
        )
    );

    promptSuite.children.add(
        TestUtils.createTest(
            testController,
            'non-anthropic-models',
            'should not set max_tokens for non-Anthropic models',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Save original modules
                const originalOpenAI = (global as any).OpenAI;
                
                // Setup mock
                let mockCreate: any = {
                    mock: { calls: [] },
                    mockClear: function() { this.mock.calls = []; }
                };
                
                // Mock OpenAI
                (global as any).OpenAI = function() {
                    return {
                        chat: {
                            completions: {
                                create: function(...args: any[]) {
                                    mockCreate.mock.calls.push(args);
                                    
                                    return {
                                        id: "test-completion",
                                        choices: [
                                            {
                                                message: { role: "assistant", content: "Test response" },
                                                finish_reason: "stop",
                                                index: 0,
                                            },
                                        ],
                                    };
                                }
                            },
                        },
                    };
                };
                
                try {
                    // Create handler with non-Anthropic model
                    const nonAnthropicOptions = {
                        apiModelId: "openai/gpt-4o",
                        unboundApiKey: "test-key",
                        unboundModelId: "openai/gpt-4o",
                        unboundModelInfo: {
                            description: "OpenAI's GPT-4",
                            maxTokens: undefined,
                            contextWindow: 128000,
                            supportsPromptCache: true,
                            inputPrice: 0.01,
                            outputPrice: 0.03,
                        },
                    };
                    const nonAnthropicHandler = new UnboundHandler(nonAnthropicOptions);
                    
                    // Test completePrompt
                    await nonAnthropicHandler.completePrompt("Test prompt");
                    
                    // Verify call arguments
                    assert.strictEqual(mockCreate.mock.calls.length, 1);
                    const callArgs = mockCreate.mock.calls[0][0];
                    assert.strictEqual(callArgs.model, "gpt-4o");
                    assert.deepStrictEqual(callArgs.messages, [{ role: "user", content: "Test prompt" }]);
                    assert.strictEqual(callArgs.temperature, 0);
                    assert.strictEqual(callArgs.max_tokens, undefined);
                } finally {
                    // Restore original modules
                    (global as any).OpenAI = originalOpenAI;
                }
            }
        )
    );

    // getModel tests
    const modelSuite = testController.createTestItem('models', 'Model Info');
    rootSuite.children.add(modelSuite);

    modelSuite.children.add(
        TestUtils.createTest(
            testController,
            'model-info',
            'should return model info',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Save original modules
                const originalOpenAI = (global as any).OpenAI;
                
                // Mock OpenAI
                (global as any).OpenAI = function() {
                    return {
                        chat: {
                            completions: {
                                create: function() {
                                    return {};
                                }
                            },
                        },
                    };
                };
                
                try {
                    // Create handler
                    const handler = new UnboundHandler(defaultOptions);
                    
                    // Test getModel
                    const modelInfo = handler.getModel();
                    
                    assert.strictEqual(modelInfo.id, defaultOptions.apiModelId);
                    assert.ok(modelInfo.info);
                } finally {
                    // Restore original modules
                    (global as any).OpenAI = originalOpenAI;
                }
            }
        )
    );

    modelSuite.children.add(
        TestUtils.createTest(
            testController,
            'invalid-model',
            'should return default model when invalid model provided',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Save original modules
                const originalOpenAI = (global as any).OpenAI;
                
                // Mock OpenAI
                (global as any).OpenAI = function() {
                    return {
                        chat: {
                            completions: {
                                create: function() {
                                    return {};
                                }
                            },
                        },
                    };
                };
                
                try {
                    // Create handler with invalid model
                    const handlerWithInvalidModel = new UnboundHandler({
                        ...defaultOptions,
                        unboundModelId: "invalid/model",
                        unboundModelInfo: undefined,
                    });
                    
                    // Test getModel
                    const modelInfo = handlerWithInvalidModel.getModel();
                    
                    assert.strictEqual(modelInfo.id, "anthropic/claude-3-5-sonnet-20241022"); // Default model
                    assert.ok(modelInfo.info);
                } finally {
                    // Restore original modules
                    (global as any).OpenAI = originalOpenAI;
                }
            }
        )
    );
}
