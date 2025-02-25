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
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const list_files_1 = require("../../services/glob/list-files");
const path_1 = require("../../utils/path");
const cwd = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath).at(0);
const MAX_INITIAL_FILES = 1_000;
// Note: this is not a drop-in replacement for listFiles at the start of tasks, since that will be done for Desktops when there is no workspace selected
class WorkspaceTracker {
    providerRef;
    disposables = [];
    filePaths = new Set();
    updateTimer = null;
    constructor(provider) {
        this.providerRef = new WeakRef(provider);
        this.registerListeners();
    }
    async initializeFilePaths() {
        // should not auto get filepaths for desktop since it would immediately show permission popup before cline ever creates a file
        if (!cwd) {
            return;
        }
        const [files, _] = await (0, list_files_1.listFiles)(cwd, true, MAX_INITIAL_FILES);
        files.slice(0, MAX_INITIAL_FILES).forEach((file) => this.filePaths.add(this.normalizeFilePath(file)));
        this.workspaceDidUpdate();
    }
    registerListeners() {
        const watcher = vscode.workspace.createFileSystemWatcher("**");
        this.disposables.push(watcher.onDidCreate(async (uri) => {
            await this.addFilePath(uri.fsPath);
            this.workspaceDidUpdate();
        }));
        // Renaming files triggers a delete and create event
        this.disposables.push(watcher.onDidDelete(async (uri) => {
            if (await this.removeFilePath(uri.fsPath)) {
                this.workspaceDidUpdate();
            }
        }));
        this.disposables.push(watcher);
        this.disposables.push(vscode.window.tabGroups.onDidChangeTabs(() => this.workspaceDidUpdate()));
    }
    getOpenedTabsInfo() {
        return vscode.window.tabGroups.all.flatMap((group) => group.tabs
            .filter((tab) => tab.input instanceof vscode.TabInputText)
            .map((tab) => {
            const path = tab.input.uri.fsPath;
            return {
                label: tab.label,
                isActive: tab.isActive,
                path: (0, path_1.toRelativePath)(path, cwd || ""),
            };
        }));
    }
    workspaceDidUpdate() {
        if (this.updateTimer) {
            clearTimeout(this.updateTimer);
        }
        this.updateTimer = setTimeout(() => {
            if (!cwd) {
                return;
            }
            const relativeFilePaths = Array.from(this.filePaths).map((file) => (0, path_1.toRelativePath)(file, cwd));
            this.providerRef.deref()?.postMessageToWebview({
                type: "workspaceUpdated",
                filePaths: relativeFilePaths,
                openedTabs: this.getOpenedTabsInfo(),
            });
            this.updateTimer = null;
        }, 300); // Debounce for 300ms
    }
    normalizeFilePath(filePath) {
        const resolvedPath = cwd ? path.resolve(cwd, filePath) : path.resolve(filePath);
        return filePath.endsWith("/") ? resolvedPath + "/" : resolvedPath;
    }
    async addFilePath(filePath) {
        // Allow for some buffer to account for files being created/deleted during a task
        if (this.filePaths.size >= MAX_INITIAL_FILES * 2) {
            return filePath;
        }
        const normalizedPath = this.normalizeFilePath(filePath);
        try {
            const stat = await vscode.workspace.fs.stat(vscode.Uri.file(normalizedPath));
            const isDirectory = (stat.type & vscode.FileType.Directory) !== 0;
            const pathWithSlash = isDirectory && !normalizedPath.endsWith("/") ? normalizedPath + "/" : normalizedPath;
            this.filePaths.add(pathWithSlash);
            return pathWithSlash;
        }
        catch {
            // If stat fails, assume it's a file (this can happen for newly created files)
            this.filePaths.add(normalizedPath);
            return normalizedPath;
        }
    }
    async removeFilePath(filePath) {
        const normalizedPath = this.normalizeFilePath(filePath);
        return this.filePaths.delete(normalizedPath) || this.filePaths.delete(normalizedPath + "/");
    }
    dispose() {
        if (this.updateTimer) {
            clearTimeout(this.updateTimer);
            this.updateTimer = null;
        }
        this.disposables.forEach((d) => d.dispose());
    }
}
exports.default = WorkspaceTracker;
//# sourceMappingURL=WorkspaceTracker.js.map