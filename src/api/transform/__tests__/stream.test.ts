import * as vscode from 'vscode';
import * as assert from 'assert';
import { ApiStreamChunk } from "../stream";
import { TestUtils } from '../../../test/testUtils';

export async function activateStreamTests(context: vscode.ExtensionContext): Promise<void> {
    // Create test controller
    const testController = TestUtils.createTestController('streamTests', 'API Stream Tests');
    context.subscriptions.push(testController);

    // Root test suite
    const rootSuite = testController.createTestItem('api-stream', 'API Stream Types');
    testController.items.add(rootSuite);

    // ApiStreamChunk test suite
    const chunkSuite = testController.createTestItem('api-stream-chunk', 'ApiStreamChunk');
    rootSuite.children.add(chunkSuite);

    // Test cases
    chunkSuite.children.add(
        TestUtils.createTest(
            testController,
            'text-chunks',
            'should correctly handle text chunks',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const textChunk: ApiStreamChunk = {
                    type: "text",
                    text: "Hello world",
                };

                assert.strictEqual(textChunk.type, "text");
                assert.strictEqual(textChunk.text, "Hello world");
            }
        )
    );

    chunkSuite.children.add(
        TestUtils.createTest(
            testController,
            'usage-with-cache',
            'should correctly handle usage chunks with cache information',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const usageChunk: ApiStreamChunk = {
                    type: "usage",
                    inputTokens: 100,
                    outputTokens: 50,
                    cacheWriteTokens: 20,
                    cacheReadTokens: 10,
                };

                assert.strictEqual(usageChunk.type, "usage");
                assert.strictEqual(usageChunk.inputTokens, 100);
                assert.strictEqual(usageChunk.outputTokens, 50);
                assert.strictEqual(usageChunk.cacheWriteTokens, 20);
                assert.strictEqual(usageChunk.cacheReadTokens, 10);
            }
        )
    );

    chunkSuite.children.add(
        TestUtils.createTest(
            testController,
            'usage-without-cache',
            'should handle usage chunks without cache tokens',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const usageChunk: ApiStreamChunk = {
                    type: "usage",
                    inputTokens: 100,
                    outputTokens: 50,
                };

                assert.strictEqual(usageChunk.type, "usage");
                assert.strictEqual(usageChunk.inputTokens, 100);
                assert.strictEqual(usageChunk.outputTokens, 50);
                assert.strictEqual(usageChunk.cacheWriteTokens, undefined);
                assert.strictEqual(usageChunk.cacheReadTokens, undefined);
            }
        )
    );

    chunkSuite.children.add(
        TestUtils.createTest(
            testController,
            'empty-text',
            'should handle text chunks with empty strings',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const emptyTextChunk: ApiStreamChunk = {
                    type: "text",
                    text: "",
                };

                assert.strictEqual(emptyTextChunk.type, "text");
                assert.strictEqual(emptyTextChunk.text, "");
            }
        )
    );

    chunkSuite.children.add(
        TestUtils.createTest(
            testController,
            'zero-tokens',
            'should handle usage chunks with zero tokens',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const zeroUsageChunk: ApiStreamChunk = {
                    type: "usage",
                    inputTokens: 0,
                    outputTokens: 0,
                };

                assert.strictEqual(zeroUsageChunk.type, "usage");
                assert.strictEqual(zeroUsageChunk.inputTokens, 0);
                assert.strictEqual(zeroUsageChunk.outputTokens, 0);
            }
        )
    );

    chunkSuite.children.add(
        TestUtils.createTest(
            testController,
            'large-tokens',
            'should handle usage chunks with large token counts',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const largeUsageChunk: ApiStreamChunk = {
                    type: "usage",
                    inputTokens: 1000000,
                    outputTokens: 500000,
                    cacheWriteTokens: 200000,
                    cacheReadTokens: 100000,
                };

                assert.strictEqual(largeUsageChunk.type, "usage");
                assert.strictEqual(largeUsageChunk.inputTokens, 1000000);
                assert.strictEqual(largeUsageChunk.outputTokens, 500000);
                assert.strictEqual(largeUsageChunk.cacheWriteTokens, 200000);
                assert.strictEqual(largeUsageChunk.cacheReadTokens, 100000);
            }
        )
    );

    chunkSuite.children.add(
        TestUtils.createTest(
            testController,
            'special-chars',
            'should handle text chunks with special characters',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const specialCharsChunk: ApiStreamChunk = {
                    type: "text",
                    text: "!@#$%^&*()_+-=[]{}|;:,.<>?`~",
                };

                assert.strictEqual(specialCharsChunk.type, "text");
                assert.strictEqual(specialCharsChunk.text, "!@#$%^&*()_+-=[]{}|;:,.<>?`~");
            }
        )
    );

    chunkSuite.children.add(
        TestUtils.createTest(
            testController,
            'unicode-chars',
            'should handle text chunks with unicode characters',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const unicodeChunk: ApiStreamChunk = {
                    type: "text",
                    text: "你好世界👋🌍",
                };

                assert.strictEqual(unicodeChunk.type, "text");
                assert.strictEqual(unicodeChunk.text, "你好世界👋🌍");
            }
        )
    );

    chunkSuite.children.add(
        TestUtils.createTest(
            testController,
            'multiline-content',
            'should handle text chunks with multiline content',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const multilineChunk: ApiStreamChunk = {
                    type: "text",
                    text: "Line 1\nLine 2\nLine 3",
                };

                assert.strictEqual(multilineChunk.type, "text");
                assert.strictEqual(multilineChunk.text, "Line 1\nLine 2\nLine 3");
                assert.strictEqual(multilineChunk.text.split("\n").length, 3);
            }
        )
    );
}
