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
exports.McpHub = exports.StdioConfigSchema = void 0;
const index_js_1 = require("@modelcontextprotocol/sdk/client/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/client/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const chokidar_1 = __importDefault(require("chokidar"));
const delay_1 = __importDefault(require("delay"));
const fast_deep_equal_1 = __importDefault(require("fast-deep-equal"));
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const zod_1 = require("zod");
const ClineProvider_1 = require("../../core/webview/ClineProvider");
const fs_1 = require("../../utils/fs");
const path_1 = require("../../utils/path");
// StdioServerParameters
const AlwaysAllowSchema = zod_1.z.array(zod_1.z.string()).default([]);
exports.StdioConfigSchema = zod_1.z.object({
    command: zod_1.z.string(),
    args: zod_1.z.array(zod_1.z.string()).optional(),
    env: zod_1.z.record(zod_1.z.string()).optional(),
    alwaysAllow: AlwaysAllowSchema.optional(),
    disabled: zod_1.z.boolean().optional(),
    timeout: zod_1.z.number().min(1).max(3600).optional().default(60),
});
const McpSettingsSchema = zod_1.z.object({
    mcpServers: zod_1.z.record(exports.StdioConfigSchema),
});
class McpHub {
    providerRef;
    disposables = [];
    settingsWatcher;
    fileWatchers = new Map();
    connections = [];
    isConnecting = false;
    constructor(provider) {
        this.providerRef = new WeakRef(provider);
        this.watchMcpSettingsFile();
        this.initializeMcpServers();
    }
    getServers() {
        // Only return enabled servers
        return this.connections.filter((conn) => !conn.server.disabled).map((conn) => conn.server);
    }
    getAllServers() {
        // Return all servers regardless of state
        return this.connections.map((conn) => conn.server);
    }
    async getMcpServersPath() {
        const provider = this.providerRef.deref();
        if (!provider) {
            throw new Error("Provider not available");
        }
        const mcpServersPath = await provider.ensureMcpServersDirectoryExists();
        return mcpServersPath;
    }
    async getMcpSettingsFilePath() {
        const provider = this.providerRef.deref();
        if (!provider) {
            throw new Error("Provider not available");
        }
        const mcpSettingsFilePath = path.join(await provider.ensureSettingsDirectoryExists(), ClineProvider_1.GlobalFileNames.mcpSettings);
        const fileExists = await (0, fs_1.fileExistsAtPath)(mcpSettingsFilePath);
        if (!fileExists) {
            await fs.writeFile(mcpSettingsFilePath, `{
  "mcpServers": {
    
  }
}`);
        }
        return mcpSettingsFilePath;
    }
    async watchMcpSettingsFile() {
        const settingsPath = await this.getMcpSettingsFilePath();
        this.disposables.push(vscode.workspace.onDidSaveTextDocument(async (document) => {
            if ((0, path_1.arePathsEqual)(document.uri.fsPath, settingsPath)) {
                const content = await fs.readFile(settingsPath, "utf-8");
                const errorMessage = "Invalid MCP settings format. Please ensure your settings follow the correct JSON format.";
                let config;
                try {
                    config = JSON.parse(content);
                }
                catch (error) {
                    vscode.window.showErrorMessage(errorMessage);
                    return;
                }
                const result = McpSettingsSchema.safeParse(config);
                if (!result.success) {
                    vscode.window.showErrorMessage(errorMessage);
                    return;
                }
                try {
                    await this.updateServerConnections(result.data.mcpServers || {});
                }
                catch (error) {
                    console.error("Failed to process MCP settings change:", error);
                }
            }
        }));
    }
    async initializeMcpServers() {
        try {
            const settingsPath = await this.getMcpSettingsFilePath();
            const content = await fs.readFile(settingsPath, "utf-8");
            const config = JSON.parse(content);
            await this.updateServerConnections(config.mcpServers || {});
        }
        catch (error) {
            console.error("Failed to initialize MCP servers:", error);
        }
    }
    async connectToServer(name, config) {
        // Remove existing connection if it exists (should never happen, the connection should be deleted beforehand)
        this.connections = this.connections.filter((conn) => conn.server.name !== name);
        try {
            // Each MCP server requires its own transport connection and has unique capabilities, configurations, and error handling. Having separate clients also allows proper scoping of resources/tools and independent server management like reconnection.
            const client = new index_js_1.Client({
                name: "Roo Code",
                version: this.providerRef.deref()?.context.extension?.packageJSON?.version ?? "1.0.0",
            }, {
                capabilities: {},
            });
            const transport = new stdio_js_1.StdioClientTransport({
                command: config.command,
                args: config.args,
                env: {
                    ...config.env,
                    ...(process.env.PATH ? { PATH: process.env.PATH } : {}),
                    // ...(process.env.NODE_PATH ? { NODE_PATH: process.env.NODE_PATH } : {}),
                },
                stderr: "pipe", // necessary for stderr to be available
            });
            transport.onerror = async (error) => {
                console.error(`Transport error for "${name}":`, error);
                const connection = this.connections.find((conn) => conn.server.name === name);
                if (connection) {
                    connection.server.status = "disconnected";
                    this.appendErrorMessage(connection, error.message);
                }
                await this.notifyWebviewOfServerChanges();
            };
            transport.onclose = async () => {
                const connection = this.connections.find((conn) => conn.server.name === name);
                if (connection) {
                    connection.server.status = "disconnected";
                }
                await this.notifyWebviewOfServerChanges();
            };
            // If the config is invalid, show an error
            if (!exports.StdioConfigSchema.safeParse(config).success) {
                console.error(`Invalid config for "${name}": missing or invalid parameters`);
                const connection = {
                    server: {
                        name,
                        config: JSON.stringify(config),
                        status: "disconnected",
                        error: "Invalid config: missing or invalid parameters",
                    },
                    client,
                    transport,
                };
                this.connections.push(connection);
                return;
            }
            // valid schema
            const parsedConfig = exports.StdioConfigSchema.parse(config);
            const connection = {
                server: {
                    name,
                    config: JSON.stringify(config),
                    status: "connecting",
                    disabled: parsedConfig.disabled,
                },
                client,
                transport,
            };
            this.connections.push(connection);
            // transport.stderr is only available after the process has been started. However we can't start it separately from the .connect() call because it also starts the transport. And we can't place this after the connect call since we need to capture the stderr stream before the connection is established, in order to capture errors during the connection process.
            // As a workaround, we start the transport ourselves, and then monkey-patch the start method to no-op so that .connect() doesn't try to start it again.
            await transport.start();
            const stderrStream = transport.stderr;
            if (stderrStream) {
                stderrStream.on("data", async (data) => {
                    const errorOutput = data.toString();
                    console.error(`Server "${name}" stderr:`, errorOutput);
                    const connection = this.connections.find((conn) => conn.server.name === name);
                    if (connection) {
                        // NOTE: we do not set server status to "disconnected" because stderr logs do not necessarily mean the server crashed or disconnected, it could just be informational. In fact when the server first starts up, it immediately logs "<name> server running on stdio" to stderr.
                        this.appendErrorMessage(connection, errorOutput);
                        // Only need to update webview right away if it's already disconnected
                        if (connection.server.status === "disconnected") {
                            await this.notifyWebviewOfServerChanges();
                        }
                    }
                });
            }
            else {
                console.error(`No stderr stream for ${name}`);
            }
            transport.start = async () => { }; // No-op now, .connect() won't fail
            // Connect
            await client.connect(transport);
            connection.server.status = "connected";
            connection.server.error = "";
            // Initial fetch of tools and resources
            connection.server.tools = await this.fetchToolsList(name);
            connection.server.resources = await this.fetchResourcesList(name);
            connection.server.resourceTemplates = await this.fetchResourceTemplatesList(name);
        }
        catch (error) {
            // Update status with error
            const connection = this.connections.find((conn) => conn.server.name === name);
            if (connection) {
                connection.server.status = "disconnected";
                this.appendErrorMessage(connection, error instanceof Error ? error.message : String(error));
            }
            throw error;
        }
    }
    appendErrorMessage(connection, error) {
        const newError = connection.server.error ? `${connection.server.error}\n${error}` : error;
        connection.server.error = newError; //.slice(0, 800)
    }
    async fetchToolsList(serverName) {
        try {
            const response = await this.connections
                .find((conn) => conn.server.name === serverName)
                ?.client.request({ method: "tools/list" }, types_js_1.ListToolsResultSchema);
            // Get always allow settings
            const settingsPath = await this.getMcpSettingsFilePath();
            const content = await fs.readFile(settingsPath, "utf-8");
            const config = JSON.parse(content);
            const alwaysAllowConfig = config.mcpServers[serverName]?.alwaysAllow || [];
            // Mark tools as always allowed based on settings
            const tools = (response?.tools || []).map((tool) => ({
                ...tool,
                alwaysAllow: alwaysAllowConfig.includes(tool.name),
            }));
            console.log(`[MCP] Fetched tools for ${serverName}:`, tools);
            return tools;
        }
        catch (error) {
            // console.error(`Failed to fetch tools for ${serverName}:`, error)
            return [];
        }
    }
    async fetchResourcesList(serverName) {
        try {
            const response = await this.connections
                .find((conn) => conn.server.name === serverName)
                ?.client.request({ method: "resources/list" }, types_js_1.ListResourcesResultSchema);
            return response?.resources || [];
        }
        catch (error) {
            // console.error(`Failed to fetch resources for ${serverName}:`, error)
            return [];
        }
    }
    async fetchResourceTemplatesList(serverName) {
        try {
            const response = await this.connections
                .find((conn) => conn.server.name === serverName)
                ?.client.request({ method: "resources/templates/list" }, types_js_1.ListResourceTemplatesResultSchema);
            return response?.resourceTemplates || [];
        }
        catch (error) {
            // console.error(`Failed to fetch resource templates for ${serverName}:`, error)
            return [];
        }
    }
    async deleteConnection(name) {
        const connection = this.connections.find((conn) => conn.server.name === name);
        if (connection) {
            try {
                await connection.transport.close();
                await connection.client.close();
            }
            catch (error) {
                console.error(`Failed to close transport for ${name}:`, error);
            }
            this.connections = this.connections.filter((conn) => conn.server.name !== name);
        }
    }
    async updateServerConnections(newServers) {
        this.isConnecting = true;
        this.removeAllFileWatchers();
        const currentNames = new Set(this.connections.map((conn) => conn.server.name));
        const newNames = new Set(Object.keys(newServers));
        // Delete removed servers
        for (const name of currentNames) {
            if (!newNames.has(name)) {
                await this.deleteConnection(name);
                console.log(`Deleted MCP server: ${name}`);
            }
        }
        // Update or add servers
        for (const [name, config] of Object.entries(newServers)) {
            const currentConnection = this.connections.find((conn) => conn.server.name === name);
            if (!currentConnection) {
                // New server
                try {
                    this.setupFileWatcher(name, config);
                    await this.connectToServer(name, config);
                }
                catch (error) {
                    console.error(`Failed to connect to new MCP server ${name}:`, error);
                }
            }
            else if (!(0, fast_deep_equal_1.default)(JSON.parse(currentConnection.server.config), config)) {
                // Existing server with changed config
                try {
                    this.setupFileWatcher(name, config);
                    await this.deleteConnection(name);
                    await this.connectToServer(name, config);
                    console.log(`Reconnected MCP server with updated config: ${name}`);
                }
                catch (error) {
                    console.error(`Failed to reconnect MCP server ${name}:`, error);
                }
            }
            // If server exists with same config, do nothing
        }
        await this.notifyWebviewOfServerChanges();
        this.isConnecting = false;
    }
    setupFileWatcher(name, config) {
        const filePath = config.args?.find((arg) => arg.includes("build/index.js"));
        if (filePath) {
            // we use chokidar instead of onDidSaveTextDocument because it doesn't require the file to be open in the editor. The settings config is better suited for onDidSave since that will be manually updated by the user or Cline (and we want to detect save events, not every file change)
            const watcher = chokidar_1.default.watch(filePath, {
            // persistent: true,
            // ignoreInitial: true,
            // awaitWriteFinish: true, // This helps with atomic writes
            });
            watcher.on("change", () => {
                console.log(`Detected change in ${filePath}. Restarting server ${name}...`);
                this.restartConnection(name);
            });
            this.fileWatchers.set(name, watcher);
        }
    }
    removeAllFileWatchers() {
        this.fileWatchers.forEach((watcher) => watcher.close());
        this.fileWatchers.clear();
    }
    async restartConnection(serverName) {
        this.isConnecting = true;
        const provider = this.providerRef.deref();
        if (!provider) {
            return;
        }
        // Get existing connection and update its status
        const connection = this.connections.find((conn) => conn.server.name === serverName);
        const config = connection?.server.config;
        if (config) {
            vscode.window.showInformationMessage(`Restarting ${serverName} MCP server...`);
            connection.server.status = "connecting";
            connection.server.error = "";
            await this.notifyWebviewOfServerChanges();
            await (0, delay_1.default)(500); // artificial delay to show user that server is restarting
            try {
                await this.deleteConnection(serverName);
                // Try to connect again using existing config
                await this.connectToServer(serverName, JSON.parse(config));
                vscode.window.showInformationMessage(`${serverName} MCP server connected`);
            }
            catch (error) {
                console.error(`Failed to restart connection for ${serverName}:`, error);
                vscode.window.showErrorMessage(`Failed to connect to ${serverName} MCP server`);
            }
        }
        await this.notifyWebviewOfServerChanges();
        this.isConnecting = false;
    }
    async notifyWebviewOfServerChanges() {
        // servers should always be sorted in the order they are defined in the settings file
        const settingsPath = await this.getMcpSettingsFilePath();
        const content = await fs.readFile(settingsPath, "utf-8");
        const config = JSON.parse(content);
        const serverOrder = Object.keys(config.mcpServers || {});
        await this.providerRef.deref()?.postMessageToWebview({
            type: "mcpServers",
            mcpServers: [...this.connections]
                .sort((a, b) => {
                const indexA = serverOrder.indexOf(a.server.name);
                const indexB = serverOrder.indexOf(b.server.name);
                return indexA - indexB;
            })
                .map((connection) => connection.server),
        });
    }
    async toggleServerDisabled(serverName, disabled) {
        let settingsPath;
        try {
            settingsPath = await this.getMcpSettingsFilePath();
            // Ensure the settings file exists and is accessible
            try {
                await fs.access(settingsPath);
            }
            catch (error) {
                console.error("Settings file not accessible:", error);
                throw new Error("Settings file not accessible");
            }
            const content = await fs.readFile(settingsPath, "utf-8");
            const config = JSON.parse(content);
            // Validate the config structure
            if (!config || typeof config !== "object") {
                throw new Error("Invalid config structure");
            }
            if (!config.mcpServers || typeof config.mcpServers !== "object") {
                config.mcpServers = {};
            }
            if (config.mcpServers[serverName]) {
                // Create a new server config object to ensure clean structure
                const serverConfig = {
                    ...config.mcpServers[serverName],
                    disabled,
                };
                // Ensure required fields exist
                if (!serverConfig.alwaysAllow) {
                    serverConfig.alwaysAllow = [];
                }
                config.mcpServers[serverName] = serverConfig;
                // Write the entire config back
                const updatedConfig = {
                    mcpServers: config.mcpServers,
                };
                await fs.writeFile(settingsPath, JSON.stringify(updatedConfig, null, 2));
                const connection = this.connections.find((conn) => conn.server.name === serverName);
                if (connection) {
                    try {
                        connection.server.disabled = disabled;
                        // Only refresh capabilities if connected
                        if (connection.server.status === "connected") {
                            connection.server.tools = await this.fetchToolsList(serverName);
                            connection.server.resources = await this.fetchResourcesList(serverName);
                            connection.server.resourceTemplates = await this.fetchResourceTemplatesList(serverName);
                        }
                    }
                    catch (error) {
                        console.error(`Failed to refresh capabilities for ${serverName}:`, error);
                    }
                }
                await this.notifyWebviewOfServerChanges();
            }
        }
        catch (error) {
            console.error("Failed to update server disabled state:", error);
            if (error instanceof Error) {
                console.error("Error details:", error.message, error.stack);
            }
            vscode.window.showErrorMessage(`Failed to update server state: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }
    async updateServerTimeout(serverName, timeout) {
        let settingsPath;
        try {
            settingsPath = await this.getMcpSettingsFilePath();
            // Ensure the settings file exists and is accessible
            try {
                await fs.access(settingsPath);
            }
            catch (error) {
                console.error("Settings file not accessible:", error);
                throw new Error("Settings file not accessible");
            }
            const content = await fs.readFile(settingsPath, "utf-8");
            const config = JSON.parse(content);
            // Validate the config structure
            if (!config || typeof config !== "object") {
                throw new Error("Invalid config structure");
            }
            if (!config.mcpServers || typeof config.mcpServers !== "object") {
                config.mcpServers = {};
            }
            if (config.mcpServers[serverName]) {
                // Create a new server config object to ensure clean structure
                const serverConfig = {
                    ...config.mcpServers[serverName],
                    timeout,
                };
                config.mcpServers[serverName] = serverConfig;
                // Write the entire config back
                const updatedConfig = {
                    mcpServers: config.mcpServers,
                };
                await fs.writeFile(settingsPath, JSON.stringify(updatedConfig, null, 2));
                await this.notifyWebviewOfServerChanges();
            }
        }
        catch (error) {
            console.error("Failed to update server timeout:", error);
            if (error instanceof Error) {
                console.error("Error details:", error.message, error.stack);
            }
            vscode.window.showErrorMessage(`Failed to update server timeout: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }
    async readResource(serverName, uri) {
        const connection = this.connections.find((conn) => conn.server.name === serverName);
        if (!connection) {
            throw new Error(`No connection found for server: ${serverName}`);
        }
        if (connection.server.disabled) {
            throw new Error(`Server "${serverName}" is disabled`);
        }
        return await connection.client.request({
            method: "resources/read",
            params: {
                uri,
            },
        }, types_js_1.ReadResourceResultSchema);
    }
    async callTool(serverName, toolName, toolArguments) {
        const connection = this.connections.find((conn) => conn.server.name === serverName);
        if (!connection) {
            throw new Error(`No connection found for server: ${serverName}. Please make sure to use MCP servers available under 'Connected MCP Servers'.`);
        }
        if (connection.server.disabled) {
            throw new Error(`Server "${serverName}" is disabled and cannot be used`);
        }
        let timeout;
        try {
            const parsedConfig = exports.StdioConfigSchema.parse(JSON.parse(connection.server.config));
            timeout = (parsedConfig.timeout ?? 60) * 1000;
        }
        catch (error) {
            console.error("Failed to parse server config for timeout:", error);
            // Default to 60 seconds if parsing fails
            timeout = 60 * 1000;
        }
        return await connection.client.request({
            method: "tools/call",
            params: {
                name: toolName,
                arguments: toolArguments,
            },
        }, types_js_1.CallToolResultSchema, {
            timeout,
        });
    }
    async toggleToolAlwaysAllow(serverName, toolName, shouldAllow) {
        try {
            const settingsPath = await this.getMcpSettingsFilePath();
            const content = await fs.readFile(settingsPath, "utf-8");
            const config = JSON.parse(content);
            // Initialize alwaysAllow if it doesn't exist
            if (!config.mcpServers[serverName].alwaysAllow) {
                config.mcpServers[serverName].alwaysAllow = [];
            }
            const alwaysAllow = config.mcpServers[serverName].alwaysAllow;
            const toolIndex = alwaysAllow.indexOf(toolName);
            if (shouldAllow && toolIndex === -1) {
                // Add tool to always allow list
                alwaysAllow.push(toolName);
            }
            else if (!shouldAllow && toolIndex !== -1) {
                // Remove tool from always allow list
                alwaysAllow.splice(toolIndex, 1);
            }
            // Write updated config back to file
            await fs.writeFile(settingsPath, JSON.stringify(config, null, 2));
            // Update the tools list to reflect the change
            const connection = this.connections.find((conn) => conn.server.name === serverName);
            if (connection) {
                connection.server.tools = await this.fetchToolsList(serverName);
                await this.notifyWebviewOfServerChanges();
            }
        }
        catch (error) {
            console.error("Failed to update always allow settings:", error);
            vscode.window.showErrorMessage("Failed to update always allow settings");
            throw error; // Re-throw to ensure the error is properly handled
        }
    }
    async dispose() {
        this.removeAllFileWatchers();
        for (const connection of this.connections) {
            try {
                await this.deleteConnection(connection.server.name);
            }
            catch (error) {
                console.error(`Failed to close connection for ${connection.server.name}:`, error);
            }
        }
        this.connections = [];
        if (this.settingsWatcher) {
            this.settingsWatcher.dispose();
        }
        this.disposables.forEach((d) => d.dispose());
    }
}
exports.McpHub = McpHub;
//# sourceMappingURL=McpHub.js.map