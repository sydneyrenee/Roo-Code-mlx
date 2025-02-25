import { Anthropic } from "@anthropic-ai/sdk"
import { Stream as AnthropicStream } from "@anthropic-ai/sdk/streaming"
import {
	anthropicDefaultModelId,
	AnthropicModelId,
	anthropicModels,
	ApiHandlerOptions,
	ModelInfo,
} from "../../shared/api"
import { ApiHandler, SingleCompletionHandler } from "../index"
import { ApiStream } from "../transform/stream"
import { SharedContentBlock, SharedTextBlock } from "../transform/shared-types"

const ANTHROPIC_DEFAULT_TEMPERATURE = 0

export class AnthropicHandler implements ApiHandler, SingleCompletionHandler {
	private options: ApiHandlerOptions
	private client: Anthropic

	constructor(options: ApiHandlerOptions) {
		this.options = options
		this.client = new Anthropic({
			apiKey: this.options.apiKey,
			baseURL: this.options.anthropicBaseUrl || undefined,
		})
	}

	async *createMessage(systemPrompt: string, messages: Anthropic.Messages.MessageParam[]): ApiStream {
		let stream: AnthropicStream<Anthropic.Messages.MessageStreamEvent>
		const modelId = this.getModel().id
		switch (modelId) {
			// 'latest' alias does not support cache_control
			case "claude-3-5-sonnet-20241022":
			case "claude-3-5-haiku-20241022":
			case "claude-3-opus-20240229":
			case "claude-3-haiku-20240307": {
				const userMsgIndices = messages.reduce(
					(acc, msg, index) => (msg.role === "user" ? [...acc, index] : acc),
					[] as number[],
				)
				const lastUserMsgIndex = userMsgIndices[userMsgIndices.length - 1] ?? -1
				const secondLastMsgUserIndex = userMsgIndices[userMsgIndices.length - 2] ?? -1
				stream = await this.client.messages.create(
					{
						model: modelId,
						max_tokens: this.getModel().info.maxTokens || 8192,
						temperature: this.options.modelTemperature ?? ANTHROPIC_DEFAULT_TEMPERATURE,
						system: [{ 
							text: systemPrompt, 
							type: "text" as const,
							cache_control: { type: "ephemeral" }
						}],
						messages: messages.map((message, index) => {
							if (index === lastUserMsgIndex || index === secondLastMsgUserIndex) {
								return {
									...message,
									content:
										typeof message.content === "string"
											? [
													{
														type: "text" as const,
														text: message.content,
														cache_control: { type: "ephemeral" }
													},
												]
											: message.content.map((content, contentIndex) =>
													contentIndex === message.content.length - 1
														? { 
															...content, 
															cache_control: { type: "ephemeral" }
														}
														: content,
												),
								}
							}
							return {
								...message,
								content:
									typeof message.content === "string"
										? [{ type: "text" as const, text: message.content }]
										: message.content,
							}
						}),
						stream: true,
					},
					{
						headers: { "anthropic-beta": "prompt-caching-2024-07-31" },
					},
				)
				break
			}
			default: {
				stream = await this.client.messages.create({
					model: modelId,
					max_tokens: this.getModel().info.maxTokens || 8192,
					temperature: this.options.modelTemperature ?? ANTHROPIC_DEFAULT_TEMPERATURE,
					system: [{ text: systemPrompt, type: "text" as const }],
					messages: messages.map(message => ({
						...message,
						content:
							typeof message.content === "string"
								? [{ type: "text" as const, text: message.content }]
								: message.content,
					})),
					stream: true,
				})
				break
			}
		}

		for await (const chunk of stream) {
			switch (chunk.type) {
				case "message_start":
					// tells us cache reads/writes/input/output
					const usage = chunk.message.usage
					yield {
						type: "usage",
						inputTokens: usage.input_tokens || 0,
						outputTokens: usage.output_tokens || 0,
						cacheWriteTokens: usage.cache_creation_input_tokens || undefined,
						cacheReadTokens: usage.cache_read_input_tokens || undefined,
					}
					break
				case "message_delta":
					// tells us stop_reason, stop_sequence, and output tokens along the way and at the end of the message

					yield {
						type: "usage",
						inputTokens: 0,
						outputTokens: chunk.usage.output_tokens || 0,
					}
					break
				case "message_stop":
					// no usage data, just an indicator that the message is done
					break
				case "content_block_start":
					switch (chunk.content_block.type) {
						case "text":
							// we may receive multiple text blocks, in which case just insert a line break between them
							if (chunk.index > 0) {
								yield {
									type: "text",
									text: "\n",
								}
							}
							yield {
								type: "text",
								text: chunk.content_block.text,
							}
							break
					}
					break
				case "content_block_delta":
					switch (chunk.delta.type) {
						case "text_delta":
							yield {
								type: "text",
								text: chunk.delta.text,
							}
							break
					}
					break
				case "content_block_stop":
					break
			}
		}
	}

	getModel(): { id: AnthropicModelId; info: ModelInfo } {
		const modelId = this.options.apiModelId
		if (modelId && modelId in anthropicModels) {
			const id = modelId as AnthropicModelId
			return { id, info: anthropicModels[id] }
		}
		return { id: anthropicDefaultModelId, info: anthropicModels[anthropicDefaultModelId] }
	}

	async completePrompt(prompt: string): Promise<string> {
		try {
			const response = await this.client.messages.create({
				model: this.getModel().id,
				max_tokens: this.getModel().info.maxTokens || 8192,
				temperature: this.options.modelTemperature ?? ANTHROPIC_DEFAULT_TEMPERATURE,
				messages: [{ 
					role: "user", 
					content: [{ 
						type: "text" as const, 
						text: prompt,
						citations: []
					}]
				}],
				stream: false,
			})

			const content = response.content[0]
			if (content.type === "text") {
				return content.text
			}
			return ""
		} catch (error) {
			if (error instanceof Error) {
				throw new Error(`Anthropic completion error: ${error.message}`)
			}
			throw error
		}
	}
}
