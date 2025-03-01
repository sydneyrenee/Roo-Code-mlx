import * as vscode from 'vscode';
import * as assert from 'assert';
import { VertexCacheRefresh } from "../../../../services/vertex/cache-refresh";
import { VertexHandler } from "../../../../api/providers/vertex";
import { ApiStream } from "../../../../api/transform/stream";
import { createTestController } from '../../testController';
import { TestUtils } from '../../../testUtils';

interface MockMessage {
    type: string;
    text: string;
}

// Mock handler class
class MockVertexHandler {
    private mockImplementation: () => AsyncGenerator<MockMessage>;
    private _calls: { systemPrompt: string; messages: { role: string; content: string }[] }[] = [];

    constructor() {
        this.mockImplementation = async function* () {
            yield { type: "text", text: "Response" };
        };

        // Bind the method to ensure correct 'this' context
        this.createMessage = this.createMessage.bind(this);
    }

    async *createMessage(
        systemPrompt: string,
        messages: { role: string; content: string }[]
    ): AsyncGenerator<MockMessage> {
        this._calls.push({ systemPrompt, messages });
        yield* this.mockImplementation();
    }

    setMockImplementation(impl: () => AsyncGenerator<MockMessage>): void {
        this.mockImplementation = impl;
    }

    getCalls(): { systemPrompt: string; messages: { role: string; content: string }[] }[] {
        return this._calls;
    }

    reset(): void {
        this._calls = [];
    }
}

// Timer mock class
class TimerMock {
    private currentTime: number = 0;
    private timers: { callback: Function; delay: number; nextRun: number }[] = [];

    advanceTimersByTime(ms: number): void {
        this.currentTime += ms;
        this.timers = this.timers.filter(timer => {
            if (timer.nextRun <= this.currentTime) {
                timer.callback();
                return false;
            }
            return true;
        });
    }

    setTimeout(callback: Function, delay: number): void {
        this.timers.push({
            callback,
            delay,
            nextRun: this.currentTime + delay
        });
    }

    clearAllTimers(): void {
        this.timers = [];
        this.currentTime = 0;
    }
}

const controller = createTestController('vertexCacheRefreshTests', 'Vertex Cache Refresh Tests');

// Root test item for Vertex Cache Refresh
const vertexCacheRefreshTests = controller.createTestItem('vertexCacheRefresh', 'Vertex Cache Refresh', vscode.Uri.file(__filename));
controller.items.add(vertexCacheRefreshTests);

// Mock objects
const mockHandler = new MockVertexHandler();
const timerMock = new TimerMock();
const originalSetTimeout = global.setTimeout;
const originalConsoleError = console.error;

// Schedule tests
const scheduleTests = controller.createTestItem('schedule', 'Schedule Refresh', vscode.Uri.file(__filename));
vertexCacheRefreshTests.children.add(scheduleTests);

// Test for scheduling periodic refresh
scheduleTests.children.add(
    TestUtils.createTest(
        controller,
        'basic',
        'should schedule periodic refresh',
        vscode.Uri.file(__filename),
        async run => {
            try {
                // Setup for test
                let cacheRefresh = new VertexCacheRefresh();
                mockHandler.reset();
                timerMock.clearAllTimers();
                global.setTimeout = timerMock.setTimeout.bind(timerMock) as any;
                console.error = () => {};

                const cacheId = cacheRefresh.scheduleRefresh(
                    mockHandler as unknown as VertexHandler,
                    "System prompt",
                    "Test context"
                );

                assert.ok(cacheId, "Cache ID should be defined");
                assert.strictEqual(cacheRefresh.isRefreshing(cacheId), true);

                timerMock.advanceTimersByTime(4 * 60 * 1000);

                const calls = mockHandler.getCalls();
                assert.ok(calls.some(call => 
                    call.systemPrompt === "System prompt" &&
                    call.messages[0].content === "Continue"
                ));
            } finally {
                // Cleanup after test
                global.setTimeout = originalSetTimeout;
                console.error = originalConsoleError;
            }
        }
    )
);

