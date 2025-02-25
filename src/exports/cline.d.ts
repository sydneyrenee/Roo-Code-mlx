import { ClineProvider } from "../core/webview/ClineProvider"
import { Mode } from "../shared/modes"

export interface ClineAPI {
	/**
	 * Sets the custom instructions in the global storage.
	 * @param value The custom instructions to be saved.
	 */
	setCustomInstructions(value: string): Promise<void>

	/**
	 * Retrieves the custom instructions from the global storage.
	 * @returns The saved custom instructions, or undefined if not set.
	 */
	getCustomInstructions(): Promise<string | undefined>

	/**
	 * Starts a new task with an optional initial message and images.
	 * @param task Optional initial task message.
	 * @param images Optional array of image data URIs (e.g., "data:image/webp;base64,...").
	 */
	startNewTask(task?: string, images?: string[]): Promise<void>

	/**
	 * Sends a message to the current task.
	 * @param message Optional message to send.
	 * @param images Optional array of image data URIs (e.g., "data:image/webp;base64,...").
	 */
	sendMessage(message?: string, images?: string[]): Promise<void>

	/**
	 * Simulates pressing the primary button in the chat interface.
	 */
	pressPrimaryButton(): Promise<void>

	/**
	 * Simulates pressing the secondary button in the chat interface.
	 */
	pressSecondaryButton(): Promise<void>

	/**
	 * Gets the provider instance.
	 */
	getProvider(): ClineProvider

	/**
	 * Switches to a different mode.
	 * @param mode The mode to switch to.
	 */
	switchMode(mode: Mode): Promise<void>

	/**
	 * Gets the current mode.
	 */
	getCurrentMode(): Promise<Mode>

	/**
	 * The sidebar provider instance.
	 */
	sidebarProvider: ClineProvider
}
