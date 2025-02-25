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
exports.DiffViewProvider = exports.DIFF_VIEW_URI_SCHEME = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
const fs_1 = require("../../utils/fs");
const path_1 = require("../../utils/path");
const responses_1 = require("../../core/prompts/responses");
const DecorationController_1 = require("./DecorationController");
const diff = __importStar(require("diff"));
const diagnostics_1 = require("../diagnostics");
exports.DIFF_VIEW_URI_SCHEME = "cline-diff";
class DiffViewProvider {
    cwd;
    editType;
    isEditing = false;
    originalContent;
    createdDirs = [];
    documentWasOpen = false;
    relPath;
    newContent;
    activeDiffEditor;
    fadedOverlayController;
    activeLineController;
    streamedLines = [];
    preDiagnostics = [];
    constructor(cwd) {
        this.cwd = cwd;
    }
    async open(relPath) {
        this.relPath = relPath;
        const fileExists = this.editType === "modify";
        const absolutePath = path.resolve(this.cwd, relPath);
        this.isEditing = true;
        // if the file is already open, ensure it's not dirty before getting its contents
        if (fileExists) {
            const existingDocument = vscode.workspace.textDocuments.find((doc) => (0, path_1.arePathsEqual)(doc.uri.fsPath, absolutePath));
            if (existingDocument && existingDocument.isDirty) {
                await existingDocument.save();
            }
        }
        // get diagnostics before editing the file, we'll compare to diagnostics after editing to see if cline needs to fix anything
        this.preDiagnostics = vscode.languages.getDiagnostics();
        if (fileExists) {
            this.originalContent = await fs.readFile(absolutePath, "utf-8");
        }
        else {
            this.originalContent = "";
        }
        // for new files, create any necessary directories and keep track of new directories to delete if the user denies the operation
        this.createdDirs = await (0, fs_1.createDirectoriesForFile)(absolutePath);
        // make sure the file exists before we open it
        if (!fileExists) {
            await fs.writeFile(absolutePath, "");
        }
        // if the file was already open, close it (must happen after showing the diff view since if it's the only tab the column will close)
        this.documentWasOpen = false;
        // close the tab if it's open (it's already saved above)
        const tabs = vscode.window.tabGroups.all
            .map((tg) => tg.tabs)
            .flat()
            .filter((tab) => tab.input instanceof vscode.TabInputText && (0, path_1.arePathsEqual)(tab.input.uri.fsPath, absolutePath));
        for (const tab of tabs) {
            if (!tab.isDirty) {
                await vscode.window.tabGroups.close(tab);
            }
            this.documentWasOpen = true;
        }
        this.activeDiffEditor = await this.openDiffEditor();
        this.fadedOverlayController = new DecorationController_1.DecorationController("fadedOverlay", this.activeDiffEditor);
        this.activeLineController = new DecorationController_1.DecorationController("activeLine", this.activeDiffEditor);
        // Apply faded overlay to all lines initially
        this.fadedOverlayController.addLines(0, this.activeDiffEditor.document.lineCount);
        this.scrollEditorToLine(0); // will this crash for new files?
        this.streamedLines = [];
    }
    async update(accumulatedContent, isFinal) {
        if (!this.relPath || !this.activeLineController || !this.fadedOverlayController) {
            throw new Error("Required values not set");
        }
        this.newContent = accumulatedContent;
        const accumulatedLines = accumulatedContent.split("\n");
        if (!isFinal) {
            accumulatedLines.pop(); // remove the last partial line only if it's not the final update
        }
        const diffEditor = this.activeDiffEditor;
        const document = diffEditor?.document;
        if (!diffEditor || !document) {
            throw new Error("User closed text editor, unable to edit file...");
        }
        // Place cursor at the beginning of the diff editor to keep it out of the way of the stream animation
        const beginningOfDocument = new vscode.Position(0, 0);
        diffEditor.selection = new vscode.Selection(beginningOfDocument, beginningOfDocument);
        const endLine = accumulatedLines.length;
        // Replace all content up to the current line with accumulated lines
        const edit = new vscode.WorkspaceEdit();
        const rangeToReplace = new vscode.Range(0, 0, endLine + 1, 0);
        const contentToReplace = accumulatedLines.slice(0, endLine + 1).join("\n") + "\n";
        edit.replace(document.uri, rangeToReplace, contentToReplace);
        await vscode.workspace.applyEdit(edit);
        // Update decorations
        this.activeLineController.setActiveLine(endLine);
        this.fadedOverlayController.updateOverlayAfterLine(endLine, document.lineCount);
        // Scroll to the current line
        this.scrollEditorToLine(endLine);
        // Update the streamedLines with the new accumulated content
        this.streamedLines = accumulatedLines;
        if (isFinal) {
            // Handle any remaining lines if the new content is shorter than the original
            if (this.streamedLines.length < document.lineCount) {
                const edit = new vscode.WorkspaceEdit();
                edit.delete(document.uri, new vscode.Range(this.streamedLines.length, 0, document.lineCount, 0));
                await vscode.workspace.applyEdit(edit);
            }
            // Preserve empty last line if original content had one
            const hasEmptyLastLine = this.originalContent?.endsWith("\n");
            if (hasEmptyLastLine && !accumulatedContent.endsWith("\n")) {
                accumulatedContent += "\n";
            }
            // Apply the final content
            const finalEdit = new vscode.WorkspaceEdit();
            finalEdit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), accumulatedContent);
            await vscode.workspace.applyEdit(finalEdit);
            // Clear all decorations at the end (after applying final edit)
            this.fadedOverlayController.clear();
            this.activeLineController.clear();
        }
    }
    async saveChanges() {
        if (!this.relPath || !this.newContent || !this.activeDiffEditor) {
            return { newProblemsMessage: undefined, userEdits: undefined, finalContent: undefined };
        }
        const absolutePath = path.resolve(this.cwd, this.relPath);
        const updatedDocument = this.activeDiffEditor.document;
        const editedContent = updatedDocument.getText();
        if (updatedDocument.isDirty) {
            await updatedDocument.save();
        }
        await vscode.window.showTextDocument(vscode.Uri.file(absolutePath), { preview: false });
        await this.closeAllDiffViews();
        /*
        Getting diagnostics before and after the file edit is a better approach than
        automatically tracking problems in real-time. This method ensures we only
        report new problems that are a direct result of this specific edit.
        Since these are new problems resulting from Roo's edit, we know they're
        directly related to the work he's doing. This eliminates the risk of Roo
        going off-task or getting distracted by unrelated issues, which was a problem
        with the previous auto-debug approach. Some users' machines may be slow to
        update diagnostics, so this approach provides a good balance between automation
        and avoiding potential issues where Roo might get stuck in loops due to
        outdated problem information. If no new problems show up by the time the user
        accepts the changes, they can always debug later using the '@problems' mention.
        This way, Roo only becomes aware of new problems resulting from his edits
        and can address them accordingly. If problems don't change immediately after
        applying a fix, won't be notified, which is generally fine since the
        initial fix is usually correct and it may just take time for linters to catch up.
        */
        const postDiagnostics = vscode.languages.getDiagnostics();
        const newProblems = (0, diagnostics_1.diagnosticsToProblemsString)((0, diagnostics_1.getNewDiagnostics)(this.preDiagnostics, postDiagnostics), [
            vscode.DiagnosticSeverity.Error, // only including errors since warnings can be distracting (if user wants to fix warnings they can use the @problems mention)
        ], this.cwd); // will be empty string if no errors
        const newProblemsMessage = newProblems.length > 0 ? `\n\nNew problems detected after saving the file:\n${newProblems}` : "";
        // If the edited content has different EOL characters, we don't want to show a diff with all the EOL differences.
        const newContentEOL = this.newContent.includes("\r\n") ? "\r\n" : "\n";
        const normalizedEditedContent = editedContent.replace(/\r\n|\n/g, newContentEOL).trimEnd() + newContentEOL; // trimEnd to fix issue where editor adds in extra new line automatically
        // just in case the new content has a mix of varying EOL characters
        const normalizedNewContent = this.newContent.replace(/\r\n|\n/g, newContentEOL).trimEnd() + newContentEOL;
        if (normalizedEditedContent !== normalizedNewContent) {
            // user made changes before approving edit
            const userEdits = responses_1.formatResponse.createPrettyPatch(this.relPath.toPosix(), normalizedNewContent, normalizedEditedContent);
            return { newProblemsMessage, userEdits, finalContent: normalizedEditedContent };
        }
        else {
            // no changes to cline's edits
            return { newProblemsMessage, userEdits: undefined, finalContent: normalizedEditedContent };
        }
    }
    async revertChanges() {
        if (!this.relPath || !this.activeDiffEditor) {
            return;
        }
        const fileExists = this.editType === "modify";
        const updatedDocument = this.activeDiffEditor.document;
        const absolutePath = path.resolve(this.cwd, this.relPath);
        if (!fileExists) {
            if (updatedDocument.isDirty) {
                await updatedDocument.save();
            }
            await this.closeAllDiffViews();
            await fs.unlink(absolutePath);
            // Remove only the directories we created, in reverse order
            for (let i = this.createdDirs.length - 1; i >= 0; i--) {
                await fs.rmdir(this.createdDirs[i]);
                console.log(`Directory ${this.createdDirs[i]} has been deleted.`);
            }
            console.log(`File ${absolutePath} has been deleted.`);
        }
        else {
            // revert document
            const edit = new vscode.WorkspaceEdit();
            const fullRange = new vscode.Range(updatedDocument.positionAt(0), updatedDocument.positionAt(updatedDocument.getText().length));
            edit.replace(updatedDocument.uri, fullRange, this.originalContent ?? "");
            // Apply the edit and save, since contents shouldnt have changed this wont show in local history unless of course the user made changes and saved during the edit
            await vscode.workspace.applyEdit(edit);
            await updatedDocument.save();
            console.log(`File ${absolutePath} has been reverted to its original content.`);
            if (this.documentWasOpen) {
                await vscode.window.showTextDocument(vscode.Uri.file(absolutePath), {
                    preview: false,
                });
            }
            await this.closeAllDiffViews();
        }
        // edit is done
        await this.reset();
    }
    async closeAllDiffViews() {
        const tabs = vscode.window.tabGroups.all
            .flatMap((tg) => tg.tabs)
            .filter((tab) => tab.input instanceof vscode.TabInputTextDiff &&
            tab.input?.original?.scheme === exports.DIFF_VIEW_URI_SCHEME);
        for (const tab of tabs) {
            // trying to close dirty views results in save popup
            if (!tab.isDirty) {
                await vscode.window.tabGroups.close(tab);
            }
        }
    }
    async openDiffEditor() {
        if (!this.relPath) {
            throw new Error("No file path set");
        }
        const uri = vscode.Uri.file(path.resolve(this.cwd, this.relPath));
        // If this diff editor is already open (ie if a previous write file was interrupted) then we should activate that instead of opening a new diff
        const diffTab = vscode.window.tabGroups.all
            .flatMap((group) => group.tabs)
            .find((tab) => tab.input instanceof vscode.TabInputTextDiff &&
            tab.input?.original?.scheme === exports.DIFF_VIEW_URI_SCHEME &&
            (0, path_1.arePathsEqual)(tab.input.modified.fsPath, uri.fsPath));
        if (diffTab && diffTab.input instanceof vscode.TabInputTextDiff) {
            const editor = await vscode.window.showTextDocument(diffTab.input.modified);
            return editor;
        }
        // Open new diff editor
        return new Promise((resolve, reject) => {
            const fileName = path.basename(uri.fsPath);
            const fileExists = this.editType === "modify";
            const disposable = vscode.window.onDidChangeActiveTextEditor((editor) => {
                if (editor && (0, path_1.arePathsEqual)(editor.document.uri.fsPath, uri.fsPath)) {
                    disposable.dispose();
                    resolve(editor);
                }
            });
            vscode.commands.executeCommand("vscode.diff", vscode.Uri.parse(`${exports.DIFF_VIEW_URI_SCHEME}:${fileName}`).with({
                query: Buffer.from(this.originalContent ?? "").toString("base64"),
            }), uri, `${fileName}: ${fileExists ? "Original ↔ Roo's Changes" : "New File"} (Editable)`);
            // This may happen on very slow machines ie project idx
            setTimeout(() => {
                disposable.dispose();
                reject(new Error("Failed to open diff editor, please try again..."));
            }, 10_000);
        });
    }
    scrollEditorToLine(line) {
        if (this.activeDiffEditor) {
            const scrollLine = line + 4;
            this.activeDiffEditor.revealRange(new vscode.Range(scrollLine, 0, scrollLine, 0), vscode.TextEditorRevealType.InCenter);
        }
    }
    scrollToFirstDiff() {
        if (!this.activeDiffEditor) {
            return;
        }
        const currentContent = this.activeDiffEditor.document.getText();
        const diffs = diff.diffLines(this.originalContent || "", currentContent);
        let lineCount = 0;
        for (const part of diffs) {
            if (part.added || part.removed) {
                // Found the first diff, scroll to it
                this.activeDiffEditor.revealRange(new vscode.Range(lineCount, 0, lineCount, 0), vscode.TextEditorRevealType.InCenter);
                return;
            }
            if (!part.removed) {
                lineCount += part.count || 0;
            }
        }
    }
    // close editor if open?
    async reset() {
        this.editType = undefined;
        this.isEditing = false;
        this.originalContent = undefined;
        this.createdDirs = [];
        this.documentWasOpen = false;
        this.activeDiffEditor = undefined;
        this.fadedOverlayController = undefined;
        this.activeLineController = undefined;
        this.streamedLines = [];
        this.preDiagnostics = [];
    }
}
exports.DiffViewProvider = DiffViewProvider;
//# sourceMappingURL=DiffViewProvider.js.map