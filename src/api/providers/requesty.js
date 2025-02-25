"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestyHandler = void 0;
const openai_1 = require("./openai");
const api_1 = require("../../shared/api");
class RequestyHandler extends openai_1.OpenAiHandler {
    constructor(options) {
        if (!options.requestyApiKey) {
            throw new Error("Requesty API key is required. Please provide it in the settings.");
        }
        super({
            ...options,
            openAiApiKey: options.requestyApiKey,
            openAiModelId: options.requestyModelId ?? api_1.requestyDefaultModelId,
            openAiBaseUrl: "https://router.requesty.ai/v1",
            openAiCustomModelInfo: options.requestyModelInfo ?? api_1.requestyModelInfoSaneDefaults,
            defaultHeaders: {
                "HTTP-Referer": "https://github.com/RooVetGit/Roo-Cline",
                "X-Title": "Roo Code",
            },
        });
    }
    getModel() {
        const modelId = this.options.requestyModelId ?? api_1.requestyDefaultModelId;
        return {
            id: modelId,
            info: this.options.requestyModelInfo ?? api_1.requestyModelInfoSaneDefaults,
        };
    }
    processUsageMetrics(usage) {
        return {
            type: "usage",
            inputTokens: usage?.prompt_tokens || 0,
            outputTokens: usage?.completion_tokens || 0,
            cacheWriteTokens: usage?.cache_creation_input_tokens,
            cacheReadTokens: usage?.cache_read_input_tokens,
        };
    }
}
exports.RequestyHandler = RequestyHandler;
//# sourceMappingURL=requesty.js.map