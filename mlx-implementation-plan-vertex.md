# Vertex AI Cache Control Implementation Plan

## Overview
Implement prompt caching using the existing @anthropic-ai/vertex-sdk with proper cache control support.

## 1. Message Formatting

### Cache Control Types
```typescript
interface CacheControl {
    type: "ephemeral";  // 5-minute TTL
}

interface SystemBlock {
    type: "text";
    text: string;
    cache_control?: CacheControl;
}

interface MessageContent {
    type: "text";
    text: string;
    cache_control?: CacheControl;
}
```

### Vertex Handler Update
Update `src/api/providers/vertex.ts`:
```typescript
export class VertexHandler implements ApiHandler {
    private options: ApiHandlerOptions;
    private client: AnthropicVertex;
    private cacheTracker: VertexCacheTracker;

    constructor(options: ApiHandlerOptions) {
        this.options = options;
        this.client = new AnthropicVertex({
            projectId: this.options.vertexProjectId ?? "not-provided",
            region: this.options.vertexRegion ?? "us-east5",
        });
        this.cacheTracker = new VertexCacheTracker();
    }

    async *createMessage(
        systemPrompt: string,
        messages: Message[]
    ): ApiStream {
        const requestId = uuid.v4();

        try {
            // Format system blocks with cache control
            const system: SystemBlock[] = [
                {
                    type: "text",
                    text: systemPrompt
                }
            ];

            // Add context with cache control if provided
            if (this.options.vertexContext) {
                system.push({
                    type: "text",
                    text: this.options.vertexContext,
                    cache_control: { type: "ephemeral" }
                });
            }

            const stream = await this.client.messages.create({
                model: this.getModel().id,
                max_tokens: this.getModel().info.maxTokens || 8192,
                temperature: this.options.modelTemperature ?? 0,
                system,
                messages,
                stream: true
            });

            for await (const chunk of stream) {
                switch (chunk.type) {
                    case "message_start":
                        // Track cache usage
                        this.cacheTracker.trackUsage(
                            requestId,
                            chunk.message.usage,
                            this.getModel().info
                        );
                        yield {
                            type: "usage",
                            inputTokens: chunk.message.usage.input_tokens || 0,
                            outputTokens: chunk.message.usage.output_tokens || 0,
                        };
                        break;
                    // ... other cases remain the same
                }
            }
        } catch (error) {
            throw new Error(`Vertex completion error: ${error.message}`);
        }
    }
}
```

## 2. Cache Management

### Cache Refresh Service
Create `src/services/vertex/cache-refresh.ts`:
```typescript
export class VertexCacheRefresh {
    private refreshInterval = 4 * 60 * 1000; // 4 minutes
    private refreshTimers: Map<string, NodeJS.Timer>;

    constructor() {
        this.refreshTimers = new Map();
    }

    // Schedule cache refresh
    scheduleRefresh(
        handler: VertexHandler,
        systemPrompt: string,
        context: string
    ): string {
        const cacheId = uuid.v4();

        // Set up periodic refresh
        const timer = setInterval(async () => {
            try {
                // Send minimal message to refresh cache
                await handler.createMessage(systemPrompt, [
                    { role: "user", content: "Continue" }
                ]);
            } catch (error) {
                console.error('Cache refresh failed:', error);
            }
        }, this.refreshInterval);

        this.refreshTimers.set(cacheId, timer);
        return cacheId;
    }

    // Stop refreshing
    stopRefresh(cacheId: string): void {
        const timer = this.refreshTimers.get(cacheId);
        if (timer) {
            clearInterval(timer);
            this.refreshTimers.delete(cacheId);
        }
    }

    // Clean up all refreshes
    dispose(): void {
        for (const [id, timer] of this.refreshTimers) {
            clearInterval(timer);
        }
        this.refreshTimers.clear();
    }
}
```

## 3. Implementation Phases

### Phase 1: Basic Caching
1. Add cache control types
2. Update message formatting
3. Track cache usage

### Phase 2: Cache Refresh
1. Implement refresh service
2. Add refresh scheduling
3. Handle cleanup

### Phase 3: Monitoring
1. Track cache hits/misses
2. Monitor refresh status
3. Log cache metrics

## Technical Considerations

### Cache Lifetime
- 5-minute TTL
- 4-minute refresh interval
- Cleanup handling

### Performance
- Minimal refresh messages
- Resource management
- Error handling

### Monitoring
- Cache hit rates
- Refresh success
- Error tracking

## Next Steps

1. Update message format
2. Add cache control
3. Implement refresh
4. Test caching

## Success Criteria

1. Working cache control
2. Reliable refresh
3. Clean resource management
4. Good monitoring
5. Pass integration tests