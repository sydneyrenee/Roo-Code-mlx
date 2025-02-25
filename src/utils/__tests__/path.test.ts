import * as vscode from 'vscode'
import * as assert from 'assert'
import { arePathsEqual, getReadablePath } from "../path"
import * as path from "path"
import os from "os"

export async function activatePathTests(context: vscode.ExtensionContext): Promise<void> {
    const testController = vscode.tests.createTestController('pathTests', 'Path Tests')
    context.subscriptions.push(testController)

    const rootSuite = testController.createTestItem('path', 'Path Utils')
    testController.items.add(rootSuite)

    const originalPlatform = process.platform

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
                    case 'posix.backslashes': {
                        const windowsPath = "C:\\Users\\test\\file.txt"
                        assert.strictEqual(windowsPath.toPosix(), "C:/Users/test/file.txt")
                        break
                    }

                    case 'posix.forwardslashes': {
                        const unixPath = "/home/user/file.txt"
                        assert.strictEqual(unixPath.toPosix(), "/home/user/file.txt")
                        break
                    }

                    case 'posix.extended': {
                        const extendedPath = "\\\\?\\C:\\Very\\Long\\Path"
                        assert.strictEqual(extendedPath.toPosix(), "\\\\?\\C:\\Very\\Long\\Path")
                        break
                    }

                    case 'windows.caseinsensitive': {
                        Object.defineProperty(process, "platform", { value: "win32" })
                        assert.strictEqual(arePathsEqual("C:\\Users\\Test", "c:\\users\\test"), true)
                        Object.defineProperty(process, "platform", { value: originalPlatform })
                        break
                    }

                    case 'windows.separators': {
                        Object.defineProperty(process, "platform", { value: "win32" })
                        const path1 = path.normalize("C:\\Users\\Test").replace(/\\/g, "/")
                        const path2 = path.normalize("C:/Users/Test").replace(/\\/g, "/")
                        assert.strictEqual(arePathsEqual(path1, path2), true)
                        Object.defineProperty(process, "platform", { value: originalPlatform })
                        break
                    }

                    case 'windows.normalize': {
                        Object.defineProperty(process, "platform", { value: "win32" })
                        const path1 = path.normalize("C:\\Users\\Test\\..\\Test").replace(/\\/g, "/")
                        const path2 = path.normalize("C:\\Users\\Test").replace(/\\/g, "/")
                        assert.strictEqual(arePathsEqual(path1, path2), true)
                        Object.defineProperty(process, "platform", { value: originalPlatform })
                        break
                    }

                    case 'posix.casesensitive': {
                        Object.defineProperty(process, "platform", { value: "darwin" })
                        assert.strictEqual(arePathsEqual("/Users/Test", "/Users/test"), false)
                        Object.defineProperty(process, "platform", { value: originalPlatform })
                        break
                    }

                    case 'posix.normalize': {
                        Object.defineProperty(process, "platform", { value: "darwin" })
                        assert.strictEqual(arePathsEqual("/Users/./Test", "/Users/Test"), true)
                        Object.defineProperty(process, "platform", { value: originalPlatform })
                        break
                    }

                    case 'posix.trailingslash': {
                        Object.defineProperty(process, "platform", { value: "darwin" })
                        assert.strictEqual(arePathsEqual("/Users/Test/", "/Users/Test"), true)
                        Object.defineProperty(process, "platform", { value: originalPlatform })
                        break
                    }

                    case 'edge.undefined': {
                        assert.strictEqual(arePathsEqual(undefined, undefined), true)
                        assert.strictEqual(arePathsEqual("/test", undefined), false)
                        assert.strictEqual(arePathsEqual(undefined, "/test"), false)
                        break
                    }

                    case 'edge.root': {
                        assert.strictEqual(arePathsEqual("/", "/"), true)
                        assert.strictEqual(arePathsEqual("C:\\", "C:\\"), true)
                        break
                    }

                    case 'readable.cwdbase': {
                        const cwd = "/Users/test/project"
                        assert.strictEqual(getReadablePath(cwd, cwd), "project")
                        break
                    }

                    case 'readable.relative': {
                        const cwd = "/Users/test/project"
                        const filePath = "/Users/test/project/src/file.txt"
                        assert.strictEqual(getReadablePath(cwd, filePath), "src/file.txt")
                        break
                    }

                    case 'readable.absolute': {
                        const cwd = "/Users/test/project"
                        const filePath = "/Users/test/other/file.txt"
                        assert.strictEqual(getReadablePath(cwd, filePath), "/Users/test/other/file.txt")
                        break
                    }

                    case 'readable.desktop': {
                        const homeDir = os.homedir()
                        const desktop = path.join(homeDir, "Desktop")
                        const filePath = path.join(desktop, "file.txt")
                        assert.strictEqual(getReadablePath(desktop, filePath), filePath.toPosix())
                        break
                    }

                    case 'readable.undefined': {
                        const cwd = "/Users/test/project"
                        assert.strictEqual(getReadablePath(cwd), "project")
                        break
                    }

                    case 'readable.parentdir': {
                        const cwd = "/Users/test/project"
                        const filePath = "../../other/file.txt"
                        assert.strictEqual(getReadablePath(cwd, filePath), "/Users/other/file.txt")
                        break
                    }

                    case 'readable.normalize': {
                        const cwd = "/Users/test/project"
                        const filePath = "/Users/test/project/./src/../src/file.txt"
                        assert.strictEqual(getReadablePath(cwd, filePath), "src/file.txt")
                        break
                    }
                }
                run.passed(test)
            } catch (err) {
                run.failed(test, new vscode.TestMessage(`Test failed: ${err}`))
            }

            // Restore original platform after each test
            Object.defineProperty(process, "platform", { value: originalPlatform })
        }

        run.end()
    })

    // String.prototype.toPosix tests
    const posixSuite = testController.createTestItem('toPosix', 'String.prototype.toPosix')
    rootSuite.children.add(posixSuite)

    posixSuite.children.add(testController.createTestItem(
        'posix.backslashes',
        'should convert backslashes to forward slashes'
    ))

    posixSuite.children.add(testController.createTestItem(
        'posix.forwardslashes',
        'should not modify paths with forward slashes'
    ))

    posixSuite.children.add(testController.createTestItem(
        'posix.extended',
        'should preserve extended-length Windows paths'
    ))

    // arePathsEqual Windows tests
    const windowsSuite = testController.createTestItem('windows', 'arePathsEqual on Windows')
    rootSuite.children.add(windowsSuite)

    windowsSuite.children.add(testController.createTestItem(
        'windows.caseinsensitive',
        'should compare paths case-insensitively'
    ))

    windowsSuite.children.add(testController.createTestItem(
        'windows.separators',
        'should handle different path separators'
    ))

    windowsSuite.children.add(testController.createTestItem(
        'windows.normalize',
        'should normalize paths with ../'
    ))

    // arePathsEqual POSIX tests
    const posixPathSuite = testController.createTestItem('posixPath', 'arePathsEqual on POSIX')
    rootSuite.children.add(posixPathSuite)

    posixPathSuite.children.add(testController.createTestItem(
        'posix.casesensitive',
        'should compare paths case-sensitively'
    ))

    posixPathSuite.children.add(testController.createTestItem(
        'posix.normalize',
        'should normalize paths'
    ))

    posixPathSuite.children.add(testController.createTestItem(
        'posix.trailingslash',
        'should handle trailing slashes'
    ))

    // Edge cases
    const edgeSuite = testController.createTestItem('edge', 'Edge Cases')
    rootSuite.children.add(edgeSuite)

    edgeSuite.children.add(testController.createTestItem(
        'edge.undefined',
        'should handle undefined paths'
    ))

    edgeSuite.children.add(testController.createTestItem(
        'edge.root',
        'should handle root paths with trailing slashes'
    ))

    // getReadablePath tests
    const readableSuite = testController.createTestItem('readable', 'getReadablePath')
    rootSuite.children.add(readableSuite)

    readableSuite.children.add(testController.createTestItem(
        'readable.cwdbase',
        'should return basename when path equals cwd'
    ))

    readableSuite.children.add(testController.createTestItem(
        'readable.relative',
        'should return relative path when inside cwd'
    ))

    readableSuite.children.add(testController.createTestItem(
        'readable.absolute',
        'should return absolute path when outside cwd'
    ))

    readableSuite.children.add(testController.createTestItem(
        'readable.desktop',
        'should handle Desktop as cwd'
    ))

    readableSuite.children.add(testController.createTestItem(
        'readable.undefined',
        'should handle undefined relative path'
    ))

    readableSuite.children.add(testController.createTestItem(
        'readable.parentdir',
        'should handle parent directory traversal'
    ))

    readableSuite.children.add(testController.createTestItem(
        'readable.normalize',
        'should normalize paths with redundant segments'
    ))
}
