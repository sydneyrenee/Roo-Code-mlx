import * as vscode from 'vscode';
import * as assert from 'assert';
import { loadRequiredLanguageParsers } from "../../../../services/tree-sitter/languageParser";
import Parser from "web-tree-sitter";
import { createTestController } from '../../testController';
import { TestUtils } from '../../../testUtils';

// Define Parser interface to avoid circular reference
interface TreeSitterParser {
    new(): any;
    init(): Promise<void>;
    Language: {
        load(path: string): Promise<any>;
    };
}

// Extend global to include Parser
declare global {
    var Parser: TreeSitterParser;
}

// Mock Parser class
class MockParser {
    private static _initialized = false;
    private static _loadedLanguages = new Map<string, any>();
    private static _setLanguageCalls = 0;

    constructor() {
        return {
            setLanguage: () => {
                MockParser._setLanguageCalls++;
            }
        };
    }

    static init(): Promise<void> {
        MockParser._initialized = true;
        return Promise.resolve();
    }

    static get initialized(): boolean {
        return MockParser._initialized;
    }

    static reset(): void {
        MockParser._initialized = false;
        MockParser._loadedLanguages.clear();
        MockParser._setLanguageCalls = 0;
    }

    static get setLanguageCalls(): number {
        return MockParser._setLanguageCalls;
    }

    static Language = {
        load(path: string): Promise<any> {
            MockParser._loadedLanguages.set(path, {
                query: () => "mockQuery"
            });
            return Promise.resolve(MockParser._loadedLanguages.get(path));
        },
        getLoadedLanguages(): Map<string, any> {
            return MockParser._loadedLanguages;
        }
    };
}

// Add static methods to constructor
(MockParser as unknown as TreeSitterParser).init = MockParser.init;
(MockParser as unknown as TreeSitterParser).Language = MockParser.Language;

const controller = createTestController('languageParserTests', 'Language Parser Tests');

// Root test item for Language Parser
const languageParserTests = controller.createTestItem('languageParser', 'Language Parser', vscode.Uri.file(__filename));
controller.items.add(languageParserTests);

// Initialize tests
const initTests = controller.createTestItem('init', 'Initialization', vscode.Uri.file(__filename));
languageParserTests.children.add(initTests);

// Mock web-tree-sitter
const originalParser = global.Parser;

// Test for initializing parser only once
initTests.children.add(
    TestUtils.createTest(
        controller,
        'once',
        'should initialize parser only once',
        vscode.Uri.file(__filename),
        async run => {
            try {
                // Reset mock before test
                MockParser.reset();
                
                // Set mock parser
                global.Parser = MockParser as unknown as TreeSitterParser;
                
                const files = ["test.js", "test2.js"];
                await loadRequiredLanguageParsers(files);
                await loadRequiredLanguageParsers(files);

                assert.strictEqual(MockParser.initialized, true);
            } finally {
                // Restore original parser
                global.Parser = originalParser;
            }
        }
    )
);

// Loading tests
const loadTests = controller.createTestItem('load', 'Loading Languages', vscode.Uri.file(__filename));
languageParserTests.children.add(loadTests);

// Test for loading JavaScript parser
loadTests.children.add(
    TestUtils.createTest(
        controller,
        'javascript',
        'should load JavaScript parser for .js and .jsx files',
        vscode.Uri.file(__filename),
        async run => {
            try {
                // Reset mock before test
                MockParser.reset();
                
                // Set mock parser
                global.Parser = MockParser as unknown as TreeSitterParser;
                
                const files = ["test.js", "test.jsx"];
                const parsers = await loadRequiredLanguageParsers(files);

                const loadedLanguages = MockParser.Language.getLoadedLanguages();
                assert.ok(Array.from(loadedLanguages.keys()).some(path => 
                    path.includes("tree-sitter-javascript.wasm")
                ));
                assert.ok(parsers.js);
                assert.ok(parsers.jsx);
                assert.ok(parsers.js.query);
                assert.ok(parsers.jsx.query);
            } finally {
                // Restore original parser
                global.Parser = originalParser;
            }
        }
    )
);

// Test for loading TypeScript parser
loadTests.children.add(
    TestUtils.createTest(
        controller,
        'typescript',
        'should load TypeScript parser for .ts and .tsx files',
        vscode.Uri.file(__filename),
        async run => {
            try {
                // Reset mock before test
                MockParser.reset();
                
                // Set mock parser
                global.Parser = MockParser as unknown as TreeSitterParser;
                
                const files = ["test.ts", "test.tsx"];
                const parsers = await loadRequiredLanguageParsers(files);

                const loadedLanguages = MockParser.Language.getLoadedLanguages();
                assert.ok(Array.from(loadedLanguages.keys()).some(path => 
                    path.includes("tree-sitter-typescript.wasm")
                ));
                assert.ok(Array.from(loadedLanguages.keys()).some(path => 
                    path.includes("tree-sitter-tsx.wasm")
                ));
                assert.ok(parsers.ts);
                assert.ok(parsers.tsx);
            } finally {
                // Restore original parser
                global.Parser = originalParser;
            }
        }
    )
);

