import * as vscode from 'vscode'
import * as assert from 'assert'
import { convertToBedrockConverseMessages, convertToAnthropicMessage } from "../bedrock-converse-format"
import { Anthropic } from "@anthropic-ai/sdk"
import { ContentBlock, ToolResultContentBlock } from "@aws-sdk/client-bedrock-runtime"
import { StreamEvent } from "../../providers/bedrock"

export async function activateBedrockConverseFormatTests(context: vscode.ExtensionContext): Promise<void> {
    const testController = vscode.tests.createTestController('bedrockConverseFormatTests', 'Bedrock Converse Format Tests')
    context.subscriptions.push(testController)

    const rootSuite = testController.createTestItem('bedrock-converse-format', 'Bedrock Converse Format')
    testController.items.add(rootSuite)

    // Create test suites
    const converterSuite = testController.createTestItem('converter', 'convertToBedrockConverseMessages')
    rootSuite.children.add(converterSuite)

    const anthropicSuite = testController.createTestItem('anthropic', 'convertToAnthropicMessage')
    rootSuite.children.add(anthropicSuite)

    // Add test cases
    converterSuite.children.add(testController.createTestItem(
        'simple-text',
        'converts simple text messages correctly'
    ))

    converterSuite.children.add(testController.createTestItem(
        'images',
        'converts messages with images correctly'
    ))

    converterSuite.children.add(testController.createTestItem(
        'tool-use',
        'converts tool use messages correctly'
    ))

    converterSuite.children.add(testController.createTestItem(
        'tool-result',
        'converts tool result messages correctly'
    ))

    converterSuite.children.add(testController.createTestItem(
        'text-content',
        'handles text content correctly'
    ))

    anthropicSuite.children.add(testController.createTestItem(
        'metadata', 
        'converts metadata events correctly'
    ))

    anthropicSuite.children.add(testController.createTestItem(
        'content-block-start',
        'converts content block start events correctly'
    ))
    
    anthropicSuite.children.add(testController.createTestItem(
        'content-block-delta',
        'converts content block delta events correctly'
    ))

    anthropicSuite.children.add(testController.createTestItem(
        'message-stop',
        'converts message stop events correctly'
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
                switch (test.id) {
                    case 'simple-text': {
                        const messages: Anthropic.Messages.MessageParam[] = [
                            { role: "user", content: "Hello" },
                            { role: "assistant", content: "Hi there" },
                        ]

                        const result = convertToBedrockConverseMessages(messages)

                        assert.deepStrictEqual(result, [
                            {
                                role: "user",
                                content: [{ text: "Hello" }],
                                usage: {
                                    input_tokens: 0,
                                    output_tokens: 0,
                                    cache_creation_input_tokens: null,
                                    cache_read_input_tokens: null
                                }
                            },
                            {
                                role: "assistant",
                                content: [{ text: "Hi there" }],
                                usage: {
                                    input_tokens: 0,
                                    output_tokens: 0,
                                    cache_creation_input_tokens: null,
                                    cache_read_input_tokens: null
                                }
                            },
                        ])
                        break
                    }
                    case 'images': {
                        const messages: Anthropic.Messages.MessageParam[] = [
                            {
                                role: "user",
                                content: [
                                    {
                                        type: "text",
                                        text: "Look at this image:",
                                    },
                                    {
                                        type: "image",
                                        source: {
                                            type: "base64",
                                            data: "SGVsbG8=", // "Hello" in base64
                                            media_type: "image/jpeg" as const,
                                        },
                                    },
                                ],
                            },
                        ]

                        const result = convertToBedrockConverseMessages(messages)

                        assert.ok(result[0] && result[0].content, "Expected result to have content")
                        assert.strictEqual(result[0].role, "user")
                        assert.strictEqual(result[0].content.length, 2)
                        assert.deepStrictEqual(result[0].content[0], { text: "Look at this image:" })

                        const imageBlock = result[0].content[1] as ContentBlock
                        if ("image" in imageBlock && imageBlock.image && imageBlock.image.source) {
                            assert.strictEqual(imageBlock.image.format, "jpeg")
                            assert.ok(imageBlock.image.source, "Image source should be defined")
                            assert.ok(imageBlock.image.source.bytes, "Image bytes should be defined")
                        } else {
                            assert.fail("Expected image block not found")
                        }
                        break
                    }
                    case 'tool-use': {
                        const messages: Anthropic.Messages.MessageParam[] = [
                            {
                                role: "assistant",
                                content: [
                                    {
                                        type: "tool_use",
                                        id: "test-id",
                                        name: "read_file",
                                        input: {
                                            path: "test.txt",
                                        },
                                    },
                                ],
                            },
                        ]

                        const result = convertToBedrockConverseMessages(messages)

                        assert.ok(result[0] && result[0].content, "Expected result to have content")
                        assert.strictEqual(result[0].role, "assistant")

                        const toolBlock = result[0].content[0] as ContentBlock
                        if ("toolUse" in toolBlock && toolBlock.toolUse) {
                            assert.deepStrictEqual(toolBlock.toolUse, {
                                toolUseId: "test-id",
                                name: "read_file",
                                input: "<read_file>\n<path>\ntest.txt\n</path>\n</read_file>",
                            })
                        } else {
                            assert.fail("Expected tool use block not found")
                        }
                        break
                    }
                    case 'tool-result': {
                        const messages: Anthropic.Messages.MessageParam[] = [
                            {
                                role: "assistant",
                                content: [
                                    {
                                        type: "tool_result",
                                        tool_use_id: "test-id",
                                        content: [{ type: "text", text: "File contents here" }],
                                    },
                                ],
                            },
                        ]

                        const result = convertToBedrockConverseMessages(messages)

                        assert.ok(result[0] && result[0].content, "Expected result to have content")
                        assert.strictEqual(result[0].role, "assistant")

                        const resultBlock = result[0].content[0] as ContentBlock
                        if ("toolResult" in resultBlock && resultBlock.toolResult) {
                            const expectedContent: ToolResultContentBlock[] = [{ text: "File contents here" }]
                            assert.deepStrictEqual(resultBlock.toolResult, {
                                toolUseId: "test-id",
                                content: expectedContent,
                                status: "success",
                            })
                        } else {
                            assert.fail("Expected tool result block not found")
                        }
                        break
                    }
                    case 'text-content': {
                        const messages: Anthropic.Messages.MessageParam[] = [
                            {
                                role: "user",
                                content: [
                                    {
                                        type: "text",
                                        text: "Hello world",
                                    },
                                ],
                            },
                        ]

                        const result = convertToBedrockConverseMessages(messages)

                        assert.ok(result[0] && result[0].content, "Expected result to have content")
                        assert.strictEqual(result[0].role, "user")
                        assert.strictEqual(result[0].content.length, 1)

                        const textBlock = result[0].content[0] as ContentBlock
                        assert.deepStrictEqual(textBlock, { text: "Hello world" })
                        break
                    }
                    case 'metadata': {
                        const event: StreamEvent = {
                            metadata: {
                                usage: {
                                    inputTokens: 10,
                                    outputTokens: 20,
                                },
                            },
                        }

                        const result = convertToAnthropicMessage(event, "test-model")

                        assert.deepStrictEqual(result, {
                            id: "",
                            type: "message",
                            role: "assistant",
                            model: "test-model",
                            content: [],
                            stop_reason: null,
                            stop_sequence: null,
                            usage: {
                                input_tokens: 10,
                                output_tokens: 20,
                                cache_creation_input_tokens: null,
                                cache_read_input_tokens: null
                            },
                        })
                        break
                    }
                    case 'content-block-start': {
                        const event: StreamEvent = {
                            contentBlockStart: {
                                start: {
                                    text: "Hello",
                                },
                            },
                        }

                        const result = convertToAnthropicMessage(event, "test-model")

                        assert.deepStrictEqual(result, {
                            type: "message",
                            role: "assistant",
                            model: "test-model",
                            content: [{ type: "text", text: "Hello", citations: null }],
                            id: "",
                            stop_reason: null,
                            stop_sequence: null,
                            usage: {
                                input_tokens: 0,
                                output_tokens: 0,
                                cache_creation_input_tokens: null,
                                cache_read_input_tokens: null
                            }
                        })
                        break
                    }
                    case 'content-block-delta': {
                        const event: StreamEvent = {
                            contentBlockDelta: {
                                delta: {
                                    text: " world",
                                },
                            },
                        }

                        const result = convertToAnthropicMessage(event, "test-model")

                        assert.deepStrictEqual(result, {
                            type: "message",
                            role: "assistant",
                            model: "test-model",
                            content: [{ type: "text", text: " world", citations: null }],
                            id: "",
                            stop_reason: null,
                            stop_sequence: null,
                            usage: {
                                input_tokens: 0,
                                output_tokens: 0,
                                cache_creation_input_tokens: null,
                                cache_read_input_tokens: null
                            }
                        })
                        break
                    }
                    case 'message-stop': {
                        const event: StreamEvent = {
                            messageStop: {
                                stopReason: "end_turn" as const,
                            },
                        }

                        const result = convertToAnthropicMessage(event, "test-model")

                        assert.deepStrictEqual(result, {
                            type: "message",
                            role: "assistant", 
                            model: "test-model",
                            content: [],
                            id: "",
                            stop_reason: "end_turn",
                            stop_sequence: null,
                            usage: {
                                input_tokens: 0,
                                output_tokens: 0,
                                cache_creation_input_tokens: null,
                                cache_read_input_tokens: null
                            }
                        })
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
