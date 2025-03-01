import * as vscode from 'vscode'
import * as assert from 'assert'
import { calculateApiCost } from '../cost'
import { ModelInfo } from '../../shared/api'

export async function activateCostTests(context: vscode.ExtensionContext): Promise<void> {
    const testController = vscode.tests.createTestController('costTests', 'Cost Utility Tests')
    context.subscriptions.push(testController)

    // Root test suite
    const rootSuite = testController.createTestItem('cost-utils', 'Cost Utilities')
    testController.items.add(rootSuite)

    // Test suites
    const calculateCostSuite = testController.createTestItem('calculate-cost', 'calculateApiCost')
    rootSuite.children.add(calculateCostSuite)

    // Create run profile
    testController.createRunProfile('run', vscode.TestRunProfileKind.Run, async (request) => {
        const queue: vscode.TestItem[] = []
        if (request.include) {
            request.include.forEach(test => queue.push(test))
        }

        const run = testController.createTestRun(request)

        const mockModelInfo: ModelInfo = {
            maxTokens: 8192,
            contextWindow: 200_000,
            supportsPromptCache: true,
            inputPrice: 3.0, // $3 per million tokens
            outputPrice: 15.0, // $15 per million tokens
            cacheWritesPrice: 3.75, // $3.75 per million tokens
            cacheReadsPrice: 0.3, // $0.30 per million tokens
        }

        for (const test of queue) {
            run.started(test)
            try {
                switch (test.id) {
                    case 'basic-cost': {
                        const cost = calculateApiCost(mockModelInfo, 1000, 500)
                        // Input cost: (3.0 / 1_000_000) * 1000 = 0.003
                        // Output cost: (15.0 / 1_000_000) * 500 = 0.0075
                        // Total: 0.003 + 0.0075 = 0.0105
                        assert.strictEqual(cost, 0.0105)
                        break
                    }

                    case 'cache-writes': {
                        const cost = calculateApiCost(mockModelInfo, 1000, 500, 2000)
                        // Input cost: (3.0 / 1_000_000) * 1000 = 0.003
                        // Output cost: (15.0 / 1_000_000) * 500 = 0.0075
                        // Cache writes: (3.75 / 1_000_000) * 2000 = 0.0075
                        // Total: 0.003 + 0.0075 + 0.0075 = 0.018
                        const expectedCost = 0.018
                        const delta = Math.abs(cost - expectedCost)
                        assert.ok(delta < 0.000001, `Cost ${cost} should be close to ${expectedCost}`)
                        break
                    }

                    case 'cache-reads': {
                        const cost = calculateApiCost(mockModelInfo, 1000, 500, undefined, 3000)
                        // Input cost: (3.0 / 1_000_000) * 1000 = 0.003
                        // Output cost: (15.0 / 1_000_000) * 500 = 0.0075
                        // Cache reads: (0.3 / 1_000_000) * 3000 = 0.0009
                        // Total: 0.003 + 0.0075 + 0.0009 = 0.0114
                        assert.strictEqual(cost, 0.0114)
                        break
                    }

                    case 'all-components': {
                        const cost = calculateApiCost(mockModelInfo, 1000, 500, 2000, 3000)
                        // Input cost: (3.0 / 1_000_000) * 1000 = 0.003
                        // Output cost: (15.0 / 1_000_000) * 500 = 0.0075
                        // Cache writes: (3.75 / 1_000_000) * 2000 = 0.0075
                        // Cache reads: (0.3 / 1_000_000) * 3000 = 0.0009
                        // Total: 0.003 + 0.0075 + 0.0075 + 0.0009 = 0.0189
                        assert.strictEqual(cost, 0.0189)
                        break
                    }

                    case 'missing-prices': {
                        const modelWithoutPrices: ModelInfo = {
                            maxTokens: 8192,
                            contextWindow: 200_000,
                            supportsPromptCache: true,
                        }
                        const cost = calculateApiCost(modelWithoutPrices, 1000, 500, 2000, 3000)
                        assert.strictEqual(cost, 0)
                        break
                    }

                    case 'zero-tokens': {
                        const cost = calculateApiCost(mockModelInfo, 0, 0, 0, 0)
                        assert.strictEqual(cost, 0)
                        break
                    }

                    case 'undefined-cache': {
                        const cost = calculateApiCost(mockModelInfo, 1000, 500)
                        // Input cost: (3.0 / 1_000_000) * 1000 = 0.003
                        // Output cost: (15.0 / 1_000_000) * 500 = 0.0075
                        // Total: 0.003 + 0.0075 = 0.0105
                        assert.strictEqual(cost, 0.0105)
                        break
                    }

                    case 'missing-cache-prices': {
                        const modelWithoutCachePrices: ModelInfo = {
                            ...mockModelInfo,
                            cacheWritesPrice: undefined,
                            cacheReadsPrice: undefined,
                        }
                        const cost = calculateApiCost(modelWithoutCachePrices, 1000, 500, 2000, 3000)
                        // Should only include input and output costs
                        // Input cost: (3.0 / 1_000_000) * 1000 = 0.003
                        // Output cost: (15.0 / 1_000_000) * 500 = 0.0075
                        // Total: 0.003 + 0.0075 = 0.0105
                        assert.strictEqual(cost, 0.0105)
                        break
                    }
                }
                run.passed(test)
            } catch (err) {
                run.failed(test, new vscode.TestMessage(err instanceof Error ? err.message : String(err)))
            }
        }
        run.end()
    })

    // Add test cases
    calculateCostSuite.children.add(testController.createTestItem(
        'basic-cost',
        'should calculate basic input/output costs correctly'
    ))
    
    calculateCostSuite.children.add(testController.createTestItem(
        'cache-writes',
        'should handle cache writes cost'
    ))
    
    calculateCostSuite.children.add(testController.createTestItem(
        'cache-reads',
        'should handle cache reads cost'
    ))
    
    calculateCostSuite.children.add(testController.createTestItem(
        'all-components',
        'should handle all cost components together'
    ))
    
    calculateCostSuite.children.add(testController.createTestItem(
        'missing-prices',
        'should handle missing prices gracefully'
    ))
    
    calculateCostSuite.children.add(testController.createTestItem(
        'zero-tokens',
        'should handle zero tokens'
    ))
    
    calculateCostSuite.children.add(testController.createTestItem(
        'undefined-cache',
        'should handle undefined cache values'
    ))
    
    calculateCostSuite.children.add(testController.createTestItem(
        'missing-cache-prices',
        'should handle missing cache prices'
    ))
}
