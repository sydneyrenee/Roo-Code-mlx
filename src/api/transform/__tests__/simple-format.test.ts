import * as vscode from 'vscode';
import * as assert from 'assert';
import { Anthropic } from "@anthropic-ai/sdk";
import { convertToSimpleContent, convertToSimpleMessages } from "../simple-format";
import { TestUtils } from '../../../test/testUtils';

export async function activateSimpleFormatTests(context: vscode.ExtensionContext): Promise<void> {
    // Create test controller
    const testController = TestUtils.createTestController('simpleFormatTests', 'Simple Format Tests');
    context.subscriptions.push(testController);

    // Root test suite
    const rootSuite = testController.createTestItem('simple-format', 'Simple Format');
    testController.items.add(rootSuite);

    // Test suites
    const contentSuite = testController.createTestItem('content', 'convertToSimpleContent');
    const messagesSuite = testController.createTestItem('messages', 'convertToSimpleMessages');
    
    rootSuite.children.add(contentSuite);
    rootSuite.children.add(messagesSuite);

    // convertToSimpleContent tests
    contentSuite.children.add(
        TestUtils.createTest(
            testController,
            'string-content',
            'returns string content as-is',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const content = "Hello world";
                assert.strictEqual(convertToSimpleContent(content), "Hello world");
            }
        )
    );

    contentSuite.children.add(
        TestUtils.createTest(
            testController,
            'text-blocks',
            'extracts text from text blocks',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const content = [
                    { type: "text", text: "Hello" },
                    { type: "text", text: "world" },
                ] as Anthropic.Messages.TextBlockParam[];
                assert.strictEqual(convertToSimpleContent(content), "Hello\nworld");
            }
        )
    );

    contentSuite.children.add(
        TestUtils.createTest(
            testController,
            'image-blocks',
            'converts image blocks to descriptive text',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const content = [
                    { type: "text", text: "Here's an image:" },
                    {
                        type: "image",
                        source: {
                            type: "base64",
                            media_type: "image/png",
                            data: "base64data",
                        },
                    },
                ] as Array<Anthropic.Messages.TextBlockParam | Anthropic.Messages.ImageBlockParam>;
                assert.strictEqual(convertToSimpleContent(content), "Here's an image:\n[Image: image/png]");
            }
        )
    );

    contentSuite.children.add(
        TestUtils.createTest(
            testController,
            'tool-use-blocks',
            'converts tool use blocks to descriptive text',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const content = [
                    { type: "text", text: "Using a tool:" },
                    {
                        type: "tool_use",
                        id: "tool-1",
                        name: "read_file",
                        input: { path: "test.txt" },
                    },
                ] as Array<Anthropic.Messages.TextBlockParam | Anthropic.Messages.ToolUseBlockParam>;
                assert.strictEqual(convertToSimpleContent(content), "Using a tool:\n[Tool Use: read_file]");
            }
        )
    );

    contentSuite.children.add(
        TestUtils.createTest(
            testController,
            'string-tool-result',
            'handles string tool result content',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const content = [
                    { type: "text", text: "Tool result:" },
                    {
                        type: "tool_result",
                        tool_use_id: "tool-1",
                        content: "Result text",
                    },
                ] as Array<Anthropic.Messages.TextBlockParam | Anthropic.Messages.ToolResultBlockParam>;
                assert.strictEqual(convertToSimpleContent(content), "Tool result:\nResult text");
            }
        )
    );

    contentSuite.children.add(
        TestUtils.createTest(
            testController,
            'array-tool-result',
            'handles array tool result content with text and images',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const content = [
                    {
                        type: "tool_result",
                        tool_use_id: "tool-1",
                        content: [
                            { type: "text", text: "Result 1" },
                            {
                                type: "image",
                                source: {
                                    type: "base64",
                                    media_type: "image/jpeg",
                                    data: "base64data",
                                },
                            },
                            { type: "text", text: "Result 2" },
                        ],
                    },
                ] as Anthropic.Messages.ToolResultBlockParam[];
                assert.strictEqual(convertToSimpleContent(content), "Result 1\n[Image: image/jpeg]\nResult 2");
            }
        )
    );

    contentSuite.children.add(
        TestUtils.createTest(
            testController,
            'filter-empty-strings',
            'filters out empty strings',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const content = [
                    { type: "text", text: "Hello" },
                    { type: "text", text: "" },
                    { type: "text", text: "world" },
                ] as Anthropic.Messages.TextBlockParam[];
                assert.strictEqual(convertToSimpleContent(content), "Hello\nworld");
            }
        )
    );

    // convertToSimpleMessages tests
    messagesSuite.children.add(
        TestUtils.createTest(
            testController,
            'string-content-messages',
            'converts messages with string content',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const messages = [
                    { role: "user", content: "Hello" },
                    { role: "assistant", content: "Hi there" },
                ] as Anthropic.Messages.MessageParam[];
                assert.deepStrictEqual(convertToSimpleMessages(messages), [
                    { role: "user", content: "Hello" },
                    { role: "assistant", content: "Hi there" },
                ]);
            }
        )
    );

    messagesSuite.children.add(
        TestUtils.createTest(
            testController,
            'complex-content-messages',
            'converts messages with complex content',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const messages = [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: "Look at this:" },
                            {
                                type: "image",
                                source: {
                                    type: "base64",
                                    media_type: "image/png",
                                    data: "base64data",
                                },
                            },
                        ],
                    },
                    {
                        role: "assistant",
                        content: [
                            { type: "text", text: "I see the image" },
                            {
                                type: "tool_use",
                                id: "tool-1",
                                name: "analyze_image",
                                input: { data: "base64data" },
                            },
                        ],
                    },
                ] as Anthropic.Messages.MessageParam[];
                assert.deepStrictEqual(convertToSimpleMessages(messages), [
                    { role: "user", content: "Look at this:\n[Image: image/png]" },
                    { role: "assistant", content: "I see the image\n[Tool Use: analyze_image]" },
                ]);
            }
        )
    );
}
