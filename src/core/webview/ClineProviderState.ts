import * as vscode from "vscode"
import { GlobalStateKey, SecretKey, StateData } from "./ClineProviderTypes"
import { ApiProvider, ModelInfo } from "../../shared/api"
import { HistoryItem } from "../../shared/HistoryItem"
import { Mode, defaultModeSlug } from "../../shared/modes"
import { experimentDefault } from "../../shared/experiments"

export class StateManager {
    constructor(private readonly context: vscode.ExtensionContext) {}

    async updateGlobalState(key: GlobalStateKey, value: any) {
        await this.context.globalState.update(key, value)
    }

    async getGlobalState(key: GlobalStateKey) {
        return await this.context.globalState.get(key)
    }

    async updateWorkspaceState(key: string, value: any) {
        await this.context.workspaceState.update(key, value)
    }

    async getWorkspaceState(key: string) {
        return await this.context.workspaceState.get(key)
    }

    async storeSecret(key: SecretKey, value?: string) {
        if (value) {
            await this.context.secrets.store(key, value)
        } else {
            await this.context.secrets.delete(key)
        }
    }

    async getSecret(key: SecretKey) {
        return await this.context.secrets.get(key)
    }

    async resetState() {
        const answer = await vscode.window.showInformationMessage(
            "Are you sure you want to reset all state and secret storage in the extension? This cannot be undone.",
            { modal: true },
            "Yes",
        )

        if (answer !== "Yes") {
            return false
        }

        for (const key of this.context.globalState.keys()) {
            await this.context.globalState.update(key, undefined)
        }
        
        const secretKeys: SecretKey[] = [
            "apiKey",
            "glamaApiKey",
            "openRouterApiKey",
            "awsAccessKey",
            "awsSecretKey",
            "awsSessionToken",
            "openAiApiKey",
            "geminiApiKey",
            "openAiNativeApiKey",
            "deepSeekApiKey",
            "mistralApiKey",
            "unboundApiKey",
            "requestyApiKey",
        ]
        
        for (const key of secretKeys) {
            await this.storeSecret(key, undefined)
        }
        
        return true
    }

