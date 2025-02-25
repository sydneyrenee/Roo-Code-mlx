"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiHandler = void 0;
const generative_ai_1 = require("@google/generative-ai");
const api_1 = require("../../shared/api");
const gemini_format_1 = require("../transform/gemini-format");
const GEMINI_DEFAULT_TEMPERATURE = 0;
class GeminiHandler {
    options;
    client;
    constructor(options) {
        this.options = options;
        this.client = new generative_ai_1.GoogleGenerativeAI(options.geminiApiKey ?? "not-provided");
    }
    async *createMessage(systemPrompt, messages) {
        const model = this.client.getGenerativeModel({
            model: this.getModel().id,
            systemInstruction: systemPrompt,
        });
        const result = await model.generateContentStream({
            contents: messages.map(gemini_format_1.convertAnthropicMessageToGemini),
            generationConfig: {
                // maxOutputTokens: this.getModel().info.maxTokens,
                temperature: this.options.modelTemperature ?? GEMINI_DEFAULT_TEMPERATURE,
            },
        });
        for await (const chunk of result.stream) {
            yield {
                type: "text",
                text: chunk.text(),
            };
        }
        const response = await result.response;
        yield {
            type: "usage",
            inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
            outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
        };
    }
    getModel() {
        const modelId = this.options.apiModelId;
        if (modelId && modelId in api_1.geminiModels) {
            const id = modelId;
            return { id, info: api_1.geminiModels[id] };
        }
        return { id: api_1.geminiDefaultModelId, info: api_1.geminiModels[api_1.geminiDefaultModelId] };
    }
    async completePrompt(prompt) {
        try {
            const model = this.client.getGenerativeModel({
                model: this.getModel().id,
            });
            const result = await model.generateContent({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: this.options.modelTemperature ?? GEMINI_DEFAULT_TEMPERATURE,
                },
            });
            return result.response.text();
        }
        catch (error) {
            if (error instanceof Error) {
                throw new Error(`Gemini completion error: ${error.message}`);
            }
            throw error;
        }
    }
}
exports.GeminiHandler = GeminiHandler;
//# sourceMappingURL=gemini.js.map