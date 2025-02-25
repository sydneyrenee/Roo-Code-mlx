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
exports.getNewDiagnostics = getNewDiagnostics;
exports.diagnosticsToProblemsString = diagnosticsToProblemsString;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fast_deep_equal_1 = __importDefault(require("fast-deep-equal"));
function getNewDiagnostics(oldDiagnostics, newDiagnostics) {
    const newProblems = [];
    const oldMap = new Map(oldDiagnostics);
    for (const [uri, newDiags] of newDiagnostics) {
        const oldDiags = oldMap.get(uri) || [];
        const newProblemsForUri = newDiags.filter((newDiag) => !oldDiags.some((oldDiag) => (0, fast_deep_equal_1.default)(oldDiag, newDiag)));
        if (newProblemsForUri.length > 0) {
            newProblems.push([uri, newProblemsForUri]);
        }
    }
    return newProblems;
}
// Usage:
// const oldDiagnostics = // ... your old diagnostics array
// const newDiagnostics = // ... your new diagnostics array
// const newProblems = getNewDiagnostics(oldDiagnostics, newDiagnostics);
// Example usage with mocks:
//
// // Mock old diagnostics
// const oldDiagnostics: [vscode.Uri, vscode.Diagnostic[]][] = [
//     [vscode.Uri.file("/path/to/file1.ts"), [
//         new vscode.Diagnostic(new vscode.Range(0, 0, 0, 10), "Old error in file1", vscode.DiagnosticSeverity.Error)
//     ]],
//     [vscode.Uri.file("/path/to/file2.ts"), [
//         new vscode.Diagnostic(new vscode.Range(5, 5, 5, 15), "Old warning in file2", vscode.DiagnosticSeverity.Warning)
//     ]]
// ];
//
// // Mock new diagnostics
// const newDiagnostics: [vscode.Uri, vscode.Diagnostic[]][] = [
//     [vscode.Uri.file("/path/to/file1.ts"), [
//         new vscode.Diagnostic(new vscode.Range(0, 0, 0, 10), "Old error in file1", vscode.DiagnosticSeverity.Error),
//         new vscode.Diagnostic(new vscode.Range(2, 2, 2, 12), "New error in file1", vscode.DiagnosticSeverity.Error)
//     ]],
//     [vscode.Uri.file("/path/to/file2.ts"), [
//         new vscode.Diagnostic(new vscode.Range(5, 5, 5, 15), "Old warning in file2", vscode.DiagnosticSeverity.Warning)
//     ]],
//     [vscode.Uri.file("/path/to/file3.ts"), [
//         new vscode.Diagnostic(new vscode.Range(1, 1, 1, 11), "New error in file3", vscode.DiagnosticSeverity.Error)
//     ]]
// ];
//
// const newProblems = getNewProblems(oldDiagnostics, newDiagnostics);
//
// console.log("New problems:");
// for (const [uri, diagnostics] of newProblems) {
//     console.log(`File: ${uri.fsPath}`);
//     for (const diagnostic of diagnostics) {
//         console.log(`- ${diagnostic.message} (${diagnostic.range.start.line}:${diagnostic.range.start.character})`);
//     }
// }
//
// // Expected output:
// // New problems:
// // File: /path/to/file1.ts
// // - New error in file1 (2:2)
// // File: /path/to/file3.ts
// // - New error in file3 (1:1)
// will return empty string if no problems with the given severity are found
function diagnosticsToProblemsString(diagnostics, severities, cwd) {
    let result = "";
    for (const [uri, fileDiagnostics] of diagnostics) {
        const problems = fileDiagnostics.filter((d) => severities.includes(d.severity));
        if (problems.length > 0) {
            result += `\n\n${path.relative(cwd, uri.fsPath).toPosix()}`;
            for (const diagnostic of problems) {
                let label;
                switch (diagnostic.severity) {
                    case vscode.DiagnosticSeverity.Error:
                        label = "Error";
                        break;
                    case vscode.DiagnosticSeverity.Warning:
                        label = "Warning";
                        break;
                    case vscode.DiagnosticSeverity.Information:
                        label = "Information";
                        break;
                    case vscode.DiagnosticSeverity.Hint:
                        label = "Hint";
                        break;
                    default:
                        label = "Diagnostic";
                }
                const line = diagnostic.range.start.line + 1; // VSCode lines are 0-indexed
                const source = diagnostic.source ? `${diagnostic.source} ` : "";
                result += `\n- [${source}${label}] Line ${line}: ${diagnostic.message}`;
            }
        }
    }
    return result.trim();
}
//# sourceMappingURL=index.js.map