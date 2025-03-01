import * as vscode from 'vscode';
import * as assert from 'assert';
import { VertexCacheTracker } from "../../../../services/vertex/cache-tracker";
import { ModelInfo } from "../../../../shared/api";
import { createTestController } from '../../testController';
import { TestUtils } from '../../../testUtils';

interface TokenUsage {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens: number;
    cache_read_input_tokens: number;
}

const controller = createTestController('vertexCacheTrackerTests', 'Vertex Cache Tracker Tests');

// Root test item for Vertex Cache Tracker
const vertexCacheTrackerTests = controller.createTestItem('vertexCacheTracker', 'Vertex Cache Tracker', vscode.Uri.file(__filename));
controller.items.add(vertexCacheTrackerTests);

// Mock model info
const mockModel: ModelInfo = {
    maxTokens: 8192,
    contextWindow: 200_000,
    supportsImages: true,
    supportsPromptCache: true,
    inputPrice: 3.0,
    outputPrice: 15.0,
    cacheWritesPrice: 3.75,  // $3.0 + 25%
    cacheReadsPrice: 0.30    // $3.0 - 90%
};

// Track Usage tests
const trackTests = controller.createTestItem('track', 'Track Usage', vscode.Uri.file(__filename));
vertexCacheTrackerTests.children.add(trackTests);

// Test for tracking initial cache write
trackTests.children.add(
    TestUtils.createTest(
        controller,
        'initial',
        'should track initial cache write',
        vscode.Uri.file(__filename),
        async run => {
            const tracker = new VertexCacheTracker();
            
            const usage: TokenUsage = {
                input_tokens: 100,
                output_tokens: 50,
                cache_creation_input_tokens: 80,
                cache_read_input_tokens: 0
            };

            tracker.trackUsage("request1", usage, mockModel);
            const metrics = tracker.getMetrics("request1");

            assert.ok(metrics, "Metrics should be defined");
            assert.deepStrictEqual(metrics.metrics, {
                creationTokens: 80,
                readTokens: 0,
                inputTokens: 100,
                outputTokens: 50
            });

            assert.ok(metrics.costs);
            assert.strictEqual(metrics.costs.cacheWrites, (80 / 1_000_000) * 3.75);
            assert.strictEqual(metrics.costs.cacheReads, 0);
            assert.strictEqual(metrics.costs.inputTokens, (100 / 1_000_000) * 3.0);
            assert.strictEqual(metrics.costs.outputTokens, (50 / 1_000_000) * 15.0);
            assert.ok(typeof metrics.costs.totalCost === 'number');
            assert.ok(typeof metrics.costs.savings === 'number');
        }
    )
);

// Test for tracking cache hits
trackTests.children.add(
    TestUtils.createTest(
        controller,
        'hits',
        'should track cache hits',
        vscode.Uri.file(__filename),
        async run => {
            const tracker = new VertexCacheTracker();
            
            const usage: TokenUsage = {
                input_tokens: 20,
                output_tokens: 50,
                cache_creation_input_tokens: 0,
                cache_read_input_tokens: 80
            };

            tracker.trackUsage("request2", usage, mockModel);
            const metrics = tracker.getMetrics("request2");

            assert.ok(metrics, "Metrics should be defined");
            assert.deepStrictEqual(metrics.metrics, {
                creationTokens: 0,
                readTokens: 80,
                inputTokens: 20,
                outputTokens: 50
            });

            const withoutCache = ((80 + 20) / 1_000_000) * mockModel.inputPrice!;
            const withCache = (80 / 1_000_000) * mockModel.cacheReadsPrice! + 
                           (20 / 1_000_000) * mockModel.inputPrice!;

            assert.ok(metrics.costs);
            assert.strictEqual(metrics.costs.cacheWrites, 0);
            assert.strictEqual(metrics.costs.cacheReads, (80 / 1_000_000) * 0.30);
            assert.strictEqual(metrics.costs.inputTokens, (20 / 1_000_000) * 3.0);
            assert.strictEqual(metrics.costs.outputTokens, (50 / 1_000_000) * 15.0);
            assert.strictEqual(metrics.costs.savings, withoutCache - withCache);
        }
    )
);