// Test for loading Python parser
loadTests.children.add(
    TestUtils.createTest(
        controller,
        'python',
        'should load Python parser for .py files',
        vscode.Uri.file(__filename),
        async run => {
            try {
                // Reset mock before test
                MockParser.reset();
                
                // Set mock parser
                global.Parser = MockParser as unknown as TreeSitterParser;
                
                const files = ["test.py"];
                const parsers = await loadRequiredLanguageParsers(files);

                const loadedLanguages = MockParser.Language.getLoadedLanguages();
                assert.ok(Array.from(loadedLanguages.keys()).some(path => 
                    path.includes("tree-sitter-python.wasm")
                ));
                assert.ok(parsers.py);
            } finally {
                // Restore original parser
                global.Parser = originalParser;
            }
        }
    )
);

// Test for loading multiple language parsers
loadTests.children.add(
    TestUtils.createTest(
        controller,
        'multiple',
        'should load multiple language parsers as needed',
        vscode.Uri.file(__filename),
        async run => {
            try {
                // Reset mock before test
                MockParser.reset();
                
                // Set mock parser
                global.Parser = MockParser as unknown as TreeSitterParser;
                
                const files = ["test.js", "test.py", "test.rs", "test.go"];
                const parsers = await loadRequiredLanguageParsers(files);

                const loadedLanguages = MockParser.Language.getLoadedLanguages();
                assert.strictEqual(loadedLanguages.size, 4);
                assert.ok(parsers.js);
                assert.ok(parsers.py);
                assert.ok(parsers.rs);
                assert.ok(parsers.go);
            } finally {
                // Restore original parser
                global.Parser = originalParser;
            }
        }
    )
);

// Test for handling C/C++ files correctly
loadTests.children.add(
    TestUtils.createTest(
        controller,
        'cpp',
        'should handle C/C++ files correctly',
        vscode.Uri.file(__filename),
        async run => {
            try {
                // Reset mock before test
                MockParser.reset();
                
                // Set mock parser
                global.Parser = MockParser as unknown as TreeSitterParser;
                
                const files = ["test.c", "test.h", "test.cpp", "test.hpp"];
                const parsers = await loadRequiredLanguageParsers(files);

                const loadedLanguages = MockParser.Language.getLoadedLanguages();
                assert.ok(Array.from(loadedLanguages.keys()).some(path => 
                    path.includes("tree-sitter-c.wasm")
                ));
                assert.ok(Array.from(loadedLanguages.keys()).some(path => 
                    path.includes("tree-sitter-cpp.wasm")
                ));
                assert.ok(parsers.c);
                assert.ok(parsers.h);
                assert.ok(parsers.cpp);
                assert.ok(parsers.hpp);
            } finally {
                // Restore original parser
                global.Parser = originalParser;
            }
        }
    )
);

// Test for loading each language only once
loadTests.children.add(
    TestUtils.createTest(
        controller,
        'once',
        'should load each language only once for multiple files',
        vscode.Uri.file(__filename),
        async run => {
            try {
                // Reset mock before test
                MockParser.reset();
                
                // Set mock parser
                global.Parser = MockParser as unknown as TreeSitterParser;
                
                const files = ["test1.js", "test2.js", "test3.js"];
                await loadRequiredLanguageParsers(files);

                const loadedLanguages = MockParser.Language.getLoadedLanguages();
                assert.strictEqual(loadedLanguages.size, 1);
                assert.ok(Array.from(loadedLanguages.keys()).some(path => 
                    path.includes("tree-sitter-javascript.wasm")
                ));
            } finally {
                // Restore original parser
                global.Parser = originalParser;
            }
        }
    )
);

// Error tests
const errorTests = controller.createTestItem('error', 'Error Handling', vscode.Uri.file(__filename));
languageParserTests.children.add(errorTests);

// Test for handling unsupported file extensions
errorTests.children.add(
    TestUtils.createTest(
        controller,
        'unsupported',
        'should throw error for unsupported file extensions',
        vscode.Uri.file(__filename),
        async run => {
            try {
                // Reset mock before test
                MockParser.reset();
                
                // Set mock parser
                global.Parser = MockParser as unknown as TreeSitterParser;
                
                const files = ["test.unsupported"];
                await assert.rejects(
                    () => loadRequiredLanguageParsers(files),
                    /Unsupported language: unsupported/
                );
            } finally {
                // Restore original parser
                global.Parser = originalParser;
            }
        }
    )
);

// Language setting tests
const setTests = controller.createTestItem('set', 'Language Setting', vscode.Uri.file(__filename));
languageParserTests.children.add(setTests);

// Test for setting language for each parser instance
setTests.children.add(
    TestUtils.createTest(
        controller,
        'language',
        'should set language for each parser instance',
        vscode.Uri.file(__filename),
        async run => {
            try {
                // Reset mock before test
                MockParser.reset();
                
                // Set mock parser
                global.Parser = MockParser as unknown as TreeSitterParser;
                
                const files = ["test.js", "test.py"];
                await loadRequiredLanguageParsers(files);

                assert.strictEqual(MockParser.setLanguageCalls, 2);
            } finally {
                // Restore original parser
                global.Parser = originalParser;
            }
        }
    )
);

export function activate() {
    return controller;
}
