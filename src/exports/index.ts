import * as vscode from "vscode"
import { ClineProvider } from "../core/webview/ClineProvider"
import { ClineAPI } from "./cline"
import { Mode } from "../shared/modes"
import { ExtensionMessage, ExtensionState } from "../shared/ExtensionMessage"

export type { ClineAPI } from "./cline"

export function createClineAPI(outputChannel: vscode.OutputChannel, sidebarProvider: ClineProvider): ClineAPI {
	const api: ClineAPI = {
		setCustomInstructions: async (value: string) => {
			await sidebarProvider.updateCustomInstructions(value)
			outputChannel.appendLine("Custom instructions set")
		},

		getCustomInstructions: async () => {
			return (await sidebarProvider.getGlobalState("customInstructions")) as string | undefined
		},

		startNewTask: async (task?: string, images?: string[]) => {
			outputChannel.appendLine("Starting new task")
			await sidebarProvider.clearTask()
			await sidebarProvider.postStateToWebview()
			await sidebarProvider.postMessageToWebview({ type: "action", action: "chatButtonClicked" })
			await sidebarProvider.postMessageToWebview({
				type: "invoke",
				invoke: "sendMessage",
				text: task,
				images: images,
			})
			outputChannel.appendLine(
				`Task started with message: ${task ? `"${task}"` : "undefined"} and ${images?.length || 0} image(s)`,
			)
		},

		sendMessage: async (message?: string, images?: string[]) => {
			outputChannel.appendLine(
				`Sending message: ${message ? `"${message}"` : "undefined"} with ${images?.length || 0} image(s)`,
			)
			await sidebarProvider.postMessageToWebview({
				type: "invoke",
				invoke: "sendMessage",
				text: message,
				images: images,
			})
		},

		pressPrimaryButton: async () => {
			outputChannel.appendLine("Pressing primary button")
			await sidebarProvider.postMessageToWebview({
				type: "invoke",
				invoke: "primaryButtonClick",
			})
		},

		pressSecondaryButton: async () => {
			outputChannel.appendLine("Pressing secondary button")
			await sidebarProvider.postMessageToWebview({
				type: "invoke",
				invoke: "secondaryButtonClick",
			})
		},

		getProvider: () => {
			return sidebarProvider
		},

		switchMode: async (mode: Mode) => {
			outputChannel.appendLine(`Switching to mode: ${mode}`)
			await sidebarProvider.postMessageToWebview({
				type: "state",
				state: {
					mode: mode
				}
			} as ExtensionMessage)
		},

		getCurrentMode: async () => {
			const state = await sidebarProvider.getState()
			return state.mode as Mode
		},

		sidebarProvider: sidebarProvider,
	}

	return api
}
