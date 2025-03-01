import * as vscode from 'vscode'
import * as assert from 'assert'
import { AwsBedrockHandler } from "../bedrock"
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime"
import { fromIni } from "@aws-sdk/credential-providers"

export async function activateBedrockTests(context: vscode.ExtensionContext): Promise<void> {
    const testController = vscode.tests.createTestController('bedrockTests', 'Bedrock Tests')
    context.subscriptions.push(testController)

    const rootSuite = testController.createTestItem('bedrock', 'Bedrock')
    testController.items.add(rootSuite)

    // Create test suites
    const handlerSuite = testController.createTestItem('handler', 'AwsBedrockHandler')
    rootSuite.children.add(handlerSuite)

    // Constructor tests
    handlerSuite.children.add(testController.createTestItem(
        'initialize-with-config',
        'should initialize with provided config'
    ))
    handlerSuite.children.add(testController.createTestItem(
        'initialize-missing-credentials',
        'should initialize with missing AWS credentials'
    ))
    handlerSuite.children.add(testController.createTestItem(
        'initialize-with-profile',
        'should initialize with AWS profile credentials'
    ))
    handlerSuite.children.add(testController.createTestItem(
        'initialize-without-profile',
        'should initialize with AWS profile enabled but no profile set'
    ))

    // Client configuration tests
    handlerSuite.children.add(testController.createTestItem(
        'profile-credentials',
        'should configure client with profile credentials when profile mode is enabled'
    ))

    // Create Message tests
    handlerSuite.children.add(testController.createTestItem(
        'handle-text-messages',
        'should handle text messages correctly'
    ))
    handlerSuite.children.add(testController.createTestItem(
        'handle-api-errors',
        'should handle API errors'
    ))

    // Complete Prompt tests
    handlerSuite.children.add(testController.createTestItem(
        'complete-prompt',
        'should complete prompt successfully'
    ))
    handlerSuite.children.add(testController.createTestItem(
        'handle-prompt-errors',
        'should handle API errors in prompt completion'
    ))
    handlerSuite.children.add(testController.createTestItem(
        'handle-invalid-response',
        'should handle invalid response format'
    ))
    handlerSuite.children.add(testController.createTestItem(
        'handle-empty-response',
        'should handle empty response'
    ))
    handlerSuite.children.add(testController.createTestItem(
        'handle-cross-region',
        'should handle cross-region inference'
    ))

    // Model info tests
    handlerSuite.children.add(testController.createTestItem(
        'get-model-info',
        'should return correct model info in test environment'
    ))
    handlerSuite.children.add(testController.createTestItem(
        'get-invalid-model-info',
        'should return test model info for invalid model in test environment'
    ))

    // Create run profile
    testController.createRunProfile('run', vscode.TestRunProfileKind.Run, async (request) => {
        const queue: vscode.TestItem[] = []
        if (request.include) {
            request.include.forEach(test => queue.push(test))
        }

        const run = testController.createTestRun(request)

        // Store original fromIni for cleanup
        const originalFromIni = (global as any).fromIni

        for (const test of queue) {
            run.started(test)
            try {
                switch (test.id) {
                    case 'initialize-with-config': {
                        const handler = new AwsBedrockHandler({
                            apiModelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
                            awsAccessKey: "test-access-key",
                            awsSecretKey: "test-secret-key",
                            awsRegion: "us-east-1",
                        })
                        assert.strictEqual(handler["options"].awsAccessKey, "test-access-key")
                        assert.strictEqual(handler["options"].awsSecretKey, "test-secret-key")
                        assert.strictEqual(handler["options"].awsRegion, "us-east-1")
                        assert.strictEqual(handler["options"].apiModelId, "anthropic.claude-3-5-sonnet-20241022-v2:0")
                        break
                    }

                    case 'initialize-missing-credentials': {
                        const handlerWithoutCreds = new AwsBedrockHandler({
                            apiModelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
                            awsRegion: "us-east-1",
                        })
                        assert.ok(handlerWithoutCreds instanceof AwsBedrockHandler)
                        break
                    }

                    case 'initialize-with-profile': {
                        const handlerWithProfile = new AwsBedrockHandler({
                            apiModelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
                            awsRegion: "us-east-1",
                            awsUseProfile: true,
                            awsProfile: "test-profile",
                        })
                        assert.ok(handlerWithProfile instanceof AwsBedrockHandler)
                        assert.strictEqual(handlerWithProfile["options"].awsUseProfile, true)
                        assert.strictEqual(handlerWithProfile["options"].awsProfile, "test-profile")
                        break
                    }

                    case 'initialize-without-profile': {
                        const handlerWithoutProfile = new AwsBedrockHandler({
                            apiModelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
                            awsRegion: "us-east-1",
                            awsUseProfile: true,
                        })
                        assert.ok(handlerWithoutProfile instanceof AwsBedrockHandler)
                        assert.strictEqual(handlerWithoutProfile["options"].awsUseProfile, true)
                        assert.strictEqual(handlerWithoutProfile["options"].awsProfile, undefined)
                        break
                    }

                    case 'profile-credentials': {
                        const handlerWithProfile = new AwsBedrockHandler({
                            apiModelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
                            awsRegion: "us-east-1",
                            awsUseProfile: true,
                            awsProfile: "test-profile",
                        })

                        // Mock fromIni to return test credentials
                        const mockCredentials = {
                            credentials: {
                                accessKeyId: "profile-access-key",
                                secretAccessKey: "profile-secret-key",
                            }
                        }
                        ;(global as any).fromIni = () => mockCredentials

                        const mockResponse = {
                            output: new TextEncoder().encode(JSON.stringify({ content: "test" })),
                        }
                        const mockSend = async () => mockResponse
                        ;(handlerWithProfile as any).client = {
                            send: mockSend,
                        } as unknown as BedrockRuntimeClient

                        const result = await handlerWithProfile.completePrompt("test")
                        assert.strictEqual(result, "test")
                        break
                    }

                    case 'handle-text-messages': {
                        const handler = new AwsBedrockHandler({
                            apiModelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
                            awsAccessKey: "test-access-key",
                            awsSecretKey: "test-secret-key",
                            awsRegion: "us-east-1",
                        })

                        const mockStream = {
                            [Symbol.asyncIterator]: async function* () {
                                yield {
                                    metadata: {
                                        usage: {
                                            inputTokens: 10,
                                            outputTokens: 5,
                                        },
                                    },
                                }
                            },
                        }
                        const mockSend = async () => ({ stream: mockStream })
                        handler["client"] = {
                            send: mockSend,
                        } as unknown as BedrockRuntimeClient

                        const stream = handler.createMessage("system prompt", [
                            { role: "user", content: "Hello" },
                            { role: "assistant", content: "Hi there!" },
                        ])

                        const chunks = []
                        for await (const chunk of stream) {
                            chunks.push(chunk)
                        }

                        assert.ok(chunks.length > 0)
                        assert.deepStrictEqual(chunks[0], {
                            type: "usage",
                            inputTokens: 10,
                            outputTokens: 5,
                        })
                        break
                    }

                    case 'handle-api-errors': {
                        const handler = new AwsBedrockHandler({
                            apiModelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
                            awsAccessKey: "test-access-key",
                            awsSecretKey: "test-secret-key",
                            awsRegion: "us-east-1",
                        })

                        const mockSend = async () => { throw new Error("AWS Bedrock error") }
                        handler["client"] = {
                            send: mockSend,
                        } as unknown as BedrockRuntimeClient

                        const stream = handler.createMessage("system prompt", [
                            { role: "user", content: "Hello" }
                        ])

                        await assert.rejects(async () => {
                            for await (const chunk of stream) {
                                // Should throw before yielding any chunks
                            }
                        }, /AWS Bedrock error/)
                        break
                    }

                    case 'complete-prompt': {
                        const handler = new AwsBedrockHandler({
                            apiModelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
                            awsAccessKey: "test-access-key",
                            awsSecretKey: "test-secret-key",
                            awsRegion: "us-east-1",
                        })

                        const mockResponse = {
                            output: new TextEncoder().encode(JSON.stringify({ content: "Test response" })),
                        }
                        const mockSend = async () => mockResponse
                        handler["client"] = {
                            send: mockSend,
                        } as unknown as BedrockRuntimeClient

                        const result = await handler.completePrompt("Test prompt")
                        assert.strictEqual(result, "Test response")
                        break
                    }

                    case 'handle-prompt-errors': {
                        const handler = new AwsBedrockHandler({
                            apiModelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
                            awsAccessKey: "test-access-key",
                            awsSecretKey: "test-secret-key",
                            awsRegion: "us-east-1",
                        })

                        const mockSend = async () => { throw new Error("AWS Bedrock error") }
                        handler["client"] = {
                            send: mockSend,
                        } as unknown as BedrockRuntimeClient

                        await assert.rejects(
                            () => handler.completePrompt("Test prompt"),
                            /Bedrock completion error: AWS Bedrock error/
                        )
                        break
                    }

                    case 'handle-invalid-response': {
                        const handler = new AwsBedrockHandler({
                            apiModelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
                            awsAccessKey: "test-access-key",
                            awsSecretKey: "test-secret-key",
                            awsRegion: "us-east-1",
                        })

                        const mockResponse = {
                            output: new TextEncoder().encode("invalid json"),
                        }
                        const mockSend = async () => mockResponse
                        handler["client"] = {
                            send: mockSend,
                        } as unknown as BedrockRuntimeClient

                        const result = await handler.completePrompt("Test prompt")
                        assert.strictEqual(result, "")
                        break
                    }

                    case 'handle-empty-response': {
                        const handler = new AwsBedrockHandler({
                            apiModelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
                            awsAccessKey: "test-access-key",
                            awsSecretKey: "test-secret-key",
                            awsRegion: "us-east-1",
                        })

                        const mockResponse = {
                            output: new TextEncoder().encode(JSON.stringify({})),
                        }
                        const mockSend = async () => mockResponse
                        handler["client"] = {
                            send: mockSend,
                        } as unknown as BedrockRuntimeClient

                        const result = await handler.completePrompt("Test prompt")
                        assert.strictEqual(result, "")
                        break
                    }

                    case 'handle-cross-region': {
                        const handler = new AwsBedrockHandler({
                            apiModelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
                            awsAccessKey: "test-access-key",
                            awsSecretKey: "test-secret-key",
                            awsRegion: "us-east-1",
                            awsUseCrossRegionInference: true,
                        })

                        const mockResponse = {
                            output: new TextEncoder().encode(JSON.stringify({ content: "Test response" })),
                        }
                        const mockSend = async () => mockResponse
                        handler["client"] = {
                            send: mockSend,
                        } as unknown as BedrockRuntimeClient

                        const result = await handler.completePrompt("Test prompt")
                        assert.strictEqual(result, "Test response")
                        break
                    }

                    case 'get-model-info': {
                        const handler = new AwsBedrockHandler({
                            apiModelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
                            awsAccessKey: "test-access-key",
                            awsSecretKey: "test-secret-key",
                            awsRegion: "us-east-1",
                        })

                        const modelInfo = handler.getModel()
                        assert.strictEqual(modelInfo.id, "anthropic.claude-3-5-sonnet-20241022-v2:0")
                        assert.ok(modelInfo.info)
                        assert.strictEqual(modelInfo.info.maxTokens, 5000)
                        assert.strictEqual(modelInfo.info.contextWindow, 128_000)
                        break
                    }

                    case 'get-invalid-model-info': {
                        const handler = new AwsBedrockHandler({
                            apiModelId: "invalid-model",
                            awsAccessKey: "test-access-key",
                            awsSecretKey: "test-secret-key",
                            awsRegion: "us-east-1",
                        })

                        const modelInfo = handler.getModel()
                        assert.strictEqual(modelInfo.id, "invalid-model")
                        assert.strictEqual(modelInfo.info.maxTokens, 5000)
                        assert.strictEqual(modelInfo.info.contextWindow, 128_000)
                        break
                    }
                }
                run.passed(test)
            } catch (err) {
                run.failed(test, new vscode.TestMessage(err instanceof Error ? err.message : String(err)))
            }
        }

        // Restore original fromIni
        (global as any).fromIni = originalFromIni

        run.end()
    })
}
