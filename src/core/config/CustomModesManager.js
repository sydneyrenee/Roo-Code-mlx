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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomModesManager = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
const CustomModesSchema_1 = require("./CustomModesSchema");
const fs_1 = require("../../utils/fs");
const path_1 = require("../../utils/path");
const ROOMODES_FILENAME = ".roomodes";
class CustomModesManager {
    context;
    onUpdate;
    disposables = [];
    isWriting = false;
    writeQueue = [];
    constructor(context, onUpdate) {
        this.context = context;
        this.onUpdate = onUpdate;
        this.watchCustomModesFiles();
    }
    async queueWrite(operation) {
        this.writeQueue.push(operation);
        if (!this.isWriting) {
            await this.processWriteQueue();
        }
    }
    async processWriteQueue() {
        if (this.isWriting || this.writeQueue.length === 0) {
            return;
        }
        this.isWriting = true;
        try {
            while (this.writeQueue.length > 0) {
                const operation = this.writeQueue.shift();
                if (operation) {
                    await operation();
                }
            }
        }
        finally {
            this.isWriting = false;
        }
    }
    async getWorkspaceRoomodes() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return undefined;
        }
        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        const roomodesPath = path.join(workspaceRoot, ROOMODES_FILENAME);
        const exists = await (0, fs_1.fileExistsAtPath)(roomodesPath);
        return exists ? roomodesPath : undefined;
    }
    async loadModesFromFile(filePath) {
        try {
            const content = await fs.readFile(filePath, "utf-8");
            const settings = JSON.parse(content);
            const result = CustomModesSchema_1.CustomModesSettingsSchema.safeParse(settings);
            if (!result.success) {
                return [];
            }
            // Determine source based on file path
            const isRoomodes = filePath.endsWith(ROOMODES_FILENAME);
            const source = isRoomodes ? "project" : "global";
            // Add source to each mode
            return result.data.customModes.map((mode) => ({
                ...mode,
                source,
            }));
        }
        catch (error) {
            const errorMsg = `Failed to load modes from ${filePath}: ${error instanceof Error ? error.message : String(error)}`;
            console.error(`[CustomModesManager] ${errorMsg}`);
            return [];
        }
    }
    async mergeCustomModes(projectModes, globalModes) {
        const slugs = new Set();
        const merged = [];
        // Add project mode (takes precedence)
        for (const mode of projectModes) {
            if (!slugs.has(mode.slug)) {
                slugs.add(mode.slug);
                merged.push({
                    ...mode,
                    source: "project",
                });
            }
        }
        // Add non-duplicate global modes
        for (const mode of globalModes) {
            if (!slugs.has(mode.slug)) {
                slugs.add(mode.slug);
                merged.push({
                    ...mode,
                    source: "global",
                });
            }
        }
        return merged;
    }
    async getCustomModesFilePath() {
        const settingsDir = await this.ensureSettingsDirectoryExists();
        const filePath = path.join(settingsDir, "cline_custom_modes.json");
        const fileExists = await (0, fs_1.fileExistsAtPath)(filePath);
        if (!fileExists) {
            await this.queueWrite(async () => {
                await fs.writeFile(filePath, JSON.stringify({ customModes: [] }, null, 2));
            });
        }
        return filePath;
    }
    async watchCustomModesFiles() {
        const settingsPath = await this.getCustomModesFilePath();
        // Watch settings file
        this.disposables.push(vscode.workspace.onDidSaveTextDocument(async (document) => {
            if ((0, path_1.arePathsEqual)(document.uri.fsPath, settingsPath)) {
                const content = await fs.readFile(settingsPath, "utf-8");
                const errorMessage = "Invalid custom modes format. Please ensure your settings follow the correct JSON format.";
                let config;
                try {
                    config = JSON.parse(content);
                }
                catch (error) {
                    console.error(error);
                    vscode.window.showErrorMessage(errorMessage);
                    return;
                }
                const result = CustomModesSchema_1.CustomModesSettingsSchema.safeParse(config);
                if (!result.success) {
                    vscode.window.showErrorMessage(errorMessage);
                    return;
                }
                // Get modes from .roomodes if it exists (takes precedence)
                const roomodesPath = await this.getWorkspaceRoomodes();
                const roomodesModes = roomodesPath ? await this.loadModesFromFile(roomodesPath) : [];
                // Merge modes from both sources (.roomodes takes precedence)
                const mergedModes = await this.mergeCustomModes(roomodesModes, result.data.customModes);
                await this.context.globalState.update("customModes", mergedModes);
                await this.onUpdate();
            }
        }));
        // Watch .roomodes file if it exists
        const roomodesPath = await this.getWorkspaceRoomodes();
        if (roomodesPath) {
            this.disposables.push(vscode.workspace.onDidSaveTextDocument(async (document) => {
                if ((0, path_1.arePathsEqual)(document.uri.fsPath, roomodesPath)) {
                    const settingsModes = await this.loadModesFromFile(settingsPath);
                    const roomodesModes = await this.loadModesFromFile(roomodesPath);
                    // .roomodes takes precedence
                    const mergedModes = await this.mergeCustomModes(roomodesModes, settingsModes);
                    await this.context.globalState.update("customModes", mergedModes);
                    await this.onUpdate();
                }
            }));
        }
    }
    async getCustomModes() {
        // Get modes from settings file
        const settingsPath = await this.getCustomModesFilePath();
        const settingsModes = await this.loadModesFromFile(settingsPath);
        // Get modes from .roomodes if it exists
        const roomodesPath = await this.getWorkspaceRoomodes();
        const roomodesModes = roomodesPath ? await this.loadModesFromFile(roomodesPath) : [];
        // Create maps to store modes by source
        const projectModes = new Map();
        const globalModes = new Map();
        // Add project modes (they take precedence)
        for (const mode of roomodesModes) {
            projectModes.set(mode.slug, { ...mode, source: "project" });
        }
        // Add global modes
        for (const mode of settingsModes) {
            if (!projectModes.has(mode.slug)) {
                globalModes.set(mode.slug, { ...mode, source: "global" });
            }
        }
        // Combine modes in the correct order: project modes first, then global modes
        const mergedModes = [
            ...roomodesModes.map((mode) => ({ ...mode, source: "project" })),
            ...settingsModes
                .filter((mode) => !projectModes.has(mode.slug))
                .map((mode) => ({ ...mode, source: "global" })),
        ];
        await this.context.globalState.update("customModes", mergedModes);
        return mergedModes;
    }
    async updateCustomMode(slug, config) {
        try {
            const isProjectMode = config.source === "project";
            const targetPath = isProjectMode ? await this.getWorkspaceRoomodes() : await this.getCustomModesFilePath();
            if (isProjectMode && !targetPath) {
                throw new Error("No workspace folder found for project-specific mode");
            }
            await this.queueWrite(async () => {
                // Ensure source is set correctly based on target file
                const modeWithSource = {
                    ...config,
                    source: isProjectMode ? "project" : "global",
                };
                await this.updateModesInFile(targetPath, (modes) => {
                    const updatedModes = modes.filter((m) => m.slug !== slug);
                    updatedModes.push(modeWithSource);
                    return updatedModes;
                });
                await this.refreshMergedState();
            });
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to update custom mode: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async updateModesInFile(filePath, operation) {
        let content = "{}";
        try {
            content = await fs.readFile(filePath, "utf-8");
        }
        catch (error) {
            // File might not exist yet
            content = JSON.stringify({ customModes: [] });
        }
        let settings;
        try {
            settings = JSON.parse(content);
        }
        catch (error) {
            console.error(`[CustomModesManager] Failed to parse JSON from ${filePath}:`, error);
            settings = { customModes: [] };
        }
        settings.customModes = operation(settings.customModes || []);
        await fs.writeFile(filePath, JSON.stringify(settings, null, 2), "utf-8");
    }
    async refreshMergedState() {
        const settingsPath = await this.getCustomModesFilePath();
        const roomodesPath = await this.getWorkspaceRoomodes();
        const settingsModes = await this.loadModesFromFile(settingsPath);
        const roomodesModes = roomodesPath ? await this.loadModesFromFile(roomodesPath) : [];
        const mergedModes = await this.mergeCustomModes(roomodesModes, settingsModes);
        await this.context.globalState.update("customModes", mergedModes);
        await this.onUpdate();
    }
    async deleteCustomMode(slug) {
        try {
            const settingsPath = await this.getCustomModesFilePath();
            const roomodesPath = await this.getWorkspaceRoomodes();
            const settingsModes = await this.loadModesFromFile(settingsPath);
            const roomodesModes = roomodesPath ? await this.loadModesFromFile(roomodesPath) : [];
            // Find the mode in either file
            const projectMode = roomodesModes.find((m) => m.slug === slug);
            const globalMode = settingsModes.find((m) => m.slug === slug);
            if (!projectMode && !globalMode) {
                throw new Error("Write error: Mode not found");
            }
            await this.queueWrite(async () => {
                // Delete from project first if it exists there
                if (projectMode && roomodesPath) {
                    await this.updateModesInFile(roomodesPath, (modes) => modes.filter((m) => m.slug !== slug));
                }
                // Delete from global settings if it exists there
                if (globalMode) {
                    await this.updateModesInFile(settingsPath, (modes) => modes.filter((m) => m.slug !== slug));
                }
                await this.refreshMergedState();
            });
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to delete custom mode: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async ensureSettingsDirectoryExists() {
        const settingsDir = path.join(this.context.globalStorageUri.fsPath, "settings");
        await fs.mkdir(settingsDir, { recursive: true });
        return settingsDir;
    }
    async resetCustomModes() {
        try {
            const filePath = await this.getCustomModesFilePath();
            await fs.writeFile(filePath, JSON.stringify({ customModes: [] }, null, 2));
            await this.context.globalState.update("customModes", []);
            await this.onUpdate();
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to reset custom modes: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    dispose() {
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables = [];
    }
}
exports.CustomModesManager = CustomModesManager;
//# sourceMappingURL=CustomModesManager.js.map