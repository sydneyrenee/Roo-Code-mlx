import * as vscode from "vscode"
import * as path from "path"
import fs from "fs/promises"
import simpleGit from "simple-git"
import { Anthropic } from "@anthropic-ai/sdk"
import { HistoryItem } from "../../shared/HistoryItem"
import { GlobalFileNames, TaskData } from "./ClineProviderTypes"
import { fileExistsAtPath } from "../../utils/fs"
import { downloadTask } from "../../integrations/misc/export-markdown"
import { StateManager } from "./ClineProviderState"

export class TaskManager {
    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly stateManager: StateManager,
        private readonly outputChannel: vscode.OutputChannel
    ) {}

    async getTaskWithId(id: string): Promise<TaskData> {
        const history = ((await this.stateManager.getGlobalState("taskHistory")) as HistoryItem[] | undefined) || []
        const historyItem = history.find((item) => item.id === id)
        if (historyItem) {
            const taskDirPath = path.join(this.context.globalStorageUri.fsPath, "tasks", id)
            const apiConversationHistoryFilePath = path.join(taskDirPath, GlobalFileNames.apiConversationHistory)
            const uiMessagesFilePath = path.join(taskDirPath, GlobalFileNames.uiMessages)
            const fileExists = await fileExistsAtPath(apiConversationHistoryFilePath)
            if (fileExists) {
                const apiConversationHistory = JSON.parse(await fs.readFile(apiConversationHistoryFilePath, "utf8"))
                return {
                    historyItem,
                    taskDirPath,
                    apiConversationHistoryFilePath,
                    uiMessagesFilePath,
                    apiConversationHistory,
                }
            }
        }
        // if we tried to get a task that doesn't exist, remove it from state
        // FIXME: this seems to happen sometimes when the json file doesnt save to disk for some reason
        await this.deleteTaskFromState(id)
        throw new Error("Task not found")
    }

    async showTaskWithId(id: string, currentTaskId?: string) {
        if (id !== currentTaskId) {
            // non-current task
            const { historyItem } = await this.getTaskWithId(id)
            return historyItem
        }
        return null
    }

    async exportTaskWithId(id: string) {
        const { historyItem, apiConversationHistory } = await this.getTaskWithId(id)
        await downloadTask(historyItem.ts, apiConversationHistory)
    }

    async deleteTaskWithId(id: string, currentTaskId?: string, checkpointsEnabled?: boolean) {
        if (id === currentTaskId) {
            // Return true to indicate the current task should be cleared
            return true
        }

        try {
            const { taskDirPath, apiConversationHistoryFilePath, uiMessagesFilePath } = await this.getTaskWithId(id)

            await this.deleteTaskFromState(id)

            // Delete the task files.
            const apiConversationHistoryFileExists = await fileExistsAtPath(apiConversationHistoryFilePath)

            if (apiConversationHistoryFileExists) {
                await fs.unlink(apiConversationHistoryFilePath)
            }

            const uiMessagesFileExists = await fileExistsAtPath(uiMessagesFilePath)

            if (uiMessagesFileExists) {
                await fs.unlink(uiMessagesFilePath)
            }

            const legacyMessagesFilePath = path.join(taskDirPath, "claude_messages.json")

            if (await fileExistsAtPath(legacyMessagesFilePath)) {
                await fs.unlink(legacyMessagesFilePath)
            }

            const baseDir = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath).at(0)

            // Delete checkpoints branch.
            if (checkpointsEnabled && baseDir) {
                const branchSummary = await simpleGit(baseDir)
                    .branch(["-D", `roo-code-checkpoints-${id}`])
                    .catch(() => undefined)

                if (branchSummary) {
                    console.log(`[deleteTaskWithId${id}] deleted checkpoints branch`)
                }
            }

            // Delete checkpoints directory
            const checkpointsDir = path.join(taskDirPath, "checkpoints")

            if (await fileExistsAtPath(checkpointsDir)) {
                try {
                    await fs.rm(checkpointsDir, { recursive: true, force: true })
                    console.log(`[deleteTaskWithId${id}] removed checkpoints repo`)
                } catch (error) {
                    console.error(
                        `[deleteTaskWithId${id}] failed to remove checkpoints repo: ${error instanceof Error ? error.message : String(error)}`,
                    )
                }
            }

            // Succeeds if the dir is empty.
            await fs.rmdir(taskDirPath)
            
            return false
        } catch (error) {
            this.outputChannel.appendLine(`Error deleting task: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`)
            return false
        }
    }

    async deleteTaskFromState(id: string) {
        // Remove the task from history
        const taskHistory = ((await this.stateManager.getGlobalState("taskHistory")) as HistoryItem[]) || []
        const updatedTaskHistory = taskHistory.filter((task) => task.id !== id)
        await this.stateManager.updateGlobalState("taskHistory", updatedTaskHistory)
    }
}