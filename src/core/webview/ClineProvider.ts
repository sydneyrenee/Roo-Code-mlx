import delay from "delay"
import * as vscode from "vscode"
import pWaitFor from "p-wait-for"

import { buildApiHandler } from "../../api"
import { getTheme } from "../../integrations/theme/getTheme"
import WorkspaceTracker from "../../integrations/workspace/WorkspaceTracker"
import { McpHub } from "../../services/mcp/McpHub"
import { ApiConfiguration } from "../../shared/api"
import { findLast } from "../../shared/array"
import { ExtensionMessage } from "../../shared/ExtensionMessage"
import { HistoryItem } from "../../shared/HistoryItem"
import { WebviewMessage } from "../../shared/WebviewMessage"
import { Mode } from "../../shared/modes"
import { Cline } from "../Cline"
import { setSoundEnabled } from "../../utils/sound"
import { ConfigManager } from "../config/ConfigManager"
import { CustomModesManager } from "../config/CustomModesManager"
import { EXPERIMENT_IDS } from "../../shared/experiments"
import { McpServerManager } from "../../services/mcp/McpServerManager"
import { logger } from "../../utils/logging"

import { ACTION_NAMES } from "../CodeActionProvider"
import { HtmlGenerator } from "./ClineProviderHtml"
import { StateManager } from "./ClineProviderState"
import { TaskManager } from "./ClineProviderTasks"
import { WebviewMessageHandler } from "./ClineProviderWebviewHandler"
import { GlobalFileNames as ImportedGlobalFileNames, GlobalStateKey, SecretKey } from "./ClineProviderTypes"
import { McpManager } from "./ClineProviderMcp"

// Re-export GlobalFileNames for backward compatibility
export const GlobalFileNames = ImportedGlobalFileNames

/*
https://github.com/microsoft/vscode-webview-ui-toolkit-samples/blob/main/default/weather-webview/src/providers/WeatherViewProvider.ts

https://github.com/KumarVariable/vscode-extension-sidebar-html/blob/master/src/customSidebarViewProvider.ts
*/

export class ClineProvider implements vscode.WebviewViewProvider {
	public static readonly sideBarId = "roo-cline.SidebarProvider" // used in package.json as the view's id. This value cannot be changed due to how vscode caches views based on their id, and updating the id would break existing instances of the extension.
	public static readonly tabPanelId = "roo-cline.TabPanelProvider"
	private static activeInstances: Set<ClineProvider> = new Set()
	private disposables: vscode.Disposable[] = []
	private view?: vscode.WebviewView | vscode.WebviewPanel
	private isViewLaunched = false
	private cline?: Cline
	private workspaceTracker?: WorkspaceTracker
	protected mcpHub?: McpHub // Change from private to protected
	private latestAnnouncementId = "jan-21-2025-custom-modes" // update to some unique identifier when we add a new announcement
	
	// Component managers
	private readonly stateManager: StateManager
	private readonly taskManager: TaskManager
	private readonly htmlGenerator: HtmlGenerator
	private readonly webviewMessageHandler: WebviewMessageHandler
	private readonly mcpManager: McpManager
	
	configManager: ConfigManager
	customModesManager: CustomModesManager

	constructor(
		readonly context: vscode.ExtensionContext,
		private readonly outputChannel: vscode.OutputChannel,
	) {
		this.outputChannel.appendLine("ClineProvider instantiated")
		logger.info("ClineProvider instantiated")
		
		ClineProvider.activeInstances.add(this)
		
		// Initialize component managers
		this.stateManager = new StateManager(this.context)
		this.htmlGenerator = new HtmlGenerator(this.context)
		this.taskManager = new TaskManager(this.context, this.stateManager, this.outputChannel)
		this.mcpManager = new McpManager(this.context, this.outputChannel)
		
		this.workspaceTracker = new WorkspaceTracker(this)
		this.configManager = new ConfigManager(this.context)
		this.customModesManager = new CustomModesManager(this.context, async () => {
			await this.postStateToWebview()
		})
		
		this.webviewMessageHandler = new WebviewMessageHandler(
			this,
			this.context,
			this.stateManager,
			this.taskManager,
			this.configManager,
			this.customModesManager,
			this.outputChannel
		)

		// Initialize MCP Hub through the singleton manager
		McpServerManager.getInstance(this.context, this)
			.then((hub) => {
				this.mcpHub = hub
			})
			.catch((error) => {
				this.outputChannel.appendLine(`Failed to initialize MCP Hub: ${error}`)
				logger.error(`Failed to initialize MCP Hub: ${error}`)
			})
	}