// Test for maintaining multiple refreshes
scheduleTests.children.add(
    TestUtils.createTest(
        controller,
        'multiple',
        'should maintain multiple refreshes',
        vscode.Uri.file(__filename),
        async run => {
            try {
                // Setup for test
                let cacheRefresh = new VertexCacheRefresh();
                mockHandler.reset();
                timerMock.clearAllTimers();
                global.setTimeout = timerMock.setTimeout.bind(timerMock) as any;
                console.error = () => {};

                const cacheId1 = cacheRefresh.scheduleRefresh(
                    mockHandler as unknown as VertexHandler,
                    "System 1",
                    "Context 1"
                );

                const cacheId2 = cacheRefresh.scheduleRefresh(
                    mockHandler as unknown as VertexHandler,
                    "System 2",
                    "Context 2"
                );

                assert.strictEqual(cacheRefresh.getActiveRefreshCount(), 2);

                timerMock.advanceTimersByTime(4 * 60 * 1000);

                const calls = mockHandler.getCalls();
                assert.ok(calls.some(call => call.systemPrompt === "System 1"));
                assert.ok(calls.some(call => call.systemPrompt === "System 2"));
            } finally {
                // Cleanup after test
                global.setTimeout = originalSetTimeout;
                console.error = originalConsoleError;
            }
        }
    )
);

// Stop tests
const stopTests = controller.createTestItem('stop', 'Stop Refresh', vscode.Uri.file(__filename));
vertexCacheRefreshTests.children.add(stopTests);

// Test for stopping specific refresh
stopTests.children.add(
    TestUtils.createTest(
        controller,
        'specific',
        'should stop specific refresh',
        vscode.Uri.file(__filename),
        async run => {
            try {
                // Setup for test
                let cacheRefresh = new VertexCacheRefresh();
                mockHandler.reset();
                timerMock.clearAllTimers();
                global.setTimeout = timerMock.setTimeout.bind(timerMock) as any;
                console.error = () => {};

                const cacheId = cacheRefresh.scheduleRefresh(
                    mockHandler as unknown as VertexHandler,
                    "System prompt",
                    "Test context"
                );

                cacheRefresh.stopRefresh(cacheId);

                timerMock.advanceTimersByTime(4 * 60 * 1000);

                assert.strictEqual(mockHandler.getCalls().length, 0);
                assert.strictEqual(cacheRefresh.isRefreshing(cacheId), false);
            } finally {
                // Cleanup after test
                global.setTimeout = originalSetTimeout;
                console.error = originalConsoleError;
            }
        }
    )
);

// Dispose tests
const disposeTests = controller.createTestItem('dispose', 'Dispose', vscode.Uri.file(__filename));
vertexCacheRefreshTests.children.add(disposeTests);

// Test for stopping all refreshes
disposeTests.children.add(
    TestUtils.createTest(
        controller,
        'all',
        'should stop all refreshes',
        vscode.Uri.file(__filename),
        async run => {
            try {
                // Setup for test
                let cacheRefresh = new VertexCacheRefresh();
                mockHandler.reset();
                timerMock.clearAllTimers();
                global.setTimeout = timerMock.setTimeout.bind(timerMock) as any;
                console.error = () => {};

                cacheRefresh.scheduleRefresh(
                    mockHandler as unknown as VertexHandler,
                    "System 1",
                    "Context 1"
                );

                cacheRefresh.scheduleRefresh(
                    mockHandler as unknown as VertexHandler,
                    "System 2",
                    "Context 2"
                );

                cacheRefresh.dispose();

                timerMock.advanceTimersByTime(4 * 60 * 1000);

                assert.strictEqual(mockHandler.getCalls().length, 0);
                assert.strictEqual(cacheRefresh.getActiveRefreshCount(), 0);
            } finally {
                // Cleanup after test
                global.setTimeout = originalSetTimeout;
                console.error = originalConsoleError;
            }
        }
    )
);

export function activate() {
    return controller;
}