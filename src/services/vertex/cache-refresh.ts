import { v4 as uuid } from 'uuid';
import { VertexHandler } from '../../api/providers/vertex';

export class VertexCacheRefresh {
    private refreshInterval = 4 * 60 * 1000; // 4 minutes
    private refreshTimers: Map<string, NodeJS.Timeout>;
    private refreshCallbacks: Map<string, () => Promise<void>>;

    constructor() {
        this.refreshTimers = new Map();
        this.refreshCallbacks = new Map();
    }

    // Schedule cache refresh
    scheduleRefresh(
        handler: VertexHandler,
        systemPrompt: string,
        context: string
    ): string {
        const cacheId = uuid();

        // Create refresh callback
        const refreshCallback = async () => {
            try {
                // Send minimal message to refresh cache
                for await (const _ of handler.createMessage(systemPrompt, [
                    { role: "user", content: "Continue" }
                ])) {
                    // Consume stream to ensure completion
                }
            } catch (error) {
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
    stopRefresh(cacheId: string): void {
        const timer = this.refreshTimers.get(cacheId);
        if (timer) {
            clearInterval(timer);
            this.refreshTimers.delete(cacheId);
            this.refreshCallbacks.delete(cacheId);
        }
    }

    // Clean up all refreshes
    dispose(): void {
        for (const [_, timer] of this.refreshTimers) {
            clearInterval(timer);
        }
        this.refreshTimers.clear();
        this.refreshCallbacks.clear();
    }

    // Check if cache is being refreshed
    isRefreshing(cacheId: string): boolean {
        return this.refreshTimers.has(cacheId);
    }

    // Get number of active refreshes
    getActiveRefreshCount(): number {
        return this.refreshTimers.size;
    }
}