	/*
	VSCode extensions use the disposable pattern to clean up resources when the sidebar/editor tab is closed by the user or system. This applies to event listening, commands, interacting with the UI, etc.
	- https://vscode-docs.readthedocs.io/en/stable/extensions/patterns-and-principles/
	- https://github.com/microsoft/vscode-extension-samples/blob/main/webview-sample/src/extension.ts
	*/
	async dispose() {
		this.outputChannel.appendLine("Disposing ClineProvider...")
		logger.info("Disposing ClineProvider...")
		
		await this.clearTask()
		this.outputChannel.appendLine("Cleared task")
		
		if (this.view && "dispose" in this.view) {
			this.view.dispose()
			this.outputChannel.appendLine("Disposed webview")
		}
		
		while (this.disposables.length) {
			const x = this.disposables.pop()
			if (x) {
				x.dispose()
			}
		}
		
		this.workspaceTracker?.dispose()
		this.workspaceTracker = undefined
		this.mcpHub?.dispose()
		this.mcpHub = undefined
		this.customModesManager?.dispose()
		this.outputChannel.appendLine("Disposed all disposables")
		
		ClineProvider.activeInstances.delete(this)

		// Unregister from McpServerManager
		McpServerManager.unregisterProvider(this)
	}

	public static getVisibleInstance(): ClineProvider | undefined {
		return findLast(Array.from(this.activeInstances), (instance) => instance.view?.visible === true)
	}

	public static async getInstance(): Promise<ClineProvider | undefined> {
		let visibleProvider = ClineProvider.getVisibleInstance()

		// If no visible provider, try to show the sidebar view
		if (!visibleProvider) {
			await vscode.commands.executeCommand("roo-cline.SidebarProvider.focus")
			// Wait briefly for the view to become visible
			await delay(100)
			visibleProvider = ClineProvider.getVisibleInstance()
		}

		// If still no visible provider, return
		if (!visibleProvider) {
			return
		}

		return visibleProvider
	}

	public static async isActiveTask(): Promise<boolean> {
		const visibleProvider = await ClineProvider.getInstance()
		if (!visibleProvider) {
			return false
		}

		if (visibleProvider.cline) {
			return true
		}

		return false
	}

	public static async handleCodeAction(
		command: string,
		promptType: keyof typeof ACTION_NAMES,
		params: Record<string, string | any[]>,
	): Promise<void> {
		const visibleProvider = await ClineProvider.getInstance()
		if (!visibleProvider) {
			return
		}

		const { customSupportPrompts } = await visibleProvider.stateManager.getState()

		const prompt = visibleProvider.webviewMessageHandler.createSupportPrompt(promptType, params, customSupportPrompts)

		if (command.endsWith("addToContext")) {
			await visibleProvider.postMessageToWebview({
				type: "invoke",
				invoke: "setChatBoxMessage",
				text: prompt,
			})

			return
		}

		if (visibleProvider.cline && command.endsWith("InCurrentTask")) {
			await visibleProvider.postMessageToWebview({
				type: "invoke",
				invoke: "sendMessage",
				text: prompt,
			})

			return
		}

		await visibleProvider.initClineWithTask(prompt)
	}

	public static async handleTerminalAction(
		command: string,
		promptType: "TERMINAL_ADD_TO_CONTEXT" | "TERMINAL_FIX" | "TERMINAL_EXPLAIN",
		params: Record<string, string | any[]>,
	): Promise<void> {
		const visibleProvider = await ClineProvider.getInstance()
		if (!visibleProvider) {
			return
		}

		const { customSupportPrompts } = await visibleProvider.stateManager.getState()

		const prompt = visibleProvider.webviewMessageHandler.createSupportPrompt(promptType, params, customSupportPrompts)

		if (command.endsWith("AddToContext")) {
			await visibleProvider.postMessageToWebview({
				type: "invoke",
				invoke: "setChatBoxMessage",
				text: prompt,
			})
			return
		}

		if (visibleProvider.cline && command.endsWith("InCurrentTask")) {
			await visibleProvider.postMessageToWebview({
				type: "invoke",
				invoke: "sendMessage",
				text: prompt,
			})
			return
		}

		await visibleProvider.initClineWithTask(prompt)
	}

	async resolveWebviewView(webviewView: vscode.WebviewView | vscode.WebviewPanel) {
		this.outputChannel.appendLine("Resolving webview view")
		logger.info("Resolving webview view")
		
		this.view = webviewView

		// Initialize sound enabled state
		this.stateManager.getState().then(({ soundEnabled }) => {
			setSoundEnabled(soundEnabled ?? false)
		})

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,
			localResourceRoots: [this.context.extensionUri],
		}