// Test for tracking concurrent requests independently
trackTests.children.add(
    TestUtils.createTest(
        controller,
        'concurrent',
        'should track concurrent requests independently',
        vscode.Uri.file(__filename),
        async run => {
            const tracker = new VertexCacheTracker();
            
            // First request with cache write
            tracker.trackUsage("request5", {
                input_tokens: 100,
                output_tokens: 50,
                cache_creation_input_tokens: 80,
                cache_read_input_tokens: 0
            }, mockModel);

            // Second request with cache hit
            tracker.trackUsage("request6", {
                input_tokens: 20,
                output_tokens: 50,
                cache_creation_input_tokens: 0,
                cache_read_input_tokens: 80
            }, mockModel);

            const metrics1 = tracker.getMetrics("request5");
            const metrics2 = tracker.getMetrics("request6");

            assert.ok(metrics1 && metrics2, "Both metrics should be defined");
            assert.strictEqual(metrics1.metrics.creationTokens, 80);
            assert.strictEqual(metrics1.metrics.readTokens, 0);
            assert.strictEqual(metrics2.metrics.creationTokens, 0);
            assert.strictEqual(metrics2.metrics.readTokens, 80);
        }
    )
);

// Test for handling race conditions in concurrent operations
trackTests.children.add(
    TestUtils.createTest(
        controller,
        'race',
        'should handle race conditions in concurrent operations',
        vscode.Uri.file(__filename),
        async run => {
            const tracker = new VertexCacheTracker();
            
            const promises = Array.from({ length: 100 }, (_, i) => {
                return Promise.resolve().then(() => {
                    tracker.trackUsage(`request-${i}`, {
                        input_tokens: i,
                        output_tokens: i,
                        cache_creation_input_tokens: i % 2 === 0 ? i : 0,
                        cache_read_input_tokens: i % 2 === 1 ? i : 0
                    }, mockModel);
                });
            });

            await Promise.all(promises);

            for (let i = 0; i < 100; i++) {
                const metrics = tracker.getMetrics(`request-${i}`);
                assert.ok(metrics, `Metrics for request-${i} should exist`);
                assert.strictEqual(metrics.metrics.inputTokens, i);
                assert.strictEqual(metrics.metrics.outputTokens, i);
                if (i % 2 === 0) {
                    assert.strictEqual(metrics.metrics.creationTokens, i);
                    assert.strictEqual(metrics.metrics.readTokens, 0);
                } else {
                    assert.strictEqual(metrics.metrics.creationTokens, 0);
                    assert.strictEqual(metrics.metrics.readTokens, i);
                }
            }
        }
    )
);

// Cleanup tests
const cleanupTests = controller.createTestItem('cleanup', 'Cleanup', vscode.Uri.file(__filename));
vertexCacheTrackerTests.children.add(cleanupTests);

// Test for removing old metrics
cleanupTests.children.add(
    TestUtils.createTest(
        controller,
        'basic',
        'should remove old metrics',
        vscode.Uri.file(__filename),
        async run => {
            const tracker = new VertexCacheTracker();
            
            tracker.trackUsage("request8", {
                input_tokens: 100,
                output_tokens: 50,
                cache_creation_input_tokens: 80,
                cache_read_input_tokens: 0
            }, mockModel);

            tracker.cleanup();
            assert.strictEqual(tracker.getMetrics("request8"), undefined);
        }
    )
);

// Test for handling cleanup during concurrent operations
cleanupTests.children.add(
    TestUtils.createTest(
        controller,
        'concurrent',
        'should handle cleanup during concurrent operations',
        vscode.Uri.file(__filename),
        async run => {
            const tracker = new VertexCacheTracker();
            
            const trackPromises = Array.from({ length: 50 }, (_, i) => {
                return Promise.resolve().then(() => {
                    tracker.trackUsage(`request-${i}`, {
                        input_tokens: i,
                        output_tokens: i,
                        cache_creation_input_tokens: i,
                        cache_read_input_tokens: 0
                    }, mockModel);
                });
            });

            const cleanupPromises = Array.from({ length: 10 }, () => {
                return Promise.resolve().then(() => {
                    tracker.cleanup();
                });
            });

            await Promise.all([...trackPromises, ...cleanupPromises]);

            tracker.trackUsage("final-request", {
                input_tokens: 100,
                output_tokens: 50,
                cache_creation_input_tokens: 80,
                cache_read_input_tokens: 0
            }, mockModel);

            const metrics = tracker.getMetrics("final-request");
            assert.ok(metrics, "Final metrics should exist");
            assert.strictEqual(metrics.metrics.inputTokens, 100);
        }
    )
);

export function activate() {
    return controller;
}