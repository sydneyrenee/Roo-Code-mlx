import { VertexCacheRefresh } from "../../../../services/vertex/cache-refresh";
jest.setTimeout(10000); // Set global timeout
jest.useFakeTimers();
describe("VertexCacheRefresh", () => {
    let cacheRefresh;
    let mockHandler;
    // Mock console.error to keep test output clean
    const originalConsoleError = console.error;
    beforeEach(() => {
        cacheRefresh = new VertexCacheRefresh();
        mockHandler = {
            createMessage: jest.fn().mockImplementation(async function* () {
                yield { type: "text", text: "Response" };
            })
        };
        // Mock console.error
        console.error = jest.fn();
    });
    afterEach(() => {
        cacheRefresh.dispose();
        jest.clearAllTimers();
        // Restore console.error
        console.error = originalConsoleError;
    });
    describe("scheduleRefresh", () => {
        it("should schedule periodic refresh", async () => {
            const cacheId = cacheRefresh.scheduleRefresh(mockHandler, "System prompt", "Test context");
            expect(cacheId).toBeDefined();
            expect(cacheRefresh.isRefreshing(cacheId)).toBe(true);
            // Fast forward 4 minutes
            jest.advanceTimersByTime(4 * 60 * 1000);
            // Should have made a refresh request
            expect(mockHandler.createMessage).toHaveBeenCalledWith("System prompt", [{ role: "user", content: "Continue" }]);
        });
        it("should handle refresh errors", async () => {
            mockHandler.createMessage = jest.fn().mockImplementation(async function* () {
                throw new Error("Refresh failed");
            });
            const cacheId = cacheRefresh.scheduleRefresh(mockHandler, "System prompt", "Test context");
            // Fast forward 4 minutes
            jest.advanceTimersByTime(4 * 60 * 1000);
            // Run all pending promises
            await Promise.resolve();
            jest.runAllTimers();
            // Should stop refreshing after error
            expect(cacheRefresh.isRefreshing(cacheId)).toBe(false);
            // Verify error was logged
            expect(console.error).toHaveBeenCalledWith('Cache refresh failed:', expect.any(Error));
        });
        it("should maintain multiple refreshes", async () => {
            const cacheId1 = cacheRefresh.scheduleRefresh(mockHandler, "System 1", "Context 1");
            const cacheId2 = cacheRefresh.scheduleRefresh(mockHandler, "System 2", "Context 2");
            expect(cacheRefresh.getActiveRefreshCount()).toBe(2);
            // Fast forward 4 minutes
            jest.advanceTimersByTime(4 * 60 * 1000);
            // Should have refreshed both caches
            expect(mockHandler.createMessage).toHaveBeenCalledWith("System 1", [{ role: "user", content: "Continue" }]);
            expect(mockHandler.createMessage).toHaveBeenCalledWith("System 2", [{ role: "user", content: "Continue" }]);
        });
        it("should maintain accurate refresh timing", async () => {
            const cacheId = cacheRefresh.scheduleRefresh(mockHandler, "System prompt", "Test context");
            // Fast forward 2 minutes
            jest.advanceTimersByTime(2 * 60 * 1000);
            expect(mockHandler.createMessage).not.toHaveBeenCalled();
            // Fast forward to just before refresh time
            jest.advanceTimersByTime(119 * 1000); // 3:59
            expect(mockHandler.createMessage).not.toHaveBeenCalled();
            // Fast forward to refresh time
            jest.advanceTimersByTime(1000); // 4:00
            expect(mockHandler.createMessage).toHaveBeenCalledTimes(1);
            // Fast forward another 4 minutes
            jest.advanceTimersByTime(4 * 60 * 1000);
            expect(mockHandler.createMessage).toHaveBeenCalledTimes(2);
        });
        it("should handle concurrent refreshes with different contexts independently", async () => {
            // Start two refreshes with different contexts
            const cacheId1 = cacheRefresh.scheduleRefresh(mockHandler, "System prompt", "Context A");
            const cacheId2 = cacheRefresh.scheduleRefresh(mockHandler, "System prompt", "Context B");
            // Fast forward 4 minutes
            jest.advanceTimersByTime(4 * 60 * 1000);
            // Both should refresh independently
            const calls = mockHandler.createMessage.mock.calls;
            expect(calls).toHaveLength(2);
            // Stop one refresh
            cacheRefresh.stopRefresh(cacheId1);
            // Fast forward another 4 minutes
            jest.advanceTimersByTime(4 * 60 * 1000);
            // Only the second refresh should continue
            expect(mockHandler.createMessage).toHaveBeenCalledTimes(3);
            expect(cacheRefresh.isRefreshing(cacheId1)).toBe(false);
            expect(cacheRefresh.isRefreshing(cacheId2)).toBe(true);
        });
        it("should handle system prompt changes", async () => {
            const cacheId = cacheRefresh.scheduleRefresh(mockHandler, "Initial system prompt", "Test context");
            // Fast forward 4 minutes
            jest.advanceTimersByTime(4 * 60 * 1000);
            // Should use initial system prompt
            expect(mockHandler.createMessage).toHaveBeenLastCalledWith("Initial system prompt", [{ role: "user", content: "Continue" }]);
            // Schedule new refresh with different system prompt
            const newCacheId = cacheRefresh.scheduleRefresh(mockHandler, "Updated system prompt", "Test context");
            // Fast forward 4 minutes
            jest.advanceTimersByTime(4 * 60 * 1000);
            // Should use updated system prompt
            expect(mockHandler.createMessage).toHaveBeenLastCalledWith("Updated system prompt", [{ role: "user", content: "Continue" }]);
        });
    });
    describe("stopRefresh", () => {
        it("should stop specific refresh", async () => {
            const cacheId = cacheRefresh.scheduleRefresh(mockHandler, "System prompt", "Test context");
            cacheRefresh.stopRefresh(cacheId);
            // Fast forward 4 minutes
            jest.advanceTimersByTime(4 * 60 * 1000);
            // Should not have made a refresh request
            expect(mockHandler.createMessage).not.toHaveBeenCalled();
            expect(cacheRefresh.isRefreshing(cacheId)).toBe(false);
        });
        it("should handle stopping non-existent refresh", () => {
            expect(() => cacheRefresh.stopRefresh("non-existent-id")).not.toThrow();
        });
    });
    describe("dispose", () => {
        it("should stop all refreshes", async () => {
            cacheRefresh.scheduleRefresh(mockHandler, "System 1", "Context 1");
            cacheRefresh.scheduleRefresh(mockHandler, "System 2", "Context 2");
            cacheRefresh.dispose();
            // Fast forward 4 minutes
            jest.advanceTimersByTime(4 * 60 * 1000);
            // Should not have made any refresh requests
            expect(mockHandler.createMessage).not.toHaveBeenCalled();
            expect(cacheRefresh.getActiveRefreshCount()).toBe(0);
        });
        it("should handle multiple dispose calls", () => {
            cacheRefresh.scheduleRefresh(mockHandler, "System prompt", "Test context");
            cacheRefresh.dispose();
            expect(() => cacheRefresh.dispose()).not.toThrow();
            expect(cacheRefresh.getActiveRefreshCount()).toBe(0);
        });
    });
});
//# sourceMappingURL=cache-refresh.test.js.map