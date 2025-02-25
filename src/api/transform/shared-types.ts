import { Anthropic } from "@anthropic-ai/sdk"

export interface SharedUsage {
    input_tokens: number
    output_tokens: number
    cache_creation_input_tokens?: number
    cache_read_input_tokens?: number
}

export interface SharedTextBlock {
    type: "text"
    text: string
    cache_control?: { type: "ephemeral" }
    citations?: Anthropic.Messages.CitationsConfigParam
}

export interface SharedImageBlock {
    type: "image"
    source: Anthropic.Messages.ImageBlockParam["source"]
    cache_control?: { type: "ephemeral" }
}

export type SharedContentBlock = SharedTextBlock | SharedImageBlock

export interface SharedMessage {
    role: "assistant" | "user"
    content: SharedContentBlock[]
    usage?: SharedUsage
}