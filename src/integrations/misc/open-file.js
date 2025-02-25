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
exports.openImage = openImage;
exports.openFile = openFile;
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const vscode = __importStar(require("vscode"));
const path_1 = require("../../utils/path");
async function openImage(dataUri) {
    const matches = dataUri.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
    if (!matches) {
        vscode.window.showErrorMessage("Invalid data URI format");
        return;
    }
    const [, format, base64Data] = matches;
    const imageBuffer = Buffer.from(base64Data, "base64");
    const tempFilePath = path.join(os.tmpdir(), `temp_image_${Date.now()}.${format}`);
    try {
        await vscode.workspace.fs.writeFile(vscode.Uri.file(tempFilePath), imageBuffer);
        await vscode.commands.executeCommand("vscode.open", vscode.Uri.file(tempFilePath));
    }
    catch (error) {
        vscode.window.showErrorMessage(`Error opening image: ${error}`);
    }
}
async function openFile(filePath, options = {}) {
    try {
        // Get workspace root
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            throw new Error("No workspace root found");
        }
        // If path starts with ./, resolve it relative to workspace root
        const fullPath = filePath.startsWith("./") ? path.join(workspaceRoot, filePath.slice(2)) : filePath;
        const uri = vscode.Uri.file(fullPath);
        // Check if file exists
        try {
            await vscode.workspace.fs.stat(uri);
        }
        catch {
            // File doesn't exist
            if (!options.create) {
                throw new Error("File does not exist");
            }
            // Create with provided content or empty string
            const content = options.content || "";
            await vscode.workspace.fs.writeFile(uri, Buffer.from(content, "utf8"));
        }
        // Check if the document is already open in a tab group that's not in the active editor's column
        try {
            for (const group of vscode.window.tabGroups.all) {
                const existingTab = group.tabs.find((tab) => tab.input instanceof vscode.TabInputText && (0, path_1.arePathsEqual)(tab.input.uri.fsPath, uri.fsPath));
                if (existingTab) {
                    const activeColumn = vscode.window.activeTextEditor?.viewColumn;
                    const tabColumn = vscode.window.tabGroups.all.find((group) => group.tabs.includes(existingTab))?.viewColumn;
                    if (activeColumn && activeColumn !== tabColumn && !existingTab.isDirty) {
                        await vscode.window.tabGroups.close(existingTab);
                    }
                    break;
                }
            }
        }
        catch { } // not essential, sometimes tab operations fail
        const document = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(document, { preview: false });
    }
    catch (error) {
        if (error instanceof Error) {
            vscode.window.showErrorMessage(`Could not open file: ${error.message}`);
        }
        else {
            vscode.window.showErrorMessage(`Could not open file!`);
        }
    }
}
//# sourceMappingURL=open-file.js.map