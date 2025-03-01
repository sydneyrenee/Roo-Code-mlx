import * as vscode from 'vscode';
import * as assert from 'assert';
import { Anthropic } from "@anthropic-ai/sdk";
import { VertexHandler } from "../vertex";
import { ApiHandlerOptions } from "../../../shared/api";
import { TestUtils } from '../../../test/testUtils';

export async function activateVertexTests(context: vscode.ExtensionContext): Promise<void> {
    // Create test controller
    const testController = TestUtils.createTestController('vertexTests', 'Vertex Handler Tests');
    context.subscriptions.push(testController);

    // Root test suite
    const rootSuite = testController.createTestItem('vertex-handler', 'VertexHandler');
    testController.items.add(rootSuite);

    // createMessage tests
    const messageSuite = testController.createTestItem('messages', 'Message Creation');
    rootSuite.children.add(messageSuite);

    messageSuite.children.add(
        TestUtils.createTest(
            testController,
            'cache-control',
            'should add cache control to context block',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Save original timers
                const originalSetTimeout = global.setTimeout;
                const originalClearTimeout = global.clearTimeout;
                
                // Mock client
                const mockClient: any = {
                    messages: {
                        create: function(options: any) {
                            mockClient.messages.createCalls.push(options);
                            return {
                                [Symbol.asyncIterator]: async function* () {
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
                        },
                        createCalls: []
                    }
                };
                
                try {
                    // Create handler
                    const options: ApiHandlerOptions = {
                        vertexProjectId: "test-project",
                        vertexRegion: "us-east5",
                        vertexContext: "Test context"
                    };
                    
                    const handler = new VertexHandler(options);
                    (handler as any).client = mockClient;
                    
                    // Test createMessage
                    const messages: Anthropic.Messages.MessageParam[] = [
                        { role: "user" as const, content: "Test" }
                    ];
                    const stream = handler.createMessage("System prompt", messages);
                    
                    const results = [];
                    for await (const chunk of stream) {
                        results.push(chunk);
                    }
                    
                    // Verify system blocks format
                    assert.strictEqual(mockClient.messages.createCalls.length, 1);
                    const createCall = mockClient.messages.createCalls[0];
                    assert.deepStrictEqual(createCall.system[0], {
                        type: "text",
                        text: "System prompt"
                    });
                    assert.deepStrictEqual(createCall.system[1], {
                        type: "text",
                        text: "Test context",
                        cache_control: { type: "ephemeral" }
                    });
                    
                    // Verify usage tracking
                    assert.strictEqual(results.length, 1);
                    assert.deepStrictEqual(results[0], {
                        type: "usage",
                        inputTokens: 100,
                        outputTokens: 50
                    });
                    
                    // Clean up
                    handler.dispose();
                } finally {
                    // Restore timers
                    global.setTimeout = originalSetTimeout;
                    global.clearTimeout = originalClearTimeout;
                }
            }
        )
    );

    messageSuite.children.add(
        TestUtils.createTest(
            testController,
            'cache-hits',
            'should handle cache hits',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Save original timers
                const originalSetTimeout = global.setTimeout;
                const originalClearTimeout = global.clearTimeout;
                
                // Mock client
                const mockClient: any = {
                    messages: {
                        create: function() {
                            return {
                                [Symbol.asyncIterator]: async function* () {
                                    yield {
                                        type: "message_start",
                                        message: {
                                            usage: {
                                                input_tokens: 20,
                                                output_tokens: 50,
                                                cache_creation_input_tokens: 0,
                                                cache_read_input_tokens: 80
                                            }
                                        }
                                    };
                                }
                            };
                        }
                    }
                };
                
                try {
                    // Create handler
                    const options: ApiHandlerOptions = {
                        vertexProjectId: "test-project",
                        vertexRegion: "us-east5",
                        vertexContext: "Test context"
                    };
                    
                    const handler = new VertexHandler(options);
                    (handler as any).client = mockClient;
                    
                    // Test createMessage
                    const messages: Anthropic.Messages.MessageParam[] = [
                        { role: "user" as const, content: "Test" }
                    ];
                    const stream = handler.createMessage("System prompt", messages);
                    
                    const results = [];
                    for await (const chunk of stream) {
                        results.push(chunk);
                    }
                    
                    // Verify usage tracking with cache hit
                    assert.strictEqual(results.length, 1);
                    assert.deepStrictEqual(results[0], {
                        type: "usage",
                        inputTokens: 20,
                        outputTokens: 50
                    });
                    
                    // Clean up
                    handler.dispose();
                } finally {
                    // Restore timers
                    global.setTimeout = originalSetTimeout;
                    global.clearTimeout = originalClearTimeout;
                }
            }
        )
    );

    messageSuite.children.add(
        TestUtils.createTest(
            testController,
            'error-handling',
            'should handle errors gracefully',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Save original timers
                const originalSetTimeout = global.setTimeout;
                const originalClearTimeout = global.clearTimeout;
                
                // Mock client
                const mockClient: any = {
                    messages: {
                        create: function() {
                            throw new Error("API Error");
                        }
                    }
                };
                
                try {
                    // Create handler
                    const options: ApiHandlerOptions = {
                        vertexProjectId: "test-project",
                        vertexRegion: "us-east5",
                        vertexContext: "Test context"
                    };
                    
                    const handler = new VertexHandler(options);
                    (handler as any).client = mockClient;
                    
                    // Test createMessage
                    const messages: Anthropic.Messages.MessageParam[] = [
                        { role: "user" as const, content: "Test" }
                    ];
                    const stream = handler.createMessage("System prompt", messages);
                    
                    try {
                        for await (const _ of stream) {
                            // consume stream
                        }
                        assert.fail("Expected error to be thrown");
                    } catch (error) {
                        assert.ok(error instanceof Error);
                        assert.strictEqual((error as Error).message, "Vertex completion error: API Error");
                    }
                    
                    // Clean up
                    handler.dispose();
                } finally {
                    // Restore timers
                    global.setTimeout = originalSetTimeout;
                    global.clearTimeout = originalClearTimeout;
                }
            }
        )
    );

    messageSuite.children.add(
        TestUtils.createTest(
            testController,
            'cache-refresh',
            'should refresh cache before expiration',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Save original timers
                const originalSetTimeout = global.setTimeout;
                const originalClearTimeout = global.clearTimeout;
                
                // Setup timer mocking
                const timeouts: { id: any, callback: Function, ms: number }[] = [];
                let currentTime = 0;
                
                // Mock setTimeout and clearTimeout
                (global as any).setTimeout = function(callback: Function, ms: number) {
                    const id = timeouts.length;
                    timeouts.push({ id, callback, ms });
                    return id;
                };
                
                (global as any).clearTimeout = function(id: any) {
                    const index = timeouts.findIndex(t => t.id === id);
                    if (index !== -1) {
                        timeouts.splice(index, 1);
                    }
                };
                
                // Function to advance timers
                const advanceTimersByTime = (ms: number) => {
                    currentTime += ms;
                    const toExecute = timeouts.filter(t => t.ms <= currentTime);
                    for (const timeout of toExecute) {
                        timeout.callback();
                    }
                    // Remove executed timeouts
                    for (let i = timeouts.length - 1; i >= 0; i--) {
                        if (timeouts[i].ms <= currentTime) {
                            timeouts.splice(i, 1);
                        }
                    }
                };
                
                // Mock client
                const mockClient: any = {
                    messages: {
                        create: function(options: any) {
                            mockClient.messages.createCalls.push(options);
                            return {
                                [Symbol.asyncIterator]: async function* () {
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
                        },
                        createCalls: []
                    }
                };
                
                try {
                    // Create handler
                    const options: ApiHandlerOptions = {
                        vertexProjectId: "test-project",
                        vertexRegion: "us-east5",
                        vertexContext: "Test context"
                    };
                    
                    const handler = new VertexHandler(options);
                    (handler as any).client = mockClient;
                    
                    // Test createMessage
                    const messages: Anthropic.Messages.MessageParam[] = [
                        { role: "user" as const, content: "Test" }
                    ];
                    const stream = handler.createMessage("System prompt", messages);
                    
                    for await (const _ of stream) { /* consume stream */ }
                    
                    // Fast forward 4 minutes (just before cache expiration)
                    advanceTimersByTime(4 * 60 * 1000);
                    
                    // Verify refresh request was made
                    assert.strictEqual(mockClient.messages.createCalls.length, 2);
                    assert.deepStrictEqual(mockClient.messages.createCalls[1].messages, [
                        { role: "user", content: "Continue" }
                    ]);
                    
                    // Clean up
                    handler.dispose();
                } finally {
                    // Restore timers
                    global.setTimeout = originalSetTimeout;
                    global.clearTimeout = originalClearTimeout;
                }
            }
        )
    );

    messageSuite.children.add(
        TestUtils.createTest(
            testController,
            'stop-refresh-on-dispose',
            'should stop refreshing on dispose',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Save original timers
                const originalSetTimeout = global.setTimeout;
                const originalClearTimeout = global.clearTimeout;
                
                // Setup timer mocking
                const timeouts: { id: any, callback: Function, ms: number }[] = [];
                let currentTime = 0;
                
                // Mock setTimeout and clearTimeout
                (global as any).setTimeout = function(callback: Function, ms: number) {
                    const id = timeouts.length;
                    timeouts.push({ id, callback, ms });
                    return id;
                };
                
                (global as any).clearTimeout = function(id: any) {
                    const index = timeouts.findIndex(t => t.id === id);
                    if (index !== -1) {
                        timeouts.splice(index, 1);
                    }
                };
                
                // Function to advance timers
                const advanceTimersByTime = (ms: number) => {
                    currentTime += ms;
                    const toExecute = timeouts.filter(t => t.ms <= currentTime);
                    for (const timeout of toExecute) {
                        timeout.callback();
                    }
                    // Remove executed timeouts
                    for (let i = timeouts.length - 1; i >= 0; i--) {
                        if (timeouts[i].ms <= currentTime) {
                            timeouts.splice(i, 1);
                        }
                    }
                };
                
                // Mock client
                const mockClient: any = {
                    messages: {
                        create: function(options: any) {
                            mockClient.messages.createCalls.push(options);
                            return {
                                [Symbol.asyncIterator]: async function* () {
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
                        },
                        createCalls: []
                    }
                };
                
                try {
                    // Create handler
                    const options: ApiHandlerOptions = {
                        vertexProjectId: "test-project",
                        vertexRegion: "us-east5",
                        vertexContext: "Test context"
                    };
                    
                    const handler = new VertexHandler(options);
                    (handler as any).client = mockClient;
                    
                    // Test createMessage
                    const messages: Anthropic.Messages.MessageParam[] = [
                        { role: "user" as const, content: "Test" }
                    ];
                    const stream = handler.createMessage("System prompt", messages);
                    
                    for await (const _ of stream) { /* consume stream */ }
                    
                    // Dispose handler
                    handler.dispose();
                    
                    // Fast forward 4 minutes
                    advanceTimersByTime(4 * 60 * 1000);
                    
                    // Verify no refresh request was made
                    assert.strictEqual(mockClient.messages.createCalls.length, 1);
                } finally {
                    // Restore timers
                    global.setTimeout = originalSetTimeout;
                    global.clearTimeout = originalClearTimeout;
                }
            }
        )
    );

    // dispose tests
    const disposeSuite = testController.createTestItem('dispose', 'Dispose');
    rootSuite.children.add(disposeSuite);

    disposeSuite.children.add(
        TestUtils.createTest(
            testController,
            'cleanup-resources',
            'should clean up resources',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Save original timers
                const originalSetTimeout = global.setTimeout;
                const originalClearTimeout = global.clearTimeout;
                
                try {
                    // Create handler
                    const options: ApiHandlerOptions = {
                        vertexProjectId: "test-project",
                        vertexRegion: "us-east5",
                        vertexContext: "Test context"
                    };
                    
                    const handler = new VertexHandler(options);
                    
                    // Mock cache refresh and tracker
                    const mockCacheRefresh: any = {
                        stopRefresh: function(cacheId: string) {
                            mockCacheRefresh.stopRefreshCalls.push(cacheId);
                        },
                        dispose: function() {
                            mockCacheRefresh.disposeCalled = true;
                        },
                        stopRefreshCalls: [],
                        disposeCalled: false
                    };
                    
                    const mockCacheTracker: any = {
                        cleanup: function() {
                            mockCacheTracker.cleanupCalled = true;
                        },
                        cleanupCalled: false
                    };
                    
                    (handler as any).cacheRefresh = mockCacheRefresh;
                    (handler as any).cacheTracker = mockCacheTracker;
                    (handler as any).activeCacheId = "test-cache";
                    
                    // Test dispose
                    handler.dispose();
                    
                    // Verify cleanup
                    assert.strictEqual(mockCacheRefresh.stopRefreshCalls.length, 1);
                    assert.strictEqual(mockCacheRefresh.stopRefreshCalls[0], "test-cache");
                    assert.strictEqual(mockCacheRefresh.disposeCalled, true);
                    assert.strictEqual(mockCacheTracker.cleanupCalled, true);
                    assert.strictEqual((handler as any).activeCacheId, undefined);
                } finally {
                    // Restore timers
                    global.setTimeout = originalSetTimeout;
                    global.clearTimeout = originalClearTimeout;
                }
            }
        )
    );
}
