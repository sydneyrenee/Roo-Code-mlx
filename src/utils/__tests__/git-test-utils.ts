import * as childProcess from 'child_process'
import { GitCommit } from '../git'
import { promisify } from 'util'

// Type for mock exec responses
export type MockExecResponse = { stdout: string, stderr: string } | null

// Store the original exec function
const originalExec = childProcess.exec

// Create a map to store mock responses
let mockResponses: Map<string, MockExecResponse> = new Map()

// Create a mock exec function
export function mockExec(command: string, options: any, callback: any) {
    // Convert Map to array and iterate
    const entries = Array.from(mockResponses.entries());
    
    for (let i = 0; i < entries.length; i++) {
        const [cmd, response] = entries[i];
        if (command === cmd || command.startsWith(cmd)) {
            if (response === null) {
                callback(new Error('not a git repository'))
            } else {
                callback(null, response.stdout, response.stderr)
            }
            return {} // Return a dummy object
        }
    }
    callback(new Error(`Unexpected command: ${command}`))
    return {}
}

// Function to set up mock responses
export function setupMockResponses(responses: Map<string, MockExecResponse>) {
    mockResponses = responses
}

// Function to install the mock
export function installMock() {
    // Use monkey patching to replace the exec implementation
    Object.defineProperty(childProcess, 'exec', {
        value: mockExec,
        writable: true,
        configurable: true
    })
}

// Function to restore the original exec
export function restoreMock() {
    // Restore the original exec implementation
    Object.defineProperty(childProcess, 'exec', {
        value: originalExec,
        writable: true,
        configurable: true
    })
}

// Mock implementation of searchCommits
export async function mockSearchCommits(
    mockCommitData: string,
    query: string,
    cwd: string,
    gitInstalled: boolean = true,
    isGitRepo: boolean = true
): Promise<GitCommit[]> {
    if (!gitInstalled) {
        return []
    }
    
    if (!isGitRepo) {
        return []
    }
    
    const commits: GitCommit[] = []
    const lines = mockCommitData
        .trim()
        .split('\\n')
        .filter((line) => line !== "--")
    
    for (let i = 0; i < lines.length; i += 5) {
        commits.push({
            hash: lines[i],
            shortHash: lines[i + 1],
            subject: lines[i + 2],
            author: lines[i + 3],
            date: lines[i + 4],
        })
    }
    
    return commits
}

// Mock implementation of getCommitInfo
export async function mockGetCommitInfo(
    mockCommitInfo: string,
    mockStats: string,
    mockDiff: string,
    hash: string,
    cwd: string,
    gitInstalled: boolean = true,
    isGitRepo: boolean = true
): Promise<string> {
    if (!gitInstalled) {
        return "Git is not installed"
    }
    
    if (!isGitRepo) {
        return "Not a git repository"
    }
    
    const [fullHash, shortHash, subject, author, date, body] = mockCommitInfo.trim().split('\\n')
    
    const summary = [
        `Commit: ${shortHash} (${fullHash})`,
        `Author: ${author}`,
        `Date: ${date}`,
        `\nMessage: ${subject}`,
        body ? `\nDescription:\n${body}` : "",
        "\nFiles Changed:",
        mockStats.trim(),
        "\nFull Changes:",
    ].join("\n")
    
    return summary + "\n\n" + mockDiff.trim()
}

// Mock implementation of getWorkingState
export async function mockGetWorkingState(
    mockStatus: string,
    mockDiff: string,
    cwd: string,
    gitInstalled: boolean = true,
    isGitRepo: boolean = true
): Promise<string> {
    if (!gitInstalled) {
        return "Git is not installed"
    }
    
    if (!isGitRepo) {
        return "Not a git repository"
    }
    
    if (!mockStatus.trim()) {
        return "No changes in working directory"
    }
    
    return `Working directory changes:\n\n${mockStatus}\n\n${mockDiff}`.trim()
}