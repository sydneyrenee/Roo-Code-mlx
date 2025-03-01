import * as vscode from 'vscode'
import * as assert from 'assert'
import WorkspaceTracker from '../WorkspaceTracker'
import { ClineProvider } from '../../../core/webview/ClineProvider'
import { listFiles } from '../../../services/glob/list-files'
import { TestUtils } from '../../../test/testUtils'

interface FileEvent {
    fsPath: string;
}

type FileEventHandler = (e: FileEvent) => Promise<void> | void;

export async function activateWorkspaceTrackerTests(context: vscode.ExtensionContext): Promise<void> {
    const testController = TestUtils.createTestController('workspaceTrackerTests', 'Workspace Tracker Tests')
    context.subscriptions.push(testController)

    const rootSuite = testController.createTestItem('workspace-tracker', 'Workspace Tracker')
    testController.items.add(rootSuite)

    // Mock vscode APIs and dependencies
    const mockDispose = () => {}
    const mockOnDidCreate = (handler: FileEventHandler) => ({ dispose: mockDispose, handler })
    const mockOnDidDelete = (handler: FileEventHandler) => ({ dispose: mockDispose, handler })

    // Add initialization test
    rootSuite.children.add(
        TestUtils.createTest(
            testController,
            'initialization',
            'should initialize with workspace files',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const messages: any[] = []
                const mockProvider = {
                    postMessageToWebview: async (msg: any) => { messages.push(msg) }
                } as unknown as ClineProvider
                
                // Mock listFiles to return test files
                const mockFiles = [['/test/workspace/file1.ts', '/test/workspace/file2.ts'], false]
                const origListFiles = (listFiles as any).listFiles
                try {
                    (listFiles as any).listFiles = async () => mockFiles
                    
                    // Create and initialize tracker
                    const workspaceTracker = new WorkspaceTracker(mockProvider)
                    await workspaceTracker.initializeFilePaths()

                    // Verify message was posted with correct files
                    const message = messages[0]
                    assert.strictEqual(message.type, 'workspaceUpdated')
                    assert.ok(message.filePaths.includes('file1.ts'))
                    assert.ok(message.filePaths.includes('file2.ts'))
                    assert.strictEqual(message.filePaths.length, 2)
                } finally {
                    // Restore original function
                    (listFiles as any).listFiles = origListFiles
                }
            }
        )
    )

    // Add file creation test
    rootSuite.children.add(
        TestUtils.createTest(
            testController,
            'file-creation',
            'should handle file creation events',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const messages: any[] = []
                const mockProvider = {
                    postMessageToWebview: async (msg: any) => { messages.push(msg) }
                } as unknown as ClineProvider

                // Create tracker and simulate file creation
                const workspaceTracker = new WorkspaceTracker(mockProvider)
                const { handler: createHandler } = mockOnDidCreate((e: FileEvent) => {})
                await createHandler({ fsPath: '/test/workspace/newfile.ts' })

                // Verify message
                const message = messages[messages.length - 1]
                assert.ok(message)
                assert.strictEqual(message.type, 'workspaceUpdated')
                assert.deepStrictEqual(message.filePaths, ['newfile.ts'])
                assert.deepStrictEqual(message.openedTabs, [])
            }
        )
    )

    // Add file deletion test
    rootSuite.children.add(
        TestUtils.createTest(
            testController,
            'file-deletion',
            'should handle file deletion events',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const messages: any[] = []
                const mockProvider = {
                    postMessageToWebview: async (msg: any) => { messages.push(msg) }
                } as unknown as ClineProvider

                const workspaceTracker = new WorkspaceTracker(mockProvider)

                // First create a file
                const { handler: createHandler } = mockOnDidCreate((e: FileEvent) => {})
                await createHandler({ fsPath: '/test/workspace/file.ts' })

                // Then delete it
                const { handler: deleteHandler } = mockOnDidDelete((e: FileEvent) => {})
                await deleteHandler({ fsPath: '/test/workspace/file.ts' })

                // Verify last message shows empty file list
                const lastMessage = messages[messages.length - 1]
                assert.strictEqual(lastMessage.type, 'workspaceUpdated')
                assert.deepStrictEqual(lastMessage.filePaths, [])
                assert.deepStrictEqual(lastMessage.openedTabs, [])
            }
        )
    )

    // Add directory handling test
    rootSuite.children.add(
        TestUtils.createTest(
            testController,
            'directory-handling',
            'should handle directory paths correctly',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const messages: any[] = []
                const mockProvider = {
                    postMessageToWebview: async (msg: any) => { messages.push(msg) }
                } as unknown as ClineProvider

                const workspaceTracker = new WorkspaceTracker(mockProvider)

                // Simulate directory creation
                const { handler: createHandler } = mockOnDidCreate((e: FileEvent) => {})
                await createHandler({ fsPath: '/test/workspace/newdir' })

                const lastMessage = messages[messages.length - 1]
                assert.strictEqual(lastMessage.type, 'workspaceUpdated')
                assert.deepStrictEqual(lastMessage.filePaths, ['newdir'])
                assert.strictEqual(lastMessage.filePaths.length, 1)
            }
        )
    )

    // Add file limits test
    rootSuite.children.add(
        TestUtils.createTest(
            testController,
            'file-limits',
            'should respect file limits',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const messages: any[] = []
                const mockProvider = {
                    postMessageToWebview: async (msg: any) => { messages.push(msg) }
                } as unknown as ClineProvider

                const workspaceTracker = new WorkspaceTracker(mockProvider)

                // Create 1001 initial files
                const files = Array.from({ length: 1001 }, (_, i) => `/test/workspace/file${i}.ts`)
                const origListFiles = (listFiles as any).listFiles
                try {
                    (listFiles as any).listFiles = async () => [files, false]
                    await workspaceTracker.initializeFilePaths()

                    // Verify initial file limit of 1000
                    const initialMessage = messages[0]
                    assert.strictEqual(initialMessage.filePaths.length, 1000)

                    // Add 1000 more files
                    const { handler: createHandler } = mockOnDidCreate((e: FileEvent) => {})
                    for (let i = 0; i < 1000; i++) {
                        await createHandler({ fsPath: `/test/workspace/extra${i}.ts` })
                    }

                    // Verify limit of 2000 total files
                    const lastMessage = messages[messages.length - 1]
                    assert.strictEqual(lastMessage.filePaths.length, 2000)

                    // Try adding one more file
                    await createHandler({ fsPath: '/test/workspace/toomany.ts' })
                    const finalMessage = messages[messages.length - 1]
                    assert.strictEqual(finalMessage.filePaths.length, 2000)
                } finally {
                    // Restore original function
                    (listFiles as any).listFiles = origListFiles
                }
            }
        )
    )

    // Add cleanup test
    rootSuite.children.add(
        TestUtils.createTest(
            testController,
            'cleanup',
            'should clean up watchers on dispose',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                let disposeCalled = false
                const mockDispose = () => { disposeCalled = true }
                const mockProvider = {
                    postMessageToWebview: async () => {}
                } as unknown as ClineProvider

                const workspaceTracker = new WorkspaceTracker(mockProvider)
                workspaceTracker.dispose()

                assert.ok(disposeCalled)
            }
        )
    )

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
                await (test as any).run?.(run)
                run.passed(test)
            } catch (err) {
                run.failed(test, new vscode.TestMessage(err instanceof Error ? err.message : String(err)))
            }
        }

        run.end()
    })
}
