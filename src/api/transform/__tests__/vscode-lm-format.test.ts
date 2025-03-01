import * as vscode from 'vscode';
import * as assert from 'assert';
import { Anthropic } from "@anthropic-ai/sdk";
import { convertToVsCodeLmMessages, convertToAnthropicRole, convertVSCodeToAnthropicMessage } from "../vscode-lm-format";
import { TestUtils } from '../../../test/testUtils';

// Define types for our mocked classes
interface MockLanguageModelTextPart {
    type: "text";
    value: string;
}

interface MockLanguageModelToolCallPart {
    type: "tool_call";
    callId: string;
    name: string;
    input: any;
}

interface MockLanguageModelToolResultPart {
    type: "tool_result";
    toolUseId: string;
    parts: MockLanguageModelTextPart[];
}

type MockMessageContent = MockLanguageModelTextPart | MockLanguageModelToolCallPart | MockLanguageModelToolResultPart;

interface MockLanguageModelChatMessage {
    role: string;
    name?: string;
    content: MockMessageContent[];
}

export async function activateVsCodeLmFormatTests(context: vscode.ExtensionContext): Promise<void> {
    // Create test controller
    const testController = TestUtils.createTestController('vsCodeLmFormatTests', 'VSCode LM Format Tests');
    context.subscriptions.push(testController);

    // Root test suite
    const rootSuite = testController.createTestItem('vscode-lm-format', 'VSCode LM Format');
    testController.items.add(rootSuite);

    // Test suites
    const toVsCodeSuite = testController.createTestItem('to-vscode', 'convertToVsCodeLmMessages');
    const toRoleSuite = testController.createTestItem('to-role', 'convertToAnthropicRole');
    const toAnthropicSuite = testController.createTestItem('to-anthropic', 'convertVSCodeToAnthropicMessage');
    
    rootSuite.children.add(toVsCodeSuite);
    rootSuite.children.add(toRoleSuite);
    rootSuite.children.add(toAnthropicSuite);

    // convertToVsCodeLmMessages tests
    toVsCodeSuite.children.add(
        TestUtils.createTest(
            testController,
            'simple-string',
            'should convert simple string messages',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Save original crypto
                const originalCrypto = global.crypto;
                
                // Mock crypto
                (global as any).crypto = {
                    randomUUID: () => "test-uuid"
                };
                
                // Setup mock vscode classes
                const originalLanguageModelTextPart = vscode.LanguageModelTextPart;
                const originalLanguageModelToolCallPart = (vscode as any).LanguageModelToolCallPart;
                const originalLanguageModelToolResultPart = (vscode as any).LanguageModelToolResultPart;
                const originalLanguageModelChatMessage = vscode.LanguageModelChatMessage;
                
                // Mock vscode classes
                class MockLanguageModelTextPart {
                    type = "text";
                    constructor(public value: string) {}
                }
                
                class MockLanguageModelToolCallPart {
                    type = "tool_call";
                    constructor(
                        public callId: string,
                        public name: string,
                        public input: any
                    ) {}
                }
                
                class MockLanguageModelToolResultPart {
                    type = "tool_result";
                    constructor(
                        public toolUseId: string,
                        public parts: MockLanguageModelTextPart[]
                    ) {}
                }
                
                const mockLanguageModelChatMessage = {
                    Assistant: (content: any) => ({
                        role: "assistant",
                        name: "assistant",
                        content: Array.isArray(content) ? content : [new MockLanguageModelTextPart(content)]
                    }),
                    User: (content: any) => ({
                        role: "user",
                        name: "user",
                        content: Array.isArray(content) ? content : [new MockLanguageModelTextPart(content)]
                    })
                };
                
                // Apply mocks
                (vscode as any).LanguageModelTextPart = MockLanguageModelTextPart;
                (vscode as any).LanguageModelToolCallPart = MockLanguageModelToolCallPart;
                (vscode as any).LanguageModelToolResultPart = MockLanguageModelToolResultPart;
                (vscode as any).LanguageModelChatMessage = mockLanguageModelChatMessage;
                
                try {
                    const messages: Anthropic.Messages.MessageParam[] = [
                        { role: "user", content: "Hello" },
                        { role: "assistant", content: "Hi there" }
                    ];
                    
                    const result = convertToVsCodeLmMessages(messages);
                    
                    assert.strictEqual(result.length, 2);
                    assert.strictEqual(result[0].role, "user");
                    assert.strictEqual((result[0].content[0] as MockLanguageModelTextPart).value, "Hello");
                    assert.strictEqual(result[1].role, "assistant");
                    assert.strictEqual((result[1].content[0] as MockLanguageModelTextPart).value, "Hi there");
                } finally {
                    // Restore original vscode classes
                    (vscode as any).LanguageModelTextPart = originalLanguageModelTextPart;
                    (vscode as any).LanguageModelToolCallPart = originalLanguageModelToolCallPart;
                    (vscode as any).LanguageModelToolResultPart = originalLanguageModelToolResultPart;
                    (vscode as any).LanguageModelChatMessage = originalLanguageModelChatMessage;
                    
                    // Restore original crypto
                    global.crypto = originalCrypto;
                }
            }
        )
    );

    toVsCodeSuite.children.add(
        TestUtils.createTest(
            testController,
            'tool-results',
            'should handle complex user messages with tool results',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Save original crypto
                const originalCrypto = global.crypto;
                
                // Mock crypto
                (global as any).crypto = {
                    randomUUID: () => "test-uuid"
                };
                
                // Setup mock vscode classes
                const originalLanguageModelTextPart = vscode.LanguageModelTextPart;
                const originalLanguageModelToolCallPart = (vscode as any).LanguageModelToolCallPart;
                const originalLanguageModelToolResultPart = (vscode as any).LanguageModelToolResultPart;
                const originalLanguageModelChatMessage = vscode.LanguageModelChatMessage;
                
                // Mock vscode classes
                class MockLanguageModelTextPart {
                    type = "text";
                    constructor(public value: string) {}
                }
                
                class MockLanguageModelToolCallPart {
                    type = "tool_call";
                    constructor(
                        public callId: string,
                        public name: string,
                        public input: any
                    ) {}
                }
                
                class MockLanguageModelToolResultPart {
                    type = "tool_result";
                    constructor(
                        public toolUseId: string,
                        public parts: MockLanguageModelTextPart[]
                    ) {}
                }
                
                const mockLanguageModelChatMessage = {
                    Assistant: (content: any) => ({
                        role: "assistant",
                        name: "assistant",
                        content: Array.isArray(content) ? content : [new MockLanguageModelTextPart(content)]
                    }),
                    User: (content: any) => ({
                        role: "user",
                        name: "user",
                        content: Array.isArray(content) ? content : [new MockLanguageModelTextPart(content)]
                    })
                };
                
                // Apply mocks
                (vscode as any).LanguageModelTextPart = MockLanguageModelTextPart;
                (vscode as any).LanguageModelToolCallPart = MockLanguageModelToolCallPart;
                (vscode as any).LanguageModelToolResultPart = MockLanguageModelToolResultPart;
                (vscode as any).LanguageModelChatMessage = mockLanguageModelChatMessage;
                
                try {
                    const messages: Anthropic.Messages.MessageParam[] = [
                        {
                            role: "user",
                            content: [
                                { type: "text", text: "Here is the result:" },
                                {
                                    type: "tool_result",
                                    tool_use_id: "tool-1",
                                    content: "Tool output",
                                },
                            ],
                        },
                    ];
                    
                    const result = convertToVsCodeLmMessages(messages);
                    
                    assert.strictEqual(result.length, 1);
                    assert.strictEqual(result[0].role, "user");
                    assert.strictEqual(result[0].content.length, 2);
                    
                    const [toolResult, textContent] = result[0].content as [
                        MockLanguageModelToolResultPart,
                        MockLanguageModelTextPart
                    ];
                    
                    assert.strictEqual(toolResult.type, "tool_result");
                    assert.strictEqual(textContent.type, "text");
                } finally {
                    // Restore original vscode classes
                    (vscode as any).LanguageModelTextPart = originalLanguageModelTextPart;
                    (vscode as any).LanguageModelToolCallPart = originalLanguageModelToolCallPart;
                    (vscode as any).LanguageModelToolResultPart = originalLanguageModelToolResultPart;
                    (vscode as any).LanguageModelChatMessage = originalLanguageModelChatMessage;
                    
                    // Restore original crypto
                    global.crypto = originalCrypto;
                }
            }
        )
    );

    toVsCodeSuite.children.add(
        TestUtils.createTest(
            testController,
            'tool-calls',
            'should handle complex assistant messages with tool calls',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Save original crypto
                const originalCrypto = global.crypto;
                
                // Mock crypto
                (global as any).crypto = {
                    randomUUID: () => "test-uuid"
                };
                
                // Setup mock vscode classes
                const originalLanguageModelTextPart = vscode.LanguageModelTextPart;
                const originalLanguageModelToolCallPart = (vscode as any).LanguageModelToolCallPart;
                const originalLanguageModelToolResultPart = (vscode as any).LanguageModelToolResultPart;
                const originalLanguageModelChatMessage = vscode.LanguageModelChatMessage;
                
                // Mock vscode classes
                class MockLanguageModelTextPart {
                    type = "text";
                    constructor(public value: string) {}
                }
                
                class MockLanguageModelToolCallPart {
                    type = "tool_call";
                    constructor(
                        public callId: string,
                        public name: string,
                        public input: any
                    ) {}
                }
                
                class MockLanguageModelToolResultPart {
                    type = "tool_result";
                    constructor(
                        public toolUseId: string,
                        public parts: MockLanguageModelTextPart[]
                    ) {}
                }
                
                const mockLanguageModelChatMessage = {
                    Assistant: (content: any) => ({
                        role: "assistant",
                        name: "assistant",
                        content: Array.isArray(content) ? content : [new MockLanguageModelTextPart(content)]
                    }),
                    User: (content: any) => ({
                        role: "user",
                        name: "user",
                        content: Array.isArray(content) ? content : [new MockLanguageModelTextPart(content)]
                    })
                };
                
                // Apply mocks
                (vscode as any).LanguageModelTextPart = MockLanguageModelTextPart;
                (vscode as any).LanguageModelToolCallPart = MockLanguageModelToolCallPart;
                (vscode as any).LanguageModelToolResultPart = MockLanguageModelToolResultPart;
                (vscode as any).LanguageModelChatMessage = mockLanguageModelChatMessage;
                
                try {
                    const messages: Anthropic.Messages.MessageParam[] = [
                        {
                            role: "assistant",
                            content: [
                                { type: "text", text: "Let me help you with that." },
                                {
                                    type: "tool_use",
                                    id: "tool-1",
                                    name: "calculator",
                                    input: { operation: "add", numbers: [2, 2] },
                                },
                            ],
                        },
                    ];
                    
                    const result = convertToVsCodeLmMessages(messages);
                    
                    assert.strictEqual(result.length, 1);
                    assert.strictEqual(result[0].role, "assistant");
                    assert.strictEqual(result[0].content.length, 2);
                    
                    const [toolCall, textContent] = result[0].content as [
                        MockLanguageModelToolCallPart,
                        MockLanguageModelTextPart
                    ];
                    
                    assert.strictEqual(toolCall.type, "tool_call");
                    assert.strictEqual(textContent.type, "text");
                } finally {
                    // Restore original vscode classes
                    (vscode as any).LanguageModelTextPart = originalLanguageModelTextPart;
                    (vscode as any).LanguageModelToolCallPart = originalLanguageModelToolCallPart;
                    (vscode as any).LanguageModelToolResultPart = originalLanguageModelToolResultPart;
                    (vscode as any).LanguageModelChatMessage = originalLanguageModelChatMessage;
                    
                    // Restore original crypto
                    global.crypto = originalCrypto;
                }
            }
        )
    );

    toVsCodeSuite.children.add(
        TestUtils.createTest(
            testController,
            'image-blocks',
            'should handle image blocks with appropriate placeholders',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Save original crypto
                const originalCrypto = global.crypto;
                
                // Mock crypto
                (global as any).crypto = {
                    randomUUID: () => "test-uuid"
                };
                
                // Setup mock vscode classes
                const originalLanguageModelTextPart = vscode.LanguageModelTextPart;
                const originalLanguageModelToolCallPart = (vscode as any).LanguageModelToolCallPart;
                const originalLanguageModelToolResultPart = (vscode as any).LanguageModelToolResultPart;
                const originalLanguageModelChatMessage = vscode.LanguageModelChatMessage;
                
                // Mock vscode classes
                class MockLanguageModelTextPart {
                    type = "text";
                    constructor(public value: string) {}
                }
                
                class MockLanguageModelToolCallPart {
                    type = "tool_call";
                    constructor(
                        public callId: string,
                        public name: string,
                        public input: any
                    ) {}
                }
                
                class MockLanguageModelToolResultPart {
                    type = "tool_result";
                    constructor(
                        public toolUseId: string,
                        public parts: MockLanguageModelTextPart[]
                    ) {}
                }
                
                const mockLanguageModelChatMessage = {
                    Assistant: (content: any) => ({
                        role: "assistant",
                        name: "assistant",
                        content: Array.isArray(content) ? content : [new MockLanguageModelTextPart(content)]
                    }),
                    User: (content: any) => ({
                        role: "user",
                        name: "user",
                        content: Array.isArray(content) ? content : [new MockLanguageModelTextPart(content)]
                    })
                };
                
                // Apply mocks
                (vscode as any).LanguageModelTextPart = MockLanguageModelTextPart;
                (vscode as any).LanguageModelToolCallPart = MockLanguageModelToolCallPart;
                (vscode as any).LanguageModelToolResultPart = MockLanguageModelToolResultPart;
                (vscode as any).LanguageModelChatMessage = mockLanguageModelChatMessage;
                
                try {
                    const messages: Anthropic.Messages.MessageParam[] = [
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
                    ];
                    
                    const result = convertToVsCodeLmMessages(messages);
                    
                    assert.strictEqual(result.length, 1);
                    const imagePlaceholder = result[0].content[1] as MockLanguageModelTextPart;
                    assert.ok(imagePlaceholder.value.includes("[Image (base64): image/png not supported by VSCode LM API]"));
                } finally {
                    // Restore original vscode classes
                    (vscode as any).LanguageModelTextPart = originalLanguageModelTextPart;
                    (vscode as any).LanguageModelToolCallPart = originalLanguageModelToolCallPart;
                    (vscode as any).LanguageModelToolResultPart = originalLanguageModelToolResultPart;
                    (vscode as any).LanguageModelChatMessage = originalLanguageModelChatMessage;
                    
                    // Restore original crypto
                    global.crypto = originalCrypto;
                }
            }
        )
    );

    // convertToAnthropicRole tests
    toRoleSuite.children.add(
        TestUtils.createTest(
            testController,
            'assistant-role',
            'should convert assistant role correctly',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const result = convertToAnthropicRole("assistant" as any);
                assert.strictEqual(result, "assistant");
            }
        )
    );

    toRoleSuite.children.add(
        TestUtils.createTest(
            testController,
            'user-role',
            'should convert user role correctly',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const result = convertToAnthropicRole("user" as any);
                assert.strictEqual(result, "user");
            }
        )
    );

    toRoleSuite.children.add(
        TestUtils.createTest(
            testController,
            'unknown-role',
            'should return null for unknown roles',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const result = convertToAnthropicRole("unknown" as any);
                assert.strictEqual(result, null);
            }
        )
    );

    // convertVSCodeToAnthropicMessage tests
    toAnthropicSuite.children.add(
        TestUtils.createTest(
            testController,
            'text-content',
            'should convert assistant message with text content',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Save original crypto
                const originalCrypto = global.crypto;
                
                // Mock crypto
                (global as any).crypto = {
                    randomUUID: () => "test-uuid"
                };
                
                // Setup mock vscode classes
                const originalLanguageModelTextPart = vscode.LanguageModelTextPart;
                
                // Mock vscode classes
                class MockLanguageModelTextPart {
                    type = "text";
                    constructor(public value: string) {}
                }
                
                // Apply mocks
                (vscode as any).LanguageModelTextPart = MockLanguageModelTextPart;
                
                try {
                    const vsCodeMessage = {
                        role: "assistant",
                        name: "assistant",
                        content: [new MockLanguageModelTextPart("Hello")],
                    };
                    
                    const result = await convertVSCodeToAnthropicMessage(vsCodeMessage as any);
                    
                    assert.strictEqual(result.role, "assistant");
                    assert.strictEqual(result.content.length, 1);
                    assert.deepStrictEqual(result.content[0], {
                        type: "text",
                        text: "Hello",
                    });
                    assert.strictEqual(result.id, "test-uuid");
                } finally {
                    // Restore original vscode classes
                    (vscode as any).LanguageModelTextPart = originalLanguageModelTextPart;
                    
                    // Restore original crypto
                    global.crypto = originalCrypto;
                }
            }
        )
    );

    toAnthropicSuite.children.add(
        TestUtils.createTest(
            testController,
            'tool-calls',
            'should convert assistant message with tool calls',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Save original crypto
                const originalCrypto = global.crypto;
                
                // Mock crypto
                (global as any).crypto = {
                    randomUUID: () => "test-uuid"
                };
                
                // Setup mock vscode classes
                const originalLanguageModelToolCallPart = (vscode as any).LanguageModelToolCallPart;
                
                // Mock vscode classes
                class MockLanguageModelToolCallPart {
                    type = "tool_call";
                    constructor(
                        public callId: string,
                        public name: string,
                        public input: any
                    ) {}
                }
                
                // Apply mocks
                (vscode as any).LanguageModelToolCallPart = MockLanguageModelToolCallPart;
                
                try {
                    const vsCodeMessage = {
                        role: "assistant",
                        name: "assistant",
                        content: [
                            new MockLanguageModelToolCallPart("call-1", "calculator", { operation: "add", numbers: [2, 2] }),
                        ],
                    };
                    
                    const result = await convertVSCodeToAnthropicMessage(vsCodeMessage as any);
                    
                    assert.strictEqual(result.content.length, 1);
                    assert.deepStrictEqual(result.content[0], {
                        type: "tool_use",
                        id: "call-1",
                        name: "calculator",
                        input: { operation: "add", numbers: [2, 2] },
                    });
                    assert.strictEqual(result.id, "test-uuid");
                } finally {
                    // Restore original vscode classes
                    (vscode as any).LanguageModelToolCallPart = originalLanguageModelToolCallPart;
                    
                    // Restore original crypto
                    global.crypto = originalCrypto;
                }
            }
        )
    );

    toAnthropicSuite.children.add(
        TestUtils.createTest(
            testController,
            'non-assistant',
            'should throw error for non-assistant messages',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Save original crypto
                const originalCrypto = global.crypto;
                
                // Mock crypto
                (global as any).crypto = {
                    randomUUID: () => "test-uuid"
                };
                
                // Setup mock vscode classes
                const originalLanguageModelTextPart = vscode.LanguageModelTextPart;
                
                // Mock vscode classes
                class MockLanguageModelTextPart {
                    type = "text";
                    constructor(public value: string) {}
                }
                
                // Apply mocks
                (vscode as any).LanguageModelTextPart = MockLanguageModelTextPart;
                
                try {
                    const vsCodeMessage = {
                        role: "user",
                        name: "user",
                        content: [new MockLanguageModelTextPart("Hello")],
                    };
                    
                    try {
                        await convertVSCodeToAnthropicMessage(vsCodeMessage as any);
                        assert.fail("Expected error to be thrown");
                    } catch (error) {
                        assert.ok(error instanceof Error);
                        assert.strictEqual((error as Error).message, "Roo Code <Language Model API>: Only assistant messages are supported.");
                    }
                } finally {
                    // Restore original vscode classes
                    (vscode as any).LanguageModelTextPart = originalLanguageModelTextPart;
                    
                    // Restore original crypto
                    global.crypto = originalCrypto;
                }
            }
        )
    );
}
