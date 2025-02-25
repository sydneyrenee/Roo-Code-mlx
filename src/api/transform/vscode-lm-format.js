"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertToVsCodeLmMessages = convertToVsCodeLmMessages;
exports.convertToAnthropicRole = convertToAnthropicRole;
exports.convertToAnthropicMessage = convertToAnthropicMessage;
const vscode = __importStar(require("vscode"));
/**
 * Safely converts a value into a plain object.
 */
function asObjectSafe(value) {
    // Handle null/undefined
    if (!value) {
        return {};
    }
    try {
        // Handle strings that might be JSON
        if (typeof value === "string") {
            return JSON.parse(value);
        }
        // Handle pre-existing objects
        if (typeof value === "object") {
            return Object.assign({}, value);
        }
        return {};
    }
    catch (error) {
        console.warn("Roo Code <Language Model API>: Failed to parse object:", error);
        return {};
    }
}
function convertToVsCodeLmMessages(anthropicMessages) {
    const vsCodeLmMessages = [];
    for (const anthropicMessage of anthropicMessages) {
        // Handle simple string messages
        if (typeof anthropicMessage.content === "string") {
            vsCodeLmMessages.push(anthropicMessage.role === "assistant"
                ? vscode.LanguageModelChatMessage.Assistant(anthropicMessage.content)
                : vscode.LanguageModelChatMessage.User(anthropicMessage.content));
            continue;
        }
        // Handle complex message structures
        switch (anthropicMessage.role) {
            case "user": {
                const { nonToolMessages, toolMessages } = anthropicMessage.content.reduce((acc, part) => {
                    if (part.type === "tool_result") {
                        acc.toolMessages.push(part);
                    }
                    else if (part.type === "text" || part.type === "image") {
                        acc.nonToolMessages.push(part);
                    }
                    return acc;
                }, { nonToolMessages: [], toolMessages: [] });
                // Process tool messages first then non-tool messages
                const contentParts = [
                    // Convert tool messages to ToolResultParts
                    ...toolMessages.map((toolMessage) => {
                        // Process tool result content into TextParts
                        const toolContentParts = typeof toolMessage.content === "string"
                            ? [new vscode.LanguageModelTextPart(toolMessage.content)]
                            : (toolMessage.content?.map((part) => {
                                if (part.type === "image") {
                                    return new vscode.LanguageModelTextPart(`[Image (${part.source?.type || "Unknown source-type"}): ${part.source?.media_type || "unknown media-type"} not supported by VSCode LM API]`);
                                }
                                return new vscode.LanguageModelTextPart(part.text);
                            }) ?? [new vscode.LanguageModelTextPart("")]);
                        return new vscode.LanguageModelToolResultPart(toolMessage.tool_use_id, toolContentParts);
                    }),
                    // Convert non-tool messages to TextParts after tool messages
                    ...nonToolMessages.map((part) => {
                        if (part.type === "image") {
                            return new vscode.LanguageModelTextPart(`[Image (${part.source?.type || "Unknown source-type"}): ${part.source?.media_type || "unknown media-type"} not supported by VSCode LM API]`);
                        }
                        return new vscode.LanguageModelTextPart(part.text);
                    }),
                ];
                // Add single user message with all content parts
                vsCodeLmMessages.push(vscode.LanguageModelChatMessage.User(contentParts));
                break;
            }
            case "assistant": {
                const { nonToolMessages, toolMessages } = anthropicMessage.content.reduce((acc, part) => {
                    if (part.type === "tool_use") {
                        acc.toolMessages.push(part);
                    }
                    else if (part.type === "text" || part.type === "image") {
                        acc.nonToolMessages.push(part);
                    }
                    return acc;
                }, { nonToolMessages: [], toolMessages: [] });
                // Process tool messages first then non-tool messages
                const contentParts = [
                    // Convert tool messages to ToolCallParts first
                    ...toolMessages.map((toolMessage) => new vscode.LanguageModelToolCallPart(toolMessage.id, toolMessage.name, asObjectSafe(toolMessage.input))),
                    // Convert non-tool messages to TextParts after tool messages
                    ...nonToolMessages.map((part) => {
                        if (part.type === "image") {
                            return new vscode.LanguageModelTextPart("[Image generation not supported by VSCode LM API]");
                        }
                        return new vscode.LanguageModelTextPart(part.text);
                    }),
                ];
                // Add the assistant message to the list of messages
                vsCodeLmMessages.push(vscode.LanguageModelChatMessage.Assistant(contentParts));
                break;
            }
        }
    }
    return vsCodeLmMessages;
}
function convertToAnthropicRole(vsCodeLmMessageRole) {
    switch (vsCodeLmMessageRole) {
        case vscode.LanguageModelChatMessageRole.Assistant:
            return "assistant";
        case vscode.LanguageModelChatMessageRole.User:
            return "user";
        default:
            return null;
    }
}
async function convertToAnthropicMessage(vsCodeLmMessage) {
    const anthropicRole = convertToAnthropicRole(vsCodeLmMessage.role);
    if (anthropicRole !== "assistant") {
        throw new Error("Roo Code <Language Model API>: Only assistant messages are supported.");
    }
    return {
        id: crypto.randomUUID(),
        type: "message",
        model: "vscode-lm",
        role: anthropicRole,
        content: vsCodeLmMessage.content
            .map((part) => {
            if (part instanceof vscode.LanguageModelTextPart) {
                return {
                    type: "text",
                    text: part.value,
                };
            }
            if (part instanceof vscode.LanguageModelToolCallPart) {
                return {
                    type: "tool_use",
                    id: part.callId || crypto.randomUUID(),
                    name: part.name,
                    input: asObjectSafe(part.input),
                };
            }
            return null;
        })
            .filter((part) => part !== null),
        stop_reason: null,
        stop_sequence: null,
        usage: {
            input_tokens: 0,
            output_tokens: 0,
        },
    };
}
//# sourceMappingURL=vscode-lm-format.js.map