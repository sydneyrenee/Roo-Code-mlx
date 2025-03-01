import * as vscode from 'vscode';
import * as assert from 'assert';
import { parseMentions, openMention } from "../index";
import { UrlContentFetcher } from "../../../services/browser/UrlContentFetcher";
import * as git from "../../../utils/git";
import { TestUtils } from '../../../test/testUtils';

export async function activateMentionsTests(context: vscode.ExtensionContext): Promise<void> {
    // Create test controller
    const testController = TestUtils.createTestController('mentionsTests', 'Mentions Tests');
    context.subscriptions.push(testController);

    // Root test suite
    const rootSuite = testController.createTestItem('mentions', 'mentions');
    testController.items.add(rootSuite);

    // Test suites
    const parseMentionsSuite = testController.createTestItem('parse-mentions-tests', 'parseMentions');
    const openMentionSuite = testController.createTestItem('open-mention-tests', 'openMention');
    
    rootSuite.children.add(parseMentionsSuite);
    rootSuite.children.add(openMentionSuite);

    // Parse mentions tests
    parseMentionsSuite.children.add(
        TestUtils.createTest(
            testController,
            'parse-git-commit-mentions',
            'should parse git commit mentions',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const mockCwd = "/test/workspace";
                
                // Create a mock UrlContentFetcher with required properties
                const mockUrlContentFetcher = {
                    launchBrowser: async () => {},
                    closeBrowser: async () => {},
                    urlToMarkdown: async () => "",
                    context: {} as vscode.ExtensionContext,
                    ensureChromiumExists: async () => true
                } as unknown as UrlContentFetcher;

                // Save original getCommitInfo function
                const originalGetCommitInfo = git.getCommitInfo;
                
                // Mock getCommitInfo
                const commitHash = "abc1234";
                const commitInfo = `abc1234 Fix bug in parser

Author: John Doe
Date: Mon Jan 5 23:50:06 2025 -0500

Detailed commit message with multiple lines
- Fixed parsing issue
- Added tests`;

                // Replace getCommitInfo with our mock
                (git as any).getCommitInfo = async () => commitInfo;

                try {
                    const result = await parseMentions(`Check out this commit @${commitHash}`, mockCwd, mockUrlContentFetcher);

                    assert.ok(result.includes(`'${commitHash}' (see below for commit info)`), "Result should include commit hash reference");
                    assert.ok(result.includes(`<git_commit hash="${commitHash}">`), "Result should include git commit tag");
                    assert.ok(result.includes(commitInfo), "Result should include commit info");
                } finally {
                    // Restore original function
                    (git as any).getCommitInfo = originalGetCommitInfo;
                }
            }
        )
    );

    parseMentionsSuite.children.add(
        TestUtils.createTest(
            testController,
            'handle-errors-fetching-git-info',
            'should handle errors fetching git info',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const mockCwd = "/test/workspace";
                
                // Create a mock UrlContentFetcher with required properties
                const mockUrlContentFetcher = {
                    launchBrowser: async () => {},
                    closeBrowser: async () => {},
                    urlToMarkdown: async () => "",
                    context: {} as vscode.ExtensionContext,
                    ensureChromiumExists: async () => true
                } as unknown as UrlContentFetcher;

                // Save original getCommitInfo function
                const originalGetCommitInfo = git.getCommitInfo;
                
                // Mock getCommitInfo to throw an error
                const commitHash = "abc1234";
                const errorMessage = "Failed to get commit info";

                // Replace getCommitInfo with our mock that throws an error
                (git as any).getCommitInfo = async () => {
                    throw new Error(errorMessage);
                };

                try {
                    const result = await parseMentions(`Check out this commit @${commitHash}`, mockCwd, mockUrlContentFetcher);

                    assert.ok(result.includes(`'${commitHash}' (see below for commit info)`), "Result should include commit hash reference");
                    assert.ok(result.includes(`<git_commit hash="${commitHash}">`), "Result should include git commit tag");
                    assert.ok(result.includes(`Error fetching commit info: ${errorMessage}`), "Result should include error message");
                } finally {
                    // Restore original function
                    (git as any).getCommitInfo = originalGetCommitInfo;
                }
            }
        )
    );

    // Open mention tests
    openMentionSuite.children.add(
        TestUtils.createTest(
            testController,
            'handle-file-paths-and-problems',
            'should handle file paths and problems',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Save original functions to restore later
                const originalExecuteCommand = vscode.commands.executeCommand;
                const originalOpenExternal = vscode.env.openExternal;
                const originalShowErrorMessage = vscode.window.showErrorMessage;

                // Create tracking variables
                let executeCommandCalled = false;
                let executeCommandArg: string | undefined;
                let openExternalCalled = false;
                let showErrorMessageCalled = false;
                let showErrorMessageArg: string | undefined;

                // Mock the functions
                (vscode.commands as any).executeCommand = async (command: string) => {
                    executeCommandCalled = true;
                    executeCommandArg = command;
                    return undefined;
                };
                
                (vscode.env as any).openExternal = async () => {
                    openExternalCalled = true;
                    return true;
                };
                
                (vscode.window as any).showErrorMessage = async (message: string) => {
                    showErrorMessageCalled = true;
                    showErrorMessageArg = message;
                    return undefined;
                };

                try {
                    // Test file path
                    await openMention("/path/to/file");
                    assert.strictEqual(executeCommandCalled, false, "executeCommand should not be called");
                    assert.strictEqual(openExternalCalled, false, "openExternal should not be called");
                    assert.strictEqual(showErrorMessageCalled, true, "showErrorMessage should be called");
                    assert.strictEqual(showErrorMessageArg, "Could not open file: File does not exist", "Error message should match");

                    // Reset tracking variables
                    executeCommandCalled = false;
                    openExternalCalled = false;
                    showErrorMessageCalled = false;
                    showErrorMessageArg = undefined;

                    // Test problems
                    await openMention("problems");
                    assert.strictEqual(executeCommandCalled, true, "executeCommand should be called");
                    assert.strictEqual(executeCommandArg, "workbench.actions.view.problems", "Command should be to view problems");
                } finally {
                    // Restore original functions
                    (vscode.commands as any).executeCommand = originalExecuteCommand;
                    (vscode.env as any).openExternal = originalOpenExternal;
                    (vscode.window as any).showErrorMessage = originalShowErrorMessage;
                }
            }
        )
    );

    openMentionSuite.children.add(
        TestUtils.createTest(
            testController,
            'handle-urls',
            'should handle URLs',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Save original functions to restore later
                const originalOpenExternal = vscode.env.openExternal;

                // Create tracking variables
                let openExternalCalled = false;
                let openExternalArg: vscode.Uri | undefined;

                // Mock the functions
                (vscode.env as any).openExternal = async (uri: vscode.Uri) => {
                    openExternalCalled = true;
                    openExternalArg = uri;
                    return true;
                };

                try {
                    const url = "https://example.com";
                    await openMention(url);
                    
                    assert.strictEqual(openExternalCalled, true, "openExternal should be called");
                    assert.ok(openExternalArg, "openExternal should be called with a URI");
                    if (openExternalArg) {
                        assert.strictEqual(openExternalArg.scheme, "https", "URI scheme should be https");
                        assert.strictEqual(openExternalArg.toString(), url, "URI should match the URL");
                    }
                } finally {
                    // Restore original function
                    (vscode.env as any).openExternal = originalOpenExternal;
                }
            }
        )
    );
}
