import * as vscode from "vscode"
import { getTheme } from "../../integrations/theme/getTheme"
import { openFile, openImage } from "../../integrations/misc/open-file"
import { openMention } from "../../core/mentions"
import { playSound, setSoundEnabled, setSoundVolume } from "../../utils/sound"
import { ExtensionMessage } from "../../shared/ExtensionMessage"
import { WebviewMessage, checkoutDiffPayloadSchema, checkoutRestorePayloadSchema } from "../../shared/WebviewMessage"
import { Cline } from "../Cline"
import { ConfigManager } from "../config/ConfigManager"
import { CustomModesManager } from "../config/CustomModesManager"
import { StateManager } from "./ClineProviderState"
import { TaskManager } from "./ClineProviderTasks"
import { ApiConfiguration } from "../../shared/api"
import { CustomSupportPrompts, supportPrompt } from "../../shared/support-prompt"
import { logger } from "../../utils/logging"
import { Mode } from "../../shared/modes"
import pWaitFor from "p-wait-for"

export class WebviewMessageHandler {
    constructor(
        private readonly provider: any, // ClineProvider - using any to avoid circular dependency
        private readonly context: vscode.ExtensionContext,
        private readonly stateManager: StateManager,
        private readonly taskManager: TaskManager,
        private readonly configManager: ConfigManager,
        private readonly customModesManager: CustomModesManager,
        private readonly outputChannel: vscode.OutputChannel
    ) {}

