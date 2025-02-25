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
exports.downloadTask = downloadTask;
exports.formatContentBlockToMarkdown = formatContentBlockToMarkdown;
exports.findToolName = findToolName;
const os_1 = __importDefault(require("os"));
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
async function downloadTask(dateTs, conversationHistory) {
    // File name
    const date = new Date(dateTs);
    const month = date.toLocaleString("en-US", { month: "short" }).toLowerCase();
    const day = date.getDate();
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const fileName = `cline_task_${month}-${day}-${year}_${hours}-${minutes}-${seconds}-${ampm}.md`;
    // Generate markdown
    const markdownContent = conversationHistory
        .map((message) => {
        const role = message.role === "user" ? "**User:**" : "**Assistant:**";
        const content = Array.isArray(message.content)
            ? message.content.map((block) => formatContentBlockToMarkdown(block)).join("\n")
            : message.content;
        return `${role}\n\n${content}\n\n`;
    })
        .join("---\n\n");
    // Prompt user for save location
    const saveUri = await vscode.window.showSaveDialog({
        filters: { Markdown: ["md"] },
        defaultUri: vscode.Uri.file(path.join(os_1.default.homedir(), "Downloads", fileName)),
    });
    if (saveUri) {
        // Write content to the selected location
        await vscode.workspace.fs.writeFile(saveUri, Buffer.from(markdownContent));
        vscode.window.showTextDocument(saveUri, { preview: true });
    }
}
function formatContentBlockToMarkdown(block) {
    switch (block.type) {
        case "text":
            return block.text;
        case "image":
            return `[Image]`;
        case "tool_use":
            let input;
            if (typeof block.input === "object" && block.input !== null) {
                input = Object.entries(block.input)
                    .map(([key, value]) => `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`)
                    .join("\n");
            }
            else {
                input = String(block.input);
            }
            return `[Tool Use: ${block.name}]\n${input}`;
        case "tool_result":
            // For now we're not doing tool name lookup since we don't use tools anymore
            // const toolName = findToolName(block.tool_use_id, messages)
            const toolName = "Tool";
            if (typeof block.content === "string") {
                return `[${toolName}${block.is_error ? " (Error)" : ""}]\n${block.content}`;
            }
            else if (Array.isArray(block.content)) {
                return `[${toolName}${block.is_error ? " (Error)" : ""}]\n${block.content
                    .map((contentBlock) => formatContentBlockToMarkdown(contentBlock))
                    .join("\n")}`;
            }
            else {
                return `[${toolName}${block.is_error ? " (Error)" : ""}]`;
            }
        default:
            return "[Unexpected content type]";
    }
}
function findToolName(toolCallId, messages) {
    for (const message of messages) {
        if (Array.isArray(message.content)) {
            for (const block of message.content) {
                if (block.type === "tool_use" && block.id === toolCallId) {
                    return block.name;
                }
            }
        }
    }
    return "Unknown Tool";
}
//# sourceMappingURL=export-markdown.js.map