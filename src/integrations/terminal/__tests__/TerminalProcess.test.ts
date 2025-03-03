import * as vscode from "vscode"
import * as assert from "assert"
import { TerminalProcess, mergePromise } from "../TerminalProcess"
import { EventEmitter } from "events"

export async function activateTerminalProcessTests(context: vscode.ExtensionContext): Promise<void> {
    const testController = vscode.tests.createTestController('terminalProcessTests', 'Terminal Process Tests')
    context.subscriptions.push(testController)

    const rootSuite = testController.createTestItem('terminal-process', 'Terminal Process')
    testController.items.add(rootSuite)

    // Create test suites
    const runSuite = testController.createTestItem('run', 'run')
    const bufferSuite = testController.createTestItem('buffer', 'Buffer Processing')
    const artifactsSuite = testController.createTestItem('artifacts', 'Remove Artifacts')
    const continueSuite = testController.createTestItem('continue', 'Continue')
    const outputSuite = testController.createTestItem('output', 'Unretrieved Output')
    const mergeSuite = testController.createTestItem('merge', 'Merge Promise')

    rootSuite.children.add(runSuite)
    rootSuite.children.add(bufferSuite)
    rootSuite.children.add(artifactsSuite)
    rootSuite.children.add(continueSuite)
    rootSuite.children.add(outputSuite)
    rootSuite.children.add(mergeSuite)

    // Add test cases
    runSuite.children.add(testController.createTestItem(
        'shell-integration',
        'handles shell integration commands correctly'
    ))
    runSuite.children.add(testController.createTestItem(
        'no-shell-integration',
        'handles terminals without shell integration'
    ))
    runSuite.children.add(testController.createTestItem(
        'hot-state',
        'sets hot state for compiling commands'
    ))

    bufferSuite.children.add(testController.createTestItem(
        'process-lines',
        'correctly processes and emits lines'
    ))
    bufferSuite.children.add(testController.createTestItem(
        'windows-line-endings',
        'handles Windows-style line endings'
    ))

    artifactsSuite.children.add(testController.createTestItem(
        'remove-artifacts',
        'removes terminal artifacts from output'
    ))

    continueSuite.children.add(testController.createTestItem(
        'continue-event',
        'stops listening and emits continue event'
    ))

    outputSuite.children.add(testController.createTestItem(
        'unretrieved-output',
        'returns and clears unretrieved output'
    ))

    mergeSuite.children.add(testController.createTestItem(
        'merge-promise',
        'merges promise methods with terminal process'
    ))

    // Create run profile
    testController.createRunProfile('run', vscode.TestRunProfileKind.Run, async (request) => {
        const queue: vscode.TestItem[] = []
        if (request.include) {
            request.include.forEach(test => queue.push(test))
        }

        const run = testController.createTestRun(request)

        for (const test of queue) {
            run.started(test)
            try {
                switch (test.id) {
                    case 'shell-integration': {
                        const terminalProcess = new TerminalProcess()
                        const lines: string[] = []
                        
                        terminalProcess.on("line", (line) => {
                            // Skip empty lines used for loading spinner
                            if (line !== "") {
                                lines.push(line)
                            }
                        })
                        
                        // Mock stream data with shell integration sequences
                        const mockStream = (async function* () {
                            // The first chunk contains the command start sequence
                            yield "Initial output\n"
                            yield "More output\n"
                            // The last chunk contains the command end sequence
                            yield "Final output"
                        })()
                        
                        const mockExecution = {
                            read: () => mockStream,
                        }
                        
                        const mockTerminal = {
                            shellIntegration: {
                                executeCommand: () => mockExecution,
                            },
                            name: "Mock Terminal",
                            processId: Promise.resolve(123),
                            creationOptions: {},
                            exitStatus: undefined,
                            state: { isInteractedWith: true },
                            dispose: () => {},
                            hide: () => {},
                            show: () => {},
                            sendText: () => {},
                        } as unknown as vscode.Terminal & {
                            shellIntegration: {
                                executeCommand: any
                            }
                        }
                        
                        const completedPromise = new Promise<void>((resolve) => {
                            terminalProcess.once("completed", resolve)
                        })
                        
                        await terminalProcess.run(mockTerminal, "test command")
                        await completedPromise
                        
                        assert.deepStrictEqual(lines, ["Initial output", "More output", "Final output"])
                        assert.strictEqual(terminalProcess.isHot, false)
                        break
                    }
                    
                    case 'no-shell-integration': {
                        const terminalProcess = new TerminalProcess()
                        let sendTextCalled = false
                        
                        const noShellTerminal = {
                            sendText: (text: string, addNewLine?: boolean) => {
                                assert.strictEqual(text, "test command")
                                assert.strictEqual(addNewLine, true)
                                sendTextCalled = true
                            },
                            shellIntegration: undefined,
                        } as unknown as vscode.Terminal
                        
                        const noShellPromise = new Promise<void>((resolve) => {
                            terminalProcess.once("no_shell_integration", resolve)
                        })
                        
                        await terminalProcess.run(noShellTerminal, "test command")
                        await noShellPromise
                        
                        assert.strictEqual(sendTextCalled, true)
                        break
                    }
                    
                    case 'hot-state': {
                        const terminalProcess = new TerminalProcess()
                        const lines: string[] = []
                        
                        terminalProcess.on("line", (line) => {
                            if (line !== "") {
                                lines.push(line)
                            }
                        })
                        
                        // Create a promise that resolves when the first chunk is processed
                        const firstChunkProcessed = new Promise<void>((resolve) => {
                            terminalProcess.on("line", () => resolve())
                        })
                        
                        const mockStream = (async function* () {
                            yield "compiling...\n"
                            // Wait to ensure hot state check happens after first chunk
                            await new Promise((resolve) => setTimeout(resolve, 10))
                            yield "still compiling...\n"
                            yield "done"
                        })()
                        
                        const mockExecution = {
                            read: () => mockStream,
                        }
                        
                        const mockTerminal = {
                            shellIntegration: {
                                executeCommand: () => mockExecution,
                            },
                            name: "Mock Terminal",
                        } as unknown as vscode.Terminal & {
                            shellIntegration: {
                                executeCommand: any
                            }
                        }
                        
                        // Start the command execution
                        const runPromise = terminalProcess.run(mockTerminal, "npm run build")
                        
                        // Wait for the first chunk to be processed
                        await firstChunkProcessed
                        
                        // Hot state should be true while compiling
                        assert.strictEqual(terminalProcess.isHot, true)
                        
                        // Complete the execution
                        const completedPromise = new Promise<void>((resolve) => {
                            terminalProcess.once("completed", resolve)
                        })
                        
                        await runPromise
                        await completedPromise
                        
                        assert.deepStrictEqual(lines, ["compiling...", "still compiling...", "done"])
                        break
                    }
                    
                    case 'process-lines': {
                        const terminalProcess = new TerminalProcess()
                        const lines: string[] = []
                        
                        terminalProcess.on("line", (line) => lines.push(line))
                        
                        // Simulate incoming chunks
                        terminalProcess["emitIfEol"]("first line\n")
                        terminalProcess["emitIfEol"]("second")
                        terminalProcess["emitIfEol"](" line\n")
                        terminalProcess["emitIfEol"]("third line")
                        
                        assert.deepStrictEqual(lines, ["first line", "second line"])
                        
                        // Process remaining buffer
                        terminalProcess["emitRemainingBufferIfListening"]()
                        assert.deepStrictEqual(lines, ["first line", "second line", "third line"])
                        break
                    }
                    
                    case 'windows-line-endings': {
                        const terminalProcess = new TerminalProcess()
                        const lines: string[] = []
                        
                        terminalProcess.on("line", (line) => lines.push(line))
                        
                        terminalProcess["emitIfEol"]("line1\r\nline2\r\n")
                        
                        assert.deepStrictEqual(lines, ["line1", "line2"])
                        break
                    }
                    
                    case 'remove-artifacts': {
                        const terminalProcess = new TerminalProcess()
                        const cases = [
                            ["output%", "output"],
                            ["output$ ", "output"],
                            ["output#", "output"],
                            ["output> ", "output"],
                            ["multi\nline%", "multi\nline"],
                            ["no artifacts", "no artifacts"],
                        ]
                        
                        for (const [input, expected] of Array.from(cases)) {
                            assert.strictEqual(terminalProcess["removeLastLineArtifacts"](input), expected)
                        }
                        break
                    }
                    
                    case 'continue-event': {
                        const terminalProcess = new TerminalProcess()
                        let continueCalled = false
                        
                        terminalProcess.on("continue", () => {
                            continueCalled = true
                        })
                        
                        terminalProcess.continue()
                        
                        assert.strictEqual(continueCalled, true)
                        assert.strictEqual(terminalProcess["isListening"], false)
                        break
                    }
                    
                    case 'unretrieved-output': {
                        const terminalProcess = new TerminalProcess()
                        terminalProcess["fullOutput"] = "previous\nnew output"
                        terminalProcess["lastRetrievedIndex"] = 9 // After "previous\n"
                        
                        const unretrieved = terminalProcess.getUnretrievedOutput()
                        
                        assert.strictEqual(unretrieved, "new output")
                        assert.strictEqual(terminalProcess["lastRetrievedIndex"], terminalProcess["fullOutput"].length)
                        break
                    }
                    
                    case 'merge-promise': {
                        const process = new TerminalProcess()
                        const promise = Promise.resolve()
                        
                        const merged = mergePromise(process, promise)
                        
                        assert.ok('then' in merged)
                        assert.ok('catch' in merged)
                        assert.ok('finally' in merged)
                        assert.ok(merged instanceof TerminalProcess)
                        
                        await merged
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
}
