"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaHandler = void 0;
const openai_1 = __importDefault(require("openai"));
const api_1 = require("../../shared/api");
const openai_format_1 = require("../transform/openai-format");
const r1_format_1 = require("../transform/r1-format");
const openai_2 = require("./openai");
const OLLAMA_DEFAULT_TEMPERATURE = 0;
class OllamaHandler {
    options;
    client;
    constructor(options) {
        this.options = options;
        this.client = new openai_1.default({
            baseURL: (this.options.ollamaBaseUrl || "http://localhost:11434") + "/v1",
            apiKey: "ollama",
        });
    }
    async *createMessage(systemPrompt, messages) {
        const modelId = this.getModel().id;
        const useR1Format = modelId.toLowerCase().includes("deepseek-r1");
        const openAiMessages = [
            { role: "system", content: systemPrompt },
            ...(useR1Format ? (0, r1_format_1.convertToR1Format)(messages) : (0, openai_format_1.convertToOpenAiMessages)(messages)),
        ];
        const stream = await this.client.chat.completions.create({
            model: this.getModel().id,
            messages: openAiMessages,
            temperature: this.options.modelTemperature ?? OLLAMA_DEFAULT_TEMPERATURE,
            stream: true,
        });
        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;
            if (delta?.content) {
                yield {
                    type: "text",
                    text: delta.content,
                };
            }
        }
    }
    getModel() {
        return {
            id: this.options.ollamaModelId || "",
            info: api_1.openAiModelInfoSaneDefaults,
        };
    }
    async completePrompt(prompt) {
        try {
            const modelId = this.getModel().id;
            const useR1Format = modelId.toLowerCase().includes("deepseek-r1");
            const response = await this.client.chat.completions.create({
                model: this.getModel().id,
                messages: useR1Format
                    ? (0, r1_format_1.convertToR1Format)([{ role: "user", content: prompt }])
                    : [{ role: "user", content: prompt }],
                temperature: this.options.modelTemperature ??
                    (useR1Format ? openai_2.DEEP_SEEK_DEFAULT_TEMPERATURE : OLLAMA_DEFAULT_TEMPERATURE),
                stream: false,
            });
            return response.choices[0]?.message.content || "";
        }
        catch (error) {
            if (error instanceof Error) {
                throw new Error(`Ollama completion error: ${error.message}`);
            }
            throw error;
        }
    }
}
exports.OllamaHandler = OllamaHandler;
//# sourceMappingURL=ollama.js.map