import * as vscode from 'vscode';
import * as assert from 'assert';
import { convertToR1Format } from "../r1-format";
import { Anthropic } from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { TestUtils } from '../../../test/testUtils';

export async function activateR1FormatTests(context: vscode.ExtensionContext): Promise<void> {
    // Create test controller
    const testController = TestUtils.createTestController('r1FormatTests', 'R1 Format Tests');
    context.subscriptions.push(testController);

    // Root test suite
    const rootSuite = testController.createTestItem('r1-format', 'convertToR1Format');
    testController.items.add(rootSuite);

    // Test cases
    rootSuite.children.add(
        TestUtils.createTest(
            testController,
            'basic-text',
            'should convert basic text messages',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const input: Anthropic.Messages.MessageParam[] = [
                    { role: "user", content: "Hello" },
                    { role: "assistant", content: "Hi there" },
                ];

                const expected: OpenAI.Chat.ChatCompletionMessageParam[] = [
                    { role: "user", content: "Hello" },
                    { role: "assistant", content: "Hi there" },
                ];

                assert.deepStrictEqual(convertToR1Format(input), expected);
            }
        )
    );

    rootSuite.children.add(
        TestUtils.createTest(
            testController,
            'merge-consecutive',
            'should merge consecutive messages with same role',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const input: Anthropic.Messages.MessageParam[] = [
                    { role: "user", content: "Hello" },
                    { role: "user", content: "How are you?" },
                    { role: "assistant", content: "Hi!" },
                    { role: "assistant", content: "I'm doing well" },
                ];

                const expected: OpenAI.Chat.ChatCompletionMessageParam[] = [
                    { role: "user", content: "Hello\nHow are you?" },
                    { role: "assistant", content: "Hi!\nI'm doing well" },
                ];

                assert.deepStrictEqual(convertToR1Format(input), expected);
            }
        )
    );

    rootSuite.children.add(
        TestUtils.createTest(
            testController,
            'image-content',
            'should handle image content',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const input: Anthropic.Messages.MessageParam[] = [
                    {
                        role: "user",
                        content: [
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

                const expected: OpenAI.Chat.ChatCompletionMessageParam[] = [
                    {
                        role: "user",
                        content: [
                            {
                                type: "image_url",
                                image_url: {
                                    url: "data:image/jpeg;base64,base64data",
                                },
                            },
                        ],
                    },
                ];

                assert.deepStrictEqual(convertToR1Format(input), expected);
            }
        )
    );

    rootSuite.children.add(
        TestUtils.createTest(
            testController,
            'mixed-content',
            'should handle mixed text and image content',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const input: Anthropic.Messages.MessageParam[] = [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: "Check this image:" },
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

                const expected: OpenAI.Chat.ChatCompletionMessageParam[] = [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: "Check this image:" },
                            {
                                type: "image_url",
                                image_url: {
                                    url: "data:image/jpeg;base64,base64data",
                                },
                            },
                        ],
                    },
                ];

                assert.deepStrictEqual(convertToR1Format(input), expected);
            }
        )
    );

    rootSuite.children.add(
        TestUtils.createTest(
            testController,
            'merge-mixed-content',
            'should merge mixed content messages with same role',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const input: Anthropic.Messages.MessageParam[] = [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: "First image:" },
                            {
                                type: "image",
                                source: {
                                    type: "base64",
                                    media_type: "image/jpeg",
                                    data: "image1",
                                },
                            },
                        ],
                    },
                    {
                        role: "user",
                        content: [
                            { type: "text", text: "Second image:" },
                            {
                                type: "image",
                                source: {
                                    type: "base64",
                                    media_type: "image/png",
                                    data: "image2",
                                },
                            },
                        ],
                    },
                ];

                const expected: OpenAI.Chat.ChatCompletionMessageParam[] = [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: "First image:" },
                            {
                                type: "image_url",
                                image_url: {
                                    url: "data:image/jpeg;base64,image1",
                                },
                            },
                            { type: "text", text: "Second image:" },
                            {
                                type: "image_url",
                                image_url: {
                                    url: "data:image/png;base64,image2",
                                },
                            },
                        ],
                    },
                ];

                assert.deepStrictEqual(convertToR1Format(input), expected);
            }
        )
    );

    rootSuite.children.add(
        TestUtils.createTest(
            testController,
            'empty-messages',
            'should handle empty messages array',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                assert.deepStrictEqual(convertToR1Format([]), []);
            }
        )
    );

    rootSuite.children.add(
        TestUtils.createTest(
            testController,
            'empty-content',
            'should handle messages with empty content',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const input: Anthropic.Messages.MessageParam[] = [
                    { role: "user", content: "" },
                    { role: "assistant", content: "" },
                ];

                const expected: OpenAI.Chat.ChatCompletionMessageParam[] = [
                    { role: "user", content: "" },
                    { role: "assistant", content: "" },
                ];

                assert.deepStrictEqual(convertToR1Format(input), expected);
            }
        )
    );
}
