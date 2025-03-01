import * as vscode from 'vscode';
import * as assert from 'assert';
import { VertexHandler } from "../../../../api/providers/vertex";
import { ApiHandlerOptions, ModelInfo } from "../../../../shared/api";
import { createTestController } from '../../testController';
import { TestUtils } from '../../../testUtils';

interface MockMessage {
    type: string;
    message?: {
        usage: {
            input_tokens: number;
            output_tokens: number;
            cache_creation_input_tokens?: number;
            cache_read_input_tokens?: number;
        };
    };
    index?: number;
    content_block?: {
        type: string;
        text: string;
    };
}

interface MockClient {
    messages: {
        create: (args: any) => Promise<{
            [Symbol.asyncIterator](): AsyncGenerator<MockMessage, void, unknown>;
        }>;
    };
}

// Timer mock class
class TimerMock {
    private currentTime: number = 0;
    private timers: { callback: Function; delay: number; nextRun: number }[] = [];

    advanceTimersByTime(ms: number): void {
        this.currentTime += ms;
        this.timers = this.timers.filter(timer => {
            if (timer.nextRun <= this.currentTime) {
                timer.callback();
                return false;
            }
            return true;
        });
    }

    setTimeout(callback: Function, delay: number): void {
        this.timers.push({
            callback,
            delay,
            nextRun: this.currentTime + delay
        });
    }

    clearAllTimers(): void {
        this.timers = [];
        this.currentTime = 0;
    }
}

const controller = createTestController('vertexHandlerCacheTests', 'Vertex Handler Cache Tests');

// Root test item for Vertex Handler Cache
const vertexHandlerCacheTests = controller.createTestItem('vertexHandlerCache', 'Vertex Handler Cache', vscode.Uri.file(__filename));
controller.items.add(vertexHandlerCacheTests);

// Timer mock and original setTimeout
const timerMock = new TimerMock();
const originalSetTimeout = global.setTimeout;

// Cache Control tests
const cacheTests = controller.createTestItem('cache', 'Cache Control', vscode.Uri.file(__filename));
vertexHandlerCacheTests.children.add(cacheTests);

// Test for adding cache control to context block
cacheTests.children.add(
    TestUtils.createTest(
        controller,
        'control',
        'should add cache control to context block',
        vscode.Uri.file(__filename),
        async run => {
            try {
                // Setup for test
                const mockClient: MockClient = {
                    messages: {
                        create: async () => ({
                            async *[Symbol.asyncIterator]() {
                                yield { type: "empty" };
                            }
                        })
                    }
                };

                const mockModel: ModelInfo = {
                    maxTokens: 8192,
                    contextWindow: 200_000,
                    supportsImages: true,
                    supportsPromptCache: true,
                    inputPrice: 3.0,
                    outputPrice: 15.0,
                    cacheWritesPrice: 3.75,
                    cacheReadsPrice: 0.30
                };

                const options: ApiHandlerOptions = {
                    vertexProjectId: "test-project",
                    vertexRegion: "us-east5",
                    vertexContext: "Test context for caching",
                    apiModelId: "claude-3-5-sonnet@20240620",
                    modelTemperature: 0
                };

                const handler = new VertexHandler(options);
                (handler as any).client = mockClient;
                (handler as any).getModel = () => ({
                    id: "claude-3-5-sonnet@20240620",
                    info: mockModel
                });

                global.setTimeout = timerMock.setTimeout.bind(timerMock) as any;

                let createCallArgs: any;
                mockClient.messages.create = async function(args: any) {
                    createCallArgs = args;
                    return {
                        async *[Symbol.asyncIterator]() {
                            yield {
                                type: "message_start",
                                message: {
                                    usage: {
                                        input_tokens: 100,
                                        output_tokens: 50,
                                        cache_creation_input_tokens: 80,
                                        cache_read_input_tokens: 0
                                    }
                                }
                            };
                            yield {
                                type: "content_block_start",
                                index: 0,
                                content_block: {
                                    type: "text",
                                    text: "Response"
                                }
                            };
                        }
                    };
                };

                const stream = handler.createMessage("System prompt", [
                    { role: "user", content: "Test message" }
                ]);

                for await (const _ of stream) { /* consume stream */ }

                assert.ok(createCallArgs.system.length === 2, "Should have two system blocks");
                assert.strictEqual(createCallArgs.system[0].text, "System prompt");
                assert.strictEqual(createCallArgs.system[1].text, "Test context for caching");
                assert.deepStrictEqual(createCallArgs.system[1].cache_control, { type: "ephemeral" });
                assert.strictEqual(createCallArgs.max_tokens, 8192);
                assert.strictEqual(createCallArgs.temperature, 0);
            } finally {
                global.setTimeout = originalSetTimeout;
            }
        }
    )
);

