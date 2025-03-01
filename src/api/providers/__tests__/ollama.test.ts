import * as vscode from 'vscode';
import * as assert from 'assert';
import { OllamaHandler } from "../ollama";
import { ApiHandlerOptions } from "../../../shared/api";
import OpenAI from "openai";
import { Anthropic } from "@anthropic-ai/sdk";

export async function activateOllamaTests(context: vscode.ExtensionContext): Promise<void> {
    // Create test controller
    const testController = vscode.tests.createTestController('ollamaTests', 'Ollama Tests');
    context.subscriptions.push(testController);

    // Root test suite
    const rootSuite = testController.createTestItem('ollama-handler', 'OllamaHandler');
    testController.items.add(rootSuite);

    // Test suites
    const constructorSuite = testController.createTestItem('constructor', 'constructor');
    const createMessageSuite = testController.createTestItem('create-message', 'createMessage');
    const completePromptSuite = testController.createTestItem('complete-prompt', 'completePrompt');
    const getModelSuite = testController.createTestItem('get-model', 'getModel');

    rootSuite.children.add(constructorSuite);
    rootSuite.children.add(createMessageSuite);
    rootSuite.children.add(completePromptSuite);
    rootSuite.children.add(getModelSuite);

    // Constructor tests
    constructorSuite.children.add(testController.createTestItem(
        'initialize-with-options',
        'should initialize with provided options'
    ));
    constructorSuite.children.add(testController.createTestItem(
        'use-default-base-url',
        'should use default base URL if not provided'
    ));

    // createMessage tests
    createMessageSuite.children.add(testController.createTestItem(
        'handle-streaming-responses',
        'should handle streaming responses'
    ));
    createMessageSuite.children.add(testController.createTestItem(
        'handle-api-errors',
        'should handle API errors'
    ));

    // completePrompt tests
    completePromptSuite.children.add(testController.createTestItem(
        'complete-prompt-successfully',
        'should complete prompt successfully'
    ));
    completePromptSuite.children.add(testController.createTestItem(
        'handle-api-errors-in-complete',
        'should handle API errors'
    ));
    completePromptSuite.children.add(testController.createTestItem(
        'handle-empty-response',
        'should handle empty response'
    ));

    // getModel tests
    getModelSuite.children.add(testController.createTestItem(
        'return-model-info',
        'should return model info'
    ));

    // Create run profile
    testController.createRunProfile('Run Tests', vscode.TestRunProfileKind.Run, async (request) => {
        const queue: vscode.TestItem[] = [];
        const run = testController.createTestRun(request);

        // Add requested tests
        if (request.include) {
            request.include.forEach(test => queue.push(test));
        } else {
            rootSuite.children.forEach(test => queue.push(test));
        }

        // Setup mock
        const originalOpenAI = OpenAI;
        let mockCreate: any = {
            mock: { calls: [] },
            mockClear: function() { this.mock.calls = []; },
            mockImplementation: function(impl: any) { 
                this.implementation = impl; 
                return this; 
            },
            mockResolvedValueOnce: function(value: any) {
                this.resolvedValues = this.resolvedValues || [];
                this.resolvedValues.push(value);
                return this;
            },
            mockRejectedValueOnce: function(error: any) {
                this.rejectedValues = this.rejectedValues || [];
                this.rejectedValues.push(error);
                return this;
            }
        };
        
        mockCreate = mockCreate.mockImplementation(async (options: any) => {
            if (mockCreate.rejectedValues && mockCreate.rejectedValues.length > 0) {
                const error = mockCreate.rejectedValues.shift();
                throw error;
            }
            
            if (mockCreate.resolvedValues && mockCreate.resolvedValues.length > 0) {
                return mockCreate.resolvedValues.shift();
            }
            
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
                };
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
                    };
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
                    };
                },
            };
        });
        
        // Mock OpenAI client
        (global as any).OpenAI = function() {
            return {
                chat: {
                    completions: {
                        create: mockCreate
                    },
                },
            };
        };

        // Run tests
        for (const test of queue) {
            run.started(test);

            try {
                // Setup for each test
                let handler: OllamaHandler;
                let mockOptions: ApiHandlerOptions;

                mockOptions = {
                    apiModelId: "llama2",
                    ollamaModelId: "llama2",
                    ollamaBaseUrl: "http://localhost:11434/v1",
                };
                handler = new OllamaHandler(mockOptions);
                mockCreate.mockClear();

                switch (test.id) {
                    // Constructor tests
                    case 'initialize-with-options': {
                        assert.ok(handler instanceof OllamaHandler);
                        assert.strictEqual(handler.getModel().id, mockOptions.ollamaModelId);
                        break;
                    }
                    case 'use-default-base-url': {
                        const handlerWithoutUrl = new OllamaHandler({
                            apiModelId: "llama2",
                            ollamaModelId: "llama2",
                        });
                        assert.ok(handlerWithoutUrl instanceof OllamaHandler);
                        break;
                    }

                    // createMessage tests
                    case 'handle-streaming-responses': {
                        const systemPrompt = "You are a helpful assistant.";
                        const messages: Anthropic.Messages.MessageParam[] = [
                            {
                                role: "user",
                                content: "Hello!",
                            },
                        ];

                        const stream = handler.createMessage(systemPrompt, messages);
                        const chunks: any[] = [];
                        for await (const chunk of stream) {
                            chunks.push(chunk);
                        }

                        assert.ok(chunks.length > 0);
                        const textChunks = chunks.filter((chunk) => chunk.type === "text");
                        assert.strictEqual(textChunks.length, 1);
                        assert.strictEqual(textChunks[0].text, "Test response");
                        break;
                    }
                    case 'handle-api-errors': {
                        const systemPrompt = "You are a helpful assistant.";
                        const messages: Anthropic.Messages.MessageParam[] = [
                            {
                                role: "user",
                                content: "Hello!",
                            },
                        ];

                        mockCreate.mockRejectedValueOnce(new Error("API Error"));
                        const stream = handler.createMessage(systemPrompt, messages);

                        try {
                            for await (const chunk of stream) {
                                // Should not reach here
                            }
                            assert.fail("Expected error was not thrown");
                        } catch (err) {
                            assert.ok(err instanceof Error);
                            assert.strictEqual((err as Error).message, "API Error");
                        }
                        break;
                    }

                    // completePrompt tests
                    case 'complete-prompt-successfully': {
                        const result = await handler.completePrompt("Test prompt");
                        assert.strictEqual(result, "Test response");
                        assert.ok(mockCreate.mock.calls.length > 0);
                        break;
                    }
                    case 'handle-api-errors-in-complete': {
                        mockCreate.mockRejectedValueOnce(new Error("API Error"));
                        try {
                            await handler.completePrompt("Test prompt");
                            assert.fail("Expected error was not thrown");
                        } catch (err) {
                            assert.ok(err instanceof Error);
                            assert.strictEqual((err as Error).message, "Ollama completion error: API Error");
                        }
                        break;
                    }
                    case 'handle-empty-response': {
                        mockCreate.mockResolvedValueOnce({
                            choices: [{ message: { content: "" } }],
                        });
                        const result = await handler.completePrompt("Test prompt");
                        assert.strictEqual(result, "");
                        break;
                    }

                    // getModel tests
                    case 'return-model-info': {
                        const modelInfo = handler.getModel();
                        assert.strictEqual(modelInfo.id, mockOptions.ollamaModelId);
                        assert.ok(modelInfo.info);
                        assert.strictEqual(modelInfo.info.maxTokens, -1);
                        assert.strictEqual(modelInfo.info.contextWindow, 128_000);
                        break;
                    }
                }
                run.passed(test);
            } catch (err) {
                run.failed(test, new vscode.TestMessage(err instanceof Error ? err.message : String(err)));
            } finally {
                // Restore original OpenAI
                (global as any).OpenAI = originalOpenAI;
            }
        }

        run.end();
    });
}
