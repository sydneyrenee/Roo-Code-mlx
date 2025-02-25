import * as vscode from 'vscode';
import * as assert from 'assert';
import { convertToOpenAiMessages, convertToAnthropicMessage } from '../../../src/api/transform/openai-format';
import { Anthropic } from "@anthropic-ai/sdk";
import OpenAI from "openai";

type PartialChatCompletion = Omit<OpenAI.Chat.Completions.ChatCompletion, "choices"> & {
    choices: Array<
        Partial<OpenAI.Chat.Completions.ChatCompletion.Choice> & {
            message: OpenAI.Chat.Completions.ChatCompletion.Choice["message"]
            finish_reason: string
            index: number
        }
    >
}

suite('OpenAI Format Tests', () => {
    const testController = vscode.test.createTestController('openaiFormat', 'OpenAI Format Tests');
    const rootSuite = testController.createTestItem('root', 'OpenAI Format Transformations');
    
    const messageConversionSuite = testController.createTestItem('convertMessages', 'Message Conversion Tests');
    rootSuite.children.add(messageConversionSuite);

    messageConversionSuite.children.add(
        testController.createTestItem('simpleText', 'converts simple text messages', async run => {
            const anthropicMessages: Anthropic.Messages.MessageParam[] = [
                { role: "user", content: "Hello" },
                { role: "assistant", content: "Hi there!" }
            ];
            
            const openAiMessages = convertToOpenAiMessages(anthropicMessages);
            assert.strictEqual(openAiMessages.length, 2);
            assert.deepStrictEqual(openAiMessages[0], {
                role: "user",
                content: "Hello"
            });
            assert.deepStrictEqual(openAiMessages[1], {
                role: "assistant",
                content: "Hi there!"
            });
            run.passed();
        })
    );

    messageConversionSuite.children.add(
        testController.createTestItem('imageContent', 'handles messages with image content', async run => {
            const anthropicMessages: Anthropic.Messages.MessageParam[] = [{
                role: "user",
                content: [
                    { type: "text", text: "What is in this image?" },
                    {
                        type: "image",
                        source: {
                            type: "base64",
                            media_type: "image/jpeg",
                            data: "base64data"
                        }
                    }
                ]
            }];
            
            const openAiMessages = convertToOpenAiMessages(anthropicMessages);
            assert.strictEqual(openAiMessages.length, 1);
            assert.strictEqual(openAiMessages[0].role, "user");
            
            const content = openAiMessages[0].content as Array<{
                type: string
                text?: string
                image_url?: { url: string }
            }>;
            
            assert.ok(Array.isArray(content));
            assert.strictEqual(content.length, 2);
            assert.deepStrictEqual(content[0], { type: "text", text: "What is in this image?" });
            assert.deepStrictEqual(content[1], {
                type: "image_url",
                image_url: { url: "data:image/jpeg;base64,base64data" }
            });
            run.passed();
        })
    );

    // Add the tests to the controller
    testController.items.add(rootSuite);
});