// Test for tracking cache write usage
cacheTests.children.add(
    TestUtils.createTest(
        controller,
        'tracking',
        'should track cache write usage',
        vscode.Uri.file(__filename),
        async run => {
            try {
                // Setup for test
                const mockClient: MockClient = {
                    messages: {
                        create: async () => ({
                            async *[Symbol.asyncIterator]() {
                                yield { type: "empty" };
                            }
                        })
                    }
                };

                const mockModel: ModelInfo = {
                    maxTokens: 8192,
                    contextWindow: 200_000,
                    supportsImages: true,
                    supportsPromptCache: true,
                    inputPrice: 3.0,
                    outputPrice: 15.0,
                    cacheWritesPrice: 3.75,
                    cacheReadsPrice: 0.30
                };

                const options: ApiHandlerOptions = {
                    vertexProjectId: "test-project",
                    vertexRegion: "us-east5",
                    vertexContext: "Test context for caching",
                    apiModelId: "claude-3-5-sonnet@20240620",
                    modelTemperature: 0
                };

                const handler = new VertexHandler(options);
                (handler as any).client = mockClient;
                (handler as any).getModel = () => ({
                    id: "claude-3-5-sonnet@20240620",
                    info: mockModel
                });

                global.setTimeout = timerMock.setTimeout.bind(timerMock) as any;

                mockClient.messages.create = async function() {
                    return {
                        async *[Symbol.asyncIterator]() {
                            yield {
                                type: "message_start",
                                message: {
                                    usage: {
                                        input_tokens: 100,
                                        output_tokens: 50,
                                        cache_creation_input_tokens: 80,
                                        cache_read_input_tokens: 0
                                    }
                                }
                            };
                        }
                    };
                };

                const stream = handler.createMessage("System prompt", [
                    { role: "user", content: "Test message" }
                ]);

                const results = [];
                for await (const chunk of stream) {
                    results.push(chunk);
                }

                assert.deepStrictEqual(results[0], {
                    type: "usage",
                    inputTokens: 100,
                    outputTokens: 50
                });
            } finally {
                global.setTimeout = originalSetTimeout;
            }
        }
    )
);

// Test for starting cache refresh when context is provided
cacheTests.children.add(
    TestUtils.createTest(
        controller,
        'refresh',
        'should start cache refresh when context is provided',
        vscode.Uri.file(__filename),
        async run => {
            try {
                // Setup for test
                const mockClient: MockClient = {
                    messages: {
                        create: async () => ({
                            async *[Symbol.asyncIterator]() {
                                yield { type: "empty" };
                            }
                        })
                    }
                };

                const mockModel: ModelInfo = {
                    maxTokens: 8192,
                    contextWindow: 200_000,
                    supportsImages: true,
                    supportsPromptCache: true,
                    inputPrice: 3.0,
                    outputPrice: 15.0,
                    cacheWritesPrice: 3.75,
                    cacheReadsPrice: 0.30
                };

                const options: ApiHandlerOptions = {
                    vertexProjectId: "test-project",
                    vertexRegion: "us-east5",
                    vertexContext: "Test context for caching",
                    apiModelId: "claude-3-5-sonnet@20240620",
                    modelTemperature: 0
                };

                const handler = new VertexHandler(options);
                (handler as any).client = mockClient;
                (handler as any).getModel = () => ({
                    id: "claude-3-5-sonnet@20240620",
                    info: mockModel
                });

                global.setTimeout = timerMock.setTimeout.bind(timerMock) as any;

                let createCallCount = 0;
                let lastCallArgs: any;
                mockClient.messages.create = async function(args: any) {
                    createCallCount++;
                    lastCallArgs = args;
                    return {
                        async *[Symbol.asyncIterator]() {
                            yield {
                                type: "message_start",
                                message: {
                                    usage: {
                                        input_tokens: 100,
                                        output_tokens: 50
                                    }
                                }
                            };
                        }
                    };
                };

                const stream = handler.createMessage("System prompt", [
                    { role: "user", content: "Test message" }
                ]);

                for await (const _ of stream) { /* consume stream */ }

                timerMock.advanceTimersByTime(4 * 60 * 1000);

                assert.strictEqual(createCallCount, 2, "Should have made refresh request");
                assert.deepStrictEqual(lastCallArgs.messages, [{ role: "user", content: "Continue" }]);
            } finally {
                global.setTimeout = originalSetTimeout;
            }
        }
    )
);

