import * as vscode from 'vscode'
import * as assert from 'assert'
import { parseSourceCodeForDefinitionsTopLevel } from "../../../../services/tree-sitter/index"
import { listFiles } from "../../../../services/glob/list-files"
import { loadRequiredLanguageParsers } from "../../../../services/tree-sitter/languageParser"
import { fileExistsAtPath } from "../../../../utils/fs"
import * as fs from "fs/promises"
import * as path from "path"

// Mock types
interface MockParser {
    parse(): { rootNode: string }
}

interface MockQuery {
    captures(): MockCapture[]
}

interface MockCapture {
    node: {
        startPosition: { row: number }
        endPosition: { row: number }
    }
    name: string
}

export async function activateTreeSitterTests(context: vscode.ExtensionContext): Promise<void> {
    const testController = vscode.tests.createTestController('treeSitterTests', 'Tree Sitter Tests')
    context.subscriptions.push(testController)

    const rootSuite = testController.createTestItem('treeSitter', 'Tree Sitter')
    testController.items.add(rootSuite)

    // Store original functions
    const originalListFiles = listFiles
    const originalLoadParsers = loadRequiredLanguageParsers
    const originalFileExists = fileExistsAtPath
    const originalReadFile = fs.readFile

    testController.createRunProfile('run', vscode.TestRunProfileKind.Run, async (request) => {
        const queue: vscode.TestItem[] = []

        if (request.include) {
            request.include.forEach(test => queue.push(test))
        }

        const run = testController.createTestRun(request)

        for (const test of queue) {
            run.started(test)

            try {
                // Reset mocks before each test
                let mockFileExists = true
                let mockFiles: string[] = []
                let mockFileContent = ""
                let mockParserThrows = false
                let parseCount = 0

                const mockParser: MockParser = {
                    parse: () => {
                        if (mockParserThrows) {
                            throw new Error("Parsing error")
                        }
                        parseCount++
                        return { rootNode: "mockNode" }
                    }
                }

                const mockQuery: MockQuery = {
                    captures: () => [] as MockCapture[]
                }

                // Override functions with mocks
                ;(global as any).listFiles = async () => [mockFiles, new Set()]
                ;(global as any).loadRequiredLanguageParsers = async () => ({
                    ts: { parser: mockParser, query: mockQuery },
                    tsx: { parser: mockParser, query: mockQuery },
                    js: { parser: mockParser, query: mockQuery },
                    py: { parser: mockParser, query: mockQuery },
                    rs: { parser: mockParser, query: mockQuery },
                    cpp: { parser: mockParser, query: mockQuery },
                    go: { parser: mockParser, query: mockQuery }
                })
                ;(global as any).fileExistsAtPath = async () => mockFileExists
                ;(global as any).readFile = async () => mockFileContent

                switch (test.id) {
                    case 'parse.nonexistent': {
                        mockFileExists = false
                        const result = await parseSourceCodeForDefinitionsTopLevel("/non/existent/path")
                        assert.strictEqual(result, "This directory does not exist or you do not have permission to access it.")
                        break
                    }

                    case 'parse.empty': {
                        mockFiles = []
                        const result = await parseSourceCodeForDefinitionsTopLevel("/test/path")
                        assert.strictEqual(result, "No source code definitions found.")
                        break
                    }

                    case 'parse.typescript': {
                        mockFiles = ["/test/path/file1.ts", "/test/path/file2.tsx", "/test/path/readme.md"]
                        mockFileContent = "export class TestClass {\n  constructor() {}\n}"
                        mockQuery.captures = () => [{
                            node: {
                                startPosition: { row: 0 },
                                endPosition: { row: 0 }
                            },
                            name: "name.definition"
                        }]

                        const result = await parseSourceCodeForDefinitionsTopLevel("/test/path")
                        assert.ok(result.includes("file1.ts"))
                        assert.ok(result.includes("file2.tsx"))
                        assert.ok(!result.includes("readme.md"))
                        assert.ok(result.includes("export class TestClass"))
                        break
                    }

                    case 'parse.definitions': {
                        mockFiles = ["/test/path/file.ts"]
                        mockFileContent = "class TestClass {\n  constructor() {}\n  testMethod() {}\n}"
                        mockQuery.captures = () => [{
                            node: {
                                startPosition: { row: 0 },
                                endPosition: { row: 0 }
                            },
                            name: "name.definition.class"
                        }, {
                            node: {
                                startPosition: { row: 2 },
                                endPosition: { row: 2 }
                            },
                            name: "name.definition.function"
                        }]

                        const result = await parseSourceCodeForDefinitionsTopLevel("/test/path")
                        assert.ok(result.includes("class TestClass"))
                        assert.ok(result.includes("testMethod()"))
                        assert.ok(result.includes("|----"))
                        break
                    }

                    case 'parse.error': {
                        mockFiles = ["/test/path/file.ts"]
                        mockFileContent = "invalid code"
                        mockParserThrows = true

                        const result = await parseSourceCodeForDefinitionsTopLevel("/test/path")
                        assert.strictEqual(result, "No source code definitions found.")
                        break
                    }

                    case 'parse.limit': {
                        mockFiles = Array(100).fill(0).map((_, i) => `/test/path/file${i}.ts`)
                        parseCount = 0

                        await parseSourceCodeForDefinitionsTopLevel("/test/path")
                        assert.strictEqual(parseCount, 50)
                        break
                    }

                    case 'parse.extensions': {
                        mockFiles = [
                            "/test/path/script.js",
                            "/test/path/app.py",
                            "/test/path/main.rs",
                            "/test/path/program.cpp",
                            "/test/path/code.go"
                        ]
                        mockFileContent = "function test() {}"
                        mockQuery.captures = () => [{
                            node: {
                                startPosition: { row: 0 },
                                endPosition: { row: 0 }
                            },
                            name: "name"
                        }]

                        const result = await parseSourceCodeForDefinitionsTopLevel("/test/path")
                        assert.ok(result.includes("script.js"))
                        assert.ok(result.includes("app.py"))
                        assert.ok(result.includes("main.rs"))
                        assert.ok(result.includes("program.cpp"))
                        assert.ok(result.includes("code.go"))
                        break
                    }

                    case 'parse.normalize': {
                        mockFiles = ["/test/path/dir\\file.ts"]
                        mockFileContent = "class Test {}"
                        mockQuery.captures = () => [{
                            node: {
                                startPosition: { row: 0 },
                                endPosition: { row: 0 }
                            },
                            name: "name"
                        }]

                        const result = await parseSourceCodeForDefinitionsTopLevel("/test/path")
                        assert.ok(result.includes("dir/file.ts"))
                        assert.ok(!result.includes("dir\\file.ts"))
                        break
                    }
                }

                run.passed(test)
            } catch (err) {
                run.failed(test, new vscode.TestMessage(`Test failed: ${err}`))
            } finally {
                // Restore original functions
                ;(global as any).listFiles = originalListFiles
                ;(global as any).loadRequiredLanguageParsers = originalLoadParsers
                ;(global as any).fileExistsAtPath = originalFileExists
                ;(global as any).readFile = originalReadFile
            }
        }

        run.end()
    })

    // Parse tests
    const parseSuite = testController.createTestItem('parse', 'Source Code Parsing')
    rootSuite.children.add(parseSuite)

    parseSuite.children.add(testController.createTestItem(
        'parse.nonexistent',
        'should handle non-existent directory'
    ))

    parseSuite.children.add(testController.createTestItem(
        'parse.empty',
        'should handle empty directory'
    ))

    parseSuite.children.add(testController.createTestItem(
        'parse.typescript',
        'should parse TypeScript files correctly'
    ))

    parseSuite.children.add(testController.createTestItem(
        'parse.definitions',
        'should handle multiple definition types'
    ))

    parseSuite.children.add(testController.createTestItem(
        'parse.error',
        'should handle parsing errors gracefully'
    ))

    parseSuite.children.add(testController.createTestItem(
        'parse.limit',
        'should respect file limit'
    ))

    parseSuite.children.add(testController.createTestItem(
        'parse.extensions',
        'should handle various supported file extensions'
    ))

    parseSuite.children.add(testController.createTestItem(
        'parse.normalize',
        'should normalize paths in output'
    ))
}
