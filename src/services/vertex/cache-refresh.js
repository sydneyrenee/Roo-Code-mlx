"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VertexCacheRefresh = void 0;
const uuid_1 = require("uuid");
class VertexCacheRefresh {
    refreshInterval = 4 * 60 * 1000; // 4 minutes
    refreshTimers;
    refreshCallbacks;
    constructor() {
        this.refreshTimers = new Map();
        this.refreshCallbacks = new Map();
    }
    // Schedule cache refresh
    scheduleRefresh(handler, systemPrompt, context) {
        const cacheId = (0, uuid_1.v4)();
        // Create refresh callback
        const refreshCallback = async () => {
            try {
                // Send minimal message to refresh cache
                for await (const _ of handler.createMessage(systemPrompt, [
                    { role: "user", content: "Continue" }
                ])) {
                    // Consume stream to ensure completion
                }
            }
            catch (error) {
                console.error('Cache refresh failed:', error);
                // Stop refresh on persistent errors
                this.stopRefresh(cacheId);
            }
        };
        // Store callback
        this.refreshCallbacks.set(cacheId, refreshCallback);
        // Set up periodic refresh
        const timer = setInterval(async () => {
            const callback = this.refreshCallbacks.get(cacheId);
            if (callback) {
                await callback();
            }
        }, this.refreshInterval);
        this.refreshTimers.set(cacheId, timer);
        return cacheId;
    }
    // Stop refreshing specific cache
    stopRefresh(cacheId) {
        const timer = this.refreshTimers.get(cacheId);
        if (timer) {
            clearInterval(timer);
            this.refreshTimers.delete(cacheId);
            this.refreshCallbacks.delete(cacheId);
        }
    }
    // Clean up all refreshes
    dispose() {
        for (const [_, timer] of this.refreshTimers) {
            clearInterval(timer);
        }
        this.refreshTimers.clear();
        this.refreshCallbacks.clear();
    }
    // Check if cache is being refreshed
    isRefreshing(cacheId) {
        return this.refreshTimers.has(cacheId);
    }
    // Get number of active refreshes
    getActiveRefreshCount() {
        return this.refreshTimers.size;
    }
}
exports.VertexCacheRefresh = VertexCacheRefresh;
//# sourceMappingURL=cache-refresh.js.map