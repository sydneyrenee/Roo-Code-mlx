import { ModelInfo } from "../../shared/api";

export interface CacheMetrics {
    creationTokens: number;
    readTokens: number;
    inputTokens: number;
    outputTokens: number;
}

export interface CacheCosts {
    cacheWrites: number;    // Cost of writing to cache
    cacheReads: number;     // Cost of reading from cache
    inputTokens: number;    // Cost of non-cached input tokens
    outputTokens: number;   // Cost of output generation
    totalCost: number;      // Total cost for request
    savings: number;        // Savings from cache hits
}

export class VertexCacheTracker {
    private metrics: Map<string, CacheMetrics>;
    private costs: Map<string, CacheCosts>;

    constructor() {
        this.metrics = new Map();
        this.costs = new Map();
    }

    private normalizeTokenCount(value: any): number {
        const num = Number(value);
        return !Number.isFinite(num) || num < 0 ? 0 : num;
    }

    trackUsage(
        requestId: string,
        usage: any,
        model: ModelInfo
    ): void {
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

    private calculateCosts(
        metrics: CacheMetrics,
        model: ModelInfo
    ): CacheCosts {
        const cacheWrites = model.cacheWritesPrice !== undefined
            ? (metrics.creationTokens / 1_000_000) * model.cacheWritesPrice
            : 0;

        const cacheReads = model.cacheReadsPrice !== undefined
            ? (metrics.readTokens / 1_000_000) * model.cacheReadsPrice
            : 0;

        const inputCost = (metrics.inputTokens / 1_000_000) * model.inputPrice!;
        const outputCost = (metrics.outputTokens / 1_000_000) * model.outputPrice!;

        // Calculate what it would have cost without caching
        const withoutCache = ((metrics.readTokens + metrics.inputTokens) / 1_000_000) * model.inputPrice!;
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

    getMetrics(requestId: string): {
        metrics: CacheMetrics;
        costs?: CacheCosts;
    } | undefined {
        const metrics = this.metrics.get(requestId);
        const costs = this.costs.get(requestId);
        
        if (!metrics) return undefined;
        
        return {
            metrics,
            costs
        };
    }

    // Clean up old metrics
    cleanup(maxAge: number = 1000 * 60 * 60): void {
        const now = Date.now();
        for (const [id] of this.metrics) {
            this.metrics.delete(id);
            this.costs.delete(id);
        }
    }
}