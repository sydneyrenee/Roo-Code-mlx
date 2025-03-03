import { Anthropic } from "@anthropic-ai/sdk"
import * as vscode from "vscode"
import { ApiConfiguration, ApiProvider, ModelInfo } from "../../shared/api"
import { ApiConfigMeta } from "../../shared/ExtensionMessage"
import { HistoryItem } from "../../shared/HistoryItem"
import { Mode } from "../../shared/modes"
import { ExperimentId } from "../../shared/experiments"

export type SecretKey =
	| "apiKey"
	| "glamaApiKey"
	| "openRouterApiKey"
	| "awsAccessKey"
	| "awsSecretKey"
	| "awsSessionToken"
	| "openAiApiKey"
	| "geminiApiKey"
	| "openAiNativeApiKey"
	| "deepSeekApiKey"
	| "mistralApiKey"
	| "unboundApiKey"
	| "requestyApiKey"

export type GlobalStateKey =
	| "apiProvider"
	| "apiModelId"
	| "glamaModelId"
	| "glamaModelInfo"
	| "awsRegion"
	| "awsUseCrossRegionInference"
	| "awsProfile"
	| "awsUseProfile"
	| "vertexProjectId"
	| "vertexRegion"
	| "lastShownAnnouncementId"
	| "customInstructions"
	| "alwaysAllowReadOnly"
	| "alwaysAllowWrite"
	| "alwaysAllowExecute"
	| "alwaysAllowBrowser"
	| "alwaysAllowMcp"
	| "alwaysAllowModeSwitch"
	| "taskHistory"
	| "openAiBaseUrl"
	| "openAiModelId"
	| "openAiCustomModelInfo"
	| "openAiUseAzure"
	| "ollamaModelId"
	| "ollamaBaseUrl"
	| "lmStudioModelId"
	| "lmStudioBaseUrl"
	| "anthropicBaseUrl"
	| "azureApiVersion"
	| "openAiStreamingEnabled"
	| "openRouterModelId"
	| "openRouterModelInfo"
	| "openRouterBaseUrl"
	| "openRouterUseMiddleOutTransform"
	| "allowedCommands"
	| "soundEnabled"
	| "soundVolume"
	| "diffEnabled"
	| "checkpointsEnabled"
	| "browserViewportSize"
	| "screenshotQuality"
	| "fuzzyMatchThreshold"
	| "preferredLanguage" // Language setting for Cline's communication
	| "writeDelayMs"
	| "terminalOutputLineLimit"
	| "mcpEnabled"
	| "enableMcpServerCreation"
	| "alwaysApproveResubmit"
	| "requestDelaySeconds"
	| "rateLimitSeconds"
	| "currentApiConfigName"
	| "listApiConfigMeta"
	| "vsCodeLmModelSelector"
	| "mode"
	| "modeApiConfigs"
	| "customModePrompts"
	| "customSupportPrompts"
	| "enhancementApiConfigId"
	| "experiments" // Map of experiment IDs to their enabled state
	| "autoApprovalEnabled"
	| "customModes" // Array of custom modes
	| "unboundModelId"
	| "requestyModelId"
	| "requestyModelInfo"
	| "unboundModelInfo"
	| "modelTemperature"
	| "mistralCodestralUrl"
	| "maxOpenTabsContext"

export const GlobalFileNames = {
	apiConversationHistory: "api_conversation_history.json",
	uiMessages: "ui_messages.json",
	glamaModels: "glama_models.json",
	openRouterModels: "openrouter_models.json",
	requestyModels: "requesty_models.json",
	mcpSettings: "cline_mcp_settings.json",
	unboundModels: "unbound_models.json",
}

export interface TaskData {
	historyItem: HistoryItem
	taskDirPath: string
	apiConversationHistoryFilePath: string
	uiMessagesFilePath: string
	apiConversationHistory: Anthropic.MessageParam[]
}

export interface StateData {
	apiConfiguration: ApiConfiguration
	lastShownAnnouncementId?: string
	customInstructions?: string
	alwaysAllowReadOnly: boolean
	alwaysAllowWrite: boolean
	alwaysAllowExecute: boolean
	alwaysAllowBrowser: boolean
	alwaysAllowMcp: boolean
	alwaysAllowModeSwitch: boolean
	taskHistory?: HistoryItem[]
	allowedCommands?: string[]
	soundEnabled: boolean
	diffEnabled: boolean
	checkpointsEnabled: boolean
	soundVolume?: number
	browserViewportSize?: string
	screenshotQuality?: number
	fuzzyMatchThreshold: number
	writeDelayMs: number
	terminalOutputLineLimit: number
	preferredLanguage: string
	mcpEnabled: boolean
	enableMcpServerCreation: boolean
	alwaysApproveResubmit: boolean
	requestDelaySeconds: number
	rateLimitSeconds: number
	currentApiConfigName?: string
	listApiConfigMeta?: ApiConfigMeta[]
	modeApiConfigs: Record<Mode, string>
	mode: Mode
	customModePrompts?: Record<string, any>
	customSupportPrompts?: Record<string, any>
	enhancementApiConfigId?: string
	experiments?: Record<ExperimentId, boolean>
	autoApprovalEnabled: boolean
	customModes?: any[]
	maxOpenTabsContext: number
}