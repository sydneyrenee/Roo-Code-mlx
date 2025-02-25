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
exports.getLatestTerminalOutput = getLatestTerminalOutput;
const vscode = __importStar(require("vscode"));
/**
 * Gets the contents of the active terminal
 * @returns The terminal contents as a string
 */
async function getLatestTerminalOutput() {
    // Store original clipboard content to restore later
    const originalClipboard = await vscode.env.clipboard.readText();
    try {
        // Select terminal content
        await vscode.commands.executeCommand("workbench.action.terminal.selectAll");
        // Copy selection to clipboard
        await vscode.commands.executeCommand("workbench.action.terminal.copySelection");
        // Clear the selection
        await vscode.commands.executeCommand("workbench.action.terminal.clearSelection");
        // Get terminal contents from clipboard
        let terminalContents = (await vscode.env.clipboard.readText()).trim();
        // Check if there's actually a terminal open
        if (terminalContents === originalClipboard) {
            return "";
        }
        // Clean up command separation
        const lines = terminalContents.split("\n");
        const lastLine = lines.pop()?.trim();
        if (lastLine) {
            let i = lines.length - 1;
            while (i >= 0 && !lines[i].trim().startsWith(lastLine)) {
                i--;
            }
            terminalContents = lines.slice(Math.max(i, 0)).join("\n");
        }
        return terminalContents;
    }
    finally {
        // Restore original clipboard content
        await vscode.env.clipboard.writeText(originalClipboard);
    }
}
//# sourceMappingURL=get-latest-output.js.map