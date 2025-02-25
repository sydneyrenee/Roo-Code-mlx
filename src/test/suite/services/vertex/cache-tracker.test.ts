import * as vscode from 'vscode'
import * as assert from 'assert'
import { VertexCacheTracker } from "../../../../services/vertex/cache-tracker"
import { ModelInfo } from "../../../../shared/api"

interface TokenUsage {
    input_tokens: number
    output_tokens: number
    cache_creation_input_tokens: number
    cache_read_input_tokens: number
}

export async function activateVertexCacheTrackerTests(context: vscode.ExtensionContext): Promise<void> {
    const testController = vscode.tests.createTestController('vertexCacheTrackerTests', 'Vertex Cache Tracker Tests')
    context.subscriptions.push(testController)

    const rootSuite = testController.createTestItem('vertexCacheTracker', 'Vertex Cache Tracker')
    testController.items.add(rootSuite)

    const mockModel: ModelInfo = {
        maxTokens: 8192,
        contextWindow: 200_000,
        supportsImages: true,
        supportsPromptCache: true,
        inputPrice: 3.0,
        outputPrice: 15.0,
        cacheWritesPrice: 3.75,  // $3.0 + 25%
        cacheReadsPrice: 0.30    // $3.0 - 90%
    }

    testController.createRunProfile('run', vscode.TestRunProfileKind.Run, async (request) => {
        const queue: vscode.TestItem[] = []

        if (request.include) {
            request.include.forEach(test => queue.push(test))
        }

        const run = testController.createTestRun(request)

        for (const test of queue) {
            run.started(test)

            try {
                const tracker = new VertexCacheTracker()

                switch (test.id) {
                    case 'track.initial': {
                        const usage: TokenUsage = {
                            input_tokens: 100,
                            output_tokens: 50,
                            cache_creation_input_tokens: 80,
                            cache_read_input_tokens: 0
                        }

                        tracker.trackUsage("request1", usage, mockModel)
                        const metrics = tracker.getMetrics("request1")

                        assert.ok(metrics, "Metrics should be defined")
                        assert.deepStrictEqual(metrics.metrics, {
                            creationTokens: 80,
                            readTokens: 0,
                            inputTokens: 100,
                            outputTokens: 50
                        })

                        assert.ok(metrics.costs)
                        assert.strictEqual(metrics.costs.cacheWrites, (80 / 1_000_000) * 3.75)
                        assert.strictEqual(metrics.costs.cacheReads, 0)
                        assert.strictEqual(metrics.costs.inputTokens, (100 / 1_000_000) * 3.0)
                        assert.strictEqual(metrics.costs.outputTokens, (50 / 1_000_000) * 15.0)
                        assert.ok(typeof metrics.costs.totalCost === 'number')
                        assert.ok(typeof metrics.costs.savings === 'number')
                        break
                    }

                    case 'track.hits': {
                        const usage: TokenUsage = {
                            input_tokens: 20,
                            output_tokens: 50,
                            cache_creation_input_tokens: 0,
                            cache_read_input_tokens: 80
                        }

                        tracker.trackUsage("request2", usage, mockModel)
                        const metrics = tracker.getMetrics("request2")

                        assert.ok(metrics, "Metrics should be defined")
                        assert.deepStrictEqual(metrics.metrics, {
                            creationTokens: 0,
                            readTokens: 80,
                            inputTokens: 20,
                            outputTokens: 50
                        })

                        const withoutCache = ((80 + 20) / 1_000_000) * mockModel.inputPrice!
                        const withCache = (80 / 1_000_000) * mockModel.cacheReadsPrice! + 
                                       (20 / 1_000_000) * mockModel.inputPrice!

                        assert.ok(metrics.costs)
                        assert.strictEqual(metrics.costs.cacheWrites, 0)
                        assert.strictEqual(metrics.costs.cacheReads, (80 / 1_000_000) * 0.30)
                        assert.strictEqual(metrics.costs.inputTokens, (20 / 1_000_000) * 3.0)
                        assert.strictEqual(metrics.costs.outputTokens, (50 / 1_000_000) * 15.0)
                        assert.strictEqual(metrics.costs.savings, withoutCache - withCache)
                        break
                    }

                    case 'track.concurrent': {
                        // First request with cache write
                        tracker.trackUsage("request5", {
                            input_tokens: 100,
                            output_tokens: 50,
                            cache_creation_input_tokens: 80,
                            cache_read_input_tokens: 0
                        }, mockModel)

                        // Second request with cache hit
                        tracker.trackUsage("request6", {
                            input_tokens: 20,
                            output_tokens: 50,
                            cache_creation_input_tokens: 0,
                            cache_read_input_tokens: 80
                        }, mockModel)

                        const metrics1 = tracker.getMetrics("request5")
                        const metrics2 = tracker.getMetrics("request6")

                        assert.ok(metrics1 && metrics2, "Both metrics should be defined")
                        assert.strictEqual(metrics1.metrics.creationTokens, 80)
                        assert.strictEqual(metrics1.metrics.readTokens, 0)
                        assert.strictEqual(metrics2.metrics.creationTokens, 0)
                        assert.strictEqual(metrics2.metrics.readTokens, 80)
                        break
                    }

                    case 'track.race': {
                        const promises = Array.from({ length: 100 }, (_, i) => {
                            return Promise.resolve().then(() => {
                                tracker.trackUsage(`request-${i}`, {
                                    input_tokens: i,
                                    output_tokens: i,
                                    cache_creation_input_tokens: i % 2 === 0 ? i : 0,
                                    cache_read_input_tokens: i % 2 === 1 ? i : 0
                                }, mockModel)
                            })
                        })

                        await Promise.all(promises)

                        for (let i = 0; i < 100; i++) {
                            const metrics = tracker.getMetrics(`request-${i}`)
                            assert.ok(metrics, `Metrics for request-${i} should exist`)
                            assert.strictEqual(metrics.metrics.inputTokens, i)
                            assert.strictEqual(metrics.metrics.outputTokens, i)
                            if (i % 2 === 0) {
                                assert.strictEqual(metrics.metrics.creationTokens, i)
                                assert.strictEqual(metrics.metrics.readTokens, 0)
                            } else {
                                assert.strictEqual(metrics.metrics.creationTokens, 0)
                                assert.strictEqual(metrics.metrics.readTokens, i)
                            }
                        }
                        break
                    }

                    case 'cleanup.basic': {
                        tracker.trackUsage("request8", {
                            input_tokens: 100,
                            output_tokens: 50,
                            cache_creation_input_tokens: 80,
                            cache_read_input_tokens: 0
                        }, mockModel)

                        tracker.cleanup()
                        assert.strictEqual(tracker.getMetrics("request8"), undefined)
                        break
                    }

                    case 'cleanup.concurrent': {
                        const trackPromises = Array.from({ length: 50 }, (_, i) => {
                            return Promise.resolve().then(() => {
                                tracker.trackUsage(`request-${i}`, {
                                    input_tokens: i,
                                    output_tokens: i,
                                    cache_creation_input_tokens: i,
                                    cache_read_input_tokens: 0
                                }, mockModel)
                            })
                        })

                        const cleanupPromises = Array.from({ length: 10 }, () => {
                            return Promise.resolve().then(() => {
                                tracker.cleanup()
                            })
                        })

                        await Promise.all([...trackPromises, ...cleanupPromises])

                        tracker.trackUsage("final-request", {
                            input_tokens: 100,
                            output_tokens: 50,
                            cache_creation_input_tokens: 80,
                            cache_read_input_tokens: 0
                        }, mockModel)

                        const metrics = tracker.getMetrics("final-request")
                        assert.ok(metrics, "Final metrics should exist")
                        assert.strictEqual(metrics.metrics.inputTokens, 100)
                        break
                    }
                }

                run.passed(test)
            } catch (err) {
                run.failed(test, new vscode.TestMessage(`Test failed: ${err}`))
            }
        }

        run.end()
    })

    // Track Usage tests
    const trackSuite = testController.createTestItem('track', 'Track Usage')
    rootSuite.children.add(trackSuite)

    trackSuite.children.add(testController.createTestItem(
        'track.initial',
        'should track initial cache write'
    ))

    trackSuite.children.add(testController.createTestItem(
        'track.hits',
        'should track cache hits'
    ))

    trackSuite.children.add(testController.createTestItem(
        'track.concurrent',
        'should track concurrent requests independently'
    ))

    trackSuite.children.add(testController.createTestItem(
        'track.race',
        'should handle race conditions in concurrent operations'
    ))

    // Cleanup tests
    const cleanupSuite = testController.createTestItem('cleanup', 'Cleanup')
    rootSuite.children.add(cleanupSuite)

    cleanupSuite.children.add(testController.createTestItem(
        'cleanup.basic',
        'should remove old metrics'
    ))

    cleanupSuite.children.add(testController.createTestItem(
        'cleanup.concurrent',
        'should handle cleanup during concurrent operations'
    ))
}