// Error Handling tests
const errorTests = controller.createTestItem('error', 'Error Handling', vscode.Uri.file(__filename));
vertexHandlerCacheTests.children.add(errorTests);

// Test for handling API errors gracefully
errorTests.children.add(
    TestUtils.createTest(
        controller,
        'api',
        'should handle API errors gracefully',
        vscode.Uri.file(__filename),
        async run => {
            try {
                // Setup for test
                const mockClient: MockClient = {
                    messages: {
                        create: async () => ({
                            async *[Symbol.asyncIterator]() {
                                yield { type: "empty" };
                            }
                        })
                    }
                };

                const mockModel: ModelInfo = {
                    maxTokens: 8192,
                    contextWindow: 200_000,
                    supportsImages: true,
                    supportsPromptCache: true,
                    inputPrice: 3.0,
                    outputPrice: 15.0,
                    cacheWritesPrice: 3.75,
                    cacheReadsPrice: 0.30
                };

                const options: ApiHandlerOptions = {
                    vertexProjectId: "test-project",
                    vertexRegion: "us-east5",
                    vertexContext: "Test context for caching",
                    apiModelId: "claude-3-5-sonnet@20240620",
                    modelTemperature: 0
                };

                const handler = new VertexHandler(options);
                (handler as any).client = mockClient;
                (handler as any).getModel = () => ({
                    id: "claude-3-5-sonnet@20240620",
                    info: mockModel
                });

                global.setTimeout = timerMock.setTimeout.bind(timerMock) as any;

                mockClient.messages.create = async function() {
                    throw new Error("API Error");
                };

                const stream = handler.createMessage("System prompt", [
                    { role: "user", content: "Test message" }
                ]);

                await assert.rejects(async () => {
                    for await (const _ of stream) { /* consume stream */ }
                }, /Vertex completion error: API Error/);
            } finally {
                global.setTimeout = originalSetTimeout;
            }
        }
    )
);

// Test for handling stream errors
errorTests.children.add(
    TestUtils.createTest(
        controller,
        'stream',
        'should handle stream errors',
        vscode.Uri.file(__filename),
        async run => {
            try {
                // Setup for test
                const mockClient: MockClient = {
                    messages: {
                        create: async () => ({
                            async *[Symbol.asyncIterator]() {
                                yield { type: "empty" };
                            }
                        })
                    }
                };

                const mockModel: ModelInfo = {
                    maxTokens: 8192,
                    contextWindow: 200_000,
                    supportsImages: true,
                    supportsPromptCache: true,
                    inputPrice: 3.0,
                    outputPrice: 15.0,
                    cacheWritesPrice: 3.75,
                    cacheReadsPrice: 0.30
                };

                const options: ApiHandlerOptions = {
                    vertexProjectId: "test-project",
                    vertexRegion: "us-east5",
                    vertexContext: "Test context for caching",
                    apiModelId: "claude-3-5-sonnet@20240620",
                    modelTemperature: 0
                };

                const handler = new VertexHandler(options);
                (handler as any).client = mockClient;
                (handler as any).getModel = () => ({
                    id: "claude-3-5-sonnet@20240620",
                    info: mockModel
                });

                global.setTimeout = timerMock.setTimeout.bind(timerMock) as any;

                mockClient.messages.create = async function() {
                    return {
                        async *[Symbol.asyncIterator]() {
                            throw new Error("Stream Error");
                        }
                    };
                };

                const stream = handler.createMessage("System prompt", [
                    { role: "user", content: "Test message" }
                ]);

                await assert.rejects(async () => {
                    for await (const _ of stream) { /* consume stream */ }
                }, /Vertex completion error: Stream Error/);
            } finally {
                global.setTimeout = originalSetTimeout;
            }
        }
    )
);

export function activate() {
    return controller;
}