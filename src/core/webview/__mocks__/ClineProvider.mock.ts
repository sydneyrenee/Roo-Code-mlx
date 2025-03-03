import * as vscode from 'vscode';
import { Cline } from '../../../core/Cline';
import { StateManager } from '../ClineProviderState';
import { HtmlGenerator } from '../ClineProviderHtml';
import { TaskManager } from '../ClineProviderTasks';
import { ModelProviders } from '../ClineProviderModels';
import { McpManager } from '../ClineProviderMcp';
import { McpHub } from '../../../services/mcp/McpHub';
import { logger } from '../../../utils/logging';
import { ExtensionMessage } from '../../../shared/ExtensionMessage';
import { GlobalStateKey, SecretKey } from '../ClineProviderTypes';
import { HistoryItem } from '../../../shared/HistoryItem';
import { ConfigManager } from '../../../core/config/ConfigManager';
import { CustomModesManager } from '../../../core/config/CustomModesManager';

/**
 * Mock implementation of ClineProvider for testing purposes
 */
export class MockClineProvider implements vscode.WebviewViewProvider {
    public static readonly sideBarId = "roo-cline.SidebarProvider";
    public static readonly tabPanelId = "roo-cline.TabPanelProvider";
    private static activeInstances: Set<MockClineProvider> = new Set();
    private disposables: vscode.Disposable[] = [];
    private view?: vscode.WebviewView | vscode.WebviewPanel;
    private isViewLaunched = false;
    private cline?: Cline;
    private mcpHub?: McpHub;
    
    // Module instances
    private stateManager: StateManager;
    private htmlGenerator: HtmlGenerator;
    private taskManager: TaskManager;
    private modelProviders: ModelProviders;
    private mcpManager: McpManager;
    
    configManager: ConfigManager;
    customModesManager: CustomModesManager;

    constructor(
        readonly context: vscode.ExtensionContext,
        private readonly outputChannel: vscode.OutputChannel,
    ) {
        logger.info("MockClineProvider instantiated");
        this.outputChannel.appendLine("MockClineProvider instantiated");
        MockClineProvider.activeInstances.add(this);
        
        // Initialize modules
        this.stateManager = new StateManager(this.context);
        this.htmlGenerator = new HtmlGenerator(this.context);
        this.taskManager = new TaskManager(this.context, this.stateManager, this.outputChannel);
        this.modelProviders = new ModelProviders(this.context, this.outputChannel);
        this.mcpManager = new McpManager(this.context, this.outputChannel);
        
        this.configManager = new ConfigManager(this.context);
        this.customModesManager = new CustomModesManager(this.context, async () => {
            await this.postStateToWebview();
        });
    }

    async dispose() {
        logger.info("Disposing MockClineProvider");
        this.outputChannel.appendLine("Disposing MockClineProvider");
        
        await this.clearTask();
        
        if (this.view && "dispose" in this.view) {
            this.view.dispose();
        }
        
        while (this.disposables.length) {
            const x = this.disposables.pop();
            if (x) {
                x.dispose();
            }
        }
        
        MockClineProvider.activeInstances.delete(this);
        logger.info("MockClineProvider fully disposed");
    }

    async resolveWebviewView(webviewView: vscode.WebviewView | vscode.WebviewPanel) {
        logger.info("Resolving webview view");
        this.view = webviewView;
        this.isViewLaunched = true;
    }

    async postMessageToWebview(message: ExtensionMessage) {
        logger.debug(`Posting message to webview: ${JSON.stringify(message)}`);
        await this.view?.webview.postMessage(message);
    }

    async clearTask() {
        logger.info("Clearing task");
        this.cline?.abortTask();
        this.cline = undefined;
        return true;
    }

    async postStateToWebview() {
        const state = await this.getStateToPostToWebview();
        await this.postMessageToWebview({ type: "state", state });
    }

    async getStateToPostToWebview() {
        const state = await this.getState();
        // Ensure required properties are always present with correct types
        const taskHistory = state.taskHistory || [];
        const customModes = state.customModes || [];
        
        // Create default experiments with required properties
        const experiments = state.experiments || {
            experimentalDiffStrategy: false,
            search_and_replace: false,
            insert_content: false
        };
        
        // Create a new state object with all required properties
        const newState = {
            ...state,
            taskHistory,
            experiments,
            customModes,
            version: this.context.extension?.packageJSON?.version ?? "",
            currentTaskItem: this.cline?.taskId
                ? taskHistory.find((item) => item.id === this.cline?.taskId)
                : undefined,
            clineMessages: this.cline?.clineMessages || [],
            shouldShowAnnouncement: false
        };
        
        return newState;
    }

    // State management methods
    async updateGlobalState(key: GlobalStateKey, value: any) {
        logger.debug(`Updating global state: ${key}`);
        return this.stateManager.updateGlobalState(key, value);
    }

    async storeSecret(key: SecretKey, value?: string) {
        logger.debug(`Storing secret: ${key}`);
        return this.stateManager.storeSecret(key, value);
    }

    async getState() {
        return this.stateManager.getState();
    }

    // Getters for testing
    get viewLaunched() {
        return this.isViewLaunched;
    }

    get messages() {
        return this.cline?.clineMessages || [];
    }

    getMcpHub(): McpHub | undefined {
        return this.mcpHub;
    }

    // Method required by WebviewViewProvider interface
    public log(message: string) {
        logger.info(message);
        this.outputChannel.appendLine(message);
    }
}