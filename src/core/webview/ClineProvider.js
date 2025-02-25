"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClineProvider = exports.GlobalFileNames = void 0;
const delay_1 = __importDefault(require("delay"));
const axios_1 = __importDefault(require("axios"));
const promises_1 = __importDefault(require("fs/promises"));
const os_1 = __importDefault(require("os"));
const p_wait_for_1 = __importDefault(require("p-wait-for"));
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const simple_git_1 = __importDefault(require("simple-git"));
const api_1 = require("../../api");
const export_markdown_1 = require("../../integrations/misc/export-markdown");
const open_file_1 = require("../../integrations/misc/open-file");
const process_images_1 = require("../../integrations/misc/process-images");
const getTheme_1 = require("../../integrations/theme/getTheme");
const DiffStrategy_1 = require("../diff/DiffStrategy");
const WorkspaceTracker_1 = __importDefault(require("../../integrations/workspace/WorkspaceTracker"));
const array_1 = require("../../shared/array");
const WebviewMessage_1 = require("../../shared/WebviewMessage");
const modes_1 = require("../../shared/modes");
const system_1 = require("../prompts/system");
const fs_1 = require("../../utils/fs");
const Cline_1 = require("../Cline");
const mentions_1 = require("../mentions");
const getNonce_1 = require("./getNonce");
const getUri_1 = require("./getUri");
const sound_1 = require("../../utils/sound");
const checkExistApiConfig_1 = require("../../shared/checkExistApiConfig");
const single_completion_handler_1 = require("../../utils/single-completion-handler");
const git_1 = require("../../utils/git");
const ConfigManager_1 = require("../config/ConfigManager");
const CustomModesManager_1 = require("../config/CustomModesManager");
const experiments_1 = require("../../shared/experiments");
const support_prompt_1 = require("../../shared/support-prompt");
const McpServerManager_1 = require("../../services/mcp/McpServerManager");
exports.GlobalFileNames = {
    apiConversationHistory: "api_conversation_history.json",
    uiMessages: "ui_messages.json",
    glamaModels: "glama_models.json",
    openRouterModels: "openrouter_models.json",
    requestyModels: "requesty_models.json",
    mcpSettings: "cline_mcp_settings.json",
    unboundModels: "unbound_models.json",
};
class ClineProvider {
    context;
    outputChannel;
    static sideBarId = "roo-cline.SidebarProvider"; // used in package.json as the view's id. This value cannot be changed due to how vscode caches views based on their id, and updating the id would break existing instances of the extension.
    static tabPanelId = "roo-cline.TabPanelProvider";
    static activeInstances = new Set();
    disposables = [];
    view;
    isViewLaunched = false;
    cline;
    workspaceTracker;
    mcpHub; // Change from private to protected
    latestAnnouncementId = "jan-21-2025-custom-modes"; // update to some unique identifier when we add a new announcement
    configManager;
    customModesManager;
    constructor(context, outputChannel) {
        this.context = context;
        this.outputChannel = outputChannel;
        this.outputChannel.appendLine("ClineProvider instantiated");
        ClineProvider.activeInstances.add(this);
        this.workspaceTracker = new WorkspaceTracker_1.default(this);
        this.configManager = new ConfigManager_1.ConfigManager(this.context);
        this.customModesManager = new CustomModesManager_1.CustomModesManager(this.context, async () => {
            await this.postStateToWebview();
        });
        // Initialize MCP Hub through the singleton manager
        McpServerManager_1.McpServerManager.getInstance(this.context, this)
            .then((hub) => {
            this.mcpHub = hub;
        })
            .catch((error) => {
            this.outputChannel.appendLine(`Failed to initialize MCP Hub: ${error}`);
        });
    }
    /*
    VSCode extensions use the disposable pattern to clean up resources when the sidebar/editor tab is closed by the user or system. This applies to event listening, commands, interacting with the UI, etc.
    - https://vscode-docs.readthedocs.io/en/stable/extensions/patterns-and-principles/
    - https://github.com/microsoft/vscode-extension-samples/blob/main/webview-sample/src/extension.ts
    */
    async dispose() {
        this.outputChannel.appendLine("Disposing ClineProvider...");
        await this.clearTask();
        this.outputChannel.appendLine("Cleared task");
        if (this.view && "dispose" in this.view) {
            this.view.dispose();
            this.outputChannel.appendLine("Disposed webview");
        }
        while (this.disposables.length) {
            const x = this.disposables.pop();
            if (x) {
                x.dispose();
            }
        }
        this.workspaceTracker?.dispose();
        this.workspaceTracker = undefined;
        this.mcpHub?.dispose();
        this.mcpHub = undefined;
        this.customModesManager?.dispose();
        this.outputChannel.appendLine("Disposed all disposables");
        ClineProvider.activeInstances.delete(this);
        // Unregister from McpServerManager
        McpServerManager_1.McpServerManager.unregisterProvider(this);
    }
    static getVisibleInstance() {
        return (0, array_1.findLast)(Array.from(this.activeInstances), (instance) => instance.view?.visible === true);
    }
    static async getInstance() {
        let visibleProvider = ClineProvider.getVisibleInstance();
        // If no visible provider, try to show the sidebar view
        if (!visibleProvider) {
            await vscode.commands.executeCommand("roo-cline.SidebarProvider.focus");
            // Wait briefly for the view to become visible
            await (0, delay_1.default)(100);
            visibleProvider = ClineProvider.getVisibleInstance();
        }
        // If still no visible provider, return
        if (!visibleProvider) {
            return;
        }
        return visibleProvider;
    }
    static async isActiveTask() {
        const visibleProvider = await ClineProvider.getInstance();
        if (!visibleProvider) {
            return false;
        }
        if (visibleProvider.cline) {
            return true;
        }
        return false;
    }
    static async handleCodeAction(command, promptType, params) {
        const visibleProvider = await ClineProvider.getInstance();
        if (!visibleProvider) {
            return;
        }
        const { customSupportPrompts } = await visibleProvider.getState();
        const prompt = support_prompt_1.supportPrompt.create(promptType, params, customSupportPrompts);
        if (command.endsWith("addToContext")) {
            await visibleProvider.postMessageToWebview({
                type: "invoke",
                invoke: "setChatBoxMessage",
                text: prompt,
            });
            return;
        }
        if (visibleProvider.cline && command.endsWith("InCurrentTask")) {
            await visibleProvider.postMessageToWebview({
                type: "invoke",
                invoke: "sendMessage",
                text: prompt,
            });
            return;
        }
        await visibleProvider.initClineWithTask(prompt);
    }
    static async handleTerminalAction(command, promptType, params) {
        const visibleProvider = await ClineProvider.getInstance();
        if (!visibleProvider) {
            return;
        }
        const { customSupportPrompts } = await visibleProvider.getState();
        const prompt = support_prompt_1.supportPrompt.create(promptType, params, customSupportPrompts);
        if (command.endsWith("AddToContext")) {
            await visibleProvider.postMessageToWebview({
                type: "invoke",
                invoke: "setChatBoxMessage",
                text: prompt,
            });
            return;
        }
        if (visibleProvider.cline && command.endsWith("InCurrentTask")) {
            await visibleProvider.postMessageToWebview({
                type: "invoke",
                invoke: "sendMessage",
                text: prompt,
            });
            return;
        }
        await visibleProvider.initClineWithTask(prompt);
    }
    async resolveWebviewView(webviewView) {
        this.outputChannel.appendLine("Resolving webview view");
        this.view = webviewView;
        // Initialize sound enabled state
        this.getState().then(({ soundEnabled }) => {
            (0, sound_1.setSoundEnabled)(soundEnabled ?? false);
        });
        webviewView.webview.options = {
            // Allow scripts in the webview
            enableScripts: true,
            localResourceRoots: [this.context.extensionUri],
        };
        webviewView.webview.html =
            this.context.extensionMode === vscode.ExtensionMode.Development
                ? await this.getHMRHtmlContent(webviewView.webview)
                : this.getHtmlContent(webviewView.webview);
        // Sets up an event listener to listen for messages passed from the webview view context
        // and executes code based on the message that is recieved
        this.setWebviewMessageListener(webviewView.webview);
        // Logs show up in bottom panel > Debug Console
        //console.log("registering listener")
        // Listen for when the panel becomes visible
        // https://github.com/microsoft/vscode-discussions/discussions/840
        if ("onDidChangeViewState" in webviewView) {
            // WebviewView and WebviewPanel have all the same properties except for this visibility listener
            // panel
            webviewView.onDidChangeViewState(() => {
                if (this.view?.visible) {
                    this.postMessageToWebview({ type: "action", action: "didBecomeVisible" });
                }
            }, null, this.disposables);
        }
        else if ("onDidChangeVisibility" in webviewView) {
            // sidebar
            webviewView.onDidChangeVisibility(() => {
                if (this.view?.visible) {
                    this.postMessageToWebview({ type: "action", action: "didBecomeVisible" });
                }
            }, null, this.disposables);
        }
        // Listen for when the view is disposed
        // This happens when the user closes the view or when the view is closed programmatically
        webviewView.onDidDispose(async () => {
            await this.dispose();
        }, null, this.disposables);
        // Listen for when color changes
        vscode.workspace.onDidChangeConfiguration(async (e) => {
            if (e && e.affectsConfiguration("workbench.colorTheme")) {
                // Sends latest theme name to webview
                await this.postMessageToWebview({ type: "theme", text: JSON.stringify(await (0, getTheme_1.getTheme)()) });
            }
        }, null, this.disposables);
        // if the extension is starting a new session, clear previous task state
        this.clearTask();
        this.outputChannel.appendLine("Webview view resolved");
    }
    async initClineWithTask(task, images) {
        await this.clearTask();
        const { apiConfiguration, customModePrompts, diffEnabled, checkpointsEnabled, fuzzyMatchThreshold, mode, customInstructions: globalInstructions, experiments, } = await this.getState();
        const modePrompt = customModePrompts?.[mode];
        const effectiveInstructions = [globalInstructions, modePrompt?.customInstructions].filter(Boolean).join("\n\n");
        this.cline = new Cline_1.Cline(this, apiConfiguration, effectiveInstructions, diffEnabled, checkpointsEnabled, fuzzyMatchThreshold, task, images, undefined, experiments);
    }
    async initClineWithHistoryItem(historyItem) {
        await this.clearTask();
        const { apiConfiguration, customModePrompts, diffEnabled, checkpointsEnabled, fuzzyMatchThreshold, mode, customInstructions: globalInstructions, experiments, } = await this.getState();
        const modePrompt = customModePrompts?.[mode];
        const effectiveInstructions = [globalInstructions, modePrompt?.customInstructions].filter(Boolean).join("\n\n");
        this.cline = new Cline_1.Cline(this, apiConfiguration, effectiveInstructions, diffEnabled, checkpointsEnabled, fuzzyMatchThreshold, undefined, undefined, historyItem, experiments);
    }
    async postMessageToWebview(message) {
        await this.view?.webview.postMessage(message);
    }
    async getHMRHtmlContent(webview) {
        const localPort = "5173";
        const localServerUrl = `localhost:${localPort}`;
        // Check if local dev server is running.
        try {
            await axios_1.default.get(`http://${localServerUrl}`);
        }
        catch (error) {
            vscode.window.showErrorMessage("Local development server is not running, HMR will not work. Please run 'npm run dev' before launching the extension to enable HMR.");
            return this.getHtmlContent(webview);
        }
        const nonce = (0, getNonce_1.getNonce)();
        const stylesUri = (0, getUri_1.getUri)(webview, this.context.extensionUri, ["webview-ui", "build", "assets", "index.css"]);
        const codiconsUri = (0, getUri_1.getUri)(webview, this.context.extensionUri, [
            "node_modules",
            "@vscode",
            "codicons",
            "dist",
            "codicon.css",
        ]);
        const file = "src/index.tsx";
        const scriptUri = `http://${localServerUrl}/${file}`;
        const reactRefresh = /*html*/ `
			<script nonce="${nonce}" type="module">
				import RefreshRuntime from "http://localhost:${localPort}/@react-refresh"
				RefreshRuntime.injectIntoGlobalHook(window)
				window.$RefreshReg$ = () => {}
				window.$RefreshSig$ = () => (type) => type
				window.__vite_plugin_react_preamble_installed__ = true
			</script>
		`;
        const csp = [
            "default-src 'none'",
            `font-src ${webview.cspSource}`,
            `style-src ${webview.cspSource} 'unsafe-inline' https://* http://${localServerUrl} http://0.0.0.0:${localPort}`,
            `img-src ${webview.cspSource} data:`,
            `script-src 'unsafe-eval' https://* http://${localServerUrl} http://0.0.0.0:${localPort} 'nonce-${nonce}'`,
            `connect-src https://* ws://${localServerUrl} ws://0.0.0.0:${localPort} http://${localServerUrl} http://0.0.0.0:${localPort}`,
        ];
        return /*html*/ `
			<!DOCTYPE html>
			<html lang="en">
				<head>
					<meta charset="utf-8">
					<meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
					<meta http-equiv="Content-Security-Policy" content="${csp.join("; ")}">
					<link rel="stylesheet" type="text/css" href="${stylesUri}">
					<link href="${codiconsUri}" rel="stylesheet" />
					<title>Roo Code</title>
				</head>
				<body>
					<div id="root"></div>
					${reactRefresh}
					<script type="module" src="${scriptUri}"></script>
				</body>
			</html>
		`;
    }
    /**
     * Defines and returns the HTML that should be rendered within the webview panel.
     *
     * @remarks This is also the place where references to the React webview build files
     * are created and inserted into the webview HTML.
     *
     * @param webview A reference to the extension webview
     * @param extensionUri The URI of the directory containing the extension
     * @returns A template string literal containing the HTML that should be
     * rendered within the webview panel
     */
    getHtmlContent(webview) {
        // Get the local path to main script run in the webview,
        // then convert it to a uri we can use in the webview.
        // The CSS file from the React build output
        const stylesUri = (0, getUri_1.getUri)(webview, this.context.extensionUri, ["webview-ui", "build", "assets", "index.css"]);
        // The JS file from the React build output
        const scriptUri = (0, getUri_1.getUri)(webview, this.context.extensionUri, ["webview-ui", "build", "assets", "index.js"]);
        // The codicon font from the React build output
        // https://github.com/microsoft/vscode-extension-samples/blob/main/webview-codicons-sample/src/extension.ts
        // we installed this package in the extension so that we can access it how its intended from the extension (the font file is likely bundled in vscode), and we just import the css fileinto our react app we don't have access to it
        // don't forget to add font-src ${webview.cspSource};
        const codiconsUri = (0, getUri_1.getUri)(webview, this.context.extensionUri, [
            "node_modules",
            "@vscode",
            "codicons",
            "dist",
            "codicon.css",
        ]);
        // const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "assets", "main.js"))
        // const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "assets", "reset.css"))
        // const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "assets", "vscode.css"))
        // // Same for stylesheet
        // const stylesheetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "assets", "main.css"))
        // Use a nonce to only allow a specific script to be run.
        /*
        content security policy of your webview to only allow scripts that have a specific nonce
        create a content security policy meta tag so that only loading scripts with a nonce is allowed
        As your extension grows you will likely want to add custom styles, fonts, and/or images to your webview. If you do, you will need to update the content security policy meta tag to explicity allow for these resources. E.g.
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; font-src ${webview.cspSource}; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';">
        - 'unsafe-inline' is required for styles due to vscode-webview-toolkit's dynamic style injection
        - since we pass base64 images to the webview, we need to specify img-src ${webview.cspSource} data:;

        in meta tag we add nonce attribute: A cryptographic nonce (only used once) to allow scripts. The server must generate a unique nonce value each time it transmits a policy. It is critical to provide a nonce that cannot be guessed as bypassing a resource's policy is otherwise trivial.
        */
        const nonce = (0, getNonce_1.getNonce)();
        // Tip: Install the es6-string-html VS Code extension to enable code highlighting below
        return /*html*/ `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
            <meta name="theme-color" content="#000000">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} data:; script-src 'nonce-${nonce}';">
            <link rel="stylesheet" type="text/css" href="${stylesUri}">
			<link href="${codiconsUri}" rel="stylesheet" />
            <title>Roo Code</title>
          </head>
          <body>
            <noscript>You need to enable JavaScript to run this app.</noscript>
            <div id="root"></div>
            <script nonce="${nonce}" src="${scriptUri}"></script>
          </body>
        </html>
      `;
    }
    /**
     * Sets up an event listener to listen for messages passed from the webview context and
     * executes code based on the message that is recieved.
     *
     * @param webview A reference to the extension webview
     */
    setWebviewMessageListener(webview) {
        webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case "webviewDidLaunch":
                    // Load custom modes first
                    const customModes = await this.customModesManager.getCustomModes();
                    await this.updateGlobalState("customModes", customModes);
                    this.postStateToWebview();
                    this.workspaceTracker?.initializeFilePaths(); // don't await
                    (0, getTheme_1.getTheme)().then((theme) => this.postMessageToWebview({ type: "theme", text: JSON.stringify(theme) }));
                    // post last cached models in case the call to endpoint fails
                    this.readOpenRouterModels().then((openRouterModels) => {
                        if (openRouterModels) {
                            this.postMessageToWebview({ type: "openRouterModels", openRouterModels });
                        }
                    });
                    // If MCP Hub is already initialized, update the webview with current server list
                    if (this.mcpHub) {
                        this.postMessageToWebview({
                            type: "mcpServers",
                            mcpServers: this.mcpHub.getAllServers(),
                        });
                    }
                    // gui relies on model info to be up-to-date to provide the most accurate pricing, so we need to fetch the latest details on launch.
                    // we do this for all users since many users switch between api providers and if they were to switch back to openrouter it would be showing outdated model info if we hadn't retrieved the latest at this point
                    // (see normalizeApiConfiguration > openrouter)
                    this.refreshOpenRouterModels().then(async (openRouterModels) => {
                        if (openRouterModels) {
                            // update model info in state (this needs to be done here since we don't want to update state while settings is open, and we may refresh models there)
                            const { apiConfiguration } = await this.getState();
                            if (apiConfiguration.openRouterModelId) {
                                await this.updateGlobalState("openRouterModelInfo", openRouterModels[apiConfiguration.openRouterModelId]);
                                await this.postStateToWebview();
                            }
                        }
                    });
                    this.readGlamaModels().then((glamaModels) => {
                        if (glamaModels) {
                            this.postMessageToWebview({ type: "glamaModels", glamaModels });
                        }
                    });
                    this.refreshGlamaModels().then(async (glamaModels) => {
                        if (glamaModels) {
                            // update model info in state (this needs to be done here since we don't want to update state while settings is open, and we may refresh models there)
                            const { apiConfiguration } = await this.getState();
                            if (apiConfiguration.glamaModelId) {
                                await this.updateGlobalState("glamaModelInfo", glamaModels[apiConfiguration.glamaModelId]);
                                await this.postStateToWebview();
                            }
                        }
                    });
                    this.readUnboundModels().then((unboundModels) => {
                        if (unboundModels) {
                            this.postMessageToWebview({ type: "unboundModels", unboundModels });
                        }
                    });
                    this.refreshUnboundModels().then(async (unboundModels) => {
                        if (unboundModels) {
                            const { apiConfiguration } = await this.getState();
                            if (apiConfiguration?.unboundModelId) {
                                await this.updateGlobalState("unboundModelInfo", unboundModels[apiConfiguration.unboundModelId]);
                                await this.postStateToWebview();
                            }
                        }
                    });
                    this.readRequestyModels().then((requestyModels) => {
                        if (requestyModels) {
                            this.postMessageToWebview({ type: "requestyModels", requestyModels });
                        }
                    });
                    this.refreshRequestyModels().then(async (requestyModels) => {
                        if (requestyModels) {
                            // update model info in state (this needs to be done here since we don't want to update state while settings is open, and we may refresh models there)
                            const { apiConfiguration } = await this.getState();
                            if (apiConfiguration.requestyModelId) {
                                await this.updateGlobalState("requestyModelInfo", requestyModels[apiConfiguration.requestyModelId]);
                                await this.postStateToWebview();
                            }
                        }
                    });
                    this.configManager
                        .listConfig()
                        .then(async (listApiConfig) => {
                        if (!listApiConfig) {
                            return;
                        }
                        if (listApiConfig.length === 1) {
                            // check if first time init then sync with exist config
                            if (!(0, checkExistApiConfig_1.checkExistKey)(listApiConfig[0])) {
                                const { apiConfiguration } = await this.getState();
                                await this.configManager.saveConfig(listApiConfig[0].name ?? "default", apiConfiguration);
                                listApiConfig[0].apiProvider = apiConfiguration.apiProvider;
                            }
                        }
                        const currentConfigName = (await this.getGlobalState("currentApiConfigName"));
                        if (currentConfigName) {
                            if (!(await this.configManager.hasConfig(currentConfigName))) {
                                // current config name not valid, get first config in list
                                await this.updateGlobalState("currentApiConfigName", listApiConfig?.[0]?.name);
                                if (listApiConfig?.[0]?.name) {
                                    const apiConfig = await this.configManager.loadConfig(listApiConfig?.[0]?.name);
                                    await Promise.all([
                                        this.updateGlobalState("listApiConfigMeta", listApiConfig),
                                        this.postMessageToWebview({ type: "listApiConfig", listApiConfig }),
                                        this.updateApiConfiguration(apiConfig),
                                    ]);
                                    await this.postStateToWebview();
                                    return;
                                }
                            }
                        }
                        await Promise.all([
                            await this.updateGlobalState("listApiConfigMeta", listApiConfig),
                            await this.postMessageToWebview({ type: "listApiConfig", listApiConfig }),
                        ]);
                    })
                        .catch((error) => this.outputChannel.appendLine(`Error list api configuration: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`));
                    this.isViewLaunched = true;
                    break;
                case "newTask":
                    // Code that should run in response to the hello message command
                    //vscode.window.showInformationMessage(message.text!)
                    // Send a message to our webview.
                    // You can send any JSON serializable data.
                    // Could also do this in extension .ts
                    //this.postMessageToWebview({ type: "text", text: `Extension: ${Date.now()}` })
                    // initializing new instance of Cline will make sure that any agentically running promises in old instance don't affect our new task. this essentially creates a fresh slate for the new task
                    await this.initClineWithTask(message.text, message.images);
                    break;
                case "apiConfiguration":
                    if (message.apiConfiguration) {
                        await this.updateApiConfiguration(message.apiConfiguration);
                    }
                    await this.postStateToWebview();
                    break;
                case "customInstructions":
                    await this.updateCustomInstructions(message.text);
                    break;
                case "alwaysAllowReadOnly":
                    await this.updateGlobalState("alwaysAllowReadOnly", message.bool ?? undefined);
                    await this.postStateToWebview();
                    break;
                case "alwaysAllowWrite":
                    await this.updateGlobalState("alwaysAllowWrite", message.bool ?? undefined);
                    await this.postStateToWebview();
                    break;
                case "alwaysAllowExecute":
                    await this.updateGlobalState("alwaysAllowExecute", message.bool ?? undefined);
                    await this.postStateToWebview();
                    break;
                case "alwaysAllowBrowser":
                    await this.updateGlobalState("alwaysAllowBrowser", message.bool ?? undefined);
                    await this.postStateToWebview();
                    break;
                case "alwaysAllowMcp":
                    await this.updateGlobalState("alwaysAllowMcp", message.bool);
                    await this.postStateToWebview();
                    break;
                case "alwaysAllowModeSwitch":
                    await this.updateGlobalState("alwaysAllowModeSwitch", message.bool);
                    await this.postStateToWebview();
                    break;
                case "askResponse":
                    this.cline?.handleWebviewAskResponse(message.askResponse, message.text, message.images);
                    break;
                case "clearTask":
                    // newTask will start a new task with a given task text, while clear task resets the current session and allows for a new task to be started
                    await this.clearTask();
                    await this.postStateToWebview();
                    break;
                case "didShowAnnouncement":
                    await this.updateGlobalState("lastShownAnnouncementId", this.latestAnnouncementId);
                    await this.postStateToWebview();
                    break;
                case "selectImages":
                    const images = await (0, process_images_1.selectImages)();
                    await this.postMessageToWebview({ type: "selectedImages", images });
                    break;
                case "exportCurrentTask":
                    const currentTaskId = this.cline?.taskId;
                    if (currentTaskId) {
                        this.exportTaskWithId(currentTaskId);
                    }
                    break;
                case "showTaskWithId":
                    this.showTaskWithId(message.text);
                    break;
                case "deleteTaskWithId":
                    this.deleteTaskWithId(message.text);
                    break;
                case "exportTaskWithId":
                    this.exportTaskWithId(message.text);
                    break;
                case "resetState":
                    await this.resetState();
                    break;
                case "requestOllamaModels":
                    const ollamaModels = await this.getOllamaModels(message.text);
                    this.postMessageToWebview({ type: "ollamaModels", ollamaModels });
                    break;
                case "requestLmStudioModels":
                    const lmStudioModels = await this.getLmStudioModels(message.text);
                    this.postMessageToWebview({ type: "lmStudioModels", lmStudioModels });
                    break;
                case "requestVsCodeLmModels":
                    const vsCodeLmModels = await this.getVsCodeLmModels();
                    this.postMessageToWebview({ type: "vsCodeLmModels", vsCodeLmModels });
                    break;
                case "refreshGlamaModels":
                    await this.refreshGlamaModels();
                    break;
                case "refreshOpenRouterModels":
                    await this.refreshOpenRouterModels();
                    break;
                case "refreshOpenAiModels":
                    if (message?.values?.baseUrl && message?.values?.apiKey) {
                        const openAiModels = await this.getOpenAiModels(message?.values?.baseUrl, message?.values?.apiKey);
                        this.postMessageToWebview({ type: "openAiModels", openAiModels });
                    }
                    break;
                case "refreshUnboundModels":
                    await this.refreshUnboundModels();
                    break;
                case "refreshRequestyModels":
                    if (message?.values?.apiKey) {
                        const requestyModels = await this.refreshRequestyModels(message?.values?.apiKey);
                        this.postMessageToWebview({ type: "requestyModels", requestyModels: requestyModels });
                    }
                    break;
                case "openImage":
                    (0, open_file_1.openImage)(message.text);
                    break;
                case "openFile":
                    (0, open_file_1.openFile)(message.text, message.values);
                    break;
                case "openMention":
                    (0, mentions_1.openMention)(message.text);
                    break;
                case "checkpointDiff":
                    const result = WebviewMessage_1.checkoutDiffPayloadSchema.safeParse(message.payload);
                    if (result.success) {
                        await this.cline?.checkpointDiff(result.data);
                    }
                    break;
                case "checkpointRestore": {
                    const result = WebviewMessage_1.checkoutRestorePayloadSchema.safeParse(message.payload);
                    if (result.success) {
                        await this.cancelTask();
                        try {
                            await (0, p_wait_for_1.default)(() => this.cline?.isInitialized === true, { timeout: 3_000 });
                        }
                        catch (error) {
                            vscode.window.showErrorMessage("Timed out when attempting to restore checkpoint.");
                        }
                        try {
                            await this.cline?.checkpointRestore(result.data);
                        }
                        catch (error) {
                            vscode.window.showErrorMessage("Failed to restore checkpoint.");
                        }
                    }
                    break;
                }
                case "cancelTask":
                    await this.cancelTask();
                    break;
                case "allowedCommands":
                    await this.context.globalState.update("allowedCommands", message.commands);
                    // Also update workspace settings
                    await vscode.workspace
                        .getConfiguration("roo-cline")
                        .update("allowedCommands", message.commands, vscode.ConfigurationTarget.Global);
                    break;
                case "openMcpSettings": {
                    const mcpSettingsFilePath = await this.mcpHub?.getMcpSettingsFilePath();
                    if (mcpSettingsFilePath) {
                        (0, open_file_1.openFile)(mcpSettingsFilePath);
                    }
                    break;
                }
                case "openCustomModesSettings": {
                    const customModesFilePath = await this.customModesManager.getCustomModesFilePath();
                    if (customModesFilePath) {
                        (0, open_file_1.openFile)(customModesFilePath);
                    }
                    break;
                }
                case "restartMcpServer": {
                    try {
                        await this.mcpHub?.restartConnection(message.text);
                    }
                    catch (error) {
                        this.outputChannel.appendLine(`Failed to retry connection for ${message.text}: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
                    }
                    break;
                }
                case "toggleToolAlwaysAllow": {
                    try {
                        await this.mcpHub?.toggleToolAlwaysAllow(message.serverName, message.toolName, message.alwaysAllow);
                    }
                    catch (error) {
                        this.outputChannel.appendLine(`Failed to toggle auto-approve for tool ${message.toolName}: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
                    }
                    break;
                }
                case "toggleMcpServer": {
                    try {
                        await this.mcpHub?.toggleServerDisabled(message.serverName, message.disabled);
                    }
                    catch (error) {
                        this.outputChannel.appendLine(`Failed to toggle MCP server ${message.serverName}: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
                    }
                    break;
                }
                case "mcpEnabled":
                    const mcpEnabled = message.bool ?? true;
                    await this.updateGlobalState("mcpEnabled", mcpEnabled);
                    await this.postStateToWebview();
                    break;
                case "enableMcpServerCreation":
                    await this.updateGlobalState("enableMcpServerCreation", message.bool ?? true);
                    await this.postStateToWebview();
                    break;
                case "playSound":
                    if (message.audioType) {
                        const soundPath = path.join(this.context.extensionPath, "audio", `${message.audioType}.wav`);
                        (0, sound_1.playSound)(soundPath);
                    }
                    break;
                case "soundEnabled":
                    const soundEnabled = message.bool ?? true;
                    await this.updateGlobalState("soundEnabled", soundEnabled);
                    (0, sound_1.setSoundEnabled)(soundEnabled); // Add this line to update the sound utility
                    await this.postStateToWebview();
                    break;
                case "soundVolume":
                    const soundVolume = message.value ?? 0.5;
                    await this.updateGlobalState("soundVolume", soundVolume);
                    (0, sound_1.setSoundVolume)(soundVolume);
                    await this.postStateToWebview();
                    break;
                case "diffEnabled":
                    const diffEnabled = message.bool ?? true;
                    await this.updateGlobalState("diffEnabled", diffEnabled);
                    await this.postStateToWebview();
                    break;
                case "checkpointsEnabled":
                    const checkpointsEnabled = message.bool ?? false;
                    await this.updateGlobalState("checkpointsEnabled", checkpointsEnabled);
                    await this.postStateToWebview();
                    break;
                case "browserViewportSize":
                    const browserViewportSize = message.text ?? "900x600";
                    await this.updateGlobalState("browserViewportSize", browserViewportSize);
                    await this.postStateToWebview();
                    break;
                case "fuzzyMatchThreshold":
                    await this.updateGlobalState("fuzzyMatchThreshold", message.value);
                    await this.postStateToWebview();
                    break;
                case "alwaysApproveResubmit":
                    await this.updateGlobalState("alwaysApproveResubmit", message.bool ?? false);
                    await this.postStateToWebview();
                    break;
                case "requestDelaySeconds":
                    await this.updateGlobalState("requestDelaySeconds", message.value ?? 5);
                    await this.postStateToWebview();
                    break;
                case "rateLimitSeconds":
                    await this.updateGlobalState("rateLimitSeconds", message.value ?? 0);
                    await this.postStateToWebview();
                    break;
                case "preferredLanguage":
                    await this.updateGlobalState("preferredLanguage", message.text);
                    await this.postStateToWebview();
                    break;
                case "writeDelayMs":
                    await this.updateGlobalState("writeDelayMs", message.value);
                    await this.postStateToWebview();
                    break;
                case "terminalOutputLineLimit":
                    await this.updateGlobalState("terminalOutputLineLimit", message.value);
                    await this.postStateToWebview();
                    break;
                case "mode":
                    await this.handleModeSwitch(message.text);
                    break;
                case "updateSupportPrompt":
                    try {
                        if (Object.keys(message?.values ?? {}).length === 0) {
                            return;
                        }
                        const existingPrompts = (await this.getGlobalState("customSupportPrompts")) || {};
                        const updatedPrompts = {
                            ...existingPrompts,
                            ...message.values,
                        };
                        await this.updateGlobalState("customSupportPrompts", updatedPrompts);
                        await this.postStateToWebview();
                    }
                    catch (error) {
                        this.outputChannel.appendLine(`Error update support prompt: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
                        vscode.window.showErrorMessage("Failed to update support prompt");
                    }
                    break;
                case "resetSupportPrompt":
                    try {
                        if (!message?.text) {
                            return;
                        }
                        const existingPrompts = ((await this.getGlobalState("customSupportPrompts")) ||
                            {});
                        const updatedPrompts = {
                            ...existingPrompts,
                        };
                        updatedPrompts[message.text] = undefined;
                        await this.updateGlobalState("customSupportPrompts", updatedPrompts);
                        await this.postStateToWebview();
                    }
                    catch (error) {
                        this.outputChannel.appendLine(`Error reset support prompt: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
                        vscode.window.showErrorMessage("Failed to reset support prompt");
                    }
                    break;
                case "updatePrompt":
                    if (message.promptMode && message.customPrompt !== undefined) {
                        const existingPrompts = (await this.getGlobalState("customModePrompts")) || {};
                        const updatedPrompts = {
                            ...existingPrompts,
                            [message.promptMode]: message.customPrompt,
                        };
                        await this.updateGlobalState("customModePrompts", updatedPrompts);
                        // Get current state and explicitly include customModePrompts
                        const currentState = await this.getState();
                        const stateWithPrompts = {
                            ...currentState,
                            customModePrompts: updatedPrompts,
                        };
                        // Post state with prompts
                        this.view?.webview.postMessage({
                            type: "state",
                            state: stateWithPrompts,
                        });
                    }
                    break;
                case "deleteMessage": {
                    const answer = await vscode.window.showInformationMessage("What would you like to delete?", { modal: true }, "Just this message", "This and all subsequent messages");
                    if ((answer === "Just this message" || answer === "This and all subsequent messages") &&
                        this.cline &&
                        typeof message.value === "number" &&
                        message.value) {
                        const timeCutoff = message.value - 1000; // 1 second buffer before the message to delete
                        const messageIndex = this.cline.clineMessages.findIndex((msg) => msg.ts && msg.ts >= timeCutoff);
                        const apiConversationHistoryIndex = this.cline.apiConversationHistory.findIndex((msg) => msg.ts && msg.ts >= timeCutoff);
                        if (messageIndex !== -1) {
                            const { historyItem } = await this.getTaskWithId(this.cline.taskId);
                            if (answer === "Just this message") {
                                // Find the next user message first
                                const nextUserMessage = this.cline.clineMessages
                                    .slice(messageIndex + 1)
                                    .find((msg) => msg.type === "say" && msg.say === "user_feedback");
                                // Handle UI messages
                                if (nextUserMessage) {
                                    // Find absolute index of next user message
                                    const nextUserMessageIndex = this.cline.clineMessages.findIndex((msg) => msg === nextUserMessage);
                                    // Keep messages before current message and after next user message
                                    await this.cline.overwriteClineMessages([
                                        ...this.cline.clineMessages.slice(0, messageIndex),
                                        ...this.cline.clineMessages.slice(nextUserMessageIndex),
                                    ]);
                                }
                                else {
                                    // If no next user message, keep only messages before current message
                                    await this.cline.overwriteClineMessages(this.cline.clineMessages.slice(0, messageIndex));
                                }
                                // Handle API messages
                                if (apiConversationHistoryIndex !== -1) {
                                    if (nextUserMessage && nextUserMessage.ts) {
                                        // Keep messages before current API message and after next user message
                                        await this.cline.overwriteApiConversationHistory([
                                            ...this.cline.apiConversationHistory.slice(0, apiConversationHistoryIndex),
                                            ...this.cline.apiConversationHistory.filter((msg) => msg.ts && msg.ts >= nextUserMessage.ts),
                                        ]);
                                    }
                                    else {
                                        // If no next user message, keep only messages before current API message
                                        await this.cline.overwriteApiConversationHistory(this.cline.apiConversationHistory.slice(0, apiConversationHistoryIndex));
                                    }
                                }
                            }
                            else if (answer === "This and all subsequent messages") {
                                // Delete this message and all that follow
                                await this.cline.overwriteClineMessages(this.cline.clineMessages.slice(0, messageIndex));
                                if (apiConversationHistoryIndex !== -1) {
                                    await this.cline.overwriteApiConversationHistory(this.cline.apiConversationHistory.slice(0, apiConversationHistoryIndex));
                                }
                            }
                            await this.initClineWithHistoryItem(historyItem);
                        }
                    }
                    break;
                }
                case "screenshotQuality":
                    await this.updateGlobalState("screenshotQuality", message.value);
                    await this.postStateToWebview();
                    break;
                case "maxOpenTabsContext":
                    const tabCount = Math.min(Math.max(0, message.value ?? 20), 500);
                    await this.updateGlobalState("maxOpenTabsContext", tabCount);
                    await this.postStateToWebview();
                    break;
                case "enhancementApiConfigId":
                    await this.updateGlobalState("enhancementApiConfigId", message.text);
                    await this.postStateToWebview();
                    break;
                case "autoApprovalEnabled":
                    await this.updateGlobalState("autoApprovalEnabled", message.bool ?? false);
                    await this.postStateToWebview();
                    break;
                case "enhancePrompt":
                    if (message.text) {
                        try {
                            const { apiConfiguration, customSupportPrompts, listApiConfigMeta, enhancementApiConfigId, } = await this.getState();
                            // Try to get enhancement config first, fall back to current config
                            let configToUse = apiConfiguration;
                            if (enhancementApiConfigId) {
                                const config = listApiConfigMeta?.find((c) => c.id === enhancementApiConfigId);
                                if (config?.name) {
                                    const loadedConfig = await this.configManager.loadConfig(config.name);
                                    if (loadedConfig.apiProvider) {
                                        configToUse = loadedConfig;
                                    }
                                }
                            }
                            const enhancedPrompt = await (0, single_completion_handler_1.singleCompletionHandler)(configToUse, support_prompt_1.supportPrompt.create("ENHANCE", {
                                userInput: message.text,
                            }, customSupportPrompts));
                            await this.postMessageToWebview({
                                type: "enhancedPrompt",
                                text: enhancedPrompt,
                            });
                        }
                        catch (error) {
                            this.outputChannel.appendLine(`Error enhancing prompt: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
                            vscode.window.showErrorMessage("Failed to enhance prompt");
                            await this.postMessageToWebview({
                                type: "enhancedPrompt",
                            });
                        }
                    }
                    break;
                case "getSystemPrompt":
                    try {
                        const systemPrompt = await generateSystemPrompt(message);
                        await this.postMessageToWebview({
                            type: "systemPrompt",
                            text: systemPrompt,
                            mode: message.mode,
                        });
                    }
                    catch (error) {
                        this.outputChannel.appendLine(`Error getting system prompt:  ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
                        vscode.window.showErrorMessage("Failed to get system prompt");
                    }
                    break;
                case "copySystemPrompt":
                    try {
                        const systemPrompt = await generateSystemPrompt(message);
                        await vscode.env.clipboard.writeText(systemPrompt);
                        await vscode.window.showInformationMessage("System prompt successfully copied to clipboard");
                    }
                    catch (error) {
                        this.outputChannel.appendLine(`Error getting system prompt:  ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
                        vscode.window.showErrorMessage("Failed to get system prompt");
                    }
                    break;
                case "searchCommits": {
                    const cwd = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath).at(0);
                    if (cwd) {
                        try {
                            const commits = await (0, git_1.searchCommits)(message.query || "", cwd);
                            await this.postMessageToWebview({
                                type: "commitSearchResults",
                                commits,
                            });
                        }
                        catch (error) {
                            this.outputChannel.appendLine(`Error searching commits: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
                            vscode.window.showErrorMessage("Failed to search commits");
                        }
                    }
                    break;
                }
                case "upsertApiConfiguration":
                    if (message.text && message.apiConfiguration) {
                        try {
                            await this.configManager.saveConfig(message.text, message.apiConfiguration);
                            const listApiConfig = await this.configManager.listConfig();
                            await Promise.all([
                                this.updateGlobalState("listApiConfigMeta", listApiConfig),
                                this.updateApiConfiguration(message.apiConfiguration),
                                this.updateGlobalState("currentApiConfigName", message.text),
                            ]);
                            await this.postStateToWebview();
                        }
                        catch (error) {
                            this.outputChannel.appendLine(`Error create new api configuration: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
                            vscode.window.showErrorMessage("Failed to create api configuration");
                        }
                    }
                    break;
                case "renameApiConfiguration":
                    if (message.values && message.apiConfiguration) {
                        try {
                            const { oldName, newName } = message.values;
                            if (oldName === newName) {
                                break;
                            }
                            await this.configManager.saveConfig(newName, message.apiConfiguration);
                            await this.configManager.deleteConfig(oldName);
                            const listApiConfig = await this.configManager.listConfig();
                            const config = listApiConfig?.find((c) => c.name === newName);
                            // Update listApiConfigMeta first to ensure UI has latest data
                            await this.updateGlobalState("listApiConfigMeta", listApiConfig);
                            await Promise.all([this.updateGlobalState("currentApiConfigName", newName)]);
                            await this.postStateToWebview();
                        }
                        catch (error) {
                            this.outputChannel.appendLine(`Error create new api configuration: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
                            vscode.window.showErrorMessage("Failed to create api configuration");
                        }
                    }
                    break;
                case "loadApiConfiguration":
                    if (message.text) {
                        try {
                            const apiConfig = await this.configManager.loadConfig(message.text);
                            const listApiConfig = await this.configManager.listConfig();
                            await Promise.all([
                                this.updateGlobalState("listApiConfigMeta", listApiConfig),
                                this.updateGlobalState("currentApiConfigName", message.text),
                                this.updateApiConfiguration(apiConfig),
                            ]);
                            await this.postStateToWebview();
                        }
                        catch (error) {
                            this.outputChannel.appendLine(`Error load api configuration: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
                            vscode.window.showErrorMessage("Failed to load api configuration");
                        }
                    }
                    break;
                case "deleteApiConfiguration":
                    if (message.text) {
                        const answer = await vscode.window.showInformationMessage("Are you sure you want to delete this configuration profile?", { modal: true }, "Yes");
                        if (answer !== "Yes") {
                            break;
                        }
                        try {
                            await this.configManager.deleteConfig(message.text);
                            const listApiConfig = await this.configManager.listConfig();
                            // Update listApiConfigMeta first to ensure UI has latest data
                            await this.updateGlobalState("listApiConfigMeta", listApiConfig);
                            // If this was the current config, switch to first available
                            const currentApiConfigName = await this.getGlobalState("currentApiConfigName");
                            if (message.text === currentApiConfigName && listApiConfig?.[0]?.name) {
                                const apiConfig = await this.configManager.loadConfig(listApiConfig[0].name);
                                await Promise.all([
                                    this.updateGlobalState("currentApiConfigName", listApiConfig[0].name),
                                    this.updateApiConfiguration(apiConfig),
                                ]);
                            }
                            await this.postStateToWebview();
                        }
                        catch (error) {
                            this.outputChannel.appendLine(`Error delete api configuration: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
                            vscode.window.showErrorMessage("Failed to delete api configuration");
                        }
                    }
                    break;
                case "getListApiConfiguration":
                    try {
                        const listApiConfig = await this.configManager.listConfig();
                        await this.updateGlobalState("listApiConfigMeta", listApiConfig);
                        this.postMessageToWebview({ type: "listApiConfig", listApiConfig });
                    }
                    catch (error) {
                        this.outputChannel.appendLine(`Error get list api configuration: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
                        vscode.window.showErrorMessage("Failed to get list api configuration");
                    }
                    break;
                case "updateExperimental": {
                    if (!message.values) {
                        break;
                    }
                    const updatedExperiments = {
                        ...((await this.getGlobalState("experiments")) ?? experiments_1.experimentDefault),
                        ...message.values,
                    };
                    await this.updateGlobalState("experiments", updatedExperiments);
                    // Update diffStrategy in current Cline instance if it exists
                    if (message.values[experiments_1.EXPERIMENT_IDS.DIFF_STRATEGY] !== undefined && this.cline) {
                        await this.cline.updateDiffStrategy(experiments_1.experiments.isEnabled(updatedExperiments, experiments_1.EXPERIMENT_IDS.DIFF_STRATEGY));
                    }
                    await this.postStateToWebview();
                    break;
                }
                case "updateMcpTimeout":
                    if (message.serverName && typeof message.timeout === "number") {
                        try {
                            await this.mcpHub?.updateServerTimeout(message.serverName, message.timeout);
                        }
                        catch (error) {
                            this.outputChannel.appendLine(`Failed to update timeout for ${message.serverName}: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
                            vscode.window.showErrorMessage("Failed to update server timeout");
                        }
                    }
                    break;
                case "updateCustomMode":
                    if (message.modeConfig) {
                        await this.customModesManager.updateCustomMode(message.modeConfig.slug, message.modeConfig);
                        // Update state after saving the mode
                        const customModes = await this.customModesManager.getCustomModes();
                        await this.updateGlobalState("customModes", customModes);
                        await this.updateGlobalState("mode", message.modeConfig.slug);
                        await this.postStateToWebview();
                    }
                    break;
                case "deleteCustomMode":
                    if (message.slug) {
                        const answer = await vscode.window.showInformationMessage("Are you sure you want to delete this custom mode?", { modal: true }, "Yes");
                        if (answer !== "Yes") {
                            break;
                        }
                        await this.customModesManager.deleteCustomMode(message.slug);
                        // Switch back to default mode after deletion
                        await this.updateGlobalState("mode", modes_1.defaultModeSlug);
                        await this.postStateToWebview();
                    }
            }
        }, null, this.disposables);
        const generateSystemPrompt = async (message) => {
            const { apiConfiguration, customModePrompts, customInstructions, preferredLanguage, browserViewportSize, diffEnabled, mcpEnabled, fuzzyMatchThreshold, experiments, enableMcpServerCreation, } = await this.getState();
            // Create diffStrategy based on current model and settings
            const diffStrategy = (0, DiffStrategy_1.getDiffStrategy)(apiConfiguration.apiModelId || apiConfiguration.openRouterModelId || "", fuzzyMatchThreshold, experiments_1.experiments.isEnabled(experiments, experiments_1.EXPERIMENT_IDS.DIFF_STRATEGY));
            const cwd = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath).at(0) || "";
            const mode = message.mode ?? modes_1.defaultModeSlug;
            const customModes = await this.customModesManager.getCustomModes();
            const systemPrompt = await (0, system_1.SYSTEM_PROMPT)(this.context, cwd, apiConfiguration.openRouterModelInfo?.supportsComputerUse ?? false, mcpEnabled ? this.mcpHub : undefined, diffStrategy, browserViewportSize ?? "900x600", mode, customModePrompts, customModes, customInstructions, preferredLanguage, diffEnabled, experiments, enableMcpServerCreation);
            return systemPrompt;
        };
    }
    /**
     * Handle switching to a new mode, including updating the associated API configuration
     * @param newMode The mode to switch to
     */
    async handleModeSwitch(newMode) {
        await this.updateGlobalState("mode", newMode);
        // Load the saved API config for the new mode if it exists
        const savedConfigId = await this.configManager.getModeConfigId(newMode);
        const listApiConfig = await this.configManager.listConfig();
        // Update listApiConfigMeta first to ensure UI has latest data
        await this.updateGlobalState("listApiConfigMeta", listApiConfig);
        // If this mode has a saved config, use it
        if (savedConfigId) {
            const config = listApiConfig?.find((c) => c.id === savedConfigId);
            if (config?.name) {
                const apiConfig = await this.configManager.loadConfig(config.name);
                await Promise.all([
                    this.updateGlobalState("currentApiConfigName", config.name),
                    this.updateApiConfiguration(apiConfig),
                ]);
            }
        }
        else {
            // If no saved config for this mode, save current config as default
            const currentApiConfigName = await this.getGlobalState("currentApiConfigName");
            if (currentApiConfigName) {
                const config = listApiConfig?.find((c) => c.name === currentApiConfigName);
                if (config?.id) {
                    await this.configManager.setModeConfig(newMode, config.id);
                }
            }
        }
        await this.postStateToWebview();
    }
    async updateApiConfiguration(apiConfiguration) {
        // Update mode's default config
        const { mode } = await this.getState();
        if (mode) {
            const currentApiConfigName = await this.getGlobalState("currentApiConfigName");
            const listApiConfig = await this.configManager.listConfig();
            const config = listApiConfig?.find((c) => c.name === currentApiConfigName);
            if (config?.id) {
                await this.configManager.setModeConfig(mode, config.id);
            }
        }
        const { apiProvider, apiModelId, apiKey, glamaModelId, glamaModelInfo, glamaApiKey, openRouterApiKey, awsAccessKey, awsSecretKey, awsSessionToken, awsRegion, awsUseCrossRegionInference, awsProfile, awsUseProfile, vertexProjectId, vertexRegion, openAiBaseUrl, openAiApiKey, openAiModelId, openAiCustomModelInfo, openAiUseAzure, ollamaModelId, ollamaBaseUrl, lmStudioModelId, lmStudioBaseUrl, anthropicBaseUrl, geminiApiKey, openAiNativeApiKey, deepSeekApiKey, azureApiVersion, openAiStreamingEnabled, openRouterModelId, openRouterBaseUrl, openRouterModelInfo, openRouterUseMiddleOutTransform, vsCodeLmModelSelector, mistralApiKey, mistralCodestralUrl, unboundApiKey, unboundModelId, unboundModelInfo, requestyApiKey, requestyModelId, requestyModelInfo, modelTemperature, } = apiConfiguration;
        await this.updateGlobalState("apiProvider", apiProvider);
        await this.updateGlobalState("apiModelId", apiModelId);
        await this.storeSecret("apiKey", apiKey);
        await this.updateGlobalState("glamaModelId", glamaModelId);
        await this.updateGlobalState("glamaModelInfo", glamaModelInfo);
        await this.storeSecret("glamaApiKey", glamaApiKey);
        await this.storeSecret("openRouterApiKey", openRouterApiKey);
        await this.storeSecret("awsAccessKey", awsAccessKey);
        await this.storeSecret("awsSecretKey", awsSecretKey);
        await this.storeSecret("awsSessionToken", awsSessionToken);
        await this.updateGlobalState("awsRegion", awsRegion);
        await this.updateGlobalState("awsUseCrossRegionInference", awsUseCrossRegionInference);
        await this.updateGlobalState("awsProfile", awsProfile);
        await this.updateGlobalState("awsUseProfile", awsUseProfile);
        await this.updateGlobalState("vertexProjectId", vertexProjectId);
        await this.updateGlobalState("vertexRegion", vertexRegion);
        await this.updateGlobalState("openAiBaseUrl", openAiBaseUrl);
        await this.storeSecret("openAiApiKey", openAiApiKey);
        await this.updateGlobalState("openAiModelId", openAiModelId);
        await this.updateGlobalState("openAiCustomModelInfo", openAiCustomModelInfo);
        await this.updateGlobalState("openAiUseAzure", openAiUseAzure);
        await this.updateGlobalState("ollamaModelId", ollamaModelId);
        await this.updateGlobalState("ollamaBaseUrl", ollamaBaseUrl);
        await this.updateGlobalState("lmStudioModelId", lmStudioModelId);
        await this.updateGlobalState("lmStudioBaseUrl", lmStudioBaseUrl);
        await this.updateGlobalState("anthropicBaseUrl", anthropicBaseUrl);
        await this.storeSecret("geminiApiKey", geminiApiKey);
        await this.storeSecret("openAiNativeApiKey", openAiNativeApiKey);
        await this.storeSecret("deepSeekApiKey", deepSeekApiKey);
        await this.updateGlobalState("azureApiVersion", azureApiVersion);
        await this.updateGlobalState("openAiStreamingEnabled", openAiStreamingEnabled);
        await this.updateGlobalState("openRouterModelId", openRouterModelId);
        await this.updateGlobalState("openRouterModelInfo", openRouterModelInfo);
        await this.updateGlobalState("openRouterBaseUrl", openRouterBaseUrl);
        await this.updateGlobalState("openRouterUseMiddleOutTransform", openRouterUseMiddleOutTransform);
        await this.updateGlobalState("vsCodeLmModelSelector", vsCodeLmModelSelector);
        await this.storeSecret("mistralApiKey", mistralApiKey);
        await this.updateGlobalState("mistralCodestralUrl", mistralCodestralUrl);
        await this.storeSecret("unboundApiKey", unboundApiKey);
        await this.updateGlobalState("unboundModelId", unboundModelId);
        await this.updateGlobalState("unboundModelInfo", unboundModelInfo);
        await this.storeSecret("requestyApiKey", requestyApiKey);
        await this.updateGlobalState("requestyModelId", requestyModelId);
        await this.updateGlobalState("requestyModelInfo", requestyModelInfo);
        await this.updateGlobalState("modelTemperature", modelTemperature);
        if (this.cline) {
            this.cline.api = (0, api_1.buildApiHandler)(apiConfiguration);
        }
    }
    async cancelTask() {
        if (this.cline) {
            const { historyItem } = await this.getTaskWithId(this.cline.taskId);
            this.cline.abortTask();
            await (0, p_wait_for_1.default)(() => this.cline === undefined ||
                this.cline.isStreaming === false ||
                this.cline.didFinishAbortingStream ||
                // If only the first chunk is processed, then there's no
                // need to wait for graceful abort (closes edits, browser,
                // etc).
                this.cline.isWaitingForFirstChunk, {
                timeout: 3_000,
            }).catch(() => {
                console.error("Failed to abort task");
            });
            if (this.cline) {
                // 'abandoned' will prevent this Cline instance from affecting
                // future Cline instances. This may happen if its hanging on a
                // streaming request.
                this.cline.abandoned = true;
            }
            // Clears task again, so we need to abortTask manually above.
            await this.initClineWithHistoryItem(historyItem);
        }
    }
    async updateCustomInstructions(instructions) {
        // User may be clearing the field
        await this.updateGlobalState("customInstructions", instructions || undefined);
        if (this.cline) {
            this.cline.customInstructions = instructions || undefined;
        }
        await this.postStateToWebview();
    }
    // MCP
    async ensureMcpServersDirectoryExists() {
        const mcpServersDir = path.join(os_1.default.homedir(), "Documents", "Cline", "MCP");
        try {
            await promises_1.default.mkdir(mcpServersDir, { recursive: true });
        }
        catch (error) {
            return "~/Documents/Cline/MCP"; // in case creating a directory in documents fails for whatever reason (e.g. permissions) - this is fine since this path is only ever used in the system prompt
        }
        return mcpServersDir;
    }
    async ensureSettingsDirectoryExists() {
        const settingsDir = path.join(this.context.globalStorageUri.fsPath, "settings");
        await promises_1.default.mkdir(settingsDir, { recursive: true });
        return settingsDir;
    }
    // Ollama
    async getOllamaModels(baseUrl) {
        try {
            if (!baseUrl) {
                baseUrl = "http://localhost:11434";
            }
            if (!URL.canParse(baseUrl)) {
                return [];
            }
            const response = await axios_1.default.get(`${baseUrl}/api/tags`);
            const modelsArray = response.data?.models?.map((model) => model.name) || [];
            const models = [...new Set(modelsArray)];
            return models;
        }
        catch (error) {
            return [];
        }
    }
    // LM Studio
    async getLmStudioModels(baseUrl) {
        try {
            if (!baseUrl) {
                baseUrl = "http://localhost:1234";
            }
            if (!URL.canParse(baseUrl)) {
                return [];
            }
            const response = await axios_1.default.get(`${baseUrl}/v1/models`);
            const modelsArray = response.data?.data?.map((model) => model.id) || [];
            const models = [...new Set(modelsArray)];
            return models;
        }
        catch (error) {
            return [];
        }
    }
    // VSCode LM API
    async getVsCodeLmModels() {
        try {
            const models = await vscode.lm.selectChatModels({});
            return models || [];
        }
        catch (error) {
            this.outputChannel.appendLine(`Error fetching VS Code LM models: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
            return [];
        }
    }
    // OpenAi
    async getOpenAiModels(baseUrl, apiKey) {
        try {
            if (!baseUrl) {
                return [];
            }
            if (!URL.canParse(baseUrl)) {
                return [];
            }
            const config = {};
            if (apiKey) {
                config["headers"] = { Authorization: `Bearer ${apiKey}` };
            }
            const response = await axios_1.default.get(`${baseUrl}/models`, config);
            const modelsArray = response.data?.data?.map((model) => model.id) || [];
            const models = [...new Set(modelsArray)];
            return models;
        }
        catch (error) {
            return [];
        }
    }
    // Requesty
    async readRequestyModels() {
        const requestyModelsFilePath = path.join(await this.ensureCacheDirectoryExists(), exports.GlobalFileNames.requestyModels);
        const fileExists = await (0, fs_1.fileExistsAtPath)(requestyModelsFilePath);
        if (fileExists) {
            const fileContents = await promises_1.default.readFile(requestyModelsFilePath, "utf8");
            return JSON.parse(fileContents);
        }
        return undefined;
    }
    async refreshRequestyModels(apiKey) {
        const requestyModelsFilePath = path.join(await this.ensureCacheDirectoryExists(), exports.GlobalFileNames.requestyModels);
        const models = {};
        try {
            const config = {};
            if (!apiKey) {
                apiKey = (await this.getSecret("requestyApiKey"));
            }
            if (!apiKey) {
                this.outputChannel.appendLine("No Requesty API key found");
                return models;
            }
            if (apiKey) {
                config["headers"] = { Authorization: `Bearer ${apiKey}` };
            }
            const response = await axios_1.default.get("https://router.requesty.ai/v1/models", config);
            /*
                {
                    "id": "anthropic/claude-3-5-sonnet-20240620",
                    "object": "model",
                    "created": 1738243330,
                    "owned_by": "system",
                    "input_price": 0.000003,
                    "caching_price": 0.00000375,
                    "cached_price": 3E-7,
                    "output_price": 0.000015,
                    "max_output_tokens": 8192,
                    "context_window": 200000,
                    "supports_caching": true,
                    "description": "Anthropic's most intelligent model. Highest level of intelligence and capability"
                    },
                }
            */
            if (response.data) {
                const rawModels = response.data.data;
                const parsePrice = (price) => {
                    if (price) {
                        return parseFloat(price) * 1_000_000;
                    }
                    return undefined;
                };
                for (const rawModel of rawModels) {
                    const modelInfo = {
                        maxTokens: rawModel.max_output_tokens,
                        contextWindow: rawModel.context_window,
                        supportsImages: rawModel.support_image,
                        supportsComputerUse: rawModel.support_computer_use,
                        supportsPromptCache: rawModel.supports_caching,
                        inputPrice: parsePrice(rawModel.input_price),
                        outputPrice: parsePrice(rawModel.output_price),
                        description: rawModel.description,
                        cacheWritesPrice: parsePrice(rawModel.caching_price),
                        cacheReadsPrice: parsePrice(rawModel.cached_price),
                    };
                    models[rawModel.id] = modelInfo;
                }
            }
            else {
                this.outputChannel.appendLine("Invalid response from Requesty API");
            }
            await promises_1.default.writeFile(requestyModelsFilePath, JSON.stringify(models));
        }
        catch (error) {
            this.outputChannel.appendLine(`Error fetching Requesty models: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
        }
        await this.postMessageToWebview({ type: "requestyModels", requestyModels: models });
        return models;
    }
    // OpenRouter
    async handleOpenRouterCallback(code) {
        let apiKey;
        try {
            const response = await axios_1.default.post("https://openrouter.ai/api/v1/auth/keys", { code });
            if (response.data && response.data.key) {
                apiKey = response.data.key;
            }
            else {
                throw new Error("Invalid response from OpenRouter API");
            }
        }
        catch (error) {
            this.outputChannel.appendLine(`Error exchanging code for API key: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
            throw error;
        }
        const openrouter = "openrouter";
        await this.updateGlobalState("apiProvider", openrouter);
        await this.storeSecret("openRouterApiKey", apiKey);
        await this.postStateToWebview();
        if (this.cline) {
            this.cline.api = (0, api_1.buildApiHandler)({ apiProvider: openrouter, openRouterApiKey: apiKey });
        }
        // await this.postMessageToWebview({ type: "action", action: "settingsButtonClicked" }) // bad ux if user is on welcome
    }
    async ensureCacheDirectoryExists() {
        const cacheDir = path.join(this.context.globalStorageUri.fsPath, "cache");
        await promises_1.default.mkdir(cacheDir, { recursive: true });
        return cacheDir;
    }
    async handleGlamaCallback(code) {
        let apiKey;
        try {
            const response = await axios_1.default.post("https://glama.ai/api/gateway/v1/auth/exchange-code", { code });
            if (response.data && response.data.apiKey) {
                apiKey = response.data.apiKey;
            }
            else {
                throw new Error("Invalid response from Glama API");
            }
        }
        catch (error) {
            this.outputChannel.appendLine(`Error exchanging code for API key: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
            throw error;
        }
        const glama = "glama";
        await this.updateGlobalState("apiProvider", glama);
        await this.storeSecret("glamaApiKey", apiKey);
        await this.postStateToWebview();
        if (this.cline) {
            this.cline.api = (0, api_1.buildApiHandler)({
                apiProvider: glama,
                glamaApiKey: apiKey,
            });
        }
        // await this.postMessageToWebview({ type: "action", action: "settingsButtonClicked" }) // bad ux if user is on welcome
    }
    async readModelsFromCache(filename) {
        const filePath = path.join(await this.ensureCacheDirectoryExists(), filename);
        const fileExists = await (0, fs_1.fileExistsAtPath)(filePath);
        if (fileExists) {
            const fileContents = await promises_1.default.readFile(filePath, "utf8");
            return JSON.parse(fileContents);
        }
        return undefined;
    }
    async readGlamaModels() {
        return this.readModelsFromCache(exports.GlobalFileNames.glamaModels);
    }
    async refreshGlamaModels() {
        const glamaModelsFilePath = path.join(await this.ensureCacheDirectoryExists(), exports.GlobalFileNames.glamaModels);
        const models = {};
        try {
            const response = await axios_1.default.get("https://glama.ai/api/gateway/v1/models");
            /*
                {
                    "added": "2024-12-24T15:12:49.324Z",
                    "capabilities": [
                        "adjustable_safety_settings",
                        "caching",
                        "code_execution",
                        "function_calling",
                        "json_mode",
                        "json_schema",
                        "system_instructions",
                        "tuning",
                        "input:audio",
                        "input:image",
                        "input:text",
                        "input:video",
                        "output:text"
                    ],
                    "id": "google-vertex/gemini-1.5-flash-002",
                    "maxTokensInput": 1048576,
                    "maxTokensOutput": 8192,
                    "pricePerToken": {
                        "cacheRead": null,
                        "cacheWrite": null,
                        "input": "0.000000075",
                        "output": "0.0000003"
                    }
                }
            */
            if (response.data) {
                const rawModels = response.data;
                const parsePrice = (price) => {
                    if (price) {
                        return parseFloat(price) * 1_000_000;
                    }
                    return undefined;
                };
                for (const rawModel of rawModels) {
                    const modelInfo = {
                        maxTokens: rawModel.maxTokensOutput,
                        contextWindow: rawModel.maxTokensInput,
                        supportsImages: rawModel.capabilities?.includes("input:image"),
                        supportsComputerUse: rawModel.capabilities?.includes("computer_use"),
                        supportsPromptCache: rawModel.capabilities?.includes("caching"),
                        inputPrice: parsePrice(rawModel.pricePerToken?.input),
                        outputPrice: parsePrice(rawModel.pricePerToken?.output),
                        description: undefined,
                        cacheWritesPrice: parsePrice(rawModel.pricePerToken?.cacheWrite),
                        cacheReadsPrice: parsePrice(rawModel.pricePerToken?.cacheRead),
                    };
                    models[rawModel.id] = modelInfo;
                }
            }
            else {
                this.outputChannel.appendLine("Invalid response from Glama API");
            }
            await promises_1.default.writeFile(glamaModelsFilePath, JSON.stringify(models));
        }
        catch (error) {
            this.outputChannel.appendLine(`Error fetching Glama models: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
        }
        await this.postMessageToWebview({ type: "glamaModels", glamaModels: models });
        return models;
    }
    async readOpenRouterModels() {
        return this.readModelsFromCache(exports.GlobalFileNames.openRouterModels);
    }
    async refreshOpenRouterModels() {
        const openRouterModelsFilePath = path.join(await this.ensureCacheDirectoryExists(), exports.GlobalFileNames.openRouterModels);
        const models = {};
        try {
            const response = await axios_1.default.get("https://openrouter.ai/api/v1/models");
            /*
            {
                "id": "anthropic/claude-3.5-sonnet",
                "name": "Anthropic: Claude 3.5 Sonnet",
                "created": 1718841600,
                "description": "Claude 3.5 Sonnet delivers better-than-Opus capabilities, faster-than-Sonnet speeds, at the same Sonnet prices. Sonnet is particularly good at:\n\n- Coding: Autonomously writes, edits, and runs code with reasoning and troubleshooting\n- Data science: Augments human data science expertise; navigates unstructured data while using multiple tools for insights\n- Visual processing: excelling at interpreting charts, graphs, and images, accurately transcribing text to derive insights beyond just the text alone\n- Agentic tasks: exceptional tool use, making it great at agentic tasks (i.e. complex, multi-step problem solving tasks that require engaging with other systems)\n\n#multimodal",
                "context_length": 200000,
                "architecture": {
                    "modality": "text+image-\u003Etext",
                    "tokenizer": "Claude",
                    "instruct_type": null
                },
                "pricing": {
                    "prompt": "0.000003",
                    "completion": "0.000015",
                    "image": "0.0048",
                    "request": "0"
                },
                "top_provider": {
                    "context_length": 200000,
                    "max_completion_tokens": 8192,
                    "is_moderated": true
                },
                "per_request_limits": null
            },
            */
            if (response.data?.data) {
                const rawModels = response.data.data;
                const parsePrice = (price) => {
                    if (price) {
                        return parseFloat(price) * 1_000_000;
                    }
                    return undefined;
                };
                for (const rawModel of rawModels) {
                    const modelInfo = {
                        maxTokens: rawModel.top_provider?.max_completion_tokens,
                        contextWindow: rawModel.context_length,
                        supportsImages: rawModel.architecture?.modality?.includes("image"),
                        supportsPromptCache: false,
                        inputPrice: parsePrice(rawModel.pricing?.prompt),
                        outputPrice: parsePrice(rawModel.pricing?.completion),
                        description: rawModel.description,
                    };
                    switch (rawModel.id) {
                        case "anthropic/claude-3.5-sonnet":
                        case "anthropic/claude-3.5-sonnet:beta":
                            // NOTE: this needs to be synced with api.ts/openrouter default model info
                            modelInfo.supportsComputerUse = true;
                            modelInfo.supportsPromptCache = true;
                            modelInfo.cacheWritesPrice = 3.75;
                            modelInfo.cacheReadsPrice = 0.3;
                            break;
                        case "anthropic/claude-3.5-sonnet-20240620":
                        case "anthropic/claude-3.5-sonnet-20240620:beta":
                            modelInfo.supportsPromptCache = true;
                            modelInfo.cacheWritesPrice = 3.75;
                            modelInfo.cacheReadsPrice = 0.3;
                            break;
                        case "anthropic/claude-3-5-haiku":
                        case "anthropic/claude-3-5-haiku:beta":
                        case "anthropic/claude-3-5-haiku-20241022":
                        case "anthropic/claude-3-5-haiku-20241022:beta":
                        case "anthropic/claude-3.5-haiku":
                        case "anthropic/claude-3.5-haiku:beta":
                        case "anthropic/claude-3.5-haiku-20241022":
                        case "anthropic/claude-3.5-haiku-20241022:beta":
                            modelInfo.supportsPromptCache = true;
                            modelInfo.cacheWritesPrice = 1.25;
                            modelInfo.cacheReadsPrice = 0.1;
                            break;
                        case "anthropic/claude-3-opus":
                        case "anthropic/claude-3-opus:beta":
                            modelInfo.supportsPromptCache = true;
                            modelInfo.cacheWritesPrice = 18.75;
                            modelInfo.cacheReadsPrice = 1.5;
                            break;
                        case "anthropic/claude-3-haiku":
                        case "anthropic/claude-3-haiku:beta":
                            modelInfo.supportsPromptCache = true;
                            modelInfo.cacheWritesPrice = 0.3;
                            modelInfo.cacheReadsPrice = 0.03;
                            break;
                    }
                    models[rawModel.id] = modelInfo;
                }
            }
            else {
                this.outputChannel.appendLine("Invalid response from OpenRouter API");
            }
            await promises_1.default.writeFile(openRouterModelsFilePath, JSON.stringify(models));
        }
        catch (error) {
            this.outputChannel.appendLine(`Error fetching OpenRouter models: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
        }
        await this.postMessageToWebview({ type: "openRouterModels", openRouterModels: models });
        return models;
    }
    async readUnboundModels() {
        return this.readModelsFromCache(exports.GlobalFileNames.unboundModels);
    }
    async refreshUnboundModels() {
        const unboundModelsFilePath = path.join(await this.ensureCacheDirectoryExists(), exports.GlobalFileNames.unboundModels);
        const models = {};
        try {
            const response = await axios_1.default.get("https://api.getunbound.ai/models");
            if (response.data) {
                const rawModels = response.data;
                for (const [modelId, model] of Object.entries(rawModels)) {
                    models[modelId] = {
                        maxTokens: model.maxTokens ? parseInt(model.maxTokens) : undefined,
                        contextWindow: model.contextWindow ? parseInt(model.contextWindow) : 0,
                        supportsImages: model.supportsImages ?? false,
                        supportsPromptCache: model.supportsPromptCaching ?? false,
                        supportsComputerUse: model.supportsComputerUse ?? false,
                        inputPrice: model.inputTokenPrice ? parseFloat(model.inputTokenPrice) : undefined,
                        outputPrice: model.outputTokenPrice ? parseFloat(model.outputTokenPrice) : undefined,
                        cacheWritesPrice: model.cacheWritePrice ? parseFloat(model.cacheWritePrice) : undefined,
                        cacheReadsPrice: model.cacheReadPrice ? parseFloat(model.cacheReadPrice) : undefined,
                    };
                }
            }
            await promises_1.default.writeFile(unboundModelsFilePath, JSON.stringify(models));
        }
        catch (error) {
            this.outputChannel.appendLine(`Error fetching Unbound models: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
        }
        await this.postMessageToWebview({ type: "unboundModels", unboundModels: models });
        return models;
    }
    // Task history
    async getTaskWithId(id) {
        const history = (await this.getGlobalState("taskHistory")) || [];
        const historyItem = history.find((item) => item.id === id);
        if (historyItem) {
            const taskDirPath = path.join(this.context.globalStorageUri.fsPath, "tasks", id);
            const apiConversationHistoryFilePath = path.join(taskDirPath, exports.GlobalFileNames.apiConversationHistory);
            const uiMessagesFilePath = path.join(taskDirPath, exports.GlobalFileNames.uiMessages);
            const fileExists = await (0, fs_1.fileExistsAtPath)(apiConversationHistoryFilePath);
            if (fileExists) {
                const apiConversationHistory = JSON.parse(await promises_1.default.readFile(apiConversationHistoryFilePath, "utf8"));
                return {
                    historyItem,
                    taskDirPath,
                    apiConversationHistoryFilePath,
                    uiMessagesFilePath,
                    apiConversationHistory,
                };
            }
        }
        // if we tried to get a task that doesn't exist, remove it from state
        // FIXME: this seems to happen sometimes when the json file doesnt save to disk for some reason
        await this.deleteTaskFromState(id);
        throw new Error("Task not found");
    }
    async showTaskWithId(id) {
        if (id !== this.cline?.taskId) {
            // non-current task
            const { historyItem } = await this.getTaskWithId(id);
            await this.initClineWithHistoryItem(historyItem); // clears existing task
        }
        await this.postMessageToWebview({ type: "action", action: "chatButtonClicked" });
    }
    async exportTaskWithId(id) {
        const { historyItem, apiConversationHistory } = await this.getTaskWithId(id);
        await (0, export_markdown_1.downloadTask)(historyItem.ts, apiConversationHistory);
    }
    async deleteTaskWithId(id) {
        if (id === this.cline?.taskId) {
            await this.clearTask();
        }
        const { taskDirPath, apiConversationHistoryFilePath, uiMessagesFilePath } = await this.getTaskWithId(id);
        await this.deleteTaskFromState(id);
        // Delete the task files.
        const apiConversationHistoryFileExists = await (0, fs_1.fileExistsAtPath)(apiConversationHistoryFilePath);
        if (apiConversationHistoryFileExists) {
            await promises_1.default.unlink(apiConversationHistoryFilePath);
        }
        const uiMessagesFileExists = await (0, fs_1.fileExistsAtPath)(uiMessagesFilePath);
        if (uiMessagesFileExists) {
            await promises_1.default.unlink(uiMessagesFilePath);
        }
        const legacyMessagesFilePath = path.join(taskDirPath, "claude_messages.json");
        if (await (0, fs_1.fileExistsAtPath)(legacyMessagesFilePath)) {
            await promises_1.default.unlink(legacyMessagesFilePath);
        }
        const { checkpointsEnabled } = await this.getState();
        const baseDir = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath).at(0);
        // Delete checkpoints branch.
        if (checkpointsEnabled && baseDir) {
            const branchSummary = await (0, simple_git_1.default)(baseDir)
                .branch(["-D", `roo-code-checkpoints-${id}`])
                .catch(() => undefined);
            if (branchSummary) {
                console.log(`[deleteTaskWithId${id}] deleted checkpoints branch`);
            }
        }
        // Delete checkpoints directory
        const checkpointsDir = path.join(taskDirPath, "checkpoints");
        if (await (0, fs_1.fileExistsAtPath)(checkpointsDir)) {
            try {
                await promises_1.default.rm(checkpointsDir, { recursive: true, force: true });
                console.log(`[deleteTaskWithId${id}] removed checkpoints repo`);
            }
            catch (error) {
                console.error(`[deleteTaskWithId${id}] failed to remove checkpoints repo: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        // Succeeds if the dir is empty.
        await promises_1.default.rmdir(taskDirPath);
    }
    async deleteTaskFromState(id) {
        // Remove the task from history
        const taskHistory = (await this.getGlobalState("taskHistory")) || [];
        const updatedTaskHistory = taskHistory.filter((task) => task.id !== id);
        await this.updateGlobalState("taskHistory", updatedTaskHistory);
        // Notify the webview that the task has been deleted
        await this.postStateToWebview();
    }
    async postStateToWebview() {
        const state = await this.getStateToPostToWebview();
        this.postMessageToWebview({ type: "state", state });
    }
    async getStateToPostToWebview() {
        const { apiConfiguration, lastShownAnnouncementId, customInstructions, alwaysAllowReadOnly, alwaysAllowWrite, alwaysAllowExecute, alwaysAllowBrowser, alwaysAllowMcp, alwaysAllowModeSwitch, soundEnabled, diffEnabled, checkpointsEnabled, taskHistory, soundVolume, browserViewportSize, screenshotQuality, preferredLanguage, writeDelayMs, terminalOutputLineLimit, fuzzyMatchThreshold, mcpEnabled, enableMcpServerCreation, alwaysApproveResubmit, requestDelaySeconds, rateLimitSeconds, currentApiConfigName, listApiConfigMeta, mode, customModePrompts, customSupportPrompts, enhancementApiConfigId, autoApprovalEnabled, experiments, maxOpenTabsContext, } = await this.getState();
        const allowedCommands = vscode.workspace.getConfiguration("roo-cline").get("allowedCommands") || [];
        return {
            version: this.context.extension?.packageJSON?.version ?? "",
            apiConfiguration,
            customInstructions,
            alwaysAllowReadOnly: alwaysAllowReadOnly ?? false,
            alwaysAllowWrite: alwaysAllowWrite ?? false,
            alwaysAllowExecute: alwaysAllowExecute ?? false,
            alwaysAllowBrowser: alwaysAllowBrowser ?? false,
            alwaysAllowMcp: alwaysAllowMcp ?? false,
            alwaysAllowModeSwitch: alwaysAllowModeSwitch ?? false,
            uriScheme: vscode.env.uriScheme,
            currentTaskItem: this.cline?.taskId
                ? (taskHistory || []).find((item) => item.id === this.cline?.taskId)
                : undefined,
            clineMessages: this.cline?.clineMessages || [],
            taskHistory: (taskHistory || [])
                .filter((item) => item.ts && item.task)
                .sort((a, b) => b.ts - a.ts),
            soundEnabled: soundEnabled ?? false,
            diffEnabled: diffEnabled ?? true,
            checkpointsEnabled: checkpointsEnabled ?? false,
            shouldShowAnnouncement: lastShownAnnouncementId !== this.latestAnnouncementId,
            allowedCommands,
            soundVolume: soundVolume ?? 0.5,
            browserViewportSize: browserViewportSize ?? "900x600",
            screenshotQuality: screenshotQuality ?? 75,
            preferredLanguage: preferredLanguage ?? "English",
            writeDelayMs: writeDelayMs ?? 1000,
            terminalOutputLineLimit: terminalOutputLineLimit ?? 500,
            fuzzyMatchThreshold: fuzzyMatchThreshold ?? 1.0,
            mcpEnabled: mcpEnabled ?? true,
            enableMcpServerCreation: enableMcpServerCreation ?? true,
            alwaysApproveResubmit: alwaysApproveResubmit ?? false,
            requestDelaySeconds: requestDelaySeconds ?? 10,
            rateLimitSeconds: rateLimitSeconds ?? 0,
            currentApiConfigName: currentApiConfigName ?? "default",
            listApiConfigMeta: listApiConfigMeta ?? [],
            mode: mode ?? modes_1.defaultModeSlug,
            customModePrompts: customModePrompts ?? {},
            customSupportPrompts: customSupportPrompts ?? {},
            enhancementApiConfigId,
            autoApprovalEnabled: autoApprovalEnabled ?? false,
            customModes: await this.customModesManager.getCustomModes(),
            experiments: experiments ?? experiments_1.experimentDefault,
            mcpServers: this.mcpHub?.getAllServers() ?? [],
            maxOpenTabsContext: maxOpenTabsContext ?? 20,
        };
    }
    async clearTask() {
        this.cline?.abortTask();
        this.cline = undefined; // removes reference to it, so once promises end it will be garbage collected
    }
    // Caching mechanism to keep track of webview messages + API conversation history per provider instance
    /*
    Now that we use retainContextWhenHidden, we don't have to store a cache of cline messages in the user's state, but we could to reduce memory footprint in long conversations.

    - We have to be careful of what state is shared between ClineProvider instances since there could be multiple instances of the extension running at once. For example when we cached cline messages using the same key, two instances of the extension could end up using the same key and overwriting each other's messages.
    - Some state does need to be shared between the instances, i.e. the API key--however there doesn't seem to be a good way to notfy the other instances that the API key has changed.

    We need to use a unique identifier for each ClineProvider instance's message cache since we could be running several instances of the extension outside of just the sidebar i.e. in editor panels.

    // conversation history to send in API requests

    /*
    It seems that some API messages do not comply with vscode state requirements. Either the Anthropic library is manipulating these values somehow in the backend in a way thats creating cyclic references, or the API returns a function or a Symbol as part of the message content.
    VSCode docs about state: "The value must be JSON-stringifyable ... value — A value. MUST not contain cyclic references."
    For now we'll store the conversation history in memory, and if we need to store in state directly we'd need to do a manual conversion to ensure proper json stringification.
    */
    // getApiConversationHistory(): Anthropic.MessageParam[] {
    // 	// const history = (await this.getGlobalState(
    // 	// 	this.getApiConversationHistoryStateKey()
    // 	// )) as Anthropic.MessageParam[]
    // 	// return history || []
    // 	return this.apiConversationHistory
    // }
    // setApiConversationHistory(history: Anthropic.MessageParam[] | undefined) {
    // 	// await this.updateGlobalState(this.getApiConversationHistoryStateKey(), history)
    // 	this.apiConversationHistory = history || []
    // }
    // addMessageToApiConversationHistory(message: Anthropic.MessageParam): Anthropic.MessageParam[] {
    // 	// const history = await this.getApiConversationHistory()
    // 	// history.push(message)
    // 	// await this.setApiConversationHistory(history)
    // 	// return history
    // 	this.apiConversationHistory.push(message)
    // 	return this.apiConversationHistory
    // }
    /*
    Storage
    https://dev.to/kompotkot/how-to-use-secretstorage-in-your-vscode-extensions-2hco
    https://www.eliostruyf.com/devhack-code-extension-storage-options/
    */
    async getState() {
        const [storedApiProvider, apiModelId, apiKey, glamaApiKey, glamaModelId, glamaModelInfo, openRouterApiKey, awsAccessKey, awsSecretKey, awsSessionToken, awsRegion, awsUseCrossRegionInference, awsProfile, awsUseProfile, vertexProjectId, vertexRegion, openAiBaseUrl, openAiApiKey, openAiModelId, openAiCustomModelInfo, openAiUseAzure, ollamaModelId, ollamaBaseUrl, lmStudioModelId, lmStudioBaseUrl, anthropicBaseUrl, geminiApiKey, openAiNativeApiKey, deepSeekApiKey, mistralApiKey, mistralCodestralUrl, azureApiVersion, openAiStreamingEnabled, openRouterModelId, openRouterModelInfo, openRouterBaseUrl, openRouterUseMiddleOutTransform, lastShownAnnouncementId, customInstructions, alwaysAllowReadOnly, alwaysAllowWrite, alwaysAllowExecute, alwaysAllowBrowser, alwaysAllowMcp, alwaysAllowModeSwitch, taskHistory, allowedCommands, soundEnabled, diffEnabled, checkpointsEnabled, soundVolume, browserViewportSize, fuzzyMatchThreshold, preferredLanguage, writeDelayMs, screenshotQuality, terminalOutputLineLimit, mcpEnabled, enableMcpServerCreation, alwaysApproveResubmit, requestDelaySeconds, rateLimitSeconds, currentApiConfigName, listApiConfigMeta, vsCodeLmModelSelector, mode, modeApiConfigs, customModePrompts, customSupportPrompts, enhancementApiConfigId, autoApprovalEnabled, customModes, experiments, unboundApiKey, unboundModelId, unboundModelInfo, requestyApiKey, requestyModelId, requestyModelInfo, modelTemperature, maxOpenTabsContext,] = await Promise.all([
            this.getGlobalState("apiProvider"),
            this.getGlobalState("apiModelId"),
            this.getSecret("apiKey"),
            this.getSecret("glamaApiKey"),
            this.getGlobalState("glamaModelId"),
            this.getGlobalState("glamaModelInfo"),
            this.getSecret("openRouterApiKey"),
            this.getSecret("awsAccessKey"),
            this.getSecret("awsSecretKey"),
            this.getSecret("awsSessionToken"),
            this.getGlobalState("awsRegion"),
            this.getGlobalState("awsUseCrossRegionInference"),
            this.getGlobalState("awsProfile"),
            this.getGlobalState("awsUseProfile"),
            this.getGlobalState("vertexProjectId"),
            this.getGlobalState("vertexRegion"),
            this.getGlobalState("openAiBaseUrl"),
            this.getSecret("openAiApiKey"),
            this.getGlobalState("openAiModelId"),
            this.getGlobalState("openAiCustomModelInfo"),
            this.getGlobalState("openAiUseAzure"),
            this.getGlobalState("ollamaModelId"),
            this.getGlobalState("ollamaBaseUrl"),
            this.getGlobalState("lmStudioModelId"),
            this.getGlobalState("lmStudioBaseUrl"),
            this.getGlobalState("anthropicBaseUrl"),
            this.getSecret("geminiApiKey"),
            this.getSecret("openAiNativeApiKey"),
            this.getSecret("deepSeekApiKey"),
            this.getSecret("mistralApiKey"),
            this.getGlobalState("mistralCodestralUrl"),
            this.getGlobalState("azureApiVersion"),
            this.getGlobalState("openAiStreamingEnabled"),
            this.getGlobalState("openRouterModelId"),
            this.getGlobalState("openRouterModelInfo"),
            this.getGlobalState("openRouterBaseUrl"),
            this.getGlobalState("openRouterUseMiddleOutTransform"),
            this.getGlobalState("lastShownAnnouncementId"),
            this.getGlobalState("customInstructions"),
            this.getGlobalState("alwaysAllowReadOnly"),
            this.getGlobalState("alwaysAllowWrite"),
            this.getGlobalState("alwaysAllowExecute"),
            this.getGlobalState("alwaysAllowBrowser"),
            this.getGlobalState("alwaysAllowMcp"),
            this.getGlobalState("alwaysAllowModeSwitch"),
            this.getGlobalState("taskHistory"),
            this.getGlobalState("allowedCommands"),
            this.getGlobalState("soundEnabled"),
            this.getGlobalState("diffEnabled"),
            this.getGlobalState("checkpointsEnabled"),
            this.getGlobalState("soundVolume"),
            this.getGlobalState("browserViewportSize"),
            this.getGlobalState("fuzzyMatchThreshold"),
            this.getGlobalState("preferredLanguage"),
            this.getGlobalState("writeDelayMs"),
            this.getGlobalState("screenshotQuality"),
            this.getGlobalState("terminalOutputLineLimit"),
            this.getGlobalState("mcpEnabled"),
            this.getGlobalState("enableMcpServerCreation"),
            this.getGlobalState("alwaysApproveResubmit"),
            this.getGlobalState("requestDelaySeconds"),
            this.getGlobalState("rateLimitSeconds"),
            this.getGlobalState("currentApiConfigName"),
            this.getGlobalState("listApiConfigMeta"),
            this.getGlobalState("vsCodeLmModelSelector"),
            this.getGlobalState("mode"),
            this.getGlobalState("modeApiConfigs"),
            this.getGlobalState("customModePrompts"),
            this.getGlobalState("customSupportPrompts"),
            this.getGlobalState("enhancementApiConfigId"),
            this.getGlobalState("autoApprovalEnabled"),
            this.customModesManager.getCustomModes(),
            this.getGlobalState("experiments"),
            this.getSecret("unboundApiKey"),
            this.getGlobalState("unboundModelId"),
            this.getGlobalState("unboundModelInfo"),
            this.getSecret("requestyApiKey"),
            this.getGlobalState("requestyModelId"),
            this.getGlobalState("requestyModelInfo"),
            this.getGlobalState("modelTemperature"),
            this.getGlobalState("maxOpenTabsContext"),
        ]);
        let apiProvider;
        if (storedApiProvider) {
            apiProvider = storedApiProvider;
        }
        else {
            // Either new user or legacy user that doesn't have the apiProvider stored in state
            // (If they're using OpenRouter or Bedrock, then apiProvider state will exist)
            if (apiKey) {
                apiProvider = "anthropic";
            }
            else {
                // New users should default to openrouter
                apiProvider = "openrouter";
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
            mode: mode ?? modes_1.defaultModeSlug,
            preferredLanguage: preferredLanguage ??
                (() => {
                    // Get VSCode's locale setting
                    const vscodeLang = vscode.env.language;
                    // Map VSCode locale to our supported languages
                    const langMap = {
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
                    };
                    // Return mapped language or default to English
                    return langMap[vscodeLang.split("-")[0]] ?? "English";
                })(),
            mcpEnabled: mcpEnabled ?? true,
            enableMcpServerCreation: enableMcpServerCreation ?? true,
            alwaysApproveResubmit: alwaysApproveResubmit ?? false,
            requestDelaySeconds: Math.max(5, requestDelaySeconds ?? 10),
            rateLimitSeconds: rateLimitSeconds ?? 0,
            currentApiConfigName: currentApiConfigName ?? "default",
            listApiConfigMeta: listApiConfigMeta ?? [],
            modeApiConfigs: modeApiConfigs ?? {},
            customModePrompts: customModePrompts ?? {},
            customSupportPrompts: customSupportPrompts ?? {},
            enhancementApiConfigId,
            experiments: experiments ?? experiments_1.experimentDefault,
            autoApprovalEnabled: autoApprovalEnabled ?? false,
            customModes,
            maxOpenTabsContext: maxOpenTabsContext ?? 20,
        };
    }
    async updateTaskHistory(item) {
        const history = (await this.getGlobalState("taskHistory")) || [];
        const existingItemIndex = history.findIndex((h) => h.id === item.id);
        if (existingItemIndex !== -1) {
            history[existingItemIndex] = item;
        }
        else {
            history.push(item);
        }
        await this.updateGlobalState("taskHistory", history);
        return history;
    }
    // global
    async updateGlobalState(key, value) {
        await this.context.globalState.update(key, value);
    }
    async getGlobalState(key) {
        return await this.context.globalState.get(key);
    }
    // workspace
    async updateWorkspaceState(key, value) {
        await this.context.workspaceState.update(key, value);
    }
    async getWorkspaceState(key) {
        return await this.context.workspaceState.get(key);
    }
    // private async clearState() {
    // 	this.context.workspaceState.keys().forEach((key) => {
    // 		this.context.workspaceState.update(key, undefined)
    // 	})
    // 	this.context.globalState.keys().forEach((key) => {
    // 		this.context.globalState.update(key, undefined)
    // 	})
    // 	this.context.secrets.delete("apiKey")
    // }
    // secrets
    async storeSecret(key, value) {
        if (value) {
            await this.context.secrets.store(key, value);
        }
        else {
            await this.context.secrets.delete(key);
        }
    }
    async getSecret(key) {
        return await this.context.secrets.get(key);
    }
    // dev
    async resetState() {
        const answer = await vscode.window.showInformationMessage("Are you sure you want to reset all state and secret storage in the extension? This cannot be undone.", { modal: true }, "Yes");
        if (answer !== "Yes") {
            return;
        }
        for (const key of this.context.globalState.keys()) {
            await this.context.globalState.update(key, undefined);
        }
        const secretKeys = [
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
        ];
        for (const key of secretKeys) {
            await this.storeSecret(key, undefined);
        }
        await this.configManager.resetAllConfigs();
        await this.customModesManager.resetCustomModes();
        if (this.cline) {
            this.cline.abortTask();
            this.cline = undefined;
        }
        await this.postStateToWebview();
        await this.postMessageToWebview({ type: "action", action: "chatButtonClicked" });
    }
    // logging
    log(message) {
        this.outputChannel.appendLine(message);
    }
    // integration tests
    get viewLaunched() {
        return this.isViewLaunched;
    }
    get messages() {
        return this.cline?.clineMessages || [];
    }
    // Add public getter
    getMcpHub() {
        return this.mcpHub;
    }
}
exports.ClineProvider = ClineProvider;
//# sourceMappingURL=ClineProvider.js.map