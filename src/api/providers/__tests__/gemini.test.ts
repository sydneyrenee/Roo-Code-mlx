import * as vscode from 'vscode'
import * as assert from 'assert'
import { GeminiHandler } from "../gemini"
import { Anthropic } from "@anthropic-ai/sdk"
import { GoogleGenerativeAI } from "@google/generative-ai"

export async function activateGeminiTests(context: vscode.ExtensionContext): Promise<void> {
    const testController = vscode.tests.createTestController('geminiTests', 'Gemini Tests')
    context.subscriptions.push(testController)

    const rootSuite = testController.createTestItem('gemini', 'Gemini')
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
        'initialize-with-config',
        'should initialize with provided config'
    ))

    // Message tests
    messageSuite.children.add(testController.createTestItem(
        'handle-text-messages',
        'should handle text messages correctly'
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

    // Model tests
    modelSuite.children.add(testController.createTestItem(
        'valid-model-info',
        'should return correct model info'
    ))
    modelSuite.children.add(testController.createTestItem(
        'invalid-model-info',
        'should return default model if invalid model specified'
    ))

    // Create run profile
    testController.createRunProfile('run', vscode.TestRunProfileKind.Run, async (request) => {
        const queue: vscode.TestItem[] = []
        if (request.include) {
            request.include.forEach(test => queue.push(test))
        }

        const run = testController.createTestRun(request)

        // Mock Gemini client implementation
        const mockClient = {
            getGenerativeModel: () => ({
                generateContentStream: async () => ({
                    stream: [
                        { text: () => "Hello" },
                        { text: () => " world!" }
                    ],
                    response: {
                        usageMetadata: {
                            promptTokenCount: 10,
                            candidatesTokenCount: 5,
                        },
                    },
                }),
                generateContent: async () => ({
                    response: {
                        text: () => "Test response",
                    },
                }),
            }),
        }

        // Test handler with mock options
        const mockOptions = {
            apiKey: "test-key",
            apiModelId: "gemini-2.0-flash-thinking-exp-1219",
            geminiApiKey: "test-key",
        }

        for (const test of queue) {
            run.started(test)
            try {
                switch (test.id) {
                    case 'initialize-with-config': {
                        const handler = new GeminiHandler(mockOptions)
                        assert.strictEqual(handler["options"].geminiApiKey, "test-key")
                        assert.strictEqual(handler["options"].apiModelId, "gemini-2.0-flash-thinking-exp-1219")
                        break
                    }

                    case 'handle-text-messages': {
                        const handler = new GeminiHandler(mockOptions)
                        ;(handler as any).client = mockClient

                        const mockMessages: Anthropic.Messages.MessageParam[] = [
                            { role: "user", content: "Hello" },
                            { role: "assistant", content: "Hi there!" },
                        ]
                        const systemPrompt = "You are a helpful assistant"

                        const stream = handler.createMessage(systemPrompt, mockMessages)
                        const chunks = []
                        for await (const chunk of stream) {
                            chunks.push(chunk)
                        }

                        assert.strictEqual(chunks.length, 3)
                        assert.deepStrictEqual(chunks[0], {
                            type: "text",
                            text: "Hello",
                        })
                        assert.deepStrictEqual(chunks[1], {
                            type: "text",
                            text: " world!",
                        })
                        assert.deepStrictEqual(chunks[2], {
                            type: "usage",
                            inputTokens: 10,
                            outputTokens: 5,
                        })
                        break
                    }

                    case 'handle-api-errors': {
                        const handler = new GeminiHandler(mockOptions)
                        const errorClient = {
                            getGenerativeModel: () => ({
                                generateContentStream: async () => {
                                    throw new Error("Gemini API error")
                                },
                            }),
                        }
                        ;(handler as any).client = errorClient

                        const mockMessages: Anthropic.Messages.MessageParam[] = [
                            { role: "user", content: "Hello" },
                        ]
                        const systemPrompt = "You are a helpful assistant"

                        const stream = handler.createMessage(systemPrompt, mockMessages)
                        await assert.rejects(async () => {
                            for await (const chunk of stream) {
                                // Should throw before yielding any chunks
                            }
                        }, /Gemini API error/)
                        break
                    }

                    case 'complete-prompt': {
                        const handler = new GeminiHandler(mockOptions)
                        ;(handler as any).client = mockClient

                        const result = await handler.completePrompt("Test prompt")
                        assert.strictEqual(result, "Test response")
                        break
                    }

                    case 'handle-prompt-errors': {
                        const handler = new GeminiHandler(mockOptions)
                        const errorClient = {
                            getGenerativeModel: () => ({
                                generateContent: async () => {
                                    throw new Error("Gemini API error")
                                },
                            }),
                        }
                        ;(handler as any).client = errorClient

                        await assert.rejects(
                            () => handler.completePrompt("Test prompt"),
                            /Gemini completion error: Gemini API error/
                        )
                        break
                    }

                    case 'handle-empty-response': {
                        const handler = new GeminiHandler(mockOptions)
                        const emptyClient = {
                            getGenerativeModel: () => ({
                                generateContent: async () => ({
                                    response: {
                                        text: () => "",
                                    },
                                }),
                            }),
                        }
                        ;(handler as any).client = emptyClient

                        const result = await handler.completePrompt("Test prompt")
                        assert.strictEqual(result, "")
                        break
                    }

                    case 'valid-model-info': {
                        const handler = new GeminiHandler(mockOptions)
                        const modelInfo = handler.getModel()
                        assert.strictEqual(modelInfo.id, "gemini-2.0-flash-thinking-exp-1219")
                        assert.ok(modelInfo.info)
                        assert.strictEqual(modelInfo.info.maxTokens, 8192)
                        assert.strictEqual(modelInfo.info.contextWindow, 32_767)
                        break
                    }

                    case 'invalid-model-info': {
                        const invalidHandler = new GeminiHandler({
                            apiModelId: "invalid-model",
                            geminiApiKey: "test-key",
                        })
                        const modelInfo = invalidHandler.getModel()
                        assert.strictEqual(modelInfo.id, "gemini-2.0-flash-001") // Default model
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
