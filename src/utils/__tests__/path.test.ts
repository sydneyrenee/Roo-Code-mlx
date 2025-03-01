import * as vscode from 'vscode';
import * as assert from 'assert';
import * as path from 'path';
import os from 'os';
import { arePathsEqual, getReadablePath } from '../path';

export async function activatePathTests(context: vscode.ExtensionContext): Promise<void> {
    const testController = vscode.tests.createTestController('pathTests', 'Path Utilities Tests');
    context.subscriptions.push(testController);

    // Root test suite
    const rootSuite = testController.createTestItem('path-utils', 'Path Utilities');
    testController.items.add(rootSuite);

    // Test suites
    const toPosixSuite = testController.createTestItem('to-posix', 'String.prototype.toPosix');
    const arePathsEqualSuite = testController.createTestItem('are-paths-equal', 'arePathsEqual');
    const windowsSuite = testController.createTestItem('windows', 'on Windows');
    const posixSuite = testController.createTestItem('posix', 'on POSIX');
    const edgeCasesSuite = testController.createTestItem('edge-cases', 'edge cases');
    const readablePathSuite = testController.createTestItem('readable-path', 'getReadablePath');

    rootSuite.children.add(toPosixSuite);
    rootSuite.children.add(arePathsEqualSuite);
    arePathsEqualSuite.children.add(windowsSuite);
    arePathsEqualSuite.children.add(posixSuite);
    arePathsEqualSuite.children.add(edgeCasesSuite);
    rootSuite.children.add(readablePathSuite);

    // Create run profile
    testController.createRunProfile('run', vscode.TestRunProfileKind.Run, async (request) => {
        const queue: vscode.TestItem[] = [];
        if (request.include) {
            request.include.forEach(test => queue.push(test));
        }

        const run = testController.createTestRun(request);

        // Store original platform
        const originalPlatform = process.platform;

        for (const test of queue) {
            run.started(test);
            try {
                switch (test.id) {
                    // toPosix tests
                    case 'convert-backslashes': {
                        const windowsPath = 'C:\\Users\\test\\file.txt';
                        assert.strictEqual(windowsPath.toPosix(), 'C:/Users/test/file.txt');
                        break;
                    }
                    case 'preserve-forward-slashes': {
                        const unixPath = '/home/user/file.txt';
                        assert.strictEqual(unixPath.toPosix(), '/home/user/file.txt');
                        break;
                    }
                    case 'preserve-extended-paths': {
                        const extendedPath = '\\\\?\\C:\\Very\\Long\\Path';
                        assert.strictEqual(extendedPath.toPosix(), '\\\\?\\C:\\Very\\Long\\Path');
                        break;
                    }

                    // Windows-specific arePathsEqual tests
                    case 'case-insensitive': {
                        Object.defineProperty(process, 'platform', { value: 'win32' });
                        assert.ok(arePathsEqual('C:\\Users\\Test', 'c:\\users\\test'));
                        break;
                    }
                    case 'handle-separators': {
                        Object.defineProperty(process, 'platform', { value: 'win32' });
                        const path1 = path.normalize('C:\\Users\\Test').replace(/\\/g, '/');
                        const path2 = path.normalize('C:/Users/Test').replace(/\\/g, '/');
                        assert.ok(arePathsEqual(path1, path2));
                        break;
                    }
                    case 'normalize-paths': {
                        Object.defineProperty(process, 'platform', { value: 'win32' });
                        const path1 = path.normalize('C:\\Users\\Test\\..\\Test').replace(/\\/g, '/');
                        const path2 = path.normalize('C:\\Users\\Test').replace(/\\/g, '/');
                        assert.ok(arePathsEqual(path1, path2));
                        break;
                    }

                    // POSIX-specific arePathsEqual tests
                    case 'case-sensitive': {
                        Object.defineProperty(process, 'platform', { value: 'darwin' });
                        assert.ok(!arePathsEqual('/Users/Test', '/Users/test'));
                        break;
                    }
                    case 'normalize-dots': {
                        Object.defineProperty(process, 'platform', { value: 'darwin' });
                        assert.ok(arePathsEqual('/Users/./Test', '/Users/Test'));
                        break;
                    }
                    case 'handle-trailing-slashes': {
                        Object.defineProperty(process, 'platform', { value: 'darwin' });
                        assert.ok(arePathsEqual('/Users/Test/', '/Users/Test'));
                        break;
                    }

                    // Edge cases for arePathsEqual
                    case 'undefined-paths': {
                        assert.ok(arePathsEqual(undefined, undefined));
                        assert.ok(!arePathsEqual('/test', undefined));
                        assert.ok(!arePathsEqual(undefined, '/test'));
                        break;
                    }
                    case 'root-paths': {
                        assert.ok(arePathsEqual('/', '/'));
                        assert.ok(arePathsEqual('C:\\', 'C:\\'));
                        break;
                    }

                    // getReadablePath tests
                    case 'basename-cwd': {
                        const cwd = '/Users/test/project';
                        assert.strictEqual(getReadablePath(cwd, cwd), 'project');
                        break;
                    }
                    case 'relative-path': {
                        const cwd = '/Users/test/project';
                        const filePath = '/Users/test/project/src/file.txt';
                        assert.strictEqual(getReadablePath(cwd, filePath), 'src/file.txt');
                        break;
                    }
                    case 'absolute-path': {
                        const cwd = '/Users/test/project';
                        const filePath = '/Users/test/other/file.txt';
                        assert.strictEqual(getReadablePath(cwd, filePath), '/Users/test/other/file.txt');
                        break;
                    }
                    case 'desktop-path': {
                        const desktop = path.join(os.homedir(), 'Desktop');
                        const filePath = path.join(desktop, 'file.txt');
                        assert.strictEqual(getReadablePath(desktop, filePath), filePath.toPosix());
                        break;
                    }
                    case 'undefined-relative': {
                        const cwd = '/Users/test/project';
                        assert.strictEqual(getReadablePath(cwd), 'project');
                        break;
                    }
                    case 'parent-traversal': {
                        const cwd = '/Users/test/project';
                        const filePath = '../../other/file.txt';
                        assert.strictEqual(getReadablePath(cwd, filePath), '/Users/other/file.txt');
                        break;
                    }
                    case 'normalize-redundant': {
                        const cwd = '/Users/test/project';
                        const filePath = '/Users/test/project/./src/../src/file.txt';
                        assert.strictEqual(getReadablePath(cwd, filePath), 'src/file.txt');
                        break;
                    }
                }
                run.passed(test);
            } catch (err) {
                run.failed(test, new vscode.TestMessage(err instanceof Error ? err.message : String(err)));
            } finally {
                // Restore original platform after each test
                Object.defineProperty(process, 'platform', { value: originalPlatform });
            }
        }
        run.end();
    });

    // Add test cases to suites
    toPosixSuite.children.add(testController.createTestItem('convert-backslashes', 'should convert backslashes to forward slashes'));
    toPosixSuite.children.add(testController.createTestItem('preserve-forward-slashes', 'should not modify paths with forward slashes'));
    toPosixSuite.children.add(testController.createTestItem('preserve-extended-paths', 'should preserve extended-length Windows paths'));

    windowsSuite.children.add(testController.createTestItem('case-insensitive', 'should compare paths case-insensitively'));
    windowsSuite.children.add(testController.createTestItem('handle-separators', 'should handle different path separators'));
    windowsSuite.children.add(testController.createTestItem('normalize-paths', 'should normalize paths with ../'));

    posixSuite.children.add(testController.createTestItem('case-sensitive', 'should compare paths case-sensitively'));
    posixSuite.children.add(testController.createTestItem('normalize-dots', 'should normalize paths'));
    posixSuite.children.add(testController.createTestItem('handle-trailing-slashes', 'should handle trailing slashes'));

    edgeCasesSuite.children.add(testController.createTestItem('undefined-paths', 'should handle undefined paths'));
    edgeCasesSuite.children.add(testController.createTestItem('root-paths', 'should handle root paths with trailing slashes'));

    readablePathSuite.children.add(testController.createTestItem('basename-cwd', 'should return basename when path equals cwd'));
    readablePathSuite.children.add(testController.createTestItem('relative-path', 'should return relative path when inside cwd'));
    readablePathSuite.children.add(testController.createTestItem('absolute-path', 'should return absolute path when outside cwd'));
    readablePathSuite.children.add(testController.createTestItem('desktop-path', 'should handle Desktop as cwd'));
    readablePathSuite.children.add(testController.createTestItem('undefined-relative', 'should handle undefined relative path'));
    readablePathSuite.children.add(testController.createTestItem('parent-traversal', 'should handle parent directory traversal'));
    readablePathSuite.children.add(testController.createTestItem('normalize-redundant', 'should normalize paths with redundant segments'));
}
