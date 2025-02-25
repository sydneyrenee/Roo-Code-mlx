import * as vscode from 'vscode'
import * as assert from 'assert'
import { VertexHandler } from "../../../../api/providers/vertex"
import { ApiHandlerOptions, ModelInfo } from "../../../../shared/api"

interface MockMessage {
    type: string
    message?: {
        usage: {
            input_tokens: number
            output_tokens: number
            cache_creation_input_tokens?: number
            cache_read_input_tokens?: number
        }
    }
    index?: number
    content_block?: {
        type: string
        text: string
    }
}

interface MockClient {
    messages: {
        create: (args: any) => Promise<{
            [Symbol.asyncIterator](): AsyncGenerator<MockMessage, void, unknown>
        }>
    }
}

// Timer mock class
class TimerMock {
    private currentTime: number = 0
    private timers: { callback: Function; delay: number; nextRun: number }[] = []

    advanceTimersByTime(ms: number): void {
        this.currentTime += ms
        this.timers = this.timers.filter(timer => {
            if (timer.nextRun <= this.currentTime) {
                timer.callback()
                return false
            }
            return true
        })
    }

    setTimeout(callback: Function, delay: number): void {
        this.timers.push({
            callback,
            delay,
            nextRun: this.currentTime + delay
        })
    }

    clearAllTimers(): void {
        this.timers = []
        this.currentTime = 0
    }
}