    async getState(): Promise<StateData> {
        const [
            storedApiProvider,
            apiModelId,
            apiKey,
            glamaApiKey,
            glamaModelId,
            glamaModelInfo,
            openRouterApiKey,
            awsAccessKey,
            awsSecretKey,
            awsSessionToken,
            awsRegion,
            awsUseCrossRegionInference,
            awsProfile,
            awsUseProfile,
            vertexProjectId,
            vertexRegion,
            openAiBaseUrl,
            openAiApiKey,
            openAiModelId,
            openAiCustomModelInfo,
            openAiUseAzure,
            ollamaModelId,
            ollamaBaseUrl,
            lmStudioModelId,
            lmStudioBaseUrl,
            anthropicBaseUrl,
            geminiApiKey,
            openAiNativeApiKey,
            deepSeekApiKey,
            mistralApiKey,
            mistralCodestralUrl,
            azureApiVersion,
            openAiStreamingEnabled,
            openRouterModelId,
            openRouterModelInfo,
            openRouterBaseUrl,
            openRouterUseMiddleOutTransform,
            lastShownAnnouncementId,
            customInstructions,
            alwaysAllowReadOnly,
            alwaysAllowWrite,
            alwaysAllowExecute,
            alwaysAllowBrowser,
            alwaysAllowMcp,
            alwaysAllowModeSwitch,
            taskHistory,
            allowedCommands,
            soundEnabled,
            diffEnabled,
            checkpointsEnabled,
            soundVolume,
            browserViewportSize,
            fuzzyMatchThreshold,
            preferredLanguage,
            writeDelayMs,
            screenshotQuality,
            terminalOutputLineLimit,
            mcpEnabled,
            enableMcpServerCreation,
            alwaysApproveResubmit,
            requestDelaySeconds,
            rateLimitSeconds,
            currentApiConfigName,
            listApiConfigMeta,
            vsCodeLmModelSelector,
            mode,
            modeApiConfigs,
            customModePrompts,
            customSupportPrompts,
            enhancementApiConfigId,
            autoApprovalEnabled,
            customModes,
            experiments,
            unboundApiKey,
            unboundModelId,
            unboundModelInfo,
            requestyApiKey,
            requestyModelId,
            requestyModelInfo,
            modelTemperature,
            maxOpenTabsContext,
        ] = await Promise.all([
            this.getGlobalState("apiProvider") as Promise<ApiProvider | undefined>,
            this.getGlobalState("apiModelId") as Promise<string | undefined>,
            this.getSecret("apiKey") as Promise<string | undefined>,
            this.getSecret("glamaApiKey") as Promise<string | undefined>,
            this.getGlobalState("glamaModelId") as Promise<string | undefined>,
            this.getGlobalState("glamaModelInfo") as Promise<ModelInfo | undefined>,
            this.getSecret("openRouterApiKey") as Promise<string | undefined>,
            this.getSecret("awsAccessKey") as Promise<string | undefined>,
            this.getSecret("awsSecretKey") as Promise<string | undefined>,
            this.getSecret("awsSessionToken") as Promise<string | undefined>,
            this.getGlobalState("awsRegion") as Promise<string | undefined>,
            this.getGlobalState("awsUseCrossRegionInference") as Promise<boolean | undefined>,
            this.getGlobalState("awsProfile") as Promise<string | undefined>,
            this.getGlobalState("awsUseProfile") as Promise<boolean | undefined>,
            this.getGlobalState("vertexProjectId") as Promise<string | undefined>,
            this.getGlobalState("vertexRegion") as Promise<string | undefined>,
            this.getGlobalState("openAiBaseUrl") as Promise<string | undefined>,
            this.getSecret("openAiApiKey") as Promise<string | undefined>,
            this.getGlobalState("openAiModelId") as Promise<string | undefined>,
            this.getGlobalState("openAiCustomModelInfo") as Promise<ModelInfo | undefined>,
            this.getGlobalState("openAiUseAzure") as Promise<boolean | undefined>,
            this.getGlobalState("ollamaModelId") as Promise<string | undefined>,
            this.getGlobalState("ollamaBaseUrl") as Promise<string | undefined>,
            this.getGlobalState("lmStudioModelId") as Promise<string | undefined>,
            this.getGlobalState("lmStudioBaseUrl") as Promise<string | undefined>,
            this.getGlobalState("anthropicBaseUrl") as Promise<string | undefined>,
            this.getSecret("geminiApiKey") as Promise<string | undefined>,
            this.getSecret("openAiNativeApiKey") as Promise<string | undefined>,
            this.getSecret("deepSeekApiKey") as Promise<string | undefined>,
            this.getSecret("mistralApiKey") as Promise<string | undefined>,
            this.getGlobalState("mistralCodestralUrl") as Promise<string | undefined>,
            this.getGlobalState("azureApiVersion") as Promise<string | undefined>,
            this.getGlobalState("openAiStreamingEnabled") as Promise<boolean | undefined>,
            this.getGlobalState("openRouterModelId") as Promise<string | undefined>,
            this.getGlobalState("openRouterModelInfo") as Promise<ModelInfo | undefined>,
            this.getGlobalState("openRouterBaseUrl") as Promise<string | undefined>,
            this.getGlobalState("openRouterUseMiddleOutTransform") as Promise<boolean | undefined>,
            this.getGlobalState("lastShownAnnouncementId") as Promise<string | undefined>,
            this.getGlobalState("customInstructions") as Promise<string | undefined>,
            this.getGlobalState("alwaysAllowReadOnly") as Promise<boolean | undefined>,
            this.getGlobalState("alwaysAllowWrite") as Promise<boolean | undefined>,
            this.getGlobalState("alwaysAllowExecute") as Promise<boolean | undefined>,
            this.getGlobalState("alwaysAllowBrowser") as Promise<boolean | undefined>,
            this.getGlobalState("alwaysAllowMcp") as Promise<boolean | undefined>,
            this.getGlobalState("alwaysAllowModeSwitch") as Promise<boolean | undefined>,
            this.getGlobalState("taskHistory") as Promise<HistoryItem[] | undefined>,
            this.getGlobalState("allowedCommands") as Promise<string[] | undefined>,
            this.getGlobalState("soundEnabled") as Promise<boolean | undefined>,
            this.getGlobalState("diffEnabled") as Promise<boolean | undefined>,
            this.getGlobalState("checkpointsEnabled") as Promise<boolean | undefined>,
            this.getGlobalState("soundVolume") as Promise<number | undefined>,
            this.getGlobalState("browserViewportSize") as Promise<string | undefined>,
            this.getGlobalState("fuzzyMatchThreshold") as Promise<number | undefined>,
            this.getGlobalState("preferredLanguage") as Promise<string | undefined>,
            this.getGlobalState("writeDelayMs") as Promise<number | undefined>,
            this.getGlobalState("screenshotQuality") as Promise<number | undefined>,
            this.getGlobalState("terminalOutputLineLimit") as Promise<number | undefined>,
            this.getGlobalState("mcpEnabled") as Promise<boolean | undefined>,
            this.getGlobalState("enableMcpServerCreation") as Promise<boolean | undefined>,
            this.getGlobalState("alwaysApproveResubmit") as Promise<boolean | undefined>,
            this.getGlobalState("requestDelaySeconds") as Promise<number | undefined>,
            this.getGlobalState("rateLimitSeconds") as Promise<number | undefined>,
            this.getGlobalState("currentApiConfigName") as Promise<string | undefined>,
            this.getGlobalState("listApiConfigMeta") as Promise<any[] | undefined>,
            this.getGlobalState("vsCodeLmModelSelector") as Promise<vscode.LanguageModelChatSelector | undefined>,
            this.getGlobalState("mode") as Promise<Mode | undefined>,
            this.getGlobalState("modeApiConfigs") as Promise<Record<Mode, string> | undefined>,
            this.getGlobalState("customModePrompts") as Promise<Record<string, any> | undefined>,
            this.getGlobalState("customSupportPrompts") as Promise<Record<string, any> | undefined>,
            this.getGlobalState("enhancementApiConfigId") as Promise<string | undefined>,
            this.getGlobalState("autoApprovalEnabled") as Promise<boolean | undefined>,
            this.getGlobalState("customModes") as Promise<any[] | undefined>,
            this.getGlobalState("experiments") as Promise<Record<string, boolean> | undefined>,
            this.getSecret("unboundApiKey") as Promise<string | undefined>,
            this.getGlobalState("unboundModelId") as Promise<string | undefined>,
            this.getGlobalState("unboundModelInfo") as Promise<ModelInfo | undefined>,
            this.getSecret("requestyApiKey") as Promise<string | undefined>,
            this.getGlobalState("requestyModelId") as Promise<string | undefined>,
            this.getGlobalState("requestyModelInfo") as Promise<ModelInfo | undefined>,
            this.getGlobalState("modelTemperature") as Promise<number | undefined>,
            this.getGlobalState("maxOpenTabsContext") as Promise<number | undefined>,
        ])

        let apiProvider: ApiProvider
        if (storedApiProvider) {
            apiProvider = storedApiProvider
        } else {
            // Either new user or legacy user that doesn't have the apiProvider stored in state
            // (If they're using OpenRouter or Bedrock, then apiProvider state will exist)
            if (apiKey) {
                apiProvider = "anthropic"
            } else {
                // New users should default to openrouter
                apiProvider = "openrouter"
            }
        }

        return {
            apiConfiguration: {
                apiProvider,
                apiModelId,
                apiKey,
                glamaApiKey,
                glamaModelId,
                glamaModelInfo,
                openRouterApiKey,
                awsAccessKey,
                awsSecretKey,
                awsSessionToken,
                awsRegion,
                awsUseCrossRegionInference,
                awsProfile,
                awsUseProfile,
                vertexProjectId,
                vertexRegion,
                openAiBaseUrl,
                openAiApiKey,
                openAiModelId,
                openAiCustomModelInfo,
                openAiUseAzure,
                ollamaModelId,
                ollamaBaseUrl,
                lmStudioModelId,
                lmStudioBaseUrl,
                anthropicBaseUrl,
                geminiApiKey,
                openAiNativeApiKey,
                deepSeekApiKey,
                mistralApiKey,
                mistralCodestralUrl,
                azureApiVersion,
                openAiStreamingEnabled,
                openRouterModelId,
                openRouterModelInfo,
                openRouterBaseUrl,
                openRouterUseMiddleOutTransform,
                vsCodeLmModelSelector,
                unboundApiKey,
                unboundModelId,
                unboundModelInfo,
                requestyApiKey,
                requestyModelId,
                requestyModelInfo,
                modelTemperature,
            },
            lastShownAnnouncementId,
            customInstructions,
            alwaysAllowReadOnly: alwaysAllowReadOnly ?? false,
            alwaysAllowWrite: alwaysAllowWrite ?? false,
            alwaysAllowExecute: alwaysAllowExecute ?? false,
            alwaysAllowBrowser: alwaysAllowBrowser ?? false,
            alwaysAllowMcp: alwaysAllowMcp ?? false,
            alwaysAllowModeSwitch: alwaysAllowModeSwitch ?? false,
            taskHistory,
            allowedCommands,
            soundEnabled: soundEnabled ?? false,
            diffEnabled: diffEnabled ?? true,
            checkpointsEnabled: checkpointsEnabled ?? false,
            soundVolume,
            browserViewportSize: browserViewportSize ?? "900x600",
            screenshotQuality: screenshotQuality ?? 75,
            fuzzyMatchThreshold: fuzzyMatchThreshold ?? 1.0,
            writeDelayMs: writeDelayMs ?? 1000,
            terminalOutputLineLimit: terminalOutputLineLimit ?? 500,
            mode: mode ?? defaultModeSlug,
            preferredLanguage:
                preferredLanguage ??
                (() => {
                    // Get VSCode's locale setting
                    const vscodeLang = vscode.env.language
                    // Map VSCode locale to our supported languages
                    const langMap: { [key: string]: string } = {
                        en: "English",
                        ar: "Arabic",
                        "pt-br": "Brazilian Portuguese",
                        cs: "Czech",
                        fr: "French",
                        de: "German",
                        hi: "Hindi",
                        hu: "Hungarian",
                        it: "Italian",
                        ja: "Japanese",
                        ko: "Korean",
                        pl: "Polish",
                        pt: "Portuguese",
                        ru: "Russian",
                        "zh-cn": "Simplified Chinese",
                        es: "Spanish",
                        "zh-tw": "Traditional Chinese",
                        tr: "Turkish",
                    }
                    // Return mapped language or default to English
                    return langMap[vscodeLang.split("-")[0]] ?? "English"
                })(),
            mcpEnabled: mcpEnabled ?? true,
            enableMcpServerCreation: enableMcpServerCreation ?? true,
            alwaysApproveResubmit: alwaysApproveResubmit ?? false,
            requestDelaySeconds: Math.max(5, requestDelaySeconds ?? 10),
            rateLimitSeconds: rateLimitSeconds ?? 0,
            currentApiConfigName: currentApiConfigName ?? "default",
            listApiConfigMeta: listApiConfigMeta ?? [],
            modeApiConfigs: modeApiConfigs ?? ({} as Record<Mode, string>),
            customModePrompts: customModePrompts ?? {},
            customSupportPrompts: customSupportPrompts ?? {},
            enhancementApiConfigId,
            experiments: experiments ?? experimentDefault,
            autoApprovalEnabled: autoApprovalEnabled ?? false,
            customModes,
            maxOpenTabsContext: maxOpenTabsContext ?? 20,
        }
    }

    async updateTaskHistory(item: HistoryItem): Promise<HistoryItem[]> {
        const history = ((await this.getGlobalState("taskHistory")) as HistoryItem[] | undefined) || []
        const existingItemIndex = history.findIndex((h) => h.id === item.id)

        if (existingItemIndex !== -1) {
            history[existingItemIndex] = item
        } else {
            history.push(item)
        }
        await this.updateGlobalState("taskHistory", history)
        return history
    }
}