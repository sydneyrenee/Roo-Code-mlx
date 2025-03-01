import * as vscode from 'vscode'
import * as assert from 'assert'
import { singleCompletionHandler } from '../single-completion-handler'
import { buildApiHandler } from '../../api'
import { supportPrompt } from '../../shared/support-prompt'

export async function activateEnhancePromptTests(context: vscode.ExtensionContext): Promise<void> {
    const testController = vscode.tests.createTestController('enhancePromptTests', 'Enhance Prompt Tests')
    context.subscriptions.push(testController)

    // Root test suite
    const rootSuite = testController.createTestItem('enhance-prompt', 'Enhance Prompt')
    testController.items.add(rootSuite)

    // Create run profile
    testController.createRunProfile('run', vscode.TestRunProfileKind.Run, async (request) => {
        const queue: vscode.TestItem[] = []
        if (request.include) {
            request.include.forEach(test => queue.push(test))
        }

        const run = testController.createTestRun(request)

        const mockApiConfig = {
            apiProvider: 'openai',
            openAiApiKey: 'test-key',
            openAiBaseUrl: 'https://api.openai.com/v1'
        }

        // Store original buildApiHandler
        const originalBuildApiHandler = buildApiHandler

        for (const test of queue) {
            run.started(test)
            try {
                // Reset mocks before each test
                const mockApiHandler = {
                    completePrompt: async () => 'Enhanced prompt',
                    createMessage: () => {},
                    getModel: () => ({
                        id: 'test-model',
                        info: {
                            maxTokens: 4096,
                            contextWindow: 8192,
                            supportsPromptCache: false
                        }
                    })
                }

                // @ts-ignore - Mock implementation
                buildApiHandler.mockImplementation(() => mockApiHandler)

                switch (test.id) {
                    case 'default-enhancement': {
                        const result = await singleCompletionHandler(mockApiConfig, 'Test prompt')
                        assert.strictEqual(result, 'Enhanced prompt')
                        
                        const handler = buildApiHandler(mockApiConfig)
                        assert.strictEqual(handler.completePrompt.mock.calls[0][0], 'Test prompt')
                        break
                    }

                    case 'custom-enhancement': {
                        const customEnhancePrompt = 'You are a custom prompt enhancer'
                        const customEnhancePromptWithTemplate = customEnhancePrompt + '\\n\\n${userInput}'
                        
                        const result = await singleCompletionHandler(
                            mockApiConfig,
                            supportPrompt.create('ENHANCE', {
                                userInput: 'Test prompt'
                            }, {
                                ENHANCE: customEnhancePromptWithTemplate
                            })
                        )

                        assert.strictEqual(result, 'Enhanced prompt')
                        
                        const handler = buildApiHandler(mockApiConfig)
                        assert.strictEqual(
                            handler.completePrompt.mock.calls[0][0],
                            `${customEnhancePrompt}\\n\\nTest prompt`
                        )
                        break
                    }

                    case 'empty-prompt': {
                        await assert.rejects(
                            () => singleCompletionHandler(mockApiConfig, ''),
                            /No prompt text provided/
                        )
                        break
                    }

                    case 'missing-config': {
                        await assert.rejects(
                            () => singleCompletionHandler({}, 'Test prompt'),
                            /No valid API configuration provided/
                        )
                        break
                    }

                    case 'unsupported-provider': {
                        // @ts-ignore - Mock implementation
                        buildApiHandler.mockImplementation(() => ({
                            createMessage: () => {},
                            getModel: () => ({
                                id: 'test-model',
                                info: {
                                    maxTokens: 4096,
                                    contextWindow: 8192,
                                    supportsPromptCache: false
                                }
                            })
                        }))

                        await assert.rejects(
                            () => singleCompletionHandler(mockApiConfig, 'Test prompt'),
                            /The selected API provider does not support prompt enhancement/
                        )
                        break
                    }

                    case 'model-by-provider': {
                        const openRouterConfig = {
                            apiProvider: 'openrouter',
                            openRouterApiKey: 'test-key',
                            openRouterModelId: 'test-model'
                        }

                        const result = await singleCompletionHandler(openRouterConfig, 'Test prompt')
                        
                        assert.strictEqual(result, 'Enhanced prompt')
                        assert.ok(buildApiHandler.mock.calls[0][0] === openRouterConfig)
                        break
                    }

                    case 'api-error': {
                        // @ts-ignore - Mock implementation
                        buildApiHandler.mockImplementation(() => ({
                            completePrompt: () => Promise.reject(new Error('API Error')),
                            createMessage: () => {},
                            getModel: () => ({
                                id: 'test-model',
                                info: {
                                    maxTokens: 4096,
                                    contextWindow: 8192,
                                    supportsPromptCache: false
                                }
                            })
                        }))

                        await assert.rejects(
                            () => singleCompletionHandler(mockApiConfig, 'Test prompt'),
                            /API Error/
                        )
                        break
                    }
                }
                run.passed(test)
            } catch (err) {
                run.failed(test, new vscode.TestMessage(err instanceof Error ? err.message : String(err)))
            } finally {
                // Restore original buildApiHandler
                Object.assign(buildApiHandler, originalBuildApiHandler)
            }
        }
        run.end()
    })

    // Add test cases
    rootSuite.children.add(testController.createTestItem(
        'default-enhancement',
        'enhances prompt using default enhancement prompt when no custom prompt provided'
    ))
    
    rootSuite.children.add(testController.createTestItem(
        'custom-enhancement',
        'enhances prompt using custom enhancement prompt when provided'
    ))
    
    rootSuite.children.add(testController.createTestItem(
        'empty-prompt',
        'throws error for empty prompt input'
    ))
    
    rootSuite.children.add(testController.createTestItem(
        'missing-config',
        'throws error for missing API configuration'
    ))
    
    rootSuite.children.add(testController.createTestItem(
        'unsupported-provider',
        'throws error for API provider that does not support prompt enhancement'
    ))
    
    rootSuite.children.add(testController.createTestItem(
        'model-by-provider',
        'uses appropriate model based on provider'
    ))
    
    rootSuite.children.add(testController.createTestItem(
        'api-error',
        'propagates API errors'
    ))
}
