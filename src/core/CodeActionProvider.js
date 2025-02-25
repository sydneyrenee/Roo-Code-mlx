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
exports.CodeActionProvider = exports.COMMAND_IDS = exports.ACTION_NAMES = void 0;
const vscode = __importStar(require("vscode"));
const EditorUtils_1 = require("./EditorUtils");
exports.ACTION_NAMES = {
    EXPLAIN: "Roo Code: Explain Code",
    FIX: "Roo Code: Fix Code",
    FIX_LOGIC: "Roo Code: Fix Logic",
    IMPROVE: "Roo Code: Improve Code",
    ADD_TO_CONTEXT: "Roo Code: Add to Context",
};
exports.COMMAND_IDS = {
    EXPLAIN: "roo-cline.explainCode",
    FIX: "roo-cline.fixCode",
    IMPROVE: "roo-cline.improveCode",
    ADD_TO_CONTEXT: "roo-cline.addToContext",
};
class CodeActionProvider {
    static providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix,
        vscode.CodeActionKind.RefactorRewrite,
    ];
    createAction(title, kind, command, args) {
        const action = new vscode.CodeAction(title, kind);
        action.command = { command, title, arguments: args };
        return action;
    }
    createActionPair(baseTitle, kind, baseCommand, args) {
        return [
            this.createAction(`${baseTitle} in New Task`, kind, baseCommand, args),
            this.createAction(`${baseTitle} in Current Task`, kind, `${baseCommand}InCurrentTask`, args),
        ];
    }
    provideCodeActions(document, range, context) {
        try {
            const effectiveRange = EditorUtils_1.EditorUtils.getEffectiveRange(document, range);
            if (!effectiveRange) {
                return [];
            }
            const filePath = EditorUtils_1.EditorUtils.getFilePath(document);
            const actions = [];
            actions.push(...this.createActionPair(exports.ACTION_NAMES.EXPLAIN, vscode.CodeActionKind.QuickFix, exports.COMMAND_IDS.EXPLAIN, [
                filePath,
                effectiveRange.text,
            ]));
            if (context.diagnostics.length > 0) {
                const relevantDiagnostics = context.diagnostics.filter((d) => EditorUtils_1.EditorUtils.hasIntersectingRange(effectiveRange.range, d.range));
                if (relevantDiagnostics.length > 0) {
                    const diagnosticMessages = relevantDiagnostics.map(EditorUtils_1.EditorUtils.createDiagnosticData);
                    actions.push(...this.createActionPair(exports.ACTION_NAMES.FIX, vscode.CodeActionKind.QuickFix, exports.COMMAND_IDS.FIX, [
                        filePath,
                        effectiveRange.text,
                        diagnosticMessages,
                    ]));
                }
            }
            else {
                actions.push(...this.createActionPair(exports.ACTION_NAMES.FIX_LOGIC, vscode.CodeActionKind.QuickFix, exports.COMMAND_IDS.FIX, [
                    filePath,
                    effectiveRange.text,
                ]));
            }
            actions.push(...this.createActionPair(exports.ACTION_NAMES.IMPROVE, vscode.CodeActionKind.RefactorRewrite, exports.COMMAND_IDS.IMPROVE, [filePath, effectiveRange.text]));
            actions.push(this.createAction(exports.ACTION_NAMES.ADD_TO_CONTEXT, vscode.CodeActionKind.QuickFix, exports.COMMAND_IDS.ADD_TO_CONTEXT, [filePath, effectiveRange.text]));
            return actions;
        }
        catch (error) {
            console.error("Error providing code actions:", error);
            return [];
        }
    }
}
exports.CodeActionProvider = CodeActionProvider;
//# sourceMappingURL=CodeActionProvider.js.map