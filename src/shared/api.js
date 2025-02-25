"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unboundDefaultModelInfo = exports.vertexDefaultModelId = exports.unboundDefaultModelId = exports.requestyDefaultModelId = exports.openRouterDefaultModelId = exports.openAiNativeDefaultModelId = exports.mistralDefaultModelId = exports.glamaDefaultModelId = exports.geminiDefaultModelId = exports.deepSeekDefaultModelId = exports.bedrockDefaultModelId = exports.anthropicDefaultModelId = exports.azureOpenAiDefaultApiVersion = exports.vertexModels = exports.mistralModels = exports.geminiModels = exports.deepSeekModels = exports.openAiNativeModels = exports.bedrockModels = exports.anthropicModels = exports.requestyModelInfoSaneDefaults = exports.openRouterDefaultModelInfo = exports.glamaDefaultModelInfo = exports.openAiModelInfoSaneDefaults = void 0;
// Default model info
exports.openAiModelInfoSaneDefaults = {
    maxTokens: -1,
    contextWindow: 128_000,
    supportsImages: true,
    supportsPromptCache: false,
    inputPrice: 0,
    outputPrice: 0
};
exports.glamaDefaultModelInfo = {
    maxTokens: 8192,
    contextWindow: 200_000,
    supportsImages: true,
    supportsPromptCache: false,
    inputPrice: 0,
    outputPrice: 0
};
exports.openRouterDefaultModelInfo = {
    maxTokens: 4096,
    contextWindow: 8192,
    supportsImages: false,
    supportsPromptCache: true,
    inputPrice: 0,
    outputPrice: 0
};
exports.requestyModelInfoSaneDefaults = {
    maxTokens: 4096,
    contextWindow: 8192,
    supportsImages: false,
    supportsPromptCache: false,
    inputPrice: 0,
    outputPrice: 0
};
// Model definitions
exports.anthropicModels = {
    "claude-3-5-sonnet-20241022": {
        maxTokens: 8192,
        contextWindow: 200_000,
        supportsImages: true,
        supportsPromptCache: true,
        inputPrice: 3.0,
        outputPrice: 15.0,
        cacheWritesPrice: 3.75,
        cacheReadsPrice: 0.30
    },
    "claude-3-5-haiku-20241022": {
        maxTokens: 8192,
        contextWindow: 200_000,
        supportsImages: false,
        supportsPromptCache: true,
        inputPrice: 1.0,
        outputPrice: 5.0,
        cacheWritesPrice: 1.25,
        cacheReadsPrice: 0.10
    },
    "claude-3-opus-20240229": {
        maxTokens: 8192,
        contextWindow: 200_000,
        supportsImages: true,
        supportsPromptCache: true,
        inputPrice: 15.0,
        outputPrice: 75.0,
        cacheWritesPrice: 18.75,
        cacheReadsPrice: 1.50
    },
    "claude-3-haiku-20240307": {
        maxTokens: 8192,
        contextWindow: 200_000,
        supportsImages: true,
        supportsPromptCache: true,
        inputPrice: 0.25,
        outputPrice: 1.25,
        cacheWritesPrice: 0.30,
        cacheReadsPrice: 0.03
    }
};
exports.bedrockModels = {
    "anthropic.claude-3-sonnet-20240229-v1:0": {
        maxTokens: 8192,
        contextWindow: 200_000,
        supportsImages: true,
        supportsPromptCache: true,
        inputPrice: 3.0,
        outputPrice: 15.0
    }
};
// OpenAI Native
// https://openai.com/api/pricing/
exports.openAiNativeModels = {
    // don't support tool use yet
    "o3-mini": {
        maxTokens: 100_000,
        contextWindow: 200_000,
        supportsImages: false,
        supportsPromptCache: false,
        inputPrice: 1.1,
        outputPrice: 4.4,
        reasoningEffort: "medium"
    },
    "o3-mini-high": {
        maxTokens: 100_000,
        contextWindow: 200_000,
        supportsImages: false,
        supportsPromptCache: false,
        inputPrice: 1.1,
        outputPrice: 4.4,
        reasoningEffort: "high"
    },
    "o3-mini-low": {
        maxTokens: 100_000,
        contextWindow: 200_000,
        supportsImages: false,
        supportsPromptCache: false,
        inputPrice: 1.1,
        outputPrice: 4.4,
        reasoningEffort: "low"
    },
    "o1": {
        maxTokens: 100_000,
        contextWindow: 200_000,
        supportsImages: true,
        supportsPromptCache: false,
        inputPrice: 15,
        outputPrice: 60
    },
    "o1-preview": {
        maxTokens: 32_768,
        contextWindow: 128_000,
        supportsImages: true,
        supportsPromptCache: false,
        inputPrice: 15,
        outputPrice: 60
    },
    "o1-mini": {
        maxTokens: 65_536,
        contextWindow: 128_000,
        supportsImages: true,
        supportsPromptCache: false,
        inputPrice: 1.1,
        outputPrice: 4.4
    },
    "gpt-4o": {
        maxTokens: 4_096,
        contextWindow: 128_000,
        supportsImages: true,
        supportsPromptCache: false,
        inputPrice: 5,
        outputPrice: 15
    },
    "gpt-4o-mini": {
        maxTokens: 16_384,
        contextWindow: 128_000,
        supportsImages: true,
        supportsPromptCache: false,
        inputPrice: 0.15,
        outputPrice: 0.6
    }
};
// DeepSeek
// https://platform.deepseek.com/docs/api
exports.deepSeekModels = {
    "deepseek-chat": {
        maxTokens: 8192,
        contextWindow: 64_000,
        supportsImages: false,
        supportsPromptCache: false,
        inputPrice: 0.014, // $0.014 per million tokens
        outputPrice: 0.28, // $0.28 per million tokens
        description: `DeepSeek-V3 achieves a significant breakthrough in inference speed over previous models. It tops the leaderboard among open-source models and rivals the most advanced closed-source models globally.`
    },
    "deepseek-reasoner": {
        maxTokens: 8192,
        contextWindow: 64_000,
        supportsImages: false,
        supportsPromptCache: false,
        inputPrice: 0.55, // $0.55 per million tokens
        outputPrice: 2.19, // $2.19 per million tokens
        description: `DeepSeek-R1 achieves performance comparable to OpenAI-o1 across math, code, and reasoning tasks.`
    }
};
// Gemini
exports.geminiModels = {
    "gemini-2.0-flash-001": {
        maxTokens: 8192,
        contextWindow: 32_767,
        supportsImages: true,
        supportsPromptCache: false,
        inputPrice: 0,
        outputPrice: 0
    },
    "gemini-2.0-flash-thinking-exp-1219": {
        maxTokens: 8192,
        contextWindow: 32_767,
        supportsImages: true,
        supportsPromptCache: false,
        inputPrice: 0,
        outputPrice: 0
    }
};
// Mistral
// https://docs.mistral.ai/getting-started/models/models_overview/
exports.mistralModels = {
    "codestral-latest": {
        maxTokens: 256_000,
        contextWindow: 256_000,
        supportsImages: false,
        supportsPromptCache: false,
        inputPrice: 0.3,
        outputPrice: 0.9
    },
    "mistral-large-latest": {
        maxTokens: 131_000,
        contextWindow: 131_000,
        supportsImages: false,
        supportsPromptCache: false,
        inputPrice: 2.0,
        outputPrice: 6.0
    },
    "ministral-8b-latest": {
        maxTokens: 131_000,
        contextWindow: 131_000,
        supportsImages: false,
        supportsPromptCache: false,
        inputPrice: 0.1,
        outputPrice: 0.1
    },
    "ministral-3b-latest": {
        maxTokens: 131_000,
        contextWindow: 131_000,
        supportsImages: false,
        supportsPromptCache: false,
        inputPrice: 0.04,
        outputPrice: 0.04
    },
    "mistral-small-latest": {
        maxTokens: 32_000,
        contextWindow: 32_000,
        supportsImages: false,
        supportsPromptCache: false,
        inputPrice: 0.2,
        outputPrice: 0.6
    },
    "pixtral-large-latest": {
        maxTokens: 131_000,
        contextWindow: 131_000,
        supportsImages: true,
        supportsPromptCache: false,
        inputPrice: 2.0,
        outputPrice: 6.0
    }
};
// Vertex AI Claude Models
exports.vertexModels = {
    "claude-3-5-sonnet@20240620": {
        maxTokens: 8192,
        contextWindow: 200_000,
        supportsImages: true,
        supportsPromptCache: true,
        inputPrice: 3.0,
        outputPrice: 15.0,
        cacheWritesPrice: 3.75, // $3.0 + 25%
        cacheReadsPrice: 0.30 // $3.0 - 90%
    },
    "claude-3-opus@20240229": {
        maxTokens: 4096,
        contextWindow: 200_000,
        supportsImages: true,
        supportsPromptCache: true,
        inputPrice: 15.0,
        outputPrice: 75.0,
        cacheWritesPrice: 18.75, // $15.0 + 25%
        cacheReadsPrice: 1.50 // $15.0 - 90%
    },
    "claude-3-haiku@20240307": {
        maxTokens: 4096,
        contextWindow: 200_000,
        supportsImages: true,
        supportsPromptCache: true,
        inputPrice: 0.25,
        outputPrice: 1.25,
        cacheWritesPrice: 0.30, // $0.25 + 25%
        cacheReadsPrice: 0.03 // $0.25 - 90%
    }
};
// Azure API version
exports.azureOpenAiDefaultApiVersion = "2024-08-01-preview";
// Default model IDs
exports.anthropicDefaultModelId = "claude-3-5-sonnet-20241022";
exports.bedrockDefaultModelId = "anthropic.claude-3-sonnet-20240229-v1:0";
exports.deepSeekDefaultModelId = "deepseek-chat";
exports.geminiDefaultModelId = "gemini-2.0-flash-001";
exports.glamaDefaultModelId = "anthropic/claude-3-5-sonnet";
exports.mistralDefaultModelId = "codestral-latest";
exports.openAiNativeDefaultModelId = "gpt-4o";
exports.openRouterDefaultModelId = "anthropic/claude-3.5-sonnet:beta";
exports.requestyDefaultModelId = "anthropic/claude-3-sonnet";
exports.unboundDefaultModelId = "anthropic/claude-3-5-sonnet-20241022";
exports.vertexDefaultModelId = "claude-3-5-sonnet@20240620";
// Unbound Security
exports.unboundDefaultModelInfo = {
    maxTokens: 8192,
    contextWindow: 200_000,
    supportsImages: true,
    supportsPromptCache: true,
    inputPrice: 3.0,
    outputPrice: 15.0,
    cacheWritesPrice: 3.75,
    cacheReadsPrice: 0.3
};
//# sourceMappingURL=api.js.map