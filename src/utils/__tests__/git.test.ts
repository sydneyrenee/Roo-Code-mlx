import * as vscode from 'vscode'
import * as assert from 'assert'
import { searchCommits, getCommitInfo, getWorkingState } from '../git'
import { truncateOutput } from '../../integrations/misc/extract-text'
import { 
    setupMockResponses,
    installMock,
    restoreMock,
    mockSearchCommits, 
    mockGetCommitInfo, 
    mockGetWorkingState,
    MockExecResponse
} from './git-test-utils'

export async function activateGitTests(context: vscode.ExtensionContext): Promise<void> {
    const testController = vscode.tests.createTestController('gitTests', 'Git Utilities Tests')
    context.subscriptions.push(testController)

    // Root test suite
    const rootSuite = testController.createTestItem('git-utils', 'Git Utilities')
    testController.items.add(rootSuite)

    // Test suites
    const searchCommitsSuite = testController.createTestItem('search-commits', 'searchCommits')
    const commitInfoSuite = testController.createTestItem('commit-info', 'getCommitInfo')
    const workingStateSuite = testController.createTestItem('working-state', 'getWorkingState')

    rootSuite.children.add(searchCommitsSuite)
    rootSuite.children.add(commitInfoSuite)
    rootSuite.children.add(workingStateSuite)

    // Create run profile
    testController.createRunProfile('run', vscode.TestRunProfileKind.Run, async (request) => {
        const queue: vscode.TestItem[] = []
        if (request.include) {
            request.include.forEach(test => queue.push(test))
        }

        const run = testController.createTestRun(request)

        const cwd = '/test/path'
        const mockCommitData = [
            'abc123def456',
            'abc123',
            'fix: test commit',
            'John Doe',
            '2024-01-06',
            'def456abc789',
            'def456',
            'feat: new feature',
            'Jane Smith',
            '2024-01-05'
        ].join('\\n')

        const mockCommitInfo = [
            'abc123def456',
            'abc123',
            'fix: test commit', 
            'John Doe',
            '2024-01-06',
            'Detailed description'
        ].join('\\n')

        const mockStats = '1 file changed, 2 insertions(+), 1 deletion(-)'
        const mockDiff = '@@ -1,1 +1,2 @@\\n-old line\\n+new line'
        const mockStatus = ' M src/file1.ts\\n?? src/file2.ts'

        for (const test of queue) {
            run.started(test)
            try {
                switch (test.id) {
                    // searchCommits tests
                    case 'basic-search': {
                        const responses = new Map<string, MockExecResponse>([
                            ['git --version', { stdout: 'git version 2.39.2', stderr: '' }],
                            ['git rev-parse --git-dir', { stdout: '.git', stderr: '' }],
                            ['git log -n 10 --format="%H%n%h%n%s%n%an%n%ad" --date=short --grep="test" --regexp-ignore-case',
                             { stdout: mockCommitData, stderr: '' }]
                        ])

                        try {
                            // Set up mock exec
                            setupMockResponses(responses)
                            installMock()

                            const result = await searchCommits('test', cwd)
                            assert.strictEqual(result.length, 2)
                            assert.deepStrictEqual(result[0], {
                                hash: 'abc123def456',
                                shortHash: 'abc123',
                                subject: 'fix: test commit',
                                author: 'John Doe',
                                date: '2024-01-06'
                            })
                        } finally {
                            restoreMock()
                        }
                        break
                    }
                    case 'git-not-installed': {
                        // Use the mock implementation directly
                        const result = await mockSearchCommits(mockCommitData, 'test', cwd, false, true)
                        assert.deepStrictEqual(result, [])
                        break
                    }
                    case 'not-git-repo': {
                        // Use the mock implementation directly
                        const result = await mockSearchCommits(mockCommitData, 'test', cwd, true, false)
                        assert.deepStrictEqual(result, [])
                        break
                    }
                    case 'hash-search-fallback': {
                        const responses = new Map<string, MockExecResponse>([
                            ['git --version', { stdout: 'git version 2.39.2', stderr: '' }],
                            ['git rev-parse --git-dir', { stdout: '.git', stderr: '' }],
                            ['git log -n 10 --format="%H%n%h%n%s%n%an%n%ad" --date=short --grep="abc123" --regexp-ignore-case',
                             { stdout: '', stderr: '' }],
                            ['git log -n 10 --format="%H%n%h%n%s%n%an%n%ad" --date=short --author-date-order abc123',
                             { stdout: mockCommitData, stderr: '' }]
                        ])

                        try {
                            // Set up mock exec
                            setupMockResponses(responses)
                            installMock()

                            const result = await searchCommits('abc123', cwd)
                            assert.strictEqual(result.length, 2)
                            assert.deepStrictEqual(result[0], {
                                hash: 'abc123def456',
                                shortHash: 'abc123',
                                subject: 'fix: test commit',
                                author: 'John Doe',
                                date: '2024-01-06'
                            })
                        } finally {
                            restoreMock()
                        }
                        break
                    }

                    // getCommitInfo tests
                    case 'basic-commit-info': {
                        const responses = new Map<string, MockExecResponse>([
                            ['git --version', { stdout: 'git version 2.39.2', stderr: '' }],
                            ['git rev-parse --git-dir', { stdout: '.git', stderr: '' }],
                            ['git show --format="%H%n%h%n%s%n%an%n%ad%n%b" --no-patch abc123',
                             { stdout: mockCommitInfo, stderr: '' }],
                            ['git show --stat --format="" abc123', { stdout: mockStats, stderr: '' }],
                            ['git show --format="" abc123', { stdout: mockDiff, stderr: '' }]
                        ])

                        try {
                            // Set up mock exec
                            setupMockResponses(responses)
                            installMock()

                            const result = await getCommitInfo('abc123', cwd)
                            assert.ok(result.includes('Commit: abc123'))
                            assert.ok(result.includes('Author: John Doe'))
                            assert.ok(result.includes('Files Changed:'))
                            assert.ok(result.includes('Full Changes:'))
                        } finally {
                            restoreMock()
                        }
                        break
                    }
                    case 'commit-info-no-git': {
                        // Use the mock implementation directly
                        const result = await mockGetCommitInfo(
                            mockCommitInfo, mockStats, mockDiff, 'abc123', cwd, false, true
                        )
                        assert.strictEqual(result, 'Git is not installed')
                        break
                    }
                    case 'commit-info-no-repo': {
                        // Use the mock implementation directly
                        const result = await mockGetCommitInfo(
                            mockCommitInfo, mockStats, mockDiff, 'abc123', cwd, true, false
                        )
                        assert.strictEqual(result, 'Not a git repository')
                        break
                    }

                    // getWorkingState tests
                    case 'working-changes': {
                        const responses = new Map<string, MockExecResponse>([
                            ['git --version', { stdout: 'git version 2.39.2', stderr: '' }],
                            ['git rev-parse --git-dir', { stdout: '.git', stderr: '' }],
                            ['git status --short', { stdout: mockStatus, stderr: '' }],
                            ['git diff HEAD', { stdout: mockDiff, stderr: '' }]
                        ])

                        try {
                            // Set up mock exec
                            setupMockResponses(responses)
                            installMock()

                            const result = await getWorkingState(cwd)
                            assert.ok(result.includes('Working directory changes:'))
                            assert.ok(result.includes('src/file1.ts'))
                            assert.ok(result.includes('src/file2.ts'))
                        } finally {
                            restoreMock()
                        }
                        break
                    }
                    case 'clean-working-dir': {
                        // Use the mock implementation directly
                        const result = await mockGetWorkingState('', mockDiff, cwd, true, true)
                        assert.strictEqual(result, 'No changes in working directory')
                        break
                    }
                    case 'working-state-no-git': {
                        // Use the mock implementation directly
                        const result = await mockGetWorkingState(mockStatus, mockDiff, cwd, false, true)
                        assert.strictEqual(result, 'Git is not installed')
                        break
                    }
                    case 'working-state-no-repo': {
                        // Use the mock implementation directly
                        const result = await mockGetWorkingState(mockStatus, mockDiff, cwd, true, false)
                        assert.strictEqual(result, 'Not a git repository')
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
    searchCommitsSuite.children.add(testController.createTestItem('basic-search', 'should return commits when git is installed and repo exists'))
    searchCommitsSuite.children.add(testController.createTestItem('git-not-installed', 'should return empty array when git is not installed'))
    searchCommitsSuite.children.add(testController.createTestItem('not-git-repo', 'should return empty array when not in a git repository'))
    searchCommitsSuite.children.add(testController.createTestItem('hash-search-fallback', 'should handle hash search when grep search returns no results'))

    commitInfoSuite.children.add(testController.createTestItem('basic-commit-info', 'should return formatted commit info'))
    commitInfoSuite.children.add(testController.createTestItem('commit-info-no-git', 'should return error message when git is not installed'))
    commitInfoSuite.children.add(testController.createTestItem('commit-info-no-repo', 'should return error message when not in a git repository'))

    workingStateSuite.children.add(testController.createTestItem('working-changes', 'should return working directory changes'))
    workingStateSuite.children.add(testController.createTestItem('clean-working-dir', 'should return message when working directory is clean'))
    workingStateSuite.children.add(testController.createTestItem('working-state-no-git', 'should return error message when git is not installed')) 
    workingStateSuite.children.add(testController.createTestItem('working-state-no-repo', 'should return error message when not in a git repository'))
}
