import * as vscode from 'vscode'
import * as assert from 'assert'
import { loadRequiredLanguageParsers } from "../../../../services/tree-sitter/languageParser"
import Parser from "web-tree-sitter"

// Define Parser interface to avoid circular reference
interface TreeSitterParser {
    new(): any
    init(): Promise<void>
    Language: {
        load(path: string): Promise<any>
    }
}

// Extend global to include Parser
declare global {
    var Parser: TreeSitterParser
}

// Mock Parser class
class MockParser {
    private static _initialized = false
    private static _loadedLanguages = new Map<string, any>()
    private static _setLanguageCalls = 0

    constructor() {
        return {
            setLanguage: () => {
                MockParser._setLanguageCalls++
            }
        }
    }

    static init(): Promise<void> {
        MockParser._initialized = true
        return Promise.resolve()
    }

    static get initialized(): boolean {
        return MockParser._initialized
    }

    static reset(): void {
        MockParser._initialized = false
        MockParser._loadedLanguages.clear()
        MockParser._setLanguageCalls = 0
    }

    static get setLanguageCalls(): number {
        return MockParser._setLanguageCalls
    }

    static Language = {
        load(path: string): Promise<any> {
            MockParser._loadedLanguages.set(path, {
                query: () => "mockQuery"
            })
            return Promise.resolve(MockParser._loadedLanguages.get(path))
        },
        getLoadedLanguages(): Map<string, any> {
            return MockParser._loadedLanguages
        }
    }
}

// Add static methods to constructor
(MockParser as unknown as TreeSitterParser).init = MockParser.init
;(MockParser as unknown as TreeSitterParser).Language = MockParser.Language