    async handleWebviewMessage(message: WebviewMessage, cline?: Cline) {
        this.outputChannel.appendLine(`Received message of type: ${message.type}`)
        logger.info(`Received message of type: ${message.type}`)

        switch (message.type) {
            case "webviewDidLaunch":
                // Load custom modes first
                const customModes = await this.customModesManager.getCustomModes()
                await this.stateManager.updateGlobalState("customModes", customModes)

                await this.provider.postStateToWebview()
                this.provider.workspaceTracker?.initializeFilePaths() // don't await
                getTheme().then((theme) =>
                    this.provider.postMessageToWebview({ type: "theme", text: JSON.stringify(theme) }),
                )
                
                // If MCP Hub is already initialized, update the webview with current server list
                if (this.provider.mcpHub) {
                    this.provider.postMessageToWebview({
                        type: "mcpServers",
                        mcpServers: this.provider.mcpHub.getAllServers(),
                    })
                }
                break;

            case "newTask":
                if (message.text) {
                    await this.provider.initClineWithTask(message.text, message.images)
                }
                break;

            case "cancelTask":
                await this.provider.cancelTask()
                break;

            case "clearTask":
                await this.provider.clearTask()
                break;

            case "customInstructions":
                await this.provider.updateCustomInstructions(message.text)
                break;

            case "mode":
                await this.provider.handleModeSwitch(message.text as Mode)
                break;

            case "soundEnabled":
                const soundEnabled = message.bool ?? true
                await this.stateManager.updateGlobalState("soundEnabled", soundEnabled)
                setSoundEnabled(soundEnabled)
                await this.provider.postStateToWebview()
                break;

            case "soundVolume":
                const soundVolume = message.value ?? 0.5
                await this.stateManager.updateGlobalState("soundVolume", soundVolume)
                setSoundVolume(soundVolume)
                await this.provider.postStateToWebview()
                break;

            case "diffEnabled":
                const diffEnabled = message.bool ?? true
                await this.stateManager.updateGlobalState("diffEnabled", diffEnabled)
                await this.provider.postStateToWebview()
                break;

            case "checkpointsEnabled":
                const checkpointsEnabled = message.bool ?? false
                await this.stateManager.updateGlobalState("checkpointsEnabled", checkpointsEnabled)
                await this.provider.postStateToWebview()
                break;

            case "browserViewportSize":
                const browserViewportSize = message.text ?? "900x600"
                await this.stateManager.updateGlobalState("browserViewportSize", browserViewportSize)
                await this.provider.postStateToWebview()
                break;

            case "fuzzyMatchThreshold":
                await this.stateManager.updateGlobalState("fuzzyMatchThreshold", message.value)
                await this.provider.postStateToWebview()
                break;

            case "alwaysApproveResubmit":
                await this.stateManager.updateGlobalState("alwaysApproveResubmit", message.bool ?? false)
                await this.provider.postStateToWebview()
                break;

            case "requestDelaySeconds":
                await this.stateManager.updateGlobalState("requestDelaySeconds", message.value ?? 5)
                await this.provider.postStateToWebview()
                break;

            case "rateLimitSeconds":
                await this.stateManager.updateGlobalState("rateLimitSeconds", message.value ?? 0)
                await this.provider.postStateToWebview()
                break;

            case "preferredLanguage":
                await this.stateManager.updateGlobalState("preferredLanguage", message.text)
                await this.provider.postStateToWebview()
                break;

            case "writeDelayMs":
                await this.stateManager.updateGlobalState("writeDelayMs", message.value)
                await this.provider.postStateToWebview()
                break;

            case "terminalOutputLineLimit":
                await this.stateManager.updateGlobalState("terminalOutputLineLimit", message.value)
                await this.provider.postStateToWebview()
                break;

            case "mcpEnabled":
                const mcpEnabled = message.bool ?? true
                await this.stateManager.updateGlobalState("mcpEnabled", mcpEnabled)
                await this.provider.postStateToWebview()
                break;

            case "enableMcpServerCreation":
                await this.stateManager.updateGlobalState("enableMcpServerCreation", message.bool ?? true)
                await this.provider.postStateToWebview()
                break;

            case "playSound":
                if (message.audioType) {
                    const soundPath = vscode.Uri.joinPath(this.context.extensionUri, "audio", `${message.audioType}.wav`).fsPath
                    playSound(soundPath)
                }
                break;

            case "openImage":
                openImage(message.text!)
                break;

            case "openFile":
                openFile(message.text!, message.values as { create?: boolean; content?: string })
                break;

            case "openMention":
                openMention(message.text)
                break;

            case "checkpointDiff":
                const diffResult = checkoutDiffPayloadSchema.safeParse(message.payload)
                if (diffResult.success && cline) {
                    // Ensure all required properties are present
                    const validData = {
                        ts: diffResult.data.ts,
                        commitHash: diffResult.data.commitHash,
                        mode: diffResult.data.mode
                    };
                    await cline.checkpointDiff(validData)
                }
                break;

            case "checkpointRestore": {
                const restoreResult = checkoutRestorePayloadSchema.safeParse(message.payload)
                if (restoreResult.success) {
                    await this.provider.cancelTask()

                    try {
                        await pWaitFor(() => cline?.isInitialized === true, { timeout: 3_000 })
                    } catch (error) {
                        vscode.window.showErrorMessage("Timed out when attempting to restore checkpoint.")
                    }

                    try {
                        // Ensure all required properties are present
                        const validData = {
                            ts: restoreResult.data.ts,
                            commitHash: restoreResult.data.commitHash,
                            mode: restoreResult.data.mode
                        };
                        await cline?.checkpointRestore(validData)
                    } catch (error) {
                        vscode.window.showErrorMessage("Failed to restore checkpoint.")
                    }
                }
                break;
            }

            case "allowedCommands":
                await this.stateManager.updateGlobalState("allowedCommands", message.commands)
                // Also update workspace settings
                await vscode.workspace
                    .getConfiguration("roo-cline")
                    .update("allowedCommands", message.commands, vscode.ConfigurationTarget.Global)
                break;

            case "openMcpSettings": {
                const mcpSettingsFilePath = await this.provider.mcpHub?.getMcpSettingsFilePath()
                if (mcpSettingsFilePath) {
                    openFile(mcpSettingsFilePath)
                }
                break;
            }

            case "openCustomModesSettings": {
                const customModesFilePath = await this.customModesManager.getCustomModesFilePath()
                if (customModesFilePath) {
                    openFile(customModesFilePath)
                }
                break;
            }

            case "restartMcpServer": {
                try {
                    await this.provider.mcpHub?.restartConnection(message.text!)
                } catch (error) {
                    this.outputChannel.appendLine(
                        `Failed to retry connection for ${message.text}: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`
                    )
                }
                break;
            }

            case "toggleToolAlwaysAllow": {
                try {
                    await this.provider.mcpHub?.toggleToolAlwaysAllow(
                        message.serverName!,
                        message.toolName!,
                        message.alwaysAllow!
                    )
                } catch (error) {
                    this.outputChannel.appendLine(
                        `Failed to toggle auto-approve for tool ${message.toolName}: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`
                    )
                }
                break;
            }

            case "toggleMcpServer": {
                try {
                    await this.provider.mcpHub?.toggleServerDisabled(message.serverName!, message.disabled!)
                } catch (error) {
                    this.outputChannel.appendLine(
                        `Failed to toggle MCP server ${message.serverName}: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`
                    )
                }
                break;
            }

            case "updateSupportPrompt":
                try {
                    if (Object.keys(message?.values ?? {}).length === 0) {
                        return
                    }

                    const existingPrompts = (await this.stateManager.getGlobalState("customSupportPrompts")) || {}

                    const updatedPrompts = Object.assign(
                        {},
                        existingPrompts || {},
                        message.values || {}
                    );

                    await this.stateManager.updateGlobalState("customSupportPrompts", updatedPrompts)
                    await this.provider.postStateToWebview()
                } catch (error) {
                    this.outputChannel.appendLine(
                        `Error update support prompt: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`
                    )
                    vscode.window.showErrorMessage("Failed to update support prompt")
                }
                break;

            case "resetSupportPrompt":
                try {
                    if (!message?.text) {
                        return
                    }

                    const existingPrompts = ((await this.stateManager.getGlobalState("customSupportPrompts")) ||
                        {}) as Record<string, any>

                    const updatedPrompts = Object.assign(
                        {},
                        existingPrompts || {}
                    );

                    updatedPrompts[message.text] = undefined

                    await this.stateManager.updateGlobalState("customSupportPrompts", updatedPrompts)
                    await this.provider.postStateToWebview()
                } catch (error) {
                    this.outputChannel.appendLine(
                        `Error reset support prompt: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`
                    )
                    vscode.window.showErrorMessage("Failed to reset support prompt")
                }
                break;

            case "updatePrompt":
                if (message.promptMode && message.customPrompt !== undefined) {
                    const existingPrompts = (await this.stateManager.getGlobalState("customModePrompts")) || {}

                    const updatedPrompts = Object.assign(
                        {},
                        existingPrompts || {},
                        { [message.promptMode]: message.customPrompt }
                    );

                    await this.stateManager.updateGlobalState("customModePrompts", updatedPrompts)
                    await this.provider.postStateToWebview()
                }
                break;

            case "deleteTaskWithId":
                if (message.text) {
                    const shouldClearCurrentTask = await this.taskManager.deleteTaskWithId(
                        message.text,
                        cline?.taskId,
                        await this.stateManager.getGlobalState("checkpointsEnabled") as boolean
                    )

                    if (shouldClearCurrentTask) {
                        await this.provider.clearTask()
                    }

                    await this.provider.postStateToWebview()
                }
                break;

            case "showTaskWithId":
                if (message.text) {
                    const historyItem = await this.taskManager.showTaskWithId(message.text, cline?.taskId)
                    if (historyItem) {
                        await this.provider.initClineWithHistoryItem(historyItem)
                    }
                }
                break;

            case "exportTaskWithId":
                if (message.text) {
                    await this.taskManager.exportTaskWithId(message.text)
                }
                break;

            case "apiConfiguration":
                if (message.apiConfiguration) {
                    await this.updateApiConfigurationState(message.apiConfiguration)
                }
                break;

            case "upsertApiConfiguration":
                if (message.text && message.apiConfiguration) {
                    await this.configManager.saveConfig(message.text, message.apiConfiguration)
                    await this.stateManager.updateGlobalState("currentApiConfigName", message.text)
                    
                    // Update the list of available configs
                    const listApiConfig = await this.configManager.listConfig()
                    await this.stateManager.updateGlobalState("listApiConfigMeta", listApiConfig)
                    
                    // Update the current mode's default config
                    const { mode } = await this.stateManager.getState()
                    if (mode) {
                        const config = listApiConfig?.find((c) => c.name === message.text)
                        if (config?.id) {
                            await this.configManager.setModeConfig(mode, config.id)
                        }
                    }
                    
                    await this.provider.postStateToWebview()
                }
                break;

            case "loadApiConfiguration":
                if (message.text) {
                    const apiConfig = await this.configManager.loadConfig(message.text)
                    if (apiConfig) {
                        await this.stateManager.updateGlobalState("currentApiConfigName", message.text)
                        await this.updateApiConfigurationState(apiConfig)
                    }
                }
                break;

            case "deleteApiConfiguration":
                if (message.text) {
                    await this.configManager.deleteConfig(message.text)
                    
                    // Update the list of available configs
                    const listApiConfig = await this.configManager.listConfig()
                    await this.stateManager.updateGlobalState("listApiConfigMeta", listApiConfig)
                    
                    await this.provider.postStateToWebview()
                }
                break;

            case "resetState":
                const resetResult = await this.stateManager.resetState()
                if (resetResult) {
                    await this.configManager.resetAllConfigs()
                    await this.customModesManager.resetCustomModes()
                    if (cline) {
                        cline.abortTask()
                    }
                    await this.provider.clearTask()
                    await this.provider.postStateToWebview()
                    await this.provider.postMessageToWebview({ type: "action", action: "chatButtonClicked" })
                }
                break;

            case "autoApprovalEnabled":
                await this.stateManager.updateGlobalState("autoApprovalEnabled", message.bool ?? false)
                await this.provider.postStateToWebview()
                break;

            case "maxOpenTabsContext":
                await this.stateManager.updateGlobalState("maxOpenTabsContext", message.value ?? 20)
                await this.provider.postStateToWebview()
                break;

            case "updateExperimental":
                if (message.values?.experimentId && message.values?.enabled !== undefined) {
                    const experiments = (await this.stateManager.getGlobalState("experiments")) || {}
                    const updatedExperiments = Object.assign(
                        {},
                        experiments || {},
                        { [message.values.experimentId]: message.values.enabled }
                    );
                    await this.stateManager.updateGlobalState("experiments", updatedExperiments)
                    await this.provider.postStateToWebview()
                }
                break;
        }
    }