		webviewView.webview.html =
			this.context.extensionMode === vscode.ExtensionMode.Development
				? await this.htmlGenerator.getHMRHtmlContent(webviewView.webview)
				: this.htmlGenerator.getHtmlContent(webviewView.webview)

		// Sets up an event listener to listen for messages passed from the webview view context
		// and executes code based on the message that is recieved
		this.setWebviewMessageListener(webviewView.webview)

		// Listen for when the panel becomes visible
		// https://github.com/microsoft/vscode-discussions/discussions/840
		if ("onDidChangeViewState" in webviewView) {
			// WebviewView and WebviewPanel have all the same properties except for this visibility listener
			// panel
			webviewView.onDidChangeViewState(
				() => {
					if (this.view?.visible) {
						this.postMessageToWebview({ type: "action", action: "didBecomeVisible" })
					}
				},
				null,
				this.disposables,
			)
		} else if ("onDidChangeVisibility" in webviewView) {
			// sidebar
			webviewView.onDidChangeVisibility(
				() => {
					if (this.view?.visible) {
						this.postMessageToWebview({ type: "action", action: "didBecomeVisible" })
					}
				},
				null,
				this.disposables,
			)
		}

		// Listen for when the view is disposed
		// This happens when the user closes the view or when the view is closed programmatically
		webviewView.onDidDispose(
			async () => {
				await this.dispose()
			},
			null,
			this.disposables,
		)

		// Listen for when color changes
		vscode.workspace.onDidChangeConfiguration(
			async (e) => {
				if (e && e.affectsConfiguration("workbench.colorTheme")) {
					// Sends latest theme name to webview
					await this.postMessageToWebview({ type: "theme", text: JSON.stringify(await getTheme()) })
				}
			},
			null,
			this.disposables,
		)

		// if the extension is starting a new session, clear previous task state
		this.clearTask()

