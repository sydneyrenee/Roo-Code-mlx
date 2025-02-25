import { Anthropic } from "@anthropic-ai/sdk";
import { VertexHandler } from "../vertex";
import { ApiHandlerOptions } from "../../../shared/api";

jest.useFakeTimers();

describe("VertexHandler", () => {
    let handler: VertexHandler;
    let mockClient: any;

    beforeEach(() => {
        mockClient = {
            messages: {
                create: jest.fn()
            }
        };

        const options: ApiHandlerOptions = {
            vertexProjectId: "test-project",
            vertexRegion: "us-east5",
            vertexContext: "Test context"
        };

        handler = new VertexHandler(options);
        (handler as any).client = mockClient;
    });

    afterEach(() => {
        handler.dispose();
        jest.clearAllTimers();
    });

    describe("createMessage", () => {
        it("should add cache control to context block", async () => {
            mockClient.messages.create.mockImplementation(() => ({
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
            }));

            const messages: Anthropic.Messages.MessageParam[] = [
                { role: "user" as const, content: "Test" }
            ];
            const stream = handler.createMessage("System prompt", messages);

            const results = [];
            for await (const chunk of stream) {
                results.push(chunk);
            }

            // Verify system blocks format
            expect(mockClient.messages.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    system: [
                        {
                            type: "text",
                            text: "System prompt"
                        },
                        {
                            type: "text",
                            text: "Test context",
                            cache_control: { type: "ephemeral" }
                        }
                    ]
                })
            );

            // Verify usage tracking
            expect(results[0]).toEqual({
                type: "usage",
                inputTokens: 100,
                outputTokens: 50
            });
        });

        it("should handle cache hits", async () => {
            mockClient.messages.create.mockImplementation(() => ({
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
            }));

            const messages: Anthropic.Messages.MessageParam[] = [
                { role: "user" as const, content: "Test" }
            ];
            const stream = handler.createMessage("System prompt", messages);

            const results = [];
            for await (const chunk of stream) {
                results.push(chunk);
            }

            // Verify usage tracking with cache hit
            expect(results[0]).toEqual({
                type: "usage",
                inputTokens: 20,
                outputTokens: 50
            });
        });

        it("should handle errors gracefully", async () => {
            mockClient.messages.create.mockRejectedValue(new Error("API Error"));

            const messages: Anthropic.Messages.MessageParam[] = [
                { role: "user" as const, content: "Test" }
            ];
            const stream = handler.createMessage("System prompt", messages);

            await expect(async () => {
                for await (const _ of stream) {
                    // consume stream
                }
            }).rejects.toThrow("Vertex completion error: API Error");
        });

        it("should refresh cache before expiration", async () => {
            // Initial request
            mockClient.messages.create.mockImplementation(() => ({
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
            }));

            const messages: Anthropic.Messages.MessageParam[] = [
                { role: "user" as const, content: "Test" }
            ];
            const stream = handler.createMessage("System prompt", messages);
            for await (const _ of stream) { /* consume stream */ }

            // Fast forward 4 minutes (just before cache expiration)
            jest.advanceTimersByTime(4 * 60 * 1000);

            // Verify refresh request was made
            expect(mockClient.messages.create).toHaveBeenCalledTimes(2);
            expect(mockClient.messages.create).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    messages: [{ role: "user", content: "Continue" }]
                })
            );
        });

        it("should stop refreshing on dispose", async () => {
            // Initial request
            mockClient.messages.create.mockImplementation(() => ({
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
            }));

            const messages: Anthropic.Messages.MessageParam[] = [
                { role: "user" as const, content: "Test" }
            ];
            const stream = handler.createMessage("System prompt", messages);
            for await (const _ of stream) { /* consume stream */ }

            // Dispose handler
            handler.dispose();

            // Fast forward 4 minutes
            jest.advanceTimersByTime(4 * 60 * 1000);

            // Verify no refresh request was made
            expect(mockClient.messages.create).toHaveBeenCalledTimes(1);
        });
    });

    describe("dispose", () => {
        it("should clean up resources", () => {
            const mockCacheRefresh = {
                stopRefresh: jest.fn(),
                dispose: jest.fn()
            };
            const mockCacheTracker = {
                cleanup: jest.fn()
            };

            (handler as any).cacheRefresh = mockCacheRefresh;
            (handler as any).cacheTracker = mockCacheTracker;
            (handler as any).activeCacheId = "test-cache";

            handler.dispose();

            expect(mockCacheRefresh.stopRefresh).toHaveBeenCalledWith("test-cache");
            expect(mockCacheRefresh.dispose).toHaveBeenCalled();
            expect(mockCacheTracker.cleanup).toHaveBeenCalled();
            expect((handler as any).activeCacheId).toBeUndefined();
        });
    });
});
