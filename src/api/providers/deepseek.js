"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeepSeekHandler = void 0;
const openai_1 = require("./openai");
const api_1 = require("../../shared/api");
class DeepSeekHandler extends openai_1.OpenAiHandler {
    constructor(options) {
        super({
            ...options,
            openAiApiKey: options.deepSeekApiKey ?? "not-provided",
            openAiModelId: options.apiModelId ?? api_1.deepSeekDefaultModelId,
            openAiBaseUrl: options.deepSeekBaseUrl ?? "https://api.deepseek.com/v1",
            openAiStreamingEnabled: true,
            includeMaxTokens: true,
        });
    }
    getModel() {
        const modelId = this.options.apiModelId ?? api_1.deepSeekDefaultModelId;
        return {
            id: modelId,
            info: api_1.deepSeekModels[modelId] || api_1.deepSeekModels[api_1.deepSeekDefaultModelId],
        };
    }
}
exports.DeepSeekHandler = DeepSeekHandler;
//# sourceMappingURL=deepseek.js.map