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
exports.OpenAiHandler = exports.DEEP_SEEK_DEFAULT_TEMPERATURE = void 0;
const openai_1 = __importStar(require("openai"));
const api_1 = require("../../shared/api");
const openai_format_1 = require("../transform/openai-format");
const r1_format_1 = require("../transform/r1-format");
const simple_format_1 = require("../transform/simple-format");
exports.DEEP_SEEK_DEFAULT_TEMPERATURE = 0.6;
const OPENAI_DEFAULT_TEMPERATURE = 0;
class OpenAiHandler {
    options;
    client;
    constructor(options) {
        this.options = options;
        const baseURL = this.options.openAiBaseUrl ?? "https://api.openai.com/v1";
        const apiKey = this.options.openAiApiKey ?? "not-provided";
        let urlHost;
        try {
            urlHost = new URL(this.options.openAiBaseUrl ?? "").host;
        }
        catch (error) {
            // Likely an invalid `openAiBaseUrl`; we're still working on
            // proper settings validation.
            urlHost = "";
        }
        if (urlHost === "azure.com" || urlHost.endsWith(".azure.com") || options.openAiUseAzure) {
            // Azure API shape slightly differs from the core API shape:
            // https://github.com/openai/openai-node?tab=readme-ov-file#microsoft-azure-openai
            this.client = new openai_1.AzureOpenAI({
                baseURL,
                apiKey,
                apiVersion: this.options.azureApiVersion || api_1.azureOpenAiDefaultApiVersion,
            });
        }
        else {
            this.client = new openai_1.default({ baseURL, apiKey, defaultHeaders: this.options.defaultHeaders });
        }
    }
    async *createMessage(systemPrompt, messages) {
        const modelInfo = this.getModel().info;
        const modelUrl = this.options.openAiBaseUrl ?? "";
        const modelId = this.options.openAiModelId ?? "";
        const deepseekReasoner = modelId.includes("deepseek-reasoner");
        const ark = modelUrl.includes(".volces.com");
        if (this.options.openAiStreamingEnabled ?? true) {
            const systemMessage = {
                role: "system",
                content: systemPrompt,
            };
            let convertedMessages;
            if (deepseekReasoner) {
                convertedMessages = (0, r1_format_1.convertToR1Format)([{ role: "user", content: systemPrompt }, ...messages]);
            }
            else if (ark) {
                convertedMessages = [systemMessage, ...(0, simple_format_1.convertToSimpleMessages)(messages)];
            }
            else {
                convertedMessages = [systemMessage, ...(0, openai_format_1.convertToOpenAiMessages)(messages)];
            }
            const requestOptions = {
                model: modelId,
                temperature: this.options.modelTemperature ??
                    (deepseekReasoner ? exports.DEEP_SEEK_DEFAULT_TEMPERATURE : OPENAI_DEFAULT_TEMPERATURE),
                messages: convertedMessages,
                stream: true,
                stream_options: { include_usage: true },
            };
            if (this.options.includeMaxTokens) {
                requestOptions.max_tokens = modelInfo.maxTokens;
            }
            const stream = await this.client.chat.completions.create(requestOptions);
            for await (const chunk of stream) {
                const delta = chunk.choices[0]?.delta ?? {};
                if (delta.content) {
                    yield {
                        type: "text",
                        text: delta.content,
                    };
                }
                if ("reasoning_content" in delta && delta.reasoning_content) {
                    yield {
                        type: "reasoning",
                        text: delta.reasoning_content || "",
                    };
                }
                if (chunk.usage) {
                    yield this.processUsageMetrics(chunk.usage);
                }
            }
        }
        else {
            // o1 for instance doesnt support streaming, non-1 temp, or system prompt
            const systemMessage = {
                role: "user",
                content: systemPrompt,
            };
            const requestOptions = {
                model: modelId,
                messages: deepseekReasoner
                    ? (0, r1_format_1.convertToR1Format)([{ role: "user", content: systemPrompt }, ...messages])
                    : [systemMessage, ...(0, openai_format_1.convertToOpenAiMessages)(messages)],
            };
            const response = await this.client.chat.completions.create(requestOptions);
            yield {
                type: "text",
                text: response.choices[0]?.message.content || "",
            };
            yield this.processUsageMetrics(response.usage);
        }
    }
    processUsageMetrics(usage) {
        return {
            type: "usage",
            inputTokens: usage?.prompt_tokens || 0,
            outputTokens: usage?.completion_tokens || 0,
        };
    }
    getModel() {
        return {
            id: this.options.openAiModelId ?? "",
            info: this.options.openAiCustomModelInfo ?? api_1.openAiModelInfoSaneDefaults,
        };
    }
    async completePrompt(prompt) {
        try {
            const requestOptions = {
                model: this.getModel().id,
                messages: [{ role: "user", content: prompt }],
            };
            const response = await this.client.chat.completions.create(requestOptions);
            return response.choices[0]?.message.content || "";
        }
        catch (error) {
            if (error instanceof Error) {
                throw new Error(`OpenAI completion error: ${error.message}`);
            }
            throw error;
        }
    }
}
exports.OpenAiHandler = OpenAiHandler;
//# sourceMappingURL=openai.js.map