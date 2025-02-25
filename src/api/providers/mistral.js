"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MistralHandler = void 0;
const mistralai_1 = require("@mistralai/mistralai");
const api_1 = require("../../shared/api");
const mistral_format_1 = require("../transform/mistral-format");
const MISTRAL_DEFAULT_TEMPERATURE = 0;
class MistralHandler {
    options;
    client;
    constructor(options) {
        if (!options.mistralApiKey) {
            throw new Error("Mistral API key is required");
        }
        this.options = options;
        const baseUrl = this.getBaseUrl();
        console.debug(`[Roo Code] MistralHandler using baseUrl: ${baseUrl}`);
        this.client = new mistralai_1.Mistral({
            serverURL: baseUrl,
            apiKey: this.options.mistralApiKey,
        });
    }
    getBaseUrl() {
        const modelId = this.options.apiModelId ?? api_1.mistralDefaultModelId;
        if (modelId?.startsWith("codestral-")) {
            return this.options.mistralCodestralUrl || "https://codestral.mistral.ai";
        }
        return "https://api.mistral.ai";
    }
    async *createMessage(systemPrompt, messages) {
        const response = await this.client.chat.stream({
            model: this.options.apiModelId || api_1.mistralDefaultModelId,
            messages: (0, mistral_format_1.convertToMistralMessages)(messages),
            maxTokens: this.options.includeMaxTokens ? this.getModel().info.maxTokens : undefined,
            temperature: this.options.modelTemperature ?? MISTRAL_DEFAULT_TEMPERATURE,
        });
        for await (const chunk of response) {
            const delta = chunk.data.choices[0]?.delta;
            if (delta?.content) {
                let content = "";
                if (typeof delta.content === "string") {
                    content = delta.content;
                }
                else if (Array.isArray(delta.content)) {
                    content = delta.content.map((c) => (c.type === "text" ? c.text : "")).join("");
                }
                yield {
                    type: "text",
                    text: content,
                };
            }
            if (chunk.data.usage) {
                yield {
                    type: "usage",
                    inputTokens: chunk.data.usage.promptTokens || 0,
                    outputTokens: chunk.data.usage.completionTokens || 0,
                };
            }
        }
    }
    getModel() {
        const modelId = this.options.apiModelId;
        if (modelId && modelId in api_1.mistralModels) {
            const id = modelId;
            return { id, info: api_1.mistralModels[id] };
        }
        return {
            id: api_1.mistralDefaultModelId,
            info: api_1.mistralModels[api_1.mistralDefaultModelId],
        };
    }
    async completePrompt(prompt) {
        try {
            const response = await this.client.chat.complete({
                model: this.options.apiModelId || api_1.mistralDefaultModelId,
                messages: [{ role: "user", content: prompt }],
                temperature: this.options.modelTemperature ?? MISTRAL_DEFAULT_TEMPERATURE,
            });
            const content = response.choices?.[0]?.message.content;
            if (Array.isArray(content)) {
                return content.map((c) => (c.type === "text" ? c.text : "")).join("");
            }
            return content || "";
        }
        catch (error) {
            if (error instanceof Error) {
                throw new Error(`Mistral completion error: ${error.message}`);
            }
            throw error;
        }
    }
}
exports.MistralHandler = MistralHandler;
//# sourceMappingURL=mistral.js.map