import { VertexHandler } from "../../../../api/providers/vertex";
jest.setTimeout(10000);
jest.useFakeTimers();
describe("Vertex Handler Cache Integration", () => {
    let handler;
    let mockClient;
    let options;
    let mockModel;
    beforeEach(() => {
        mockClient = {
            messages: {
                create: jest.fn()
            }
        };
        mockModel = {
            maxTokens: 8192,
            contextWindow: 200_000,
            supportsImages: true,
            supportsPromptCache: true,
            inputPrice: 3.0,
            outputPrice: 15.0,
            cacheWritesPrice: 3.75,
            cacheReadsPrice: 0.30
        };
        options = {
            vertexProjectId: "test-project",
            vertexRegion: "us-east5",
            vertexContext: "Test context for caching",
            apiModelId: "claude-3-5-sonnet@20240620",
            modelTemperature: 0
        };
        handler = new VertexHandler(options);
        handler.client = mockClient;
        jest.spyOn(handler, 'getModel').mockReturnValue({
            id: "claude-3-5-sonnet@20240620",
            info: mockModel
        });
    });
    afterEach(() => {
        handler.dispose();
        jest.clearAllTimers();
        jest.restoreAllMocks();
    });
    describe("Cache Control", () => {
        it("should add cache control to context block", async () => {
            const mockStream = {
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
            mockClient.messages.create.mockResolvedValue(mockStream);
            const stream = handler.createMessage("System prompt", [
                { role: "user", content: "Test message" }
            ]);
            for await (const _ of stream) { /* consume stream */ }
            // Verify system blocks format with cache control
            expect(mockClient.messages.create).toHaveBeenCalledWith(expect.objectContaining({
                system: [
                    {
                        type: "text",
                        text: "System prompt"
                    },
                    {
                        type: "text",
                        text: "Test context for caching",
                        cache_control: { type: "ephemeral" }
                    }
                ],
                max_tokens: 8192,
                temperature: 0
            }));
        });
        it("should not add cache control without context", async () => {
            const handlerWithoutContext = new VertexHandler({
                ...options,
                vertexContext: undefined
            });
            handlerWithoutContext.client = mockClient;
            jest.spyOn(handlerWithoutContext, 'getModel').mockReturnValue({
                id: "claude-3-5-sonnet@20240620",
                info: mockModel
            });
            const mockStream = {
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
            mockClient.messages.create.mockResolvedValue(mockStream);
            const stream = handlerWithoutContext.createMessage("System prompt", [
                { role: "user", content: "Test message" }
            ]);
            for await (const _ of stream) { /* consume stream */ }
            // Verify only system prompt is present
            expect(mockClient.messages.create).toHaveBeenCalledWith(expect.objectContaining({
                system: [
                    {
                        type: "text",
                        text: "System prompt"
                    }
                ]
            }));
        });
        it("should handle different temperature settings", async () => {
            const handlerWithTemp = new VertexHandler({
                ...options,
                modelTemperature: 0.7
            });
            handlerWithTemp.client = mockClient;
            jest.spyOn(handlerWithTemp, 'getModel').mockReturnValue({
                id: "claude-3-5-sonnet@20240620",
                info: mockModel
            });
            const mockStream = {
                async *[Symbol.asyncIterator]() {
                    yield {
                        type: "message_start",
                        message: { usage: { input_tokens: 100, output_tokens: 50 } }
                    };
                }
            };
            mockClient.messages.create.mockResolvedValue(mockStream);
            const stream = handlerWithTemp.createMessage("System prompt", [
                { role: "user", content: "Test message" }
            ]);
            for await (const _ of stream) { /* consume stream */ }
            expect(mockClient.messages.create).toHaveBeenCalledWith(expect.objectContaining({
                temperature: 0.7
            }));
        });
    });
    describe("Cache Usage Tracking", () => {
        it("should track cache write usage", async () => {
            const mockStream = {
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
            mockClient.messages.create.mockResolvedValue(mockStream);
            const stream = handler.createMessage("System prompt", [
                { role: "user", content: "Test message" }
            ]);
            const results = [];
            for await (const chunk of stream) {
                results.push(chunk);
            }
            // Verify usage metrics
            expect(results[0]).toEqual({
                type: "usage",
                inputTokens: 100,
                outputTokens: 50
            });
        });
        it("should track cache hit usage", async () => {
            const mockStream = {
                async *[Symbol.asyncIterator]() {
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
            mockClient.messages.create.mockResolvedValue(mockStream);
            const stream = handler.createMessage("System prompt", [
                { role: "user", content: "Test message" }
            ]);
            const results = [];
            for await (const chunk of stream) {
                results.push(chunk);
            }
            // Verify usage metrics
            expect(results[0]).toEqual({
                type: "usage",
                inputTokens: 20,
                outputTokens: 50
            });
        });
        it("should handle zero token usage", async () => {
            const mockStream = {
                async *[Symbol.asyncIterator]() {
                    yield {
                        type: "message_start",
                        message: {
                            usage: {
                                input_tokens: 0,
                                output_tokens: 0,
                                cache_creation_input_tokens: 0,
                                cache_read_input_tokens: 0
                            }
                        }
                    };
                }
            };
            mockClient.messages.create.mockResolvedValue(mockStream);
            const stream = handler.createMessage("System prompt", [
                { role: "user", content: "Test message" }
            ]);
            const results = [];
            for await (const chunk of stream) {
                results.push(chunk);
            }
            expect(results[0]).toEqual({
                type: "usage",
                inputTokens: 0,
                outputTokens: 0
            });
        });
    });
    describe("Error Handling", () => {
        it("should handle API errors gracefully", async () => {
            mockClient.messages.create.mockRejectedValue(new Error("API Error"));
            const stream = handler.createMessage("System prompt", [
                { role: "user", content: "Test message" }
            ]);
            await expect(async () => {
                for await (const _ of stream) { /* consume stream */ }
            }).rejects.toThrow("Vertex completion error: API Error");
        });
        it("should handle stream errors", async () => {
            const mockStream = {
                async *[Symbol.asyncIterator]() {
                    throw new Error("Stream Error");
                }
            };
            mockClient.messages.create.mockResolvedValue(mockStream);
            const stream = handler.createMessage("System prompt", [
                { role: "user", content: "Test message" }
            ]);
            await expect(async () => {
                for await (const _ of stream) { /* consume stream */ }
            }).rejects.toThrow("Vertex completion error: Stream Error");
        });
    });
    describe("Cache Refresh", () => {
        it("should start cache refresh when context is provided", async () => {
            const mockStream = {
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
            mockClient.messages.create.mockResolvedValue(mockStream);
            const stream = handler.createMessage("System prompt", [
                { role: "user", content: "Test message" }
            ]);
            for await (const _ of stream) { /* consume stream */ }
            // Fast forward 4 minutes
            jest.advanceTimersByTime(4 * 60 * 1000);
            // Should have made a refresh request
            expect(mockClient.messages.create).toHaveBeenCalledTimes(2);
            expect(mockClient.messages.create).toHaveBeenLastCalledWith(expect.objectContaining({
                messages: [{ role: "user", content: "Continue" }]
            }));
        });
        it("should clean up refresh on dispose", async () => {
            const mockStream = {
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
            mockClient.messages.create.mockResolvedValue(mockStream);
            const stream = handler.createMessage("System prompt", [
                { role: "user", content: "Test message" }
            ]);
            for await (const _ of stream) { /* consume stream */ }
            handler.dispose();
            // Fast forward 4 minutes
            jest.advanceTimersByTime(4 * 60 * 1000);
            // Should not have made a refresh request
            expect(mockClient.messages.create).toHaveBeenCalledTimes(1);
        });
    });
    describe("completePrompt", () => {
        it("should handle cache in non-streaming mode", async () => {
            const response = {
                content: [{ type: "text", text: "Test response" }],
                usage: {
                    input_tokens: 100,
                    output_tokens: 50,
                    cache_creation_input_tokens: 80,
                    cache_read_input_tokens: 0
                }
            };
            mockClient.messages.create.mockResolvedValue(response);
            const result = await handler.completePrompt("Test prompt");
            expect(result).toBe("Test response");
            expect(mockClient.messages.create).toHaveBeenCalledWith(expect.objectContaining({
                stream: false,
                messages: [{ role: "user", content: "Test prompt" }]
            }));
        });
        it("should handle empty or invalid response", async () => {
            const response = {
                content: [{ type: "unknown", text: "Test response" }]
            };
            mockClient.messages.create.mockResolvedValue(response);
            const result = await handler.completePrompt("Test prompt");
            expect(result).toBe("");
        });
    });
});
//# sourceMappingURL=vertex-handler-cache.test.js.map