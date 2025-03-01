import * as vscode from 'vscode';
import * as assert from 'assert';
import { Anthropic } from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { ApiHandlerOptions, ModelInfo, requestyModelInfoSaneDefaults } from "../../../shared/api";
import { RequestyHandler } from "../requesty";
import { convertToOpenAiMessages } from "../../transform/openai-format";
import { convertToR1Format } from "../../transform/r1-format";
import { TestUtils } from '../../../test/testUtils';

export async function activateRequestyTests(context: vscode.ExtensionContext): Promise<void> {
    // Create test controller
    const testController = TestUtils.createTestController('requestyTests', 'Requesty Handler Tests');
    context.subscriptions.push(testController);

    // Root test suite
    const rootSuite = testController.createTestItem('requesty-handler', 'RequestyHandler');
    testController.items.add(rootSuite);

    // Default options for tests
    const defaultOptions: ApiHandlerOptions = {
        requestyApiKey: "test-key",
        requestyModelId: "test-model",
        requestyModelInfo: {
            maxTokens: 1000,
            contextWindow: 4000,
            supportsPromptCache: false,
            supportsImages: true,
            inputPrice: 0,
            outputPrice: 0,
        },
        openAiStreamingEnabled: true,
        includeMaxTokens: true,
    };

    // Constructor tests
    const constructorSuite = testController.createTestItem('constructor', 'Constructor');
    rootSuite.children.add(constructorSuite);

    constructorSuite.children.add(
        TestUtils.createTest(
            testController,
            'init',
            'should initialize with correct options',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Save original OpenAI
                const originalOpenAI = OpenAI;
                
                // Mock OpenAI
                let openAiOptions: any;
                (global as any).OpenAI = function(options: any) {
                    openAiOptions = options;
                    return {
                        chat: {
                            completions: {
                                create: async () => ({})
                            }
                        }
                    };
                };
                
                try {
                    // Create handler
                    const handler = new RequestyHandler(defaultOptions);
                    
                    // Verify OpenAI was called with correct options
                    assert.strictEqual(openAiOptions.baseURL, "https://router.requesty.ai/v1");
                    assert.strictEqual(openAiOptions.apiKey, defaultOptions.requestyApiKey);
                    assert.deepStrictEqual(openAiOptions.defaultHeaders, {
                        "HTTP-Referer": "https://github.com/RooVetGit/Roo-Cline",
                        "X-Title": "Roo Code",
                    });
                } finally {
                    // Restore original OpenAI
                    (global as any).OpenAI = originalOpenAI;
                }
            }
        )
    );

    // createMessage tests
    const messageSuite = testController.createTestItem('messages', 'Message Creation');
    rootSuite.children.add(messageSuite);

    // Streaming enabled tests
    const streamingSuite = testController.createTestItem('streaming-enabled', 'With Streaming Enabled');
    messageSuite.children.add(streamingSuite);

    streamingSuite.children.add(
        TestUtils.createTest(
            testController,
            'streaming-response',
            'should handle streaming response correctly',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Save original modules
                const originalOpenAI = OpenAI;
                const originalConvertToOpenAiMessages = convertToOpenAiMessages;
                const originalConvertToR1Format = convertToR1Format;
                
                // Mock modules
                let mockCreate = async () => ({
                    [Symbol.asyncIterator]: async function* () {
                        yield {
                            choices: [{ delta: { content: "Hello" } }],
                        };
                        yield {
                            choices: [{ delta: { content: " world" } }],
                            usage: {
                                prompt_tokens: 10,
                                completion_tokens: 5,
                            },
                        };
                    },
                });
                
                (global as any).OpenAI = function() {
                    return {
                        chat: {
                            completions: {
                                create: mockCreate
                            }
                        }
                    };
                };
                
                (global as any).convertToOpenAiMessages = (messages: any) => messages;
                (global as any).convertToR1Format = (messages: any) => messages;
                
                try {
                    // Create handler
                    const handler = new RequestyHandler(defaultOptions);
                    
                    // Test streaming response
                    const systemPrompt = "You are a helpful assistant";
                    const messages: Anthropic.Messages.MessageParam[] = [{ role: "user", content: "Hello" }];
                    
                    const stream = handler.createMessage(systemPrompt, messages);
                    const results = [];
                    
                    for await (const chunk of stream) {
                        results.push(chunk);
                    }
                    
                    assert.strictEqual(results.length, 3);
                    assert.deepStrictEqual(results[0], { type: "text", text: "Hello" });
                    assert.deepStrictEqual(results[1], { type: "text", text: " world" });
                    assert.deepStrictEqual(results[2], {
                        type: "usage",
                        inputTokens: 10,
                        outputTokens: 5,
                        cacheWriteTokens: undefined,
                        cacheReadTokens: undefined,
                    });
                } finally {
                    // Restore original modules
                    (global as any).OpenAI = originalOpenAI;
                    (global as any).convertToOpenAiMessages = originalConvertToOpenAiMessages;
                    (global as any).convertToR1Format = originalConvertToR1Format;
                }
            }
        )
    );

    streamingSuite.children.add(
        TestUtils.createTest(
            testController,
            'no-max-tokens',
            'should not include max_tokens when includeMaxTokens is false',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Save original modules
                const originalOpenAI = OpenAI;
                
                // Mock modules
                let createOptions: any;
                let mockCreate = async (options: any) => {
                    createOptions = options;
                    return {
                        [Symbol.asyncIterator]: async function* () {
                            yield { choices: [{ delta: { content: "Test" } }] };
                        },
                    };
                };
                
                (global as any).OpenAI = function() {
                    return {
                        chat: {
                            completions: {
                                create: mockCreate
                            }
                        }
                    };
                };
                
                try {
                    // Create handler with includeMaxTokens: false
                    const handler = new RequestyHandler({
                        ...defaultOptions,
                        includeMaxTokens: false,
                    });
                    
                    // Test streaming response
                    const systemPrompt = "You are a helpful assistant";
                    const messages: Anthropic.Messages.MessageParam[] = [{ role: "user", content: "Hello" }];
                    
                    await handler.createMessage(systemPrompt, messages).next();
                    
                    assert.strictEqual(createOptions.max_tokens, undefined);
                } finally {
                    // Restore original modules
                    (global as any).OpenAI = originalOpenAI;
                }
            }
        )
    );

    streamingSuite.children.add(
        TestUtils.createTest(
            testController,
            'deepseek-reasoner',
            'should handle deepseek-reasoner model format',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Save original modules
                const originalOpenAI = OpenAI;
                const originalConvertToR1Format = convertToR1Format;
                
                // Mock modules
                let mockCreate = async () => ({
                    [Symbol.asyncIterator]: async function* () {
                        yield { choices: [{ delta: { content: "Test" } }] };
                    },
                });
                
                let convertToR1FormatCalled = false;
                let convertToR1FormatArgs: any;
                
                (global as any).OpenAI = function() {
                    return {
                        chat: {
                            completions: {
                                create: mockCreate
                            }
                        }
                    };
                };
                
                (global as any).convertToR1Format = (messages: any) => {
                    convertToR1FormatCalled = true;
                    convertToR1FormatArgs = messages;
                    return messages;
                };
                
                try {
                    // Create handler with deepseek-reasoner model
                    const handler = new RequestyHandler({
                        ...defaultOptions,
                        requestyModelId: "deepseek-reasoner",
                    });
                    
                    // Test streaming response
                    const systemPrompt = "You are a helpful assistant";
                    const messages: Anthropic.Messages.MessageParam[] = [{ role: "user", content: "Hello" }];
                    
                    await handler.createMessage(systemPrompt, messages).next();
                    
                    assert.strictEqual(convertToR1FormatCalled, true);
                    assert.deepStrictEqual(convertToR1FormatArgs, [
                        { role: "user", content: systemPrompt },
                        ...messages
                    ]);
                } finally {
                    // Restore original modules
                    (global as any).OpenAI = originalOpenAI;
                    (global as any).convertToR1Format = originalConvertToR1Format;
                }
            }
        )
    );

    // Streaming disabled tests
    const nonStreamingSuite = testController.createTestItem('streaming-disabled', 'With Streaming Disabled');
    messageSuite.children.add(nonStreamingSuite);

    nonStreamingSuite.children.add(
        TestUtils.createTest(
            testController,
            'non-streaming-response',
            'should handle non-streaming response correctly',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Save original modules
                const originalOpenAI = OpenAI;
                
                // Mock modules
                let createOptions: any;
                let mockCreate = async (options: any) => {
                    createOptions = options;
                    return {
                        choices: [{ message: { content: "Hello world" } }],
                        usage: {
                            prompt_tokens: 10,
                            completion_tokens: 5,
                        },
                    };
                };
                
                (global as any).OpenAI = function() {
                    return {
                        chat: {
                            completions: {
                                create: mockCreate
                            }
                        }
                    };
                };
                
                try {
                    // Create handler with streaming disabled
                    const handler = new RequestyHandler({
                        ...defaultOptions,
                        openAiStreamingEnabled: false,
                    });
                    
                    // Test non-streaming response
                    const systemPrompt = "You are a helpful assistant";
                    const messages: Anthropic.Messages.MessageParam[] = [{ role: "user", content: "Hello" }];
                    
                    const stream = handler.createMessage(systemPrompt, messages);
                    const results = [];
                    
                    for await (const chunk of stream) {
                        results.push(chunk);
                    }
                    
                    assert.strictEqual(results.length, 2);
                    assert.deepStrictEqual(results[0], { type: "text", text: "Hello world" });
                    assert.deepStrictEqual(results[1], {
                        type: "usage",
                        inputTokens: 10,
                        outputTokens: 5,
                    });
                    
                    assert.deepStrictEqual(createOptions.messages, [
                        { role: "user", content: systemPrompt },
                        { role: "user", content: "Hello" },
                    ]);
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
            'should return correct model information',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Save original OpenAI
                const originalOpenAI = OpenAI;
                
                // Mock OpenAI
                (global as any).OpenAI = function() {
                    return {
                        chat: {
                            completions: {
                                create: async () => ({})
                            }
                        }
                    };
                };
                
                try {
                    // Create handler
                    const handler = new RequestyHandler(defaultOptions);
                    
                    // Test getModel
                    const result = handler.getModel();
                    
                    assert.strictEqual(result.id, defaultOptions.requestyModelId);
                    assert.deepStrictEqual(result.info, defaultOptions.requestyModelInfo);
                } finally {
                    // Restore original OpenAI
                    (global as any).OpenAI = originalOpenAI;
                }
            }
        )
    );

    modelSuite.children.add(
        TestUtils.createTest(
            testController,
            'default-model-info',
            'should use sane defaults when no model info provided',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Save original OpenAI
                const originalOpenAI = OpenAI;
                
                // Mock OpenAI
                (global as any).OpenAI = function() {
                    return {
                        chat: {
                            completions: {
                                create: async () => ({})
                            }
                        }
                    };
                };
                
                try {
                    // Create handler without model info
                    const handler = new RequestyHandler({
                        ...defaultOptions,
                        requestyModelInfo: undefined,
                    });
                    
                    // Test getModel
                    const result = handler.getModel();
                    
                    assert.strictEqual(result.id, defaultOptions.requestyModelId);
                    assert.deepStrictEqual(result.info, requestyModelInfoSaneDefaults);
                } finally {
                    // Restore original OpenAI
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
                // Save original OpenAI
                const originalOpenAI = OpenAI;
                
                // Mock modules
                let createOptions: any;
                let mockCreate = async (options: any) => {
                    createOptions = options;
                    return {
                        choices: [{ message: { content: "Completed response" } }],
                    };
                };
                
                (global as any).OpenAI = function() {
                    return {
                        chat: {
                            completions: {
                                create: mockCreate
                            }
                        }
                    };
                };
                
                try {
                    // Create handler
                    const handler = new RequestyHandler(defaultOptions);
                    
                    // Test completePrompt
                    const result = await handler.completePrompt("Test prompt");
                    
                    assert.strictEqual(result, "Completed response");
                    assert.deepStrictEqual(createOptions.messages, [
                        { role: "user", content: "Test prompt" },
                    ]);
                } finally {
                    // Restore original OpenAI
                    (global as any).OpenAI = originalOpenAI;
                }
            }
        )
    );

    promptSuite.children.add(
        TestUtils.createTest(
            testController,
            'error-handling',
            'should handle errors correctly',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Save original OpenAI
                const originalOpenAI = OpenAI;
                
                // Mock modules
                const errorMessage = "API error";
                let mockCreate = async () => {
                    throw new Error(errorMessage);
                };
                
                (global as any).OpenAI = function() {
                    return {
                        chat: {
                            completions: {
                                create: mockCreate
                            }
                        }
                    };
                };
                
                try {
                    // Create handler
                    const handler = new RequestyHandler(defaultOptions);
                    
                    // Test error handling
                    try {
                        await handler.completePrompt("Test prompt");
                        assert.fail("Expected error was not thrown");
                    } catch (err) {
                        assert.ok(err instanceof Error);
                        assert.strictEqual((err as Error).message, `OpenAI completion error: ${errorMessage}`);
                    }
                } finally {
                    // Restore original OpenAI
                    (global as any).OpenAI = originalOpenAI;
                }
            }
        )
    );
}
