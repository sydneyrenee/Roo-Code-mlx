import * as vscode from 'vscode';
import * as assert from 'assert';
import { VsCodeLmHandler } from '../vscode-lm';
import { TestUtils } from '../../../test/testUtils';

// Mock vscode namespace
const mockLanguageModelChat = {
    id: "test-model",
    name: "Test Model",
    vendor: "test-vendor",
    family: "test-family",
    version: "1.0",
    maxInputTokens: 4096,
    sendRequest: async () => ({
        response: { content: "Test response" },
        stream: (async function* () {
            yield { type: "text", value: "Test response" };
            return;
        })()
    }),
    countTokens: async () => ({ input: 10, output: 5 })
};

export async function activateVsCodeLmTests(context: vscode.ExtensionContext): Promise<void> {
    // Create test controller
    const testController = TestUtils.createTestController('vsCodeLmTests', 'VSCode LM Tests');
    context.subscriptions.push(testController);

    // Root test suite
    const rootSuite = testController.createTestItem('vscode-lm', 'VSCode LM');
    testController.items.add(rootSuite);

    // Test suites
    const handlerSuite = testController.createTestItem('handler', 'Handler');
    rootSuite.children.add(handlerSuite);

    // Test cases
    handlerSuite.children.add(
        TestUtils.createTest(
            testController,
            'should-initialize-handler',
            'should initialize handler',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const handler = new VsCodeLmHandler({
                    vsCodeLmModelSelector: {
                        vendor: "test-vendor",
                        family: "test-family"
                    }
                });
                assert.ok(handler, "Handler should be defined");
            }
        )
    );

    handlerSuite.children.add(
        TestUtils.createTest(
            testController,
            'should-stream-response',
            'should stream response',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const handler = new VsCodeLmHandler({
                    vsCodeLmModelSelector: {
                        vendor: "test-vendor",
                        family: "test-family"
                    }
                });
                // Mock client property
                (handler as any)["client"] = mockLanguageModelChat;
                
                const chunks = [];
                for await (const chunk of (handler as any)["createMessage"]("Test system prompt", [
                    { role: "user", content: "Test prompt" }
                ])) {
                    chunks.push(chunk);
                }

                assert.strictEqual(chunks.length, 2, "Should have text and usage chunks");
                assert.deepStrictEqual(chunks[0], {
                    type: "text",
                    text: "Test response"
                });
            }
        )
    );

    handlerSuite.children.add(
        TestUtils.createTest(
            testController,
            'should-get-model-info',
            'should get model info',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const handler = new VsCodeLmHandler({
                    vsCodeLmModelSelector: {
                        vendor: "test-vendor",
                        family: "test-family"
                    }
                });
                // Mock client property
                (handler as any)["client"] = mockLanguageModelChat;
                
                const model = handler.getModel();
                assert.strictEqual(model.id, "test-model");
                assert.ok(model.info, "Model info should be defined");
                assert.strictEqual(model.info.contextWindow, 4096);
            }
        )
    );
}
