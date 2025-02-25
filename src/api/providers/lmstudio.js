"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LmStudioHandler = void 0;
const openai_1 = __importDefault(require("openai"));
const api_1 = require("../../shared/api");
const openai_format_1 = require("../transform/openai-format");
const LMSTUDIO_DEFAULT_TEMPERATURE = 0;
class LmStudioHandler {
    options;
    client;
    constructor(options) {
        this.options = options;
        this.client = new openai_1.default({
            baseURL: (this.options.lmStudioBaseUrl || "http://localhost:1234") + "/v1",
            apiKey: "noop",
        });
    }
    async *createMessage(systemPrompt, messages) {
        const openAiMessages = [
            { role: "system", content: systemPrompt },
            ...(0, openai_format_1.convertToOpenAiMessages)(messages),
        ];
        try {
            const stream = await this.client.chat.completions.create({
                model: this.getModel().id,
                messages: openAiMessages,
                temperature: this.options.modelTemperature ?? LMSTUDIO_DEFAULT_TEMPERATURE,
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
        catch (error) {
            // LM Studio doesn't return an error code/body for now
            throw new Error("Please check the LM Studio developer logs to debug what went wrong. You may need to load the model with a larger context length to work with Roo Code's prompts.");
        }
    }
    getModel() {
        return {
            id: this.options.lmStudioModelId || "",
            info: api_1.openAiModelInfoSaneDefaults,
        };
    }
    async completePrompt(prompt) {
        try {
            const response = await this.client.chat.completions.create({
                model: this.getModel().id,
                messages: [{ role: "user", content: prompt }],
                temperature: this.options.modelTemperature ?? LMSTUDIO_DEFAULT_TEMPERATURE,
                stream: false,
            });
            return response.choices[0]?.message.content || "";
        }
        catch (error) {
            throw new Error("Please check the LM Studio developer logs to debug what went wrong. You may need to load the model with a larger context length to work with Roo Code's prompts.");
        }
    }
}
exports.LmStudioHandler = LmStudioHandler;
//# sourceMappingURL=lmstudio.js.map