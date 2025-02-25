"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildApiHandler = buildApiHandler;
const glama_1 = require("./providers/glama");
const anthropic_1 = require("./providers/anthropic");
const bedrock_1 = require("./providers/bedrock");
const openrouter_1 = require("./providers/openrouter");
const vertex_1 = require("./providers/vertex");
const openai_1 = require("./providers/openai");
const ollama_1 = require("./providers/ollama");
const lmstudio_1 = require("./providers/lmstudio");
const gemini_1 = require("./providers/gemini");
const openai_native_1 = require("./providers/openai-native");
const deepseek_1 = require("./providers/deepseek");
const mistral_1 = require("./providers/mistral");
const vscode_lm_1 = require("./providers/vscode-lm");
const unbound_1 = require("./providers/unbound");
const requesty_1 = require("./providers/requesty");
function buildApiHandler(configuration) {
    const { apiProvider, ...options } = configuration;
    switch (apiProvider) {
        case "anthropic":
            return new anthropic_1.AnthropicHandler(options);
        case "glama":
            return new glama_1.GlamaHandler(options);
        case "openrouter":
            return new openrouter_1.OpenRouterHandler(options);
        case "bedrock":
            return new bedrock_1.AwsBedrockHandler(options);
        case "vertex":
            return new vertex_1.VertexHandler(options);
        case "openai":
            return new openai_1.OpenAiHandler(options);
        case "ollama":
            return new ollama_1.OllamaHandler(options);
        case "lmstudio":
            return new lmstudio_1.LmStudioHandler(options);
        case "gemini":
            return new gemini_1.GeminiHandler(options);
        case "openai-native":
            return new openai_native_1.OpenAiNativeHandler(options);
        case "deepseek":
            return new deepseek_1.DeepSeekHandler(options);
        case "vscode-lm":
            return new vscode_lm_1.VsCodeLmHandler(options);
        case "mistral":
            return new mistral_1.MistralHandler(options);
        case "unbound":
            return new unbound_1.UnboundHandler(options);
        case "requesty":
            return new requesty_1.RequestyHandler(options);
        default:
            return new anthropic_1.AnthropicHandler(options);
    }
}
//# sourceMappingURL=index.js.map