export async function activateVertexHandlerCacheTests(context: vscode.ExtensionContext): Promise<void> {
    const testController = vscode.tests.createTestController('vertexHandlerCacheTests', 'Vertex Handler Cache Tests')
    context.subscriptions.push(testController)

    const rootSuite = testController.createTestItem('vertexHandlerCache', 'Vertex Handler Cache')
    testController.items.add(rootSuite)

    const timerMock = new TimerMock()
    const originalSetTimeout = global.setTimeout

    testController.createRunProfile('run', vscode.TestRunProfileKind.Run, async (request) => {
        const queue: vscode.TestItem[] = []

        if (request.include) {
            request.include.forEach(test => queue.push(test))
        }

        const run = testController.createTestRun(request)

        for (const test of queue) {
            run.started(test)

            try {
                // Setup for each test
                const mockClient: MockClient = {
                    messages: {
                        create: async () => ({
                            async *[Symbol.asyncIterator]() {
                                yield { type: "empty" }
                            }
                        })
                    }
                }

                const mockModel: ModelInfo = {
                    maxTokens: 8192,
                    contextWindow: 200_000,
                    supportsImages: true,
                    supportsPromptCache: true,
                    inputPrice: 3.0,
                    outputPrice: 15.0,
                    cacheWritesPrice: 3.75,
                    cacheReadsPrice: 0.30
                }

                const options: ApiHandlerOptions = {
                    vertexProjectId: "test-project",
                    vertexRegion: "us-east5",
                    vertexContext: "Test context for caching",
                    apiModelId: "claude-3-5-sonnet@20240620",
                    modelTemperature: 0
                }

                const handler = new VertexHandler(options)
                ;(handler as any).client = mockClient
                ;(handler as any).getModel = () => ({
                    id: "claude-3-5-sonnet@20240620",
                    info: mockModel
                })

                global.setTimeout = timerMock.setTimeout.bind(timerMock) as any

                switch (test.id) {
                    case 'cache.control': {
                        let createCallArgs: any
                        mockClient.messages.create = async function(args: any) {
                            createCallArgs = args
                            return {
                                async *[Symbol.asyncIterator]() {
                                    yield {
                                        type: "message_start",
                                        message: {
                                            usage: {
                                                input_tokens: 100,
                                                output_tokens: 50,
                                                cache_creation_input_tokens: 80,
                                                cache_read_input_tokens: 0
                                            }
                                        }
                                    }
                                    yield {
                                        type: "content_block_start",
                                        index: 0,
                                        content_block: {
                                            type: "text",
                                            text: "Response"
                                        }
                                    }
                                }
                            }
                        }

                        const stream = handler.createMessage("System prompt", [
                            { role: "user", content: "Test message" }
                        ])

                        for await (const _ of stream) { /* consume stream */ }

                        assert.ok(createCallArgs.system.length === 2, "Should have two system blocks")
                        assert.strictEqual(createCallArgs.system[0].text, "System prompt")
                        assert.strictEqual(createCallArgs.system[1].text, "Test context for caching")
                        assert.deepStrictEqual(createCallArgs.system[1].cache_control, { type: "ephemeral" })
                        assert.strictEqual(createCallArgs.max_tokens, 8192)
                        assert.strictEqual(createCallArgs.temperature, 0)
                        break
                    }

                    case 'cache.tracking': {
                        mockClient.messages.create = async function() {
                            return {
                                async *[Symbol.asyncIterator]() {
                                    yield {
                                        type: "message_start",
                                        message: {
                                            usage: {
                                                input_tokens: 100,
                                                output_tokens: 50,
                                                cache_creation_input_tokens: 80,
                                                cache_read_input_tokens: 0
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        const stream = handler.createMessage("System prompt", [
                            { role: "user", content: "Test message" }
                        ])

                        const results = []
                        for await (const chunk of stream) {
                            results.push(chunk)
                        }

                        assert.deepStrictEqual(results[0], {
                            type: "usage",
                            inputTokens: 100,
                            outputTokens: 50
                        })
                        break
                    }

                    case 'cache.refresh': {
                        let createCallCount = 0
                        let lastCallArgs: any
                        mockClient.messages.create = async function(args: any) {
                            createCallCount++
                            lastCallArgs = args
                            return {
                                async *[Symbol.asyncIterator]() {
                                    yield {
                                        type: "message_start",
                                        message: {
                                            usage: {
                                                input_tokens: 100,
                                                output_tokens: 50
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        const stream = handler.createMessage("System prompt", [
                            { role: "user", content: "Test message" }
                        ])

                        for await (const _ of stream) { /* consume stream */ }

                        timerMock.advanceTimersByTime(4 * 60 * 1000)

                        assert.strictEqual(createCallCount, 2, "Should have made refresh request")
                        assert.deepStrictEqual(lastCallArgs.messages, [{ role: "user", content: "Continue" }])
                        break
                    }

                    case 'error.api': {
                        mockClient.messages.create = async function() {
                            throw new Error("API Error")
                        }

                        const stream = handler.createMessage("System prompt", [
                            { role: "user", content: "Test message" }
                        ])

                        await assert.rejects(async () => {
                            for await (const _ of stream) { /* consume stream */ }
                        }, /Vertex completion error: API Error/)
                        break
                    }

                    case 'error.stream': {
                        mockClient.messages.create = async function() {
                            return {
                                async *[Symbol.asyncIterator]() {
                                    throw new Error("Stream Error")
                                }
                            }
                        }

                        const stream = handler.createMessage("System prompt", [
                            { role: "user", content: "Test message" }
                        ])

                        await assert.rejects(async () => {
                            for await (const _ of stream) { /* consume stream */ }
                        }, /Vertex completion error: Stream Error/)
                        break
                    }
                }

                run.passed(test)
            } catch (err) {
                run.failed(test, new vscode.TestMessage(`Test failed: ${err}`))
            } finally {
                global.setTimeout = originalSetTimeout
            }
        }

        run.end()
    })

    // Cache Control tests
    const cacheSuite = testController.createTestItem('cache', 'Cache Control')
    rootSuite.children.add(cacheSuite)

    cacheSuite.children.add(testController.createTestItem(
        'cache.control',
        'should add cache control to context block'
    ))

    cacheSuite.children.add(testController.createTestItem(
        'cache.tracking',
        'should track cache write usage'
    ))

    cacheSuite.children.add(testController.createTestItem(
        'cache.refresh',
        'should start cache refresh when context is provided'
    ))

    // Error Handling tests
    const errorSuite = testController.createTestItem('error', 'Error Handling')
    rootSuite.children.add(errorSuite)

    errorSuite.children.add(testController.createTestItem(
        'error.api',
        'should handle API errors gracefully'
    ))

    errorSuite.children.add(testController.createTestItem(
        'error.stream',
        'should handle stream errors'
    ))
}