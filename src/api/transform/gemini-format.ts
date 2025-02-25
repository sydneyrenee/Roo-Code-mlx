import { Anthropic } from "@anthropic-ai/sdk"
import {
    Content,
    EnhancedGenerateContentResponse,
    FunctionCallPart,
    FunctionDeclaration,
    FunctionResponsePart,
    InlineDataPart,
    Part,
    SchemaType,
    TextPart,
} from "@google/generative-ai"

export interface GeminiMessage {
    role: "assistant" | "user"
    parts: Part[]
    usage?: {
        input_tokens?: number
        output_tokens?: number
    }
}

export function convertAnthropicContentToGemini(
    content:
        | string
        | Array<
                | Anthropic.Messages.TextBlockParam
                | Anthropic.Messages.ImageBlockParam
                | Anthropic.Messages.ToolUseBlockParam
                | Anthropic.Messages.ToolResultBlockParam
          >,
): Part[] {
    if (typeof content === "string") {
        return [{ text: content } as TextPart]
    }
    
    return content.flatMap((block) => {
        switch (block.type) {
            case "text":
                return { text: block.text } as TextPart
            case "image":
                if (block.source.type !== "base64") {
                    throw new Error("Unsupported image source type")
                }
                return {
                    inlineData: {
                        data: block.source.data,
                        mimeType: block.source.media_type,
                    },
                } as InlineDataPart
            case "tool_use":
                return {
                    functionCall: {
                        name: block.name,
                        args: block.input,
                    },
                } as FunctionCallPart
            case "tool_result":
                const name = block.tool_use_id.split("-")[0]
                if (!block.content) {
                    return []
                }
                if (typeof block.content === "string") {
                    return {
                        functionResponse: {
                            name,
                            response: {
                                name,
                                content: block.content,
                            },
                        },
                    } as FunctionResponsePart
                } else {
                    const textParts = block.content.filter((part) => part.type === "text")
                    const imageParts = block.content.filter((part) => part.type === "image")
                    const text = textParts.length > 0 ? textParts.map((part) => part.text).join("\n\n") : ""
                    const imageText = imageParts.length > 0 ? "\n\n(See next part for image)" : ""
                    return [
                        {
                            functionResponse: {
                                name,
                                response: {
                                    name,
                                    content: text + imageText,
                                },
                            },
                        } as FunctionResponsePart,
                        ...imageParts.map(
                            (part) =>
                                ({
                                    inlineData: {
                                        data: part.source.data,
                                        mimeType: part.source.media_type,
                                    },
                                }) as InlineDataPart,
                        ),
                    ]
                }
            default:
                return []
        }
    })
}

export function convertAnthropicMessageToGemini(message: Anthropic.Messages.MessageParam): Content {
    return {
        role: message.role === "assistant" ? "model" : "user",
        parts: convertAnthropicContentToGemini(
            typeof message.content === "string" 
            ? message.content 
            : message.content.filter((block): block is ValidContentBlock => 
                block.type === "text" ||
                block.type === "image" ||
                block.type === "tool_use" ||
                block.type === "tool_result"
            )
        ),
    }
}

// Add type guard for content blocks
type ValidContentBlock = 
    | Anthropic.Messages.TextBlockParam 
    | Anthropic.Messages.ImageBlockParam 
    | Anthropic.Messages.ToolUseBlockParam 
    | Anthropic.Messages.ToolResultBlockParam;

export function convertAnthropicToolToGemini(tool: Anthropic.Messages.Tool): FunctionDeclaration {
    return {
        name: tool.name,
        description: tool.description || "",
        parameters: {
            type: SchemaType.OBJECT,
            properties: Object.fromEntries(
                Object.entries(tool.input_schema.properties || {}).map(([key, value]) => [
                    key,
                    {
                        type: (value as any).type.toUpperCase(),
                        description: (value as any).description || "",
                    },
                ]),
            ),
            required: (tool.input_schema.required as string[]) || [],
        },
    }
}

/*
It looks like gemini likes to double escape certain characters when writing file contents: https://discuss.ai.google.dev/t/function-call-string-property-is-double-escaped/37867
*/
export function unescapeGeminiContent(content: string) {
    return content
        .replace(/\\n/g, "\n")
        .replace(/\\'/g, "'")
        .replace(/\\"/g, '"')
        .replace(/\\r/g, "\r")
        .replace(/\\t/g, "\t")
}

export function convertGeminiResponseToAnthropic(
    response: EnhancedGenerateContentResponse,
): Anthropic.Messages.Message {
    const content: Anthropic.Messages.ContentBlock[] = []

    // Add the main text response
    const text = response.text()
    if (text) {
        content.push({ 
            type: "text", 
            text,
            citations: null
        })
    }

    // Add function calls as tool_use blocks
    const functionCalls = response.functionCalls()
    if (functionCalls) {
        functionCalls.forEach((call, index) => {
            if ("content" in call.args && typeof call.args.content === "string") {
                call.args.content = unescapeGeminiContent(call.args.content)
            }
            content.push({
                type: "tool_use",
                id: `${call.name}-${index}-${Date.now()}`,
                name: call.name,
                input: call.args
            })
        })
    }

    // Determine stop reason
    let stop_reason: Anthropic.Messages.Message["stop_reason"] = null
    const finishReason = response.candidates?.[0]?.finishReason
    if (finishReason) {
        switch (finishReason) {
            case "STOP":
                stop_reason = "end_turn"
                break
            case "MAX_TOKENS":
                stop_reason = "max_tokens"
                break
            case "SAFETY":
            case "RECITATION":
            case "OTHER":
                stop_reason = "stop_sequence"
                break
        }
    }

    return {
        id: `msg_${Date.now()}`,
        type: "message",
        role: "assistant",
        content,
        model: "",
        stop_reason,
        stop_sequence: null,
        usage: {
            input_tokens: response.usageMetadata?.promptTokenCount ?? 0,
            output_tokens: response.usageMetadata?.candidatesTokenCount ?? 0,
            cache_creation_input_tokens: null,
            cache_read_input_tokens: null
        },
    }
}

export function convertGeminiToAnthropicMessages(
    messages: GeminiMessage[]
): Anthropic.Messages.MessageParam[] {
    return messages.map((message) => ({
        role: message.role,
        content: message.parts.map((part): Anthropic.Messages.ContentBlock => {
            if ("text" in part) {
                return {
                    type: "text",
                    text: part.text || "", // Handle potential undefined case
                    citations: null
                }
            }
            throw new Error("Unsupported content type")
        }),
    }))
}
