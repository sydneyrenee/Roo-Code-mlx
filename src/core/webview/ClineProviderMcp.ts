import * as vscode from "vscode"
import * as path from "path"
import * as os from "os"
import fs from "fs/promises"
import { GlobalFileNames } from "./ClineProviderTypes"

export class McpManager {
    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly outputChannel: vscode.OutputChannel
    ) {}

    async ensureMcpServersDirectoryExists(): Promise<string> {
        const mcpServersDir = path.join(os.homedir(), "Documents", "Cline", "MCP")
        try {
            await fs.mkdir(mcpServersDir, { recursive: true })
        } catch (error) {
            return "~/Documents/Cline/MCP" // in case creating a directory in documents fails for whatever reason (e.g. permissions) - this is fine since this path is only ever used in the system prompt
        }
        return mcpServersDir
    }

    async ensureSettingsDirectoryExists(): Promise<string> {
        const settingsDir = path.join(this.context.globalStorageUri.fsPath, "settings")
        await fs.mkdir(settingsDir, { recursive: true })
        return settingsDir
    }

    async getMcpSettingsFilePath(): Promise<string> {
        const settingsDir = await this.ensureSettingsDirectoryExists()
        return path.join(settingsDir, GlobalFileNames.mcpSettings)
    }

    async toggleServerDisabled(serverName: string, disabled: boolean): Promise<void> {
        try {
            const mcpSettingsPath = await this.getMcpSettingsFilePath()
            let settings: any = {}
            
            try {
                const settingsContent = await fs.readFile(mcpSettingsPath, 'utf8')
                settings = JSON.parse(settingsContent)
            } catch (error) {
                // File might not exist yet, use empty settings
            }
            
            if (!settings.servers) {
                settings.servers = {}
            }
            
            if (!settings.servers[serverName]) {
                settings.servers[serverName] = {}
            }
            
            settings.servers[serverName].disabled = disabled
            
            await fs.writeFile(mcpSettingsPath, JSON.stringify(settings, null, 2))
        } catch (error) {
            this.outputChannel.appendLine(`Failed to toggle server disabled state: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`)
            throw error
        }
    }

    async toggleToolAlwaysAllow(serverName: string, toolName: string, alwaysAllow: boolean): Promise<void> {
        try {
            const mcpSettingsPath = await this.getMcpSettingsFilePath()
            let settings: any = {}
            
            try {
                const settingsContent = await fs.readFile(mcpSettingsPath, 'utf8')
                settings = JSON.parse(settingsContent)
            } catch (error) {
                // File might not exist yet, use empty settings
            }
            
            if (!settings.servers) {
                settings.servers = {}
            }
            
            if (!settings.servers[serverName]) {
                settings.servers[serverName] = {}
            }
            
            if (!settings.servers[serverName].tools) {
                settings.servers[serverName].tools = {}
            }
            
            if (!settings.servers[serverName].tools[toolName]) {
                settings.servers[serverName].tools[toolName] = {}
            }
            
            settings.servers[serverName].tools[toolName].alwaysAllow = alwaysAllow
            
            await fs.writeFile(mcpSettingsPath, JSON.stringify(settings, null, 2))
        } catch (error) {
            this.outputChannel.appendLine(`Failed to toggle tool always allow: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`)
            throw error
        }
    }

    async updateServerTimeout(serverName: string, timeout: number): Promise<void> {
        try {
            const mcpSettingsPath = await this.getMcpSettingsFilePath()
            let settings: any = {}
            
            try {
                const settingsContent = await fs.readFile(mcpSettingsPath, 'utf8')
                settings = JSON.parse(settingsContent)
            } catch (error) {
                // File might not exist yet, use empty settings
            }
            
            if (!settings.servers) {
                settings.servers = {}
            }
            
            if (!settings.servers[serverName]) {
                settings.servers[serverName] = {}
            }
            
            settings.servers[serverName].timeout = timeout
            
            await fs.writeFile(mcpSettingsPath, JSON.stringify(settings, null, 2))
        } catch (error) {
            this.outputChannel.appendLine(`Failed to update server timeout: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`)
            throw error
        }
    }
}