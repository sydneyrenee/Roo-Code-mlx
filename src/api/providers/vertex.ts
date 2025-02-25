import { Anthropic } from "@anthropic-ai/sdk"
import { AnthropicVertex } from "@anthropic-ai/vertex-sdk"
import { ApiHandler, SingleCompletionHandler } from "../"
import { ApiHandlerOptions, ModelInfo, vertexDefaultModelId, VertexModelId, vertexModels } from "../../shared/api"
import { ApiStream } from "../transform/stream"
import { VertexCacheTracker } from "../../services/vertex/cache-tracker"
import { VertexCacheRefresh } from "../../services/vertex/cache-refresh"
import { v4 as uuid } from 'uuid'
import { SharedContentBlock } from "../transform/shared-types"

interface VertexUsage {
    input_tokens?: number
    output_tokens?: number
    cache_creation_input_tokens?: number
    cache_read_input_tokens?: number
}

export class VertexHandler implements ApiHandler, SingleCompletionHandler {
    private options: ApiHandlerOptions
    private client: AnthropicVertex
    private cacheTracker: VertexCacheTracker
    private cacheRefresh: VertexCacheRefresh
    private activeCacheId?: string

    constructor(options: ApiHandlerOptions) {
        this.options = options
        this.client = new AnthropicVertex({
            projectId: this.options.vertexProjectId ?? "not-provided",
            region: this.options.vertexRegion ?? "us-east5"
        })
        this.cacheTracker = new VertexCacheTracker()
        this.cacheRefresh = new VertexCacheRefresh()
    }

    async *createMessage(systemPrompt: string, messages: Anthropic.Messages.MessageParam[]): ApiStream {
        const requestId = uuid()

        try {
            // Format system content blocks
            const system: Anthropic.Messages.TextBlockParam[] = [
                {
                    type: "text",
                    text: systemPrompt
                }
            ]

            // Add context with cache control if provided
            if (this.options.vertexContext) {
                system.push({
                    type: "text",
                    text: this.options.vertexContext,
                    cache_control: { type: "ephemeral" }
                })

                // Start cache refresh if not already active
                if (!this.activeCacheId && this.getModel().info.supportsPromptCache) {
                    this.activeCacheId = this.cacheRefresh.scheduleRefresh(
                        this,
                        systemPrompt,
                        this.options.vertexContext
                    )
                }
            }

            const stream = await this.client.messages.create({
                model: this.getModel().id,
                max_tokens: this.getModel().info.maxTokens || 8192,
                temperature: this.options.modelTemperature ?? 0,
                system,
                messages: messages.map(message => ({
                    ...message,
                    content:
                        typeof message.content === "string"
                            ? [{ type: "text" as const, text: message.content }]
                            : message.content,
                })),
                stream: true
            })

            for await (const chunk of stream) {
                try {
                    switch (chunk.type) {
                        case "message_start":
                            // Track cache usage
                            if (chunk.message.usage) {
                                const usage = chunk.message.usage as VertexUsage
                                this.cacheTracker.trackUsage(
                                    requestId,
                                    {
                                        input_tokens: usage.input_tokens || 0,
                                        output_tokens: usage.output_tokens || 0,
                                        cache_creation_input_tokens: usage.cache_creation_input_tokens || 0,
                                        cache_read_input_tokens: usage.cache_read_input_tokens || 0
                                    },
                                    this.getModel().info
                                )
                            }
                            yield {
                                type: "usage",
                                inputTokens: chunk.message.usage?.input_tokens || 0,
                                outputTokens: chunk.message.usage?.output_tokens || 0,
                                cacheWriteTokens: chunk.message.usage?.cache_creation_input_tokens ?? undefined,
                                cacheReadTokens: chunk.message.usage?.cache_read_input_tokens ?? undefined
                            }
                            break

                        case "content_block_start":
                            if (chunk.content_block.type === "text") {
                                if (chunk.index > 0) {
                                    yield { type: "text", text: "\n" }
                                }
                                yield {
                                    type: "text",
                                    text: chunk.content_block.text || ""
                                }
                            }
                            break

                        case "content_block_delta":
                            if (chunk.delta.type === "text_delta") {
                                yield {
                                    type: "text",
                                    text: chunk.delta.text || ""
                                }
                            }
                            break

                        case "message_delta":
                            // Handle any message updates
                            break

                        case "message_stop":
                            // End of message
                            return
                    }
                } catch (error) {
                    console.error("Error processing chunk:", error)
                    throw error
                }
            }
        } catch (error) {
            throw new Error(`Vertex completion error: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    getModel(): { id: VertexModelId; info: ModelInfo } {
        const modelId = this.options.apiModelId
        if (modelId && modelId in vertexModels) {
            const id = modelId as VertexModelId
            return { id, info: vertexModels[id] }
        }
        return { id: vertexDefaultModelId, info: vertexModels[vertexDefaultModelId] }
    }

    async completePrompt(prompt: string): Promise<string> {
        try {
            const response = await this.client.messages.create({
                model: this.getModel().id,
                max_tokens: this.getModel().info.maxTokens || 8192,
                temperature: this.options.modelTemperature ?? 0,
                messages: [{ 
                    role: "user", 
                    content: [{ 
                        type: "text" as const, 
                        text: prompt
                    }] 
                }],
                stream: false
            })

            const content = response.content[0]
            if (content.type === "text") {
                return content.text
            }
            return ""
        } catch (error) {
            throw new Error(`Vertex completion error: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    // Clean up resources
    dispose(): void {
        if (this.activeCacheId) {
            this.cacheRefresh.stopRefresh(this.activeCacheId)
            this.activeCacheId = undefined
        }
        this.cacheRefresh.dispose()
        this.cacheTracker.cleanup()
    }
}
