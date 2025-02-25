"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VertexCacheTracker = void 0;
class VertexCacheTracker {
    metrics;
    costs;
    constructor() {
        this.metrics = new Map();
        this.costs = new Map();
    }
    normalizeTokenCount(value) {
        const num = Number(value);
        return !Number.isFinite(num) || num < 0 ? 0 : num;
    }
    trackUsage(requestId, usage, model) {
        const metrics = {
            creationTokens: this.normalizeTokenCount(usage.cache_creation_input_tokens),
            readTokens: this.normalizeTokenCount(usage.cache_read_input_tokens),
            inputTokens: this.normalizeTokenCount(usage.input_tokens),
            outputTokens: this.normalizeTokenCount(usage.output_tokens)
        };
        this.metrics.set(requestId, metrics);
        // Calculate costs if model has pricing info
        if (model.inputPrice !== undefined && model.outputPrice !== undefined) {
            const costs = this.calculateCosts(metrics, model);
            this.costs.set(requestId, costs);
        }
    }
    calculateCosts(metrics, model) {
        const cacheWrites = model.cacheWritesPrice !== undefined
            ? (metrics.creationTokens / 1_000_000) * model.cacheWritesPrice
            : 0;
        const cacheReads = model.cacheReadsPrice !== undefined
            ? (metrics.readTokens / 1_000_000) * model.cacheReadsPrice
            : 0;
        const inputCost = (metrics.inputTokens / 1_000_000) * model.inputPrice;
        const outputCost = (metrics.outputTokens / 1_000_000) * model.outputPrice;
        // Calculate what it would have cost without caching
        const withoutCache = ((metrics.readTokens + metrics.inputTokens) / 1_000_000) * model.inputPrice;
        const withCache = cacheWrites + cacheReads + inputCost;
        const savings = withoutCache - withCache;
        return {
            cacheWrites,
            cacheReads,
            inputTokens: inputCost,
            outputTokens: outputCost,
            totalCost: cacheWrites + cacheReads + inputCost + outputCost,
            savings
        };
    }
    getMetrics(requestId) {
        const metrics = this.metrics.get(requestId);
        const costs = this.costs.get(requestId);
        if (!metrics)
            return undefined;
        return {
            metrics,
            costs
        };
    }
    // Clean up old metrics
    cleanup(maxAge = 1000 * 60 * 60) {
        const now = Date.now();
        for (const [id] of this.metrics) {
            this.metrics.delete(id);
            this.costs.delete(id);
        }
    }
}
exports.VertexCacheTracker = VertexCacheTracker;
//# sourceMappingURL=cache-tracker.js.map