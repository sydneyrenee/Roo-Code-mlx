declare module "@frost-beta/llm" {
    export interface Message {
        role: "system" | "user" | "assistant"
        content: string
    }

    export interface GenerateOptions {
        maxTokens?: number
        temperature?: number
        topP?: number
    }

    export interface ChatTemplateOptions {
        trimSystemPrompt?: boolean
    }

    export class LLM {
        /**
         * Apply chat template to messages
         */
        applyChatTemplate(
            messages: Message[],
            options?: ChatTemplateOptions
        ): Promise<any>

        /**
         * Generate text using the model
         */
        generate(
            promptEmbeds: any,
            options?: GenerateOptions
        ): AsyncGenerator<string[], void, unknown>
    }

    /**
     * Load a LLM model from a directory or Hugging Face repo
     */
    export function loadLLM(path: string): Promise<LLM>
}