    async getStateToPostToWebview(cline?: Cline) {
        const state = await this.stateManager.getState()
        
        // Create a default experiments object with required properties
        const defaultExperiments = {
            experimentalDiffStrategy: false,
            search_and_replace: false,
            insert_content: false
        }
        
        return {
            ...state,
            version: this.context.extension?.packageJSON?.version ?? "",
            clineMessages: cline?.clineMessages || [],
            shouldShowAnnouncement: false,
            taskHistory: state.taskHistory || [],
            // Ensure experiments has all required properties
            experiments: Object.assign({}, defaultExperiments || {}, state.experiments || {}),
            // Ensure customModes is always an array
            customModes: state.customModes || []
        }
    }

    createSupportPrompt(promptType: string, params: Record<string, any>, customSupportPrompts?: CustomSupportPrompts) {
        // Use the support prompt utility to create the prompt
        return supportPrompt.create(promptType as any, params, customSupportPrompts)
    }

    async updateApiConfigurationState(apiConfiguration: ApiConfiguration) {
        // Update all API configuration values in global state
        await this.stateManager.updateGlobalState("apiProvider", apiConfiguration.apiProvider)
        await this.stateManager.updateGlobalState("apiModelId", apiConfiguration.apiModelId)
        
        // Anthropic specific
        await this.stateManager.updateGlobalState("anthropicBaseUrl", apiConfiguration.anthropicBaseUrl)
        
        // OpenAI specific
        await this.stateManager.updateGlobalState("openAiBaseUrl", apiConfiguration.openAiBaseUrl)
        await this.stateManager.updateGlobalState("openAiModelId", apiConfiguration.openAiModelId)
        await this.stateManager.updateGlobalState("openAiCustomModelInfo", apiConfiguration.openAiCustomModelInfo)
        await this.stateManager.updateGlobalState("openAiUseAzure", apiConfiguration.openAiUseAzure)
        await this.stateManager.updateGlobalState("openAiStreamingEnabled", apiConfiguration.openAiStreamingEnabled)
        await this.stateManager.updateGlobalState("azureApiVersion", apiConfiguration.azureApiVersion)
        
        // AWS specific
        await this.stateManager.updateGlobalState("awsRegion", apiConfiguration.awsRegion)
        await this.stateManager.updateGlobalState("awsUseCrossRegionInference", apiConfiguration.awsUseCrossRegionInference)
        await this.stateManager.updateGlobalState("awsProfile", apiConfiguration.awsProfile)
        await this.stateManager.updateGlobalState("awsUseProfile", apiConfiguration.awsUseProfile)
        
        // Vertex specific
        await this.stateManager.updateGlobalState("vertexProjectId", apiConfiguration.vertexProjectId)
        await this.stateManager.updateGlobalState("vertexRegion", apiConfiguration.vertexRegion)
        
        // Ollama specific
        await this.stateManager.updateGlobalState("ollamaModelId", apiConfiguration.ollamaModelId)
        await this.stateManager.updateGlobalState("ollamaBaseUrl", apiConfiguration.ollamaBaseUrl)
        
        // LM Studio specific
        await this.stateManager.updateGlobalState("lmStudioModelId", apiConfiguration.lmStudioModelId)
        await this.stateManager.updateGlobalState("lmStudioBaseUrl", apiConfiguration.lmStudioBaseUrl)
        
        // OpenRouter specific
        await this.stateManager.updateGlobalState("openRouterModelId", apiConfiguration.openRouterModelId)
        await this.stateManager.updateGlobalState("openRouterModelInfo", apiConfiguration.openRouterModelInfo)
        await this.stateManager.updateGlobalState("openRouterBaseUrl", apiConfiguration.openRouterBaseUrl)
        await this.stateManager.updateGlobalState("openRouterUseMiddleOutTransform", apiConfiguration.openRouterUseMiddleOutTransform)
        
        // Glama specific
        await this.stateManager.updateGlobalState("glamaModelId", apiConfiguration.glamaModelId)
        await this.stateManager.updateGlobalState("glamaModelInfo", apiConfiguration.glamaModelInfo)
        
        // Mistral specific
        await this.stateManager.updateGlobalState("mistralCodestralUrl", apiConfiguration.mistralCodestralUrl)
        
        // Unbound specific
        await this.stateManager.updateGlobalState("unboundModelId", apiConfiguration.unboundModelId)
        await this.stateManager.updateGlobalState("unboundModelInfo", apiConfiguration.unboundModelInfo)
        
        // Requesty specific
        await this.stateManager.updateGlobalState("requestyModelId", apiConfiguration.requestyModelId)
        await this.stateManager.updateGlobalState("requestyModelInfo", apiConfiguration.requestyModelInfo)
        
        // General settings
        await this.stateManager.updateGlobalState("modelTemperature", apiConfiguration.modelTemperature)
        await this.stateManager.updateGlobalState("vsCodeLmModelSelector", apiConfiguration.vsCodeLmModelSelector)
        
        // Update the UI
        await this.provider.postStateToWebview()
        
        // Update the Cline instance if it exists
        if (this.provider.cline) {
            const buildApiHandler = require("../../api").buildApiHandler;
            this.provider.cline.api = buildApiHandler(apiConfiguration)
        }
    }
}
