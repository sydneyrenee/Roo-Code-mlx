import { VertexCacheTracker } from "../../../../services/vertex/cache-tracker";
describe("VertexCacheTracker", () => {
    let tracker;
    let mockModel;
    beforeEach(() => {
        tracker = new VertexCacheTracker();
        mockModel = {
            maxTokens: 8192,
            contextWindow: 200_000,
            supportsImages: true,
            supportsPromptCache: true,
            inputPrice: 3.0,
            outputPrice: 15.0,
            cacheWritesPrice: 3.75, // $3.0 + 25%
            cacheReadsPrice: 0.30 // $3.0 - 90%
        };
    });
    describe("trackUsage", () => {
        it("should track initial cache write", () => {
            const usage = {
                input_tokens: 100,
                output_tokens: 50,
                cache_creation_input_tokens: 80,
                cache_read_input_tokens: 0
            };
            tracker.trackUsage("request1", usage, mockModel);
            const metrics = tracker.getMetrics("request1");
            expect(metrics).toBeDefined();
            expect(metrics?.metrics).toEqual({
                creationTokens: 80,
                readTokens: 0,
                inputTokens: 100,
                outputTokens: 50
            });
            // Verify cost calculation
            expect(metrics?.costs).toEqual({
                cacheWrites: (80 / 1_000_000) * 3.75,
                cacheReads: 0,
                inputTokens: (100 / 1_000_000) * 3.0,
                outputTokens: (50 / 1_000_000) * 15.0,
                totalCost: expect.any(Number),
                savings: expect.any(Number)
            });
        });
        it("should track cache hits", () => {
            const usage = {
                input_tokens: 20,
                output_tokens: 50,
                cache_creation_input_tokens: 0,
                cache_read_input_tokens: 80
            };
            tracker.trackUsage("request2", usage, mockModel);
            const metrics = tracker.getMetrics("request2");
            expect(metrics).toBeDefined();
            expect(metrics?.metrics).toEqual({
                creationTokens: 0,
                readTokens: 80,
                inputTokens: 20,
                outputTokens: 50
            });
            // Verify cost calculation with cache hit savings
            const withoutCache = ((80 + 20) / 1_000_000) * mockModel.inputPrice;
            const withCache = (80 / 1_000_000) * mockModel.cacheReadsPrice +
                (20 / 1_000_000) * mockModel.inputPrice;
            expect(metrics?.costs).toEqual({
                cacheWrites: 0,
                cacheReads: (80 / 1_000_000) * 0.30,
                inputTokens: (20 / 1_000_000) * 3.0,
                outputTokens: (50 / 1_000_000) * 15.0,
                totalCost: expect.any(Number),
                savings: withoutCache - withCache
            });
        });
        it("should handle missing cache prices", () => {
            const modelWithoutCachePrices = {
                maxTokens: 8192,
                contextWindow: 200_000,
                supportsImages: true,
                supportsPromptCache: true,
                inputPrice: 3.0,
                outputPrice: 15.0
            };
            const usage = {
                input_tokens: 100,
                output_tokens: 50,
                cache_creation_input_tokens: 80,
                cache_read_input_tokens: 0
            };
            tracker.trackUsage("request3", usage, modelWithoutCachePrices);
            const metrics = tracker.getMetrics("request3");
            expect(metrics).toBeDefined();
            expect(metrics?.costs).toEqual({
                cacheWrites: 0,
                cacheReads: 0,
                inputTokens: (100 / 1_000_000) * 3.0,
                outputTokens: (50 / 1_000_000) * 15.0,
                totalCost: expect.any(Number),
                savings: 0
            });
        });
        it("should handle zero token usage", () => {
            const usage = {
                input_tokens: 0,
                output_tokens: 0,
                cache_creation_input_tokens: 0,
                cache_read_input_tokens: 0
            };
            tracker.trackUsage("request4", usage, mockModel);
            const metrics = tracker.getMetrics("request4");
            expect(metrics).toBeDefined();
            expect(metrics?.metrics).toEqual({
                creationTokens: 0,
                readTokens: 0,
                inputTokens: 0,
                outputTokens: 0
            });
            expect(metrics?.costs).toEqual({
                cacheWrites: 0,
                cacheReads: 0,
                inputTokens: 0,
                outputTokens: 0,
                totalCost: 0,
                savings: 0
            });
        });
        it("should track concurrent requests independently", () => {
            // First request with cache write
            tracker.trackUsage("request5", {
                input_tokens: 100,
                output_tokens: 50,
                cache_creation_input_tokens: 80,
                cache_read_input_tokens: 0
            }, mockModel);
            // Second request with cache hit
            tracker.trackUsage("request6", {
                input_tokens: 20,
                output_tokens: 50,
                cache_creation_input_tokens: 0,
                cache_read_input_tokens: 80
            }, mockModel);
            const metrics1 = tracker.getMetrics("request5");
            const metrics2 = tracker.getMetrics("request6");
            expect(metrics1).toBeDefined();
            expect(metrics2).toBeDefined();
            expect(metrics1?.metrics.creationTokens).toBe(80);
            expect(metrics1?.metrics.readTokens).toBe(0);
            expect(metrics2?.metrics.creationTokens).toBe(0);
            expect(metrics2?.metrics.readTokens).toBe(80);
        });
        it("should calculate savings with different price models", () => {
            const customModel = {
                ...mockModel,
                inputPrice: 5.0,
                outputPrice: 20.0,
                cacheWritesPrice: 7.5, // $5.0 + 50%
                cacheReadsPrice: 1.0 // $5.0 - 80%
            };
            const usage = {
                input_tokens: 20,
                output_tokens: 50,
                cache_creation_input_tokens: 0,
                cache_read_input_tokens: 80
            };
            tracker.trackUsage("request7", usage, customModel);
            const metrics = tracker.getMetrics("request7");
            expect(metrics).toBeDefined();
            const withoutCache = ((80 + 20) / 1_000_000) * customModel.inputPrice;
            const withCache = (80 / 1_000_000) * customModel.cacheReadsPrice +
                (20 / 1_000_000) * customModel.inputPrice;
            expect(metrics?.costs?.savings).toBe(withoutCache - withCache);
        });
        it("should handle very large token counts without overflow", () => {
            const largeUsage = {
                input_tokens: Number.MAX_SAFE_INTEGER,
                output_tokens: Number.MAX_SAFE_INTEGER,
                cache_creation_input_tokens: Number.MAX_SAFE_INTEGER,
                cache_read_input_tokens: 0
            };
            tracker.trackUsage("large-request", largeUsage, mockModel);
            const metrics = tracker.getMetrics("large-request");
            expect(metrics).toBeDefined();
            expect(Number.isFinite(metrics?.costs?.totalCost)).toBe(true);
            expect(Number.isFinite(metrics?.costs?.savings)).toBe(true);
        });
        it("should handle malformed usage data", () => {
            const malformedUsage = {
                input_tokens: NaN,
                output_tokens: undefined,
                cache_creation_input_tokens: null,
                cache_read_input_tokens: -1
            };
            tracker.trackUsage("malformed-request", malformedUsage, mockModel);
            const metrics = tracker.getMetrics("malformed-request");
            expect(metrics).toBeDefined();
            expect(metrics?.metrics).toEqual({
                creationTokens: 0,
                readTokens: 0,
                inputTokens: 0,
                outputTokens: 0
            });
        });
        it("should handle race conditions in concurrent operations", async () => {
            // Simulate multiple concurrent requests
            const promises = Array.from({ length: 100 }, (_, i) => {
                return Promise.resolve().then(() => {
                    tracker.trackUsage(`request-${i}`, {
                        input_tokens: i,
                        output_tokens: i,
                        cache_creation_input_tokens: i % 2 === 0 ? i : 0,
                        cache_read_input_tokens: i % 2 === 1 ? i : 0
                    }, mockModel);
                });
            });
            await Promise.all(promises);
            // Verify all requests were tracked correctly
            for (let i = 0; i < 100; i++) {
                const metrics = tracker.getMetrics(`request-${i}`);
                expect(metrics).toBeDefined();
                expect(metrics?.metrics.inputTokens).toBe(i);
                expect(metrics?.metrics.outputTokens).toBe(i);
                if (i % 2 === 0) {
                    expect(metrics?.metrics.creationTokens).toBe(i);
                    expect(metrics?.metrics.readTokens).toBe(0);
                }
                else {
                    expect(metrics?.metrics.creationTokens).toBe(0);
                    expect(metrics?.metrics.readTokens).toBe(i);
                }
            }
        });
    });
    describe("cleanup", () => {
        it("should remove old metrics", () => {
            const usage = {
                input_tokens: 100,
                output_tokens: 50,
                cache_creation_input_tokens: 80,
                cache_read_input_tokens: 0
            };
            tracker.trackUsage("request8", usage, mockModel);
            tracker.cleanup();
            expect(tracker.getMetrics("request8")).toBeUndefined();
        });
        it("should handle cleanup with no metrics", () => {
            expect(() => tracker.cleanup()).not.toThrow();
        });
        it("should handle cleanup during concurrent operations", async () => {
            // Start tracking requests
            const trackPromises = Array.from({ length: 50 }, (_, i) => {
                return Promise.resolve().then(() => {
                    tracker.trackUsage(`request-${i}`, {
                        input_tokens: i,
                        output_tokens: i,
                        cache_creation_input_tokens: i,
                        cache_read_input_tokens: 0
                    }, mockModel);
                });
            });
            // Interleave cleanups
            const cleanupPromises = Array.from({ length: 10 }, () => {
                return Promise.resolve().then(() => {
                    tracker.cleanup();
                });
            });
            // Run all operations concurrently
            await Promise.all([...trackPromises, ...cleanupPromises]);
            // Verify the tracker is still in a valid state
            tracker.trackUsage("final-request", {
                input_tokens: 100,
                output_tokens: 50,
                cache_creation_input_tokens: 80,
                cache_read_input_tokens: 0
            }, mockModel);
            const metrics = tracker.getMetrics("final-request");
            expect(metrics).toBeDefined();
            expect(metrics?.metrics.inputTokens).toBe(100);
        });
    });
});
//# sourceMappingURL=cache-tracker.test.js.map