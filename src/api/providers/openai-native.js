"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAiNativeHandler = void 0;
const openai_1 = __importDefault(require("openai"));
const api_1 = require("../../shared/api");
const openai_format_1 = require("../transform/openai-format");
const OPENAI_NATIVE_DEFAULT_TEMPERATURE = 0;
class OpenAiNativeHandler {
    options;
    client;
    constructor(options) {
        this.options = options;
        const apiKey = this.options.openAiNativeApiKey ?? "not-provided";
        this.client = new openai_1.default({ apiKey });
    }
    async *createMessage(systemPrompt, messages) {
        const modelId = this.getModel().id;
        if (modelId.startsWith("o1")) {
            yield* this.handleO1FamilyMessage(modelId, systemPrompt, messages);
            return;
        }
        if (modelId.startsWith("o3-mini")) {
            yield* this.handleO3FamilyMessage(modelId, systemPrompt, messages);
            return;
        }
        yield* this.handleDefaultModelMessage(modelId, systemPrompt, messages);
    }
    async *handleO1FamilyMessage(modelId, systemPrompt, messages) {
        // o1 supports developer prompt with formatting
        // o1-preview and o1-mini only support user messages
        const isOriginalO1 = modelId === "o1";
        const response = await this.client.chat.completions.create({
            model: modelId,
            messages: [
                {
                    role: isOriginalO1 ? "developer" : "user",
                    content: isOriginalO1 ? `Formatting re-enabled\n${systemPrompt}` : systemPrompt,
                },
                ...(0, openai_format_1.convertToOpenAiMessages)(messages),
            ],
            stream: true,
            stream_options: { include_usage: true },
        });
        yield* this.handleStreamResponse(response);
    }
    async *handleO3FamilyMessage(modelId, systemPrompt, messages) {
        const stream = await this.client.chat.completions.create({
            model: "o3-mini",
            messages: [
                {
                    role: "developer",
                    content: `Formatting re-enabled\n${systemPrompt}`,
                },
                ...(0, openai_format_1.convertToOpenAiMessages)(messages),
            ],
            stream: true,
            stream_options: { include_usage: true },
            reasoning_effort: this.getModel().info.reasoningEffort,
        });
        yield* this.handleStreamResponse(stream);
    }
    async *handleDefaultModelMessage(modelId, systemPrompt, messages) {
        const stream = await this.client.chat.completions.create({
            model: modelId,
            temperature: this.options.modelTemperature ?? OPENAI_NATIVE_DEFAULT_TEMPERATURE,
            messages: [{ role: "system", content: systemPrompt }, ...(0, openai_format_1.convertToOpenAiMessages)(messages)],
            stream: true,
            stream_options: { include_usage: true },
        });
        yield* this.handleStreamResponse(stream);
    }
    async *yieldResponseData(response) {
        yield {
            type: "text",
            text: response.choices[0]?.message.content || "",
        };
        yield {
            type: "usage",
            inputTokens: response.usage?.prompt_tokens || 0,
            outputTokens: response.usage?.completion_tokens || 0,
        };
    }
    async *handleStreamResponse(stream) {
        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;
            if (delta?.content) {
                yield {
                    type: "text",
                    text: delta.content,
                };
            }
            if (chunk.usage) {
                yield {
                    type: "usage",
                    inputTokens: chunk.usage.prompt_tokens || 0,
                    outputTokens: chunk.usage.completion_tokens || 0,
                };
            }
        }
    }
    getModel() {
        const modelId = this.options.apiModelId;
        if (modelId && modelId in api_1.openAiNativeModels) {
            const id = modelId;
            return { id, info: api_1.openAiNativeModels[id] };
        }
        return { id: api_1.openAiNativeDefaultModelId, info: api_1.openAiNativeModels[api_1.openAiNativeDefaultModelId] };
    }
    async completePrompt(prompt) {
        try {
            const modelId = this.getModel().id;
            let requestOptions;
            if (modelId.startsWith("o1")) {
                requestOptions = this.getO1CompletionOptions(modelId, prompt);
            }
            else if (modelId.startsWith("o3-mini")) {
                requestOptions = this.getO3CompletionOptions(modelId, prompt);
            }
            else {
                requestOptions = this.getDefaultCompletionOptions(modelId, prompt);
            }
            const response = await this.client.chat.completions.create(requestOptions);
            return response.choices[0]?.message.content || "";
        }
        catch (error) {
            if (error instanceof Error) {
                throw new Error(`OpenAI Native completion error: ${error.message}`);
            }
            throw error;
        }
    }
    getO1CompletionOptions(modelId, prompt) {
        return {
            model: modelId,
            messages: [{ role: "user", content: prompt }],
        };
    }
    getO3CompletionOptions(modelId, prompt) {
        return {
            model: "o3-mini",
            messages: [{ role: "user", content: prompt }],
            reasoning_effort: this.getModel().info.reasoningEffort,
        };
    }
    getDefaultCompletionOptions(modelId, prompt) {
        return {
            model: modelId,
            messages: [{ role: "user", content: prompt }],
            temperature: this.options.modelTemperature ?? OPENAI_NATIVE_DEFAULT_TEMPERATURE,
        };
    }
}
exports.OpenAiNativeHandler = OpenAiNativeHandler;
//# sourceMappingURL=openai-native.js.map