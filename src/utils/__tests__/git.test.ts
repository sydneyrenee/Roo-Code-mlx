import * as vscode from 'vscode'
import * as assert from 'assert'
import { searchCommits, getCommitInfo, getWorkingState } from "../git"
import { ExecException } from "child_process"

// Mock types
type ExecFunction = (
    command: string,
    options: { cwd?: string },
    callback: (error: ExecException | null, result?: { stdout: string; stderr: string }) => void,
) => void

// Mock implementation
class MockExec {
    private responses: Map<string, { stdout: string; stderr: string } | null> = new Map()
    private calls: string[] = []

    exec: ExecFunction = (command: string, options: { cwd?: string }, callback: Function) => {
        this.calls.push(command)
        const response = this.responses.get(command)
        
        if (response === null) {
            callback(new Error("not a git repository"))
        } else if (response) {
            callback(null, response)
        } else {
            callback(new Error("Unexpected command"))
        }
    }

    setResponse(command: string, response: { stdout: string; stderr: string } | null) {
        this.responses.set(command, response)
    }

    getCalls(): string[] {
        return this.calls
    }

    reset() {
        this.responses.clear()
        this.calls = []
    }
}

// Create mock instance
const mockExec = new MockExec()

// Mock modules
const childProcess = { exec: mockExec.exec }
const util = {
    promisify: (fn: ExecFunction) => {
        return async (command: string, options?: { cwd?: string }) => {
            return new Promise((resolve, reject) => {
                fn(
                    command,
                    options || {},
                    (error: ExecException | null, result?: { stdout: string; stderr: string }) => {
                        if (error) {
                            reject(error)
                        } else {
                            resolve(result!)
                        }
                    },
                )
            })
        }
    },
}

export async function activateGitTests(context: vscode.ExtensionContext): Promise<void> {
    const testController = vscode.tests.createTestController('gitTests', 'Git Tests')
    context.subscriptions.push(testController)

    const rootSuite = testController.createTestItem('git', 'Git Utils')
    testController.items.add(rootSuite)

    const cwd = "/test/path"
    const mockCommitData = [
        "abc123def456",
        "abc123",
        "fix: test commit",
        "John Doe",
        "2024-01-06",
        "def456abc789",
        "def456",
        "feat: new feature",
        "Jane Smith",
        "2024-01-05",
    ].join("\n")

    testController.createRunProfile('run', vscode.TestRunProfileKind.Run, async (request) => {
        const queue: vscode.TestItem[] = []

        if (request.include) {
            request.include.forEach(test => queue.push(test))
        }

        const run = testController.createTestRun(request)

        for (const test of queue) {
            run.started(test)
            mockExec.reset()

            try {
                switch (test.id) {
                    case 'search.normal': {
                        mockExec.setResponse("git --version", { stdout: "git version 2.39.2", stderr: "" })
                        mockExec.setResponse("git rev-parse --git-dir", { stdout: ".git", stderr: "" })
                        mockExec.setResponse(
                            'git log -n 10 --format="%H%n%h%n%s%n%an%n%ad" --date=short --grep="test" --regexp-ignore-case',
                            { stdout: mockCommitData, stderr: "" }
                        )

                        const result = await searchCommits("test", cwd)

                        assert.strictEqual(result.length, 2)
                        assert.deepStrictEqual(result[0], {
                            hash: "abc123def456",
                            shortHash: "abc123",
                            subject: "fix: test commit",
                            author: "John Doe",
                            date: "2024-01-06",
                        })

                        const calls = mockExec.getCalls()
                        assert.ok(calls.includes("git --version"))
                        assert.ok(calls.includes("git rev-parse --git-dir"))
                        assert.ok(calls.includes(
                            'git log -n 10 --format="%H%n%h%n%s%n%an%n%ad" --date=short --grep="test" --regexp-ignore-case'
                        ))
                        break
                    }

                    case 'search.nogit': {
                        mockExec.setResponse("git --version", null)

                        const result = await searchCommits("test", cwd)
                        assert.deepStrictEqual(result, [])
                        
                        const calls = mockExec.getCalls()
                        assert.ok(calls.includes("git --version"))
                        break
                    }

                    case 'commit.info': {
                        const mockCommitInfo = [
                            "abc123def456",
                            "abc123",
                            "fix: test commit",
                            "John Doe",
                            "2024-01-06",
                            "Detailed description",
                        ].join("\n")
                        const mockStats = "1 file changed, 2 insertions(+), 1 deletion(-)"
                        const mockDiff = "@@ -1,1 +1,2 @@\n-old line\n+new line"

                        mockExec.setResponse("git --version", { stdout: "git version 2.39.2", stderr: "" })
                        mockExec.setResponse("git rev-parse --git-dir", { stdout: ".git", stderr: "" })
                        mockExec.setResponse(
                            'git show --format="%H%n%h%n%s%n%an%n%ad%n%b" --no-patch abc123',
                            { stdout: mockCommitInfo, stderr: "" }
                        )
                        mockExec.setResponse(
                            'git show --stat --format="" abc123',
                            { stdout: mockStats, stderr: "" }
                        )
                        mockExec.setResponse(
                            'git show --format="" abc123',
                            { stdout: mockDiff, stderr: "" }
                        )

                        const result = await getCommitInfo("abc123", cwd)
                        assert.ok(result.includes("Commit: abc123"))
                        assert.ok(result.includes("Author: John Doe"))
                        assert.ok(result.includes("Files Changed:"))
                        assert.ok(result.includes("Full Changes:"))
                        break
                    }

                    case 'working.changes': {
                        const mockStatus = " M src/file1.ts\n?? src/file2.ts"
                        const mockDiff = "@@ -1,1 +1,2 @@\n-old line\n+new line"

                        mockExec.setResponse("git --version", { stdout: "git version 2.39.2", stderr: "" })
                        mockExec.setResponse("git rev-parse --git-dir", { stdout: ".git", stderr: "" })
                        mockExec.setResponse("git status --short", { stdout: mockStatus, stderr: "" })
                        mockExec.setResponse("git diff HEAD", { stdout: mockDiff, stderr: "" })

                        const result = await getWorkingState(cwd)
                        assert.ok(result.includes("Working directory changes:"))
                        assert.ok(result.includes("src/file1.ts"))
                        assert.ok(result.includes("src/file2.ts"))
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

    // Add test items
    const searchCommitsSuite = testController.createTestItem('searchCommits', 'searchCommits')
    rootSuite.children.add(searchCommitsSuite)

    const searchTest = testController.createTestItem(
        'search.normal',
        'should return commits when git is installed and repo exists'
    )
    searchCommitsSuite.children.add(searchTest)

    const noGitTest = testController.createTestItem(
        'search.nogit',
        'should return empty array when git is not installed'
    )
    searchCommitsSuite.children.add(noGitTest)

    const commitInfoSuite = testController.createTestItem('getCommitInfo', 'getCommitInfo')
    rootSuite.children.add(commitInfoSuite)

    const commitInfoTest = testController.createTestItem(
        'commit.info',
        'should return formatted commit info'
    )
    commitInfoSuite.children.add(commitInfoTest)

    const workingStateSuite = testController.createTestItem('getWorkingState', 'getWorkingState')
    rootSuite.children.add(workingStateSuite)

    const workingStateTest = testController.createTestItem(
        'working.changes',
        'should return working directory changes'
    )
    workingStateSuite.children.add(workingStateTest)
}