export async function activateLanguageParserTests(context: vscode.ExtensionContext): Promise<void> {
    const testController = vscode.tests.createTestController('languageParserTests', 'Language Parser Tests')
    context.subscriptions.push(testController)

    const rootSuite = testController.createTestItem('languageParser', 'Language Parser')
    testController.items.add(rootSuite)

    // Mock web-tree-sitter
    const originalParser = global.Parser
    global.Parser = MockParser as unknown as TreeSitterParser

    testController.createRunProfile('run', vscode.TestRunProfileKind.Run, async (request) => {
        const queue: vscode.TestItem[] = []

        if (request.include) {
            request.include.forEach(test => queue.push(test))
        }

        const run = testController.createTestRun(request)

        for (const test of queue) {
            run.started(test)

            try {
                MockParser.reset()

                switch (test.id) {
                    case 'init.once': {
                        const files = ["test.js", "test2.js"]
                        await loadRequiredLanguageParsers(files)
                        await loadRequiredLanguageParsers(files)

                        assert.strictEqual(MockParser.initialized, true)
                        break
                    }

                    case 'load.javascript': {
                        const files = ["test.js", "test.jsx"]
                        const parsers = await loadRequiredLanguageParsers(files)

                        const loadedLanguages = MockParser.Language.getLoadedLanguages()
                        assert.ok(Array.from(loadedLanguages.keys()).some(path => 
                            path.includes("tree-sitter-javascript.wasm")
                        ))
                        assert.ok(parsers.js)
                        assert.ok(parsers.jsx)
                        assert.ok(parsers.js.query)
                        assert.ok(parsers.jsx.query)
                        break
                    }

                    case 'load.typescript': {
                        const files = ["test.ts", "test.tsx"]
                        const parsers = await loadRequiredLanguageParsers(files)

                        const loadedLanguages = MockParser.Language.getLoadedLanguages()
                        assert.ok(Array.from(loadedLanguages.keys()).some(path => 
                            path.includes("tree-sitter-typescript.wasm")
                        ))
                        assert.ok(Array.from(loadedLanguages.keys()).some(path => 
                            path.includes("tree-sitter-tsx.wasm")
                        ))
                        assert.ok(parsers.ts)
                        assert.ok(parsers.tsx)
                        break
                    }

                    case 'load.python': {
                        const files = ["test.py"]
                        const parsers = await loadRequiredLanguageParsers(files)

                        const loadedLanguages = MockParser.Language.getLoadedLanguages()
                        assert.ok(Array.from(loadedLanguages.keys()).some(path => 
                            path.includes("tree-sitter-python.wasm")
                        ))
                        assert.ok(parsers.py)
                        break
                    }

                    case 'load.multiple': {
                        const files = ["test.js", "test.py", "test.rs", "test.go"]
                        const parsers = await loadRequiredLanguageParsers(files)

                        const loadedLanguages = MockParser.Language.getLoadedLanguages()
                        assert.strictEqual(loadedLanguages.size, 4)
                        assert.ok(parsers.js)
                        assert.ok(parsers.py)
                        assert.ok(parsers.rs)
                        assert.ok(parsers.go)
                        break
                    }

                    case 'load.cpp': {
                        const files = ["test.c", "test.h", "test.cpp", "test.hpp"]
                        const parsers = await loadRequiredLanguageParsers(files)

                        const loadedLanguages = MockParser.Language.getLoadedLanguages()
                        assert.ok(Array.from(loadedLanguages.keys()).some(path => 
                            path.includes("tree-sitter-c.wasm")
                        ))
                        assert.ok(Array.from(loadedLanguages.keys()).some(path => 
                            path.includes("tree-sitter-cpp.wasm")
                        ))
                        assert.ok(parsers.c)
                        assert.ok(parsers.h)
                        assert.ok(parsers.cpp)
                        assert.ok(parsers.hpp)
                        break
                    }

                    case 'error.unsupported': {
                        const files = ["test.unsupported"]
                        await assert.rejects(
                            () => loadRequiredLanguageParsers(files),
                            /Unsupported language: unsupported/
                        )
                        break
                    }

                    case 'load.once': {
                        const files = ["test1.js", "test2.js", "test3.js"]
                        await loadRequiredLanguageParsers(files)

                        const loadedLanguages = MockParser.Language.getLoadedLanguages()
                        assert.strictEqual(loadedLanguages.size, 1)
                        assert.ok(Array.from(loadedLanguages.keys()).some(path => 
                            path.includes("tree-sitter-javascript.wasm")
                        ))
                        break
                    }

                    case 'set.language': {
                        const files = ["test.js", "test.py"]
                        await loadRequiredLanguageParsers(files)

                        assert.strictEqual(MockParser.setLanguageCalls, 2)
                        break
                    }
                }

                run.passed(test)
            } catch (err) {
                run.failed(test, new vscode.TestMessage(`Test failed: ${err}`))
            }
        }

        run.end()
        global.Parser = originalParser
    })

    // Initialize tests
    const initSuite = testController.createTestItem('init', 'Initialization')
    rootSuite.children.add(initSuite)

    initSuite.children.add(testController.createTestItem(
        'init.once',
        'should initialize parser only once'
    ))

    // Loading tests
    const loadSuite = testController.createTestItem('load', 'Loading Languages')
    rootSuite.children.add(loadSuite)

    loadSuite.children.add(testController.createTestItem(
        'load.javascript',
        'should load JavaScript parser for .js and .jsx files'
    ))

    loadSuite.children.add(testController.createTestItem(
        'load.typescript',
        'should load TypeScript parser for .ts and .tsx files'
    ))

    loadSuite.children.add(testController.createTestItem(
        'load.python',
        'should load Python parser for .py files'
    ))

    loadSuite.children.add(testController.createTestItem(
        'load.multiple',
        'should load multiple language parsers as needed'
    ))

    loadSuite.children.add(testController.createTestItem(
        'load.cpp',
        'should handle C/C++ files correctly'
    ))

    loadSuite.children.add(testController.createTestItem(
        'load.once',
        'should load each language only once for multiple files'
    ))

    // Error tests
    const errorSuite = testController.createTestItem('error', 'Error Handling')
    rootSuite.children.add(errorSuite)

    errorSuite.children.add(testController.createTestItem(
        'error.unsupported',
        'should throw error for unsupported file extensions'
    ))

    // Language setting tests
    const setSuite = testController.createTestItem('set', 'Language Setting')
    rootSuite.children.add(setSuite)

    setSuite.children.add(testController.createTestItem(
        'set.language',
        'should set language for each parser instance'
    ))
}
