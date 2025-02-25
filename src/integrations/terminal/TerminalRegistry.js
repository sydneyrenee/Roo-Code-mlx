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
exports.TerminalRegistry = void 0;
const vscode = __importStar(require("vscode"));
// Although vscode.window.terminals provides a list of all open terminals, there's no way to know whether they're busy or not (exitStatus does not provide useful information for most commands). In order to prevent creating too many terminals, we need to keep track of terminals through the life of the extension, as well as session specific terminals for the life of a task (to get latest unretrieved output).
// Since we have promises keeping track of terminal processes, we get the added benefit of keep track of busy terminals even after a task is closed.
class TerminalRegistry {
    static terminals = [];
    static nextTerminalId = 1;
    static createTerminal(cwd) {
        const terminal = vscode.window.createTerminal({
            cwd,
            name: "Roo Code",
            iconPath: new vscode.ThemeIcon("rocket"),
            env: {
                PAGER: "cat",
            },
        });
        const newInfo = {
            terminal,
            busy: false,
            lastCommand: "",
            id: this.nextTerminalId++,
        };
        this.terminals.push(newInfo);
        return newInfo;
    }
    static getTerminal(id) {
        const terminalInfo = this.terminals.find((t) => t.id === id);
        if (terminalInfo && this.isTerminalClosed(terminalInfo.terminal)) {
            this.removeTerminal(id);
            return undefined;
        }
        return terminalInfo;
    }
    static updateTerminal(id, updates) {
        const terminal = this.getTerminal(id);
        if (terminal) {
            Object.assign(terminal, updates);
        }
    }
    static removeTerminal(id) {
        this.terminals = this.terminals.filter((t) => t.id !== id);
    }
    static getAllTerminals() {
        this.terminals = this.terminals.filter((t) => !this.isTerminalClosed(t.terminal));
        return this.terminals;
    }
    // The exit status of the terminal will be undefined while the terminal is active. (This value is set when onDidCloseTerminal is fired.)
    static isTerminalClosed(terminal) {
        return terminal.exitStatus !== undefined;
    }
}
exports.TerminalRegistry = TerminalRegistry;
//# sourceMappingURL=TerminalRegistry.js.map