import * as vscode from 'vscode'
import * as assert from 'assert'
import { VertexCacheRefresh } from "../../../../services/vertex/cache-refresh"
import { VertexHandler } from "../../../../api/providers/vertex"
import { ApiStream } from "../../../../api/transform/stream"

interface MockMessage {
    type: string
    text: string
}

// Mock handler class
class MockVertexHandler {
    private mockImplementation: () => AsyncGenerator<MockMessage>
    private _calls: { systemPrompt: string; messages: { role: string; content: string }[] }[] = []

    constructor() {
        this.mockImplementation = async function* () {
            yield { type: "text", text: "Response" }
        }

        // Bind the method to ensure correct 'this' context
        this.createMessage = this.createMessage.bind(this)
    }

    async *createMessage(
        systemPrompt: string,
        messages: { role: string; content: string }[]
    ): AsyncGenerator<MockMessage> {
        this._calls.push({ systemPrompt, messages })
        yield* this.mockImplementation()
    }

    setMockImplementation(impl: () => AsyncGenerator<MockMessage>): void {
        this.mockImplementation = impl
    }

    getCalls(): { systemPrompt: string; messages: { role: string; content: string }[] }[] {
        return this._calls
    }

    reset(): void {
        this._calls = []
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

export async function activateVertexCacheRefreshTests(context: vscode.ExtensionContext): Promise<void> {
    const testController = vscode.tests.createTestController('vertexCacheRefreshTests', 'Vertex Cache Refresh Tests')
    context.subscriptions.push(testController)

    const rootSuite = testController.createTestItem('vertexCacheRefresh', 'Vertex Cache Refresh')
    testController.items.add(rootSuite)

    // Mock objects
    const mockHandler = new MockVertexHandler()
    const timerMock = new TimerMock()
    const originalSetTimeout = global.setTimeout
    const originalConsoleError = console.error

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
                let cacheRefresh = new VertexCacheRefresh()
                mockHandler.reset()
                timerMock.clearAllTimers()
                global.setTimeout = timerMock.setTimeout.bind(timerMock) as any
                console.error = () => {}

                switch (test.id) {
                    case 'schedule.basic': {
                        const cacheId = cacheRefresh.scheduleRefresh(
                            mockHandler as unknown as VertexHandler,
                            "System prompt",
                            "Test context"
                        )

                        assert.ok(cacheId, "Cache ID should be defined")
                        assert.strictEqual(cacheRefresh.isRefreshing(cacheId), true)

                        timerMock.advanceTimersByTime(4 * 60 * 1000)

                        const calls = mockHandler.getCalls()
                        assert.ok(calls.some(call => 
                            call.systemPrompt === "System prompt" &&
                            call.messages[0].content === "Continue"
                        ))
                        break
                    }

                    case 'schedule.multiple': {
                        const cacheId1 = cacheRefresh.scheduleRefresh(
                            mockHandler as unknown as VertexHandler,
                            "System 1",
                            "Context 1"
                        )

                        const cacheId2 = cacheRefresh.scheduleRefresh(
                            mockHandler as unknown as VertexHandler,
                            "System 2",
                            "Context 2"
                        )

                        assert.strictEqual(cacheRefresh.getActiveRefreshCount(), 2)

                        timerMock.advanceTimersByTime(4 * 60 * 1000)

                        const calls = mockHandler.getCalls()
                        assert.ok(calls.some(call => call.systemPrompt === "System 1"))
                        assert.ok(calls.some(call => call.systemPrompt === "System 2"))
                        break
                    }

                    case 'stop.specific': {
                        const cacheId = cacheRefresh.scheduleRefresh(
                            mockHandler as unknown as VertexHandler,
                            "System prompt",
                            "Test context"
                        )

                        cacheRefresh.stopRefresh(cacheId)

                        timerMock.advanceTimersByTime(4 * 60 * 1000)

                        assert.strictEqual(mockHandler.getCalls().length, 0)
                        assert.strictEqual(cacheRefresh.isRefreshing(cacheId), false)
                        break
                    }

                    case 'dispose.all': {
                        cacheRefresh.scheduleRefresh(
                            mockHandler as unknown as VertexHandler,
                            "System 1",
                            "Context 1"
                        )

                        cacheRefresh.scheduleRefresh(
                            mockHandler as unknown as VertexHandler,
                            "System 2",
                            "Context 2"
                        )

                        cacheRefresh.dispose()

                        timerMock.advanceTimersByTime(4 * 60 * 1000)

                        assert.strictEqual(mockHandler.getCalls().length, 0)
                        assert.strictEqual(cacheRefresh.getActiveRefreshCount(), 0)
                        break
                    }
                }

                run.passed(test)
            } catch (err) {
                run.failed(test, new vscode.TestMessage(`Test failed: ${err}`))
            } finally {
                // Cleanup after each test
                global.setTimeout = originalSetTimeout
                console.error = originalConsoleError
            }
        }

        run.end()
    })

    // Schedule tests
    const scheduleSuite = testController.createTestItem('schedule', 'Schedule Refresh')
    rootSuite.children.add(scheduleSuite)

    scheduleSuite.children.add(testController.createTestItem(
        'schedule.basic',
        'should schedule periodic refresh'
    ))

    scheduleSuite.children.add(testController.createTestItem(
        'schedule.multiple',
        'should maintain multiple refreshes'
    ))

    // Stop tests
    const stopSuite = testController.createTestItem('stop', 'Stop Refresh')
    rootSuite.children.add(stopSuite)

    stopSuite.children.add(testController.createTestItem(
        'stop.specific',
        'should stop specific refresh'
    ))

    // Dispose tests
    const disposeSuite = testController.createTestItem('dispose', 'Dispose')
    rootSuite.children.add(disposeSuite)

    disposeSuite.children.add(testController.createTestItem(
        'dispose.all',
        'should stop all refreshes'
    ))
}