		this.outputChannel.appendLine("Webview view resolved")
		logger.info("Webview view resolved")
	}

	public async initClineWithTask(task?: string, images?: string[]) {
		await this.clearTask()
		const {
			apiConfiguration,
			customModePrompts,
			diffEnabled,
			checkpointsEnabled,
			fuzzyMatchThreshold,
			mode,
			customInstructions: globalInstructions,
			experiments,
		} = await this.stateManager.getState()

		const modePrompt = customModePrompts?.[mode]
		const effectiveInstructions = [globalInstructions, modePrompt?.customInstructions].filter(Boolean).join("\n\n")

		this.cline = new Cline(
			this,
			apiConfiguration,
			effectiveInstructions,
			diffEnabled,
			checkpointsEnabled,
			fuzzyMatchThreshold,
			task,
			images,
			undefined,
			experiments,
		)
	}

	public async initClineWithHistoryItem(historyItem: HistoryItem) {
		await this.clearTask()

		const {
			apiConfiguration,
			customModePrompts,
			diffEnabled,
			checkpointsEnabled,
			fuzzyMatchThreshold,
			mode,
			customInstructions: globalInstructions,
			experiments,
		} = await this.stateManager.getState()

		const modePrompt = customModePrompts?.[mode]
		const effectiveInstructions = [globalInstructions, modePrompt?.customInstructions].filter(Boolean).join("\n\n")

		this.cline = new Cline(
			this,
			apiConfiguration,
			effectiveInstructions,
			diffEnabled,
			checkpointsEnabled,
			fuzzyMatchThreshold,
			undefined,
			undefined,
			historyItem,
			experiments,
		)
	}

	public async postMessageToWebview(message: ExtensionMessage) {
		await this.view?.webview.postMessage(message)
	}

	private setWebviewMessageListener(webview: vscode.Webview) {
		webview.onDidReceiveMessage(
			async (message: WebviewMessage) => {
				await this.webviewMessageHandler.handleWebviewMessage(message, this.cline)
			},
			null,
			this.disposables,
		)
	}

	/**
	 * Handle switching to a new mode, including updating the associated API configuration
	 * @param newMode The mode to switch to
	 */
	public async handleModeSwitch(newMode: Mode) {
		await this.stateManager.updateGlobalState("mode", newMode)

		// Load the saved API config for the new mode if it exists
		const savedConfigId = await this.configManager.getModeConfigId(newMode)
		const listApiConfig = await this.configManager.listConfig()

		// Update listApiConfigMeta first to ensure UI has latest data
		await this.stateManager.updateGlobalState("listApiConfigMeta", listApiConfig)

		// If this mode has a saved config, use it
		if (savedConfigId) {
			const config = listApiConfig?.find((c) => c.id === savedConfigId)
			if (config?.name) {
				const apiConfig = await this.configManager.loadConfig(config.name)
				await Promise.all([
					this.stateManager.updateGlobalState("currentApiConfigName", config.name),
					this.updateApiConfiguration(apiConfig),
				])
			}
		} else {
			// If no saved config for this mode, save current config as default
			const currentApiConfigName = await this.stateManager.getGlobalState("currentApiConfigName")
			if (currentApiConfigName) {
				const config = listApiConfig?.find((c) => c.name === currentApiConfigName)
				if (config?.id) {
					await this.configManager.setModeConfig(newMode, config.id)
				}
			}
		}

		await this.postStateToWebview()
	}

	async updateApiConfiguration(apiConfiguration: ApiConfiguration) {
		// Update mode's default config
		const { mode } = await this.stateManager.getState()
		if (mode) {
			const currentApiConfigName = await this.stateManager.getGlobalState("currentApiConfigName")
			const listApiConfig = await this.configManager.listConfig()
			const config = listApiConfig?.find((c) => c.name === currentApiConfigName)
			if (config?.id) {
				await this.configManager.setModeConfig(mode, config.id)
			}
		}

		// Update all API configuration values in global state
		await this.webviewMessageHandler.updateApiConfigurationState(apiConfiguration)
		
		if (this.cline) {
			this.cline.api = buildApiHandler(apiConfiguration)
		}
	}

	async cancelTask() {
		if (this.cline) {
			const { historyItem } = await this.taskManager.getTaskWithId(this.cline.taskId)
			this.cline.abortTask()

			await pWaitFor(
				() =>
					this.cline === undefined ||
					this.cline.isStreaming === false ||
					this.cline.didFinishAbortingStream ||
					// If only the first chunk is processed, then there's no
					// need to wait for graceful abort (closes edits, browser,
					// etc).
					this.cline.isWaitingForFirstChunk,
				{
					timeout: 3_000,
				},
			).catch(() => {
				console.error("Failed to abort task")
				logger.error("Failed to abort task")
			})

			if (this.cline) {
				// 'abandoned' will prevent this Cline instance from affecting
				// future Cline instances. This may happen if its hanging on a
				// streaming request.
				this.cline.abandoned = true
			}

			// Clears task again, so we need to abortTask manually above.
			await this.initClineWithHistoryItem(historyItem)
		}
	}

	async updateCustomInstructions(instructions?: string) {
		// User may be clearing the field
		await this.stateManager.updateGlobalState("customInstructions", instructions || undefined)
		if (this.cline) {
			this.cline.customInstructions = instructions || undefined
		}
		await this.postStateToWebview()
	}

	async postStateToWebview() {
		const state = await this.webviewMessageHandler.getStateToPostToWebview(this.cline)
		this.postMessageToWebview({ type: "state", state })
	}

	async clearTask() {
		this.cline?.abortTask()
		this.cline = undefined // removes reference to it, so once promises end it will be garbage collected
	}

	// State management methods
	async getState() {
		return await this.stateManager.getState()
	}

	async getGlobalState(key: GlobalStateKey) {
		return await this.stateManager.getGlobalState(key)
	}

	async updateGlobalState(key: GlobalStateKey, value: any) {
		await this.stateManager.updateGlobalState(key, value)
	}

	async storeSecret(key: SecretKey, value?: string) {
		await this.stateManager.storeSecret(key, value)
	}

	async updateTaskHistory(item: HistoryItem) {
		return await this.stateManager.updateTaskHistory(item)
	}

	// Task management methods
	async getTaskWithId(id: string) {
		return await this.taskManager.getTaskWithId(id)
	}

	// MCP methods
	async ensureMcpServersDirectoryExists() {
		return await this.mcpManager.ensureMcpServersDirectoryExists()
	}

	async ensureSettingsDirectoryExists() {
		return await this.mcpManager.ensureSettingsDirectoryExists()
	}

	// Logging method
	log(message: string) {
		this.outputChannel.appendLine(message)
		logger.info(message)
	}

	// MCP
	
	// Add public getter
	public getMcpHub(): McpHub | undefined {
		return this.mcpHub
	}
	
	// For testing
	get viewLaunched() {
		return this.isViewLaunched
	}

	get messages() {
		return this.cline?.clineMessages || []
	}

	// Callback handlers
	async handleGlamaCallback(code: string) {
		// Store the Glama API key
		await this.storeSecret("glamaApiKey", code)
		
		// Update the UI
		await this.postStateToWebview()
		
		// Log the action
		this.log("Glama API key stored successfully")
	}

	async handleOpenRouterCallback(code: string) {
		// Store the OpenRouter API key
		await this.storeSecret("openRouterApiKey", code)
		
		// Update the UI
		await this.postStateToWebview()
		
		// Log the action
		this.log("OpenRouter API key stored successfully")
	}
}
