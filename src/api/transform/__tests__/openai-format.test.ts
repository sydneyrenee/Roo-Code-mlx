import * as vscode from 'vscode';
import * as assert from 'assert';
import { convertToOpenAiMessages, convertToAnthropicMessage } from "../openai-format";
import { Anthropic } from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { TestUtils } from '../../../test/testUtils';

type PartialChatCompletion = Omit<OpenAI.Chat.Completions.ChatCompletion, "choices"> & {
    choices: Array<
        Partial<OpenAI.Chat.Completions.ChatCompletion.Choice> & {
            message: OpenAI.Chat.Completions.ChatCompletion.Choice["message"]
            finish_reason: string
            index: number
        }
    >
};

export async function activateOpenAiFormatTests(context: vscode.ExtensionContext): Promise<void> {
    // Create test controller
    const testController = TestUtils.createTestController('openAiFormatTests', 'OpenAI Format Tests');
    context.subscriptions.push(testController);

    // Root test suite
    const rootSuite = testController.createTestItem('openai-format', 'OpenAI Format Transformations');
    testController.items.add(rootSuite);

    // Test suites
    const toOpenAiSuite = testController.createTestItem('to-openai', 'convertToOpenAiMessages');
    const toAnthropicSuite = testController.createTestItem('to-anthropic', 'convertToAnthropicMessage');
    
    rootSuite.children.add(toOpenAiSuite);
    rootSuite.children.add(toAnthropicSuite);

    // convertToOpenAiMessages tests
    toOpenAiSuite.children.add(
        TestUtils.createTest(
            testController,
            'simple-text',
            'should convert simple text messages',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const anthropicMessages: Anthropic.Messages.MessageParam[] = [
                    {
                        role: "user",
                        content: "Hello",
                    },
                    {
                        role: "assistant",
                        content: "Hi there!",
                    },
                ];

                const openAiMessages = convertToOpenAiMessages(anthropicMessages);
                assert.strictEqual(openAiMessages.length, 2);
                assert.deepStrictEqual(openAiMessages[0], {
                    role: "user",
                    content: "Hello",
                });
                assert.deepStrictEqual(openAiMessages[1], {
                    role: "assistant",
                    content: "Hi there!",
                });
            }
        )
    );

    toOpenAiSuite.children.add(
        TestUtils.createTest(
            testController,
            'image-content',
            'should handle messages with image content',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const anthropicMessages: Anthropic.Messages.MessageParam[] = [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: "What is in this image?",
                            },
                            {
                                type: "image",
                                source: {
                                    type: "base64",
                                    media_type: "image/jpeg",
                                    data: "base64data",
                                },
                            },
                        ],
                    },
                ];

                const openAiMessages = convertToOpenAiMessages(anthropicMessages);
                assert.strictEqual(openAiMessages.length, 1);
                assert.strictEqual(openAiMessages[0].role, "user");

                const content = openAiMessages[0].content as Array<{
                    type: string;
                    text?: string;
                    image_url?: { url: string };
                }>;

                assert.strictEqual(Array.isArray(content), true);
                assert.strictEqual(content.length, 2);
                assert.deepStrictEqual(content[0], { type: "text", text: "What is in this image?" });
                assert.deepStrictEqual(content[1], {
                    type: "image_url",
                    image_url: { url: "data:image/jpeg;base64,base64data" },
                });
            }
        )
    );

    toOpenAiSuite.children.add(
        TestUtils.createTest(
            testController,
            'tool-use',
            'should handle assistant messages with tool use',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const anthropicMessages: Anthropic.Messages.MessageParam[] = [
                    {
                        role: "assistant",
                        content: [
                            {
                                type: "text",
                                text: "Let me check the weather.",
                            },
                            {
                                type: "tool_use",
                                id: "weather-123",
                                name: "get_weather",
                                input: { city: "London" },
                            },
                        ],
                    },
                ];

                const openAiMessages = convertToOpenAiMessages(anthropicMessages);
                assert.strictEqual(openAiMessages.length, 1);

                const assistantMessage = openAiMessages[0] as OpenAI.Chat.ChatCompletionAssistantMessageParam;
                assert.strictEqual(assistantMessage.role, "assistant");
                assert.strictEqual(assistantMessage.content, "Let me check the weather.");
                assert.strictEqual(assistantMessage.tool_calls?.length, 1);
                assert.deepStrictEqual(assistantMessage.tool_calls![0], {
                    id: "weather-123",
                    type: "function",
                    function: {
                        name: "get_weather",
                        arguments: JSON.stringify({ city: "London" }),
                    },
                });
            }
        )
    );

    toOpenAiSuite.children.add(
        TestUtils.createTest(
            testController,
            'tool-results',
            'should handle user messages with tool results',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const anthropicMessages: Anthropic.Messages.MessageParam[] = [
                    {
                        role: "user",
                        content: [
                            {
                                type: "tool_result",
                                tool_use_id: "weather-123",
                                content: "Current temperature in London: 20°C",
                            },
                        ],
                    },
                ];

                const openAiMessages = convertToOpenAiMessages(anthropicMessages);
                assert.strictEqual(openAiMessages.length, 1);

                const toolMessage = openAiMessages[0] as OpenAI.Chat.ChatCompletionToolMessageParam;
                assert.strictEqual(toolMessage.role, "tool");
                assert.strictEqual(toolMessage.tool_call_id, "weather-123");
                assert.strictEqual(toolMessage.content, "Current temperature in London: 20°C");
            }
        )
    );

    // convertToAnthropicMessage tests
    toAnthropicSuite.children.add(
        TestUtils.createTest(
            testController,
            'simple-completion',
            'should convert simple completion',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const openAiCompletion: PartialChatCompletion = {
                    id: "completion-123",
                    model: "gpt-4",
                    choices: [
                        {
                            message: {
                                role: "assistant",
                                content: "Hello there!",
                                refusal: null,
                            },
                            finish_reason: "stop",
                            index: 0,
                        },
                    ],
                    usage: {
                        prompt_tokens: 10,
                        completion_tokens: 5,
                        total_tokens: 15,
                    },
                    created: 123456789,
                    object: "chat.completion",
                };

                const anthropicMessage = convertToAnthropicMessage(
                    openAiCompletion as OpenAI.Chat.Completions.ChatCompletion
                );
                assert.strictEqual(anthropicMessage.id, "completion-123");
                assert.strictEqual(anthropicMessage.role, "assistant");
                assert.strictEqual(anthropicMessage.content.length, 1);
                assert.deepStrictEqual(anthropicMessage.content[0], {
                    type: "text",
                    text: "Hello there!",
                });
                assert.strictEqual(anthropicMessage.stop_reason, "end_turn");
                assert.deepStrictEqual(anthropicMessage.usage, {
                    input_tokens: 10,
                    output_tokens: 5,
                });
            }
        )
    );

    toAnthropicSuite.children.add(
        TestUtils.createTest(
            testController,
            'tool-calls',
            'should handle tool calls in completion',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const openAiCompletion: PartialChatCompletion = {
                    id: "completion-123",
                    model: "gpt-4",
                    choices: [
                        {
                            message: {
                                role: "assistant",
                                content: "Let me check the weather.",
                                tool_calls: [
                                    {
                                        id: "weather-123",
                                        type: "function",
                                        function: {
                                            name: "get_weather",
                                            arguments: '{"city":"London"}',
                                        },
                                    },
                                ],
                                refusal: null,
                            },
                            finish_reason: "tool_calls",
                            index: 0,
                        },
                    ],
                    usage: {
                        prompt_tokens: 15,
                        completion_tokens: 8,
                        total_tokens: 23,
                    },
                    created: 123456789,
                    object: "chat.completion",
                };

                const anthropicMessage = convertToAnthropicMessage(
                    openAiCompletion as OpenAI.Chat.Completions.ChatCompletion
                );
                assert.strictEqual(anthropicMessage.content.length, 2);
                assert.deepStrictEqual(anthropicMessage.content[0], {
                    type: "text",
                    text: "Let me check the weather.",
                });
                assert.deepStrictEqual(anthropicMessage.content[1], {
                    type: "tool_use",
                    id: "weather-123",
                    name: "get_weather",
                    input: { city: "London" },
                });
                assert.strictEqual(anthropicMessage.stop_reason, "tool_use");
            }
        )
    );

    toAnthropicSuite.children.add(
        TestUtils.createTest(
            testController,
            'invalid-tool-args',
            'should handle invalid tool call arguments',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const openAiCompletion: PartialChatCompletion = {
                    id: "completion-123",
                    model: "gpt-4",
                    choices: [
                        {
                            message: {
                                role: "assistant",
                                content: "Testing invalid arguments",
                                tool_calls: [
                                    {
                                        id: "test-123",
                                        type: "function",
                                        function: {
                                            name: "test_function",
                                            arguments: "invalid json",
                                        },
                                    },
                                ],
                                refusal: null,
                            },
                            finish_reason: "tool_calls",
                            index: 0,
                        },
                    ],
                    created: 123456789,
                    object: "chat.completion",
                };

                const anthropicMessage = convertToAnthropicMessage(
                    openAiCompletion as OpenAI.Chat.Completions.ChatCompletion
                );
                assert.strictEqual(anthropicMessage.content.length, 2);
                assert.deepStrictEqual(anthropicMessage.content[1], {
                    type: "tool_use",
                    id: "test-123",
                    name: "test_function",
                    input: {}, // Should default to empty object for invalid JSON
                });
            }
        )
    );
}