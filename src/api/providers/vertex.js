"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VertexHandler = void 0;
const vertex_sdk_1 = require("@anthropic-ai/vertex-sdk");
const api_1 = require("../../shared/api");
const cache_tracker_1 = require("../../services/vertex/cache-tracker");
const cache_refresh_1 = require("../../services/vertex/cache-refresh");
const uuid_1 = require("uuid");
class VertexHandler {
    options;
    client;
    cacheTracker;
    cacheRefresh;
    activeCacheId;
    constructor(options) {
        this.options = options;
        this.client = new vertex_sdk_1.AnthropicVertex({
            projectId: this.options.vertexProjectId ?? "not-provided",
            region: this.options.vertexRegion ?? "us-east5"
        });
        this.cacheTracker = new cache_tracker_1.VertexCacheTracker();
        this.cacheRefresh = new cache_refresh_1.VertexCacheRefresh();
    }
    async *createMessage(systemPrompt, messages) {
        const requestId = (0, uuid_1.v4)();
        try {
            // Format system content blocks
            const system = [
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
                // Start cache refresh if not already active
                if (!this.activeCacheId && this.getModel().info.supportsPromptCache) {
                    this.activeCacheId = this.cacheRefresh.scheduleRefresh(this, systemPrompt, this.options.vertexContext);
                }
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
                try {
                    switch (chunk.type) {
                        case "message_start":
                            // Track cache usage
                            if (chunk.message.usage) {
                                const usage = chunk.message.usage;
                                this.cacheTracker.trackUsage(requestId, {
                                    input_tokens: usage.input_tokens || 0,
                                    output_tokens: usage.output_tokens || 0,
                                    cache_creation_input_tokens: usage.cache_creation_input_tokens || 0,
                                    cache_read_input_tokens: usage.cache_read_input_tokens || 0
                                }, this.getModel().info);
                            }
                            yield {
                                type: "usage",
                                inputTokens: chunk.message.usage?.input_tokens || 0,
                                outputTokens: chunk.message.usage?.output_tokens || 0
                            };
                            break;
                        case "content_block_start":
                            if (chunk.content_block.type === "text") {
                                if (chunk.index > 0) {
                                    yield { type: "text", text: "\n" };
                                }
                                yield {
                                    type: "text",
                                    text: chunk.content_block.text || ""
                                };
                            }
                            break;
                        case "content_block_delta":
                            if (chunk.delta.type === "text_delta") {
                                yield {
                                    type: "text",
                                    text: chunk.delta.text || ""
                                };
                            }
                            break;
                        case "message_delta":
                            // Handle any message updates
                            break;
                        case "message_stop":
                            // End of message
                            return;
                    }
                }
                catch (error) {
                    console.error("Error processing chunk:", error);
                    throw error;
                }
            }
        }
        catch (error) {
            throw new Error(`Vertex completion error: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    getModel() {
        const modelId = this.options.apiModelId;
        if (modelId && modelId in api_1.vertexModels) {
            const id = modelId;
            return { id, info: api_1.vertexModels[id] };
        }
        return { id: api_1.vertexDefaultModelId, info: api_1.vertexModels[api_1.vertexDefaultModelId] };
    }
    async completePrompt(prompt) {
        try {
            const response = await this.client.messages.create({
                model: this.getModel().id,
                max_tokens: this.getModel().info.maxTokens || 8192,
                temperature: this.options.modelTemperature ?? 0,
                messages: [{ role: "user", content: prompt }],
                stream: false
            });
            const content = response.content[0];
            if (content.type === "text") {
                return content.text;
            }
            return "";
        }
        catch (error) {
            throw new Error(`Vertex completion error: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    // Clean up resources
    dispose() {
        if (this.activeCacheId) {
            this.cacheRefresh.stopRefresh(this.activeCacheId);
            this.activeCacheId = undefined;
        }
        this.cacheRefresh.dispose();
        this.cacheTracker.cleanup();
    }
}
exports.VertexHandler = VertexHandler;
//# sourceMappingURL=vertex.js.map