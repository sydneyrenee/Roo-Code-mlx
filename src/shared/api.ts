import * as vscode from "vscode"

export type ApiProvider =
	| "anthropic"
	| "glama"
	| "openrouter"
	| "bedrock"
	| "vertex"
	| "openai"
	| "ollama"
	| "lmstudio"
	| "gemini"
	| "openai-native"
	| "deepseek"
	| "vscode-lm"
	| "mistral"
	| "unbound"
	| "requesty"

export interface ModelInfo {
	maxTokens?: number
	contextWindow: number
	supportsImages?: boolean
	supportsComputerUse?: boolean
	supportsPromptCache: boolean
	inputPrice?: number
	outputPrice?: number
	cacheWritesPrice?: number
	cacheReadsPrice?: number
	description?: string
	reasoningEffort?: "low" | "medium" | "high"
}

export interface MessageContent {
	type: "text" | "image" | "tool_use" | "tool_result" | "video"
	text?: string
	image?: {
		url: string
		detail?: "low" | "high" | "auto"
	}
	source?: {
		data: string | Uint8Array
		media_type: string
	}
	name?: string
	input?: Record<string, any>
	content?: { type: string; text: string }[]
	output?: string | { type: string; text: string }[]
	s3Location?: {
		uri: string
		bucketOwner: string
	}
	id?: string
	tool_use_id?: string
}

export interface ApiHandlerOptions {
	apiModelId?: string
	apiKey?: string // anthropic
	anthropicBaseUrl?: string
	vsCodeLmModelSelector?: vscode.LanguageModelChatSelector
	glamaModelId?: string
	glamaModelInfo?: ModelInfo
	glamaApiKey?: string
	openRouterApiKey?: string
	openRouterModelId?: string
	openRouterModelInfo?: ModelInfo
	openRouterBaseUrl?: string
	awsAccessKey?: string
	awsSecretKey?: string
	awsSessionToken?: string
	awsRegion?: string
	awsUseCrossRegionInference?: boolean
	awsUsePromptCache?: boolean
	awspromptCacheId?: string
	awsProfile?: string
	awsUseProfile?: boolean
	vertexProjectId?: string
	vertexRegion?: string
	vertexContext?: string
	openAiBaseUrl?: string
	openAiApiKey?: string
	openAiModelId?: string
	openAiCustomModelInfo?: ModelInfo
	openAiUseAzure?: boolean
	ollamaModelId?: string
	ollamaBaseUrl?: string
	lmStudioModelId?: string
	lmStudioBaseUrl?: string
	geminiApiKey?: string
	openAiNativeApiKey?: string
	mistralApiKey?: string
	mistralCodestralUrl?: string // New option for Codestral URL
	azureApiVersion?: string
	openRouterUseMiddleOutTransform?: boolean
	openAiStreamingEnabled?: boolean
	setAzureApiVersion?: boolean
	deepSeekBaseUrl?: string
	deepSeekApiKey?: string
	includeMaxTokens?: boolean
	unboundApiKey?: string
	unboundModelId?: string
	unboundModelInfo?: ModelInfo
	requestyApiKey?: string
	requestyModelId?: string
	requestyModelInfo?: ModelInfo
	modelTemperature?: number
	temperature?: number;
}

export type ApiConfiguration = ApiHandlerOptions & {
	apiProvider?: ApiProvider
	id?: string // stable unique identifier
}

// Default model info
export const openAiModelInfoSaneDefaults: ModelInfo = {
	maxTokens: -1,
	contextWindow: 128_000,
	supportsImages: true,
	supportsPromptCache: false,
	inputPrice: 0,
	outputPrice: 0
}

export const glamaDefaultModelInfo: ModelInfo = {
	maxTokens: 8192,
	contextWindow: 200_000,
	supportsImages: true,
	supportsPromptCache: false,
	inputPrice: 0,
	outputPrice: 0
}

export const openRouterDefaultModelInfo: ModelInfo = {
	maxTokens: 4096,
	contextWindow: 8192,
	supportsImages: false,
	supportsPromptCache: true,
	inputPrice: 0,
	outputPrice: 0
}

export const requestyModelInfoSaneDefaults: ModelInfo = {
	maxTokens: 4096,
	contextWindow: 8192,
	supportsImages: false,
	supportsPromptCache: false,
	inputPrice: 0,
	outputPrice: 0
}

// Model definitions
export const anthropicModels = {
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
} as const satisfies Record<string, ModelInfo>

export const bedrockModels = {
	"anthropic.claude-3-sonnet-20240229-v1:0": {
		maxTokens: 8192,
		contextWindow: 200_000,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 3.0,
		outputPrice: 15.0
	}
} as const satisfies Record<string, ModelInfo>

// OpenAI Native
// https://openai.com/api/pricing/
export const openAiNativeModels = {
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
} as const satisfies Record<string, ModelInfo>

// DeepSeek
// https://platform.deepseek.com/docs/api
export const deepSeekModels = {
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
} as const satisfies Record<string, ModelInfo>

// Gemini
export const geminiModels = {
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
} as const satisfies Record<string, ModelInfo>

// Mistral
// https://docs.mistral.ai/getting-started/models/models_overview/
export const mistralModels = {
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
} as const satisfies Record<string, ModelInfo>

// Vertex AI Claude Models
export const vertexModels = {
	"claude-3-5-sonnet@20240620": {
		maxTokens: 8192,
		contextWindow: 200_000,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 3.0,
		outputPrice: 15.0,
		cacheWritesPrice: 3.75,  // $3.0 + 25%
		cacheReadsPrice: 0.30    // $3.0 - 90%
	},
	"claude-3-opus@20240229": {
		maxTokens: 4096,
		contextWindow: 200_000,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 15.0,
		outputPrice: 75.0,
		cacheWritesPrice: 18.75, // $15.0 + 25%
		cacheReadsPrice: 1.50    // $15.0 - 90%
	},
	"claude-3-haiku@20240307": {
		maxTokens: 4096,
		contextWindow: 200_000,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 0.25,
		outputPrice: 1.25,
		cacheWritesPrice: 0.30,  // $0.25 + 25%
		cacheReadsPrice: 0.03    // $0.25 - 90%
	}
} as const satisfies Record<string, ModelInfo>

// Model type definitions
export type AnthropicModelId = keyof typeof anthropicModels
export type BedrockModelId = keyof typeof bedrockModels
export type DeepSeekModelId = keyof typeof deepSeekModels
export type GeminiModelId = keyof typeof geminiModels
export type MistralModelId = keyof typeof mistralModels
export type OpenAiNativeModelId = keyof typeof openAiNativeModels
export type VertexModelId = keyof typeof vertexModels

// Azure API version
export const azureOpenAiDefaultApiVersion = "2024-08-01-preview"

// Default model IDs
export const anthropicDefaultModelId: AnthropicModelId = "claude-3-5-sonnet-20241022"
export const bedrockDefaultModelId: BedrockModelId = "anthropic.claude-3-sonnet-20240229-v1:0"
export const deepSeekDefaultModelId: DeepSeekModelId = "deepseek-chat"
export const geminiDefaultModelId: GeminiModelId = "gemini-2.0-flash-001"
export const glamaDefaultModelId = "anthropic/claude-3-5-sonnet"
export const mistralDefaultModelId: MistralModelId = "codestral-latest"
export const openAiNativeDefaultModelId: OpenAiNativeModelId = "gpt-4o"
export const openRouterDefaultModelId = "anthropic/claude-3.5-sonnet:beta"
export const requestyDefaultModelId = "anthropic/claude-3-sonnet"
export const requestyDefaultModelInfo = requestyModelInfoSaneDefaults
export const unboundDefaultModelId = "anthropic/claude-3-5-sonnet-20241022"
export const vertexDefaultModelId: VertexModelId = "claude-3-5-sonnet@20240620"

// Unbound Security
export const unboundDefaultModelInfo: ModelInfo = {
	maxTokens: 8192,
	contextWindow: 200_000,
	supportsImages: true,
	supportsPromptCache: true,
	inputPrice: 3.0,
	outputPrice: 15.0,
	cacheWritesPrice: 3.75,
	cacheReadsPrice: 0.3
}
