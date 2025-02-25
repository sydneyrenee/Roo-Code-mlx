import * as vscode from 'vscode';
import * as assert from 'assert';
import { parseMentions, openMention } from '../../../src/core/mentions';
import { UrlContentFetcher } from '../../../src/services/browser/UrlContentFetcher';
import * as git from '../../../src/utils/git';
import { createTestSuite, addTest } from '../testUtils';

// Create a mock implementation of the git module
jest.mock('../../../src/utils/git', () => ({
    getCommitInfo: jest.fn(),
    getWorkingState: jest.fn(),
    searchCommits: jest.fn()
}));

suite('Mentions Tests', () => {
    const testController = vscode.tests.createTestController('mentionsTests', 'Mentions Tests');
    const rootSuite = createTestSuite(testController, 'root', 'Mention Handler Tests');

    const mockCwd = '/test/workspace';
    let mockUrlContentFetcher: any; // Use any type for the mock
    let commandsExecuted: string[];
    let externalUrlsOpened: vscode.Uri[];
    let errorMessages: string[];

    setup(() => {
        commandsExecuted = [];
        externalUrlsOpened = [];
        errorMessages = [];

        // Setup command execution tracking
        const originalExecuteCommand = vscode.commands.executeCommand;
        vscode.commands.executeCommand = async (command: string, ...args: any[]) => {
            commandsExecuted.push(command);
            return originalExecuteCommand(command, ...args);
        };

        // Setup external URL opening tracking
        const originalOpenExternal = vscode.env.openExternal;
        vscode.env.openExternal = async (uri: vscode.Uri) => {
            externalUrlsOpened.push(uri);
            return true;
        };

        // Setup error message tracking
        const originalShowErrorMessage = vscode.window.showErrorMessage;
        vscode.window.showErrorMessage = async (message: string) => {
            errorMessages.push(message);
            return undefined;
        };

        // Setup URL content fetcher with a simple mock that implements the required methods
        mockUrlContentFetcher = {
            launchBrowser: async () => {},
            closeBrowser: async () => {},
            urlToMarkdown: async () => ''
        };
    });

    const parsingTestSuite = createTestSuite(testController, 'parsing', 'Mention Parsing');

    addTest(
        parsingTestSuite,
        testController,
        'gitCommits',
        'parses git commit mentions',
        async run => {
            const commitHash = 'abc1234';
            const commitInfo = `abc1234 Fix bug in parser

Author: John Doe
Date: Mon Jan 5 23:50:06 2025 -0500

Detailed commit message with multiple lines
- Fixed parsing issue
- Added tests`;

            // Setup git info mock
            jest.spyOn(git, 'getCommitInfo').mockImplementation(async () => commitInfo);

            const result = await parseMentions(`Check out this commit @${commitHash}`, mockCwd, mockUrlContentFetcher);

            assert.ok(result.includes(`'${commitHash}' (see below for commit info)`));
            assert.ok(result.includes(commitInfo));

            // Restore original function
            jest.restoreAllMocks();
        }
    );

    addTest(
        parsingTestSuite,
        testController,
        'gitErrors',
        'handles git info fetch errors',
        async run => {
            const commitHash = 'abc1234';
            const errorMessage = 'Failed to get commit info';
            
            // Setup git info mock to throw
            jest.spyOn(git, 'getCommitInfo').mockImplementation(async () => {
                throw new Error(errorMessage);
            });

            const result = await parseMentions(`Check out this commit @${commitHash}`, mockCwd, mockUrlContentFetcher);

            assert.ok(result.includes(`'${commitHash}' (see below for commit info)`));
            assert.ok(result.includes(`<git_commit hash="${commitHash}">`));
            assert.ok(result.includes(`Error fetching commit info: ${errorMessage}`));

            // Restore original function
            jest.restoreAllMocks();
        }
    );

    const openingTestSuite = createTestSuite(testController, 'opening', 'Mention Opening');

    addTest(
        openingTestSuite,
        testController,
        'fileAndProblems',
        'handles file paths and problems',
        async run => {
            await openMention('/path/to/file');
            assert.strictEqual(commandsExecuted.length, 0, 'Should not execute any commands for non-existent file');
            assert.strictEqual(externalUrlsOpened.length, 0, 'Should not open any external URLs');
            assert.strictEqual(errorMessages[0], 'Could not open file: File does not exist');

            await openMention('problems');
            assert.strictEqual(commandsExecuted[0], 'workbench.actions.view.problems');
        }
    );
});