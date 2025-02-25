import { Anthropic } from "@anthropic-ai/sdk"
import { MessageContent } from "../../shared/api"
import { ConversationRole, Message } from "@aws-sdk/client-bedrock-runtime"
import { StreamEvent } from "../providers/bedrock"

// Define our own content block types since AWS SDK types are not sufficient
interface BedrockContentBlock {
    text: string;
    citations?: null;
}

interface ToolContent {
    type: string;
    text: string;
    citations?: Array<any> | null;
    content?: string | ToolContent[];
}

export function convertToBedrockConverseMessages(anthropicMessages: Anthropic.Messages.MessageParam[]): Message[] {
    return anthropicMessages.map((anthropicMessage) => {
        const role: ConversationRole = anthropicMessage.role === "assistant" ? "assistant" : "user"

        if (typeof anthropicMessage.content === "string") {
            return {
                role,
                content: [{
                    text: anthropicMessage.content
                } as BedrockContentBlock],
                usage: {
                    input_tokens: 0,
                    output_tokens: 0,
                    cache_creation_input_tokens: null,
                    cache_read_input_tokens: null
                }
            }
        }

        const content = anthropicMessages.flatMap((message): BedrockContentBlock[] => {
            if (typeof message.content === "string") {
                return [{
                    text: message.content
                }];
            }

            return message.content.map((block): BedrockContentBlock => {
                if (block.type === "text") {
                    return {
                        text: block.text
                    };
                }
                if (block.type === "image") {
                    return {
                        text: `[Image: ${block.source.media_type}]`
                    };
                }
                if (block.type === "tool_use") {
                    return {
                        text: `[Tool Use: ${block.name}]`
                    };
                }
                if (block.type === "tool_result") {
                    if (typeof block.content === "string") {
                        return {
                            text: block.content
                        };
                    }
                    if (Array.isArray(block.content)) {
                        return {
                            text: block.content
                                .filter(item => item.type === "text" || item.type === "image")
                                .map(item => item.type === "text" ? item.text : `[Image: ${item.source.media_type}]`)
                                .join("\n")
                        };
                    }
                }
                return {
                    text: "[Unsupported content type]"
                };
            });
        });

        return {
            role,
            content,
            usage: {
                input_tokens: 0,
                output_tokens: 0,
                cache_creation_input_tokens: null,
                cache_read_input_tokens: null
            }
        }
    })
}

export function convertToAnthropicMessage(
    event: StreamEvent,
    modelId: string
): Anthropic.Messages.Message {
    const baseMessage = {
        id: "", // Bedrock doesn't provide message IDs
        type: "message" as const,
        role: "assistant" as const,
        model: modelId,
        stop_reason: null,
        stop_sequence: null,
        usage: {
            input_tokens: 0,
            output_tokens: 0,
            cache_creation_input_tokens: null,
            cache_read_input_tokens: null
        }
    };

    // Handle metadata events
    if (event.metadata?.usage) {
        return {
            ...baseMessage,
            content: [],
            usage: {
                input_tokens: event.metadata.usage.inputTokens || 0,
                output_tokens: event.metadata.usage.outputTokens || 0,
                cache_creation_input_tokens: null,
                cache_read_input_tokens: null
            },
        };
    }

    // Handle content blocks
    const text = event.contentBlockStart?.start?.text || event.contentBlockDelta?.delta?.text;
    if (text !== undefined) {
        return {
            ...baseMessage,
            content: [{ type: "text", text: text, citations: null }],
        };
    }

    // Handle message stop
    if (event.messageStop) {
        return {
            ...baseMessage,
            content: [],
            stop_reason: event.messageStop.stopReason || null,
        };
    }

    return {
        ...baseMessage,
        content: [],
    };
}
