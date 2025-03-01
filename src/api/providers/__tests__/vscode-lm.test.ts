import * as vscode from 'vscode';
import * as assert from 'assert';
import { VsCodeLmHandler } from '../vscode-lm';

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
            yield new vscode.LanguageModelTextPart("Test response");
            return;
        })()
    }),
    countTokens: async () => ({ input: 10, output: 5 })
};

export async function activateVsCodeLmTests(context: vscode.ExtensionContext) {
    const testController = vscode.tests.createTestController('vsCodeLmTests', 'VSCode LM Tests');
    context.subscriptions.push(testController);

    const rootSuite = testController.createTestItem('vscode-lm', 'VSCode LM');
    testController.items.add(rootSuite);

    // Test suites
    const handlerSuite = testController.createTestItem('handler', 'Handler');
    rootSuite.children.add(handlerSuite);

    // Test cases
    handlerSuite.children.add(testController.createTestItem('should-initialize-handler', 'should initialize handler'));
    handlerSuite.children.add(testController.createTestItem('should-stream-response', 'should stream response'));
    handlerSuite.children.add(testController.createTestItem('should-get-model-info', 'should get model info'));

    testController.createRunProfile('Run Tests', vscode.TestRunProfileKind.Run, async (request) => {
        const queue: vscode.TestItem[] = [];
        const run = testController.createTestRun(request);

        // Add requested tests
        if (request.include) {
            request.include.forEach(test => queue.push(test));
        } else {
            rootSuite.children.forEach(test => queue.push(test));
        }

        // Run tests
        for (const test of queue) {
            run.started(test);

            try {
                switch (test.id) {
                    case 'should-initialize-handler': {
                        const handler = new VsCodeLmHandler({
                            vsCodeLmModelSelector: {
                                vendor: "test-vendor",
                                family: "test-family"
                            }
                        });
                        assert.ok(handler, "Handler should be defined");
                        break;
                    }

                    case 'should-stream-response': {
                        const handler = new VsCodeLmHandler({
                            vsCodeLmModelSelector: {
                                vendor: "test-vendor",
                                family: "test-family"
                            }
                        });
                        // Mock client property
                        handler["client"] = mockLanguageModelChat;
                        
                        const chunks = [];
                        for await (const chunk of handler["createMessage"]("Test system prompt", [
                            { role: "user", content: "Test prompt" }
                        ])) {
                            chunks.push(chunk);
                        }

                        assert.strictEqual(chunks.length, 2, "Should have text and usage chunks");
                        assert.deepStrictEqual(chunks[0], {
                            type: "text",
                            text: "Test response"
                        });
                        break;
                    }

                    case 'should-get-model-info': {
                        const handler = new VsCodeLmHandler({
                            vsCodeLmModelSelector: {
                                vendor: "test-vendor",
                                family: "test-family"
                            }
                        });
                        // Mock client property
                        handler["client"] = mockLanguageModelChat;
                        
                        const model = handler.getModel();
                        assert.strictEqual(model.id, "test-model");
                        assert.ok(model.info, "Model info should be defined");
                        assert.strictEqual(model.info.contextWindow, 4096);
                        break;
                    }
                }
                run.passed(test);
            } catch (err) {
                run.failed(test, new vscode.TestMessage(err instanceof Error ? err.message : String(err)));
            }
        }

        run.end();
    });
}
