import * as vscode from "vscode";
import { ClineProvider } from "../core/webview/ClineProvider";
import { TerminalManager } from "../integrations/terminal/TerminalManager";
const TERMINAL_COMMAND_IDS = {
    ADD_TO_CONTEXT: "roo-cline.terminalAddToContext",
    FIX: "roo-cline.terminalFixCommand",
    FIX_IN_CURRENT_TASK: "roo-cline.terminalFixCommandInCurrentTask",
    EXPLAIN: "roo-cline.terminalExplainCommand",
    EXPLAIN_IN_CURRENT_TASK: "roo-cline.terminalExplainCommandInCurrentTask",
};
export const registerTerminalActions = (context) => {
    const terminalManager = new TerminalManager();
    registerTerminalAction(context, terminalManager, TERMINAL_COMMAND_IDS.ADD_TO_CONTEXT, "TERMINAL_ADD_TO_CONTEXT");
    registerTerminalActionPair(context, terminalManager, TERMINAL_COMMAND_IDS.FIX, "TERMINAL_FIX", "What would you like Roo to fix?");
    registerTerminalActionPair(context, terminalManager, TERMINAL_COMMAND_IDS.EXPLAIN, "TERMINAL_EXPLAIN", "What would you like Roo to explain?");
};
const registerTerminalAction = (context, terminalManager, command, promptType, inputPrompt) => {
    context.subscriptions.push(vscode.commands.registerCommand(command, async (args) => {
        let content = args.selection;
        if (!content || content === "") {
            content = await terminalManager.getTerminalContents(promptType === "TERMINAL_ADD_TO_CONTEXT" ? -1 : 1);
        }
        if (!content) {
            vscode.window.showWarningMessage("No terminal content selected");
            return;
        }
        const params = {
            terminalContent: content,
        };
        if (inputPrompt) {
            params.userInput =
                (await vscode.window.showInputBox({
                    prompt: inputPrompt,
                })) ?? "";
        }
        await ClineProvider.handleTerminalAction(command, promptType, params);
    }));
};
const registerTerminalActionPair = (context, terminalManager, baseCommand, promptType, inputPrompt) => {
    // Register new task version
    registerTerminalAction(context, terminalManager, baseCommand, promptType, inputPrompt);
    // Register current task version
    registerTerminalAction(context, terminalManager, `${baseCommand}InCurrentTask`, promptType, inputPrompt);
};
//# sourceMappingURL=registerTerminalActions.js.map