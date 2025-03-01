import * as vscode from 'vscode';
import * as assert from 'assert';
import { parseSourceCodeForDefinitionsTopLevel } from "../../../../services/tree-sitter/index";
import { listFiles } from "../../../../services/glob/list-files";
import { loadRequiredLanguageParsers } from "../../../../services/tree-sitter/languageParser";
import { fileExistsAtPath } from "../../../../utils/fs";
import * as fs from "fs/promises";
import * as path from "path";
import { createTestController } from '../../testController';
import { TestUtils } from '../../../testUtils';

// Mock types
interface MockParser {
    parse(): { rootNode: string };
}

interface MockQuery {
    captures(): MockCapture[];
}

interface MockCapture {
    node: {
        startPosition: { row: number };
        endPosition: { row: number };
    };
    name: string;
}

const controller = createTestController('treeSitterTests', 'Tree Sitter Tests');

// Root test item for Tree Sitter
const treeSitterTests = controller.createTestItem('treeSitter', 'Tree Sitter', vscode.Uri.file(__filename));
controller.items.add(treeSitterTests);

// Parse tests
const parseTests = controller.createTestItem('parse', 'Source Code Parsing', vscode.Uri.file(__filename));
treeSitterTests.children.add(parseTests);

// Store original functions
const originalListFiles = listFiles;
const originalLoadParsers = loadRequiredLanguageParsers;
const originalFileExists = fileExistsAtPath;
const originalReadFile = fs.readFile;

// Test for handling non-existent directory
parseTests.children.add(
    TestUtils.createTest(
        controller,
        'nonexistent',
        'should handle non-existent directory',
        vscode.Uri.file(__filename),
        async run => {
            // Reset mocks before test
            let mockFileExists = false;
            let mockFiles: string[] = [];
            let mockFileContent = "";
            let mockParserThrows = false;
            let parseCount = 0;

            const mockParser: MockParser = {
                parse: () => {
                    if (mockParserThrows) {
                        throw new Error("Parsing error");
                    }
                    parseCount++;
                    return { rootNode: "mockNode" };
                }
            };

            const mockQuery: MockQuery = {
                captures: () => [] as MockCapture[]
            };

            try {
                // Override functions with mocks
                (global as any).listFiles = async () => [mockFiles, new Set()];
                (global as any).loadRequiredLanguageParsers = async () => ({
                    ts: { parser: mockParser, query: mockQuery },
                    tsx: { parser: mockParser, query: mockQuery },
                    js: { parser: mockParser, query: mockQuery },
                    py: { parser: mockParser, query: mockQuery },
                    rs: { parser: mockParser, query: mockQuery },
                    cpp: { parser: mockParser, query: mockQuery },
                    go: { parser: mockParser, query: mockQuery }
                });
                (global as any).fileExistsAtPath = async () => mockFileExists;
                (global as any).readFile = async () => mockFileContent;

                const result = await parseSourceCodeForDefinitionsTopLevel("/non/existent/path");
                assert.strictEqual(result, "This directory does not exist or you do not have permission to access it.");
            } finally {
                // Restore original functions
                (global as any).listFiles = originalListFiles;
                (global as any).loadRequiredLanguageParsers = originalLoadParsers;
                (global as any).fileExistsAtPath = originalFileExists;
                (global as any).readFile = originalReadFile;
            }
        }
    )
);

// Test for handling empty directory
parseTests.children.add(
    TestUtils.createTest(
        controller,
        'empty',
        'should handle empty directory',
        vscode.Uri.file(__filename),
        async run => {
            // Reset mocks before test
            let mockFileExists = true;
            let mockFiles: string[] = [];
            let mockFileContent = "";
            let mockParserThrows = false;
            let parseCount = 0;

            const mockParser: MockParser = {
                parse: () => {
                    if (mockParserThrows) {
                        throw new Error("Parsing error");
                    }
                    parseCount++;
                    return { rootNode: "mockNode" };
                }
            };

            const mockQuery: MockQuery = {
                captures: () => [] as MockCapture[]
            };

            try {
                // Override functions with mocks
                (global as any).listFiles = async () => [mockFiles, new Set()];
                (global as any).loadRequiredLanguageParsers = async () => ({
                    ts: { parser: mockParser, query: mockQuery },
                    tsx: { parser: mockParser, query: mockQuery },
                    js: { parser: mockParser, query: mockQuery },
                    py: { parser: mockParser, query: mockQuery },
                    rs: { parser: mockParser, query: mockQuery },
                    cpp: { parser: mockParser, query: mockQuery },
                    go: { parser: mockParser, query: mockQuery }
                });
                (global as any).fileExistsAtPath = async () => mockFileExists;
                (global as any).readFile = async () => mockFileContent;

                const result = await parseSourceCodeForDefinitionsTopLevel("/test/path");
                assert.strictEqual(result, "No source code definitions found.");
            } finally {
                // Restore original functions
                (global as any).listFiles = originalListFiles;
                (global as any).loadRequiredLanguageParsers = originalLoadParsers;
                (global as any).fileExistsAtPath = originalFileExists;
                (global as any).readFile = originalReadFile;
            }
        }
    )
);

// Test for parsing TypeScript files correctly
parseTests.children.add(
    TestUtils.createTest(
        controller,
        'typescript',
        'should parse TypeScript files correctly',
        vscode.Uri.file(__filename),
        async run => {
            // Reset mocks before test
            let mockFileExists = true;
            let mockFiles: string[] = ["/test/path/file1.ts", "/test/path/file2.tsx", "/test/path/readme.md"];
            let mockFileContent = "export class TestClass {\n  constructor() {}\n}";
            let mockParserThrows = false;
            let parseCount = 0;

            const mockParser: MockParser = {
                parse: () => {
                    if (mockParserThrows) {
                        throw new Error("Parsing error");
                    }
                    parseCount++;
                    return { rootNode: "mockNode" };
                }
            };

            const mockQuery: MockQuery = {
                captures: () => [{
                    node: {
                        startPosition: { row: 0 },
                        endPosition: { row: 0 }
                    },
                    name: "name.definition"
                }]
            };

            try {
                // Override functions with mocks
                (global as any).listFiles = async () => [mockFiles, new Set()];
                (global as any).loadRequiredLanguageParsers = async () => ({
                    ts: { parser: mockParser, query: mockQuery },
                    tsx: { parser: mockParser, query: mockQuery },
                    js: { parser: mockParser, query: mockQuery },
                    py: { parser: mockParser, query: mockQuery },
                    rs: { parser: mockParser, query: mockQuery },
                    cpp: { parser: mockParser, query: mockQuery },
                    go: { parser: mockParser, query: mockQuery }
                });
                (global as any).fileExistsAtPath = async () => mockFileExists;
                (global as any).readFile = async () => mockFileContent;

                const result = await parseSourceCodeForDefinitionsTopLevel("/test/path");
                assert.ok(result.includes("file1.ts"));
                assert.ok(result.includes("file2.tsx"));
                assert.ok(!result.includes("readme.md"));
                assert.ok(result.includes("export class TestClass"));
            } finally {
                // Restore original functions
                (global as any).listFiles = originalListFiles;
                (global as any).loadRequiredLanguageParsers = originalLoadParsers;
                (global as any).fileExistsAtPath = originalFileExists;
                (global as any).readFile = originalReadFile;
            }
        }
    )
);

// Test for handling multiple definition types
parseTests.children.add(
    TestUtils.createTest(
        controller,
        'definitions',
        'should handle multiple definition types',
        vscode.Uri.file(__filename),
        async run => {
            // Reset mocks before test
            let mockFileExists = true;
            let mockFiles: string[] = ["/test/path/file.ts"];
            let mockFileContent = "class TestClass {\n  constructor() {}\n  testMethod() {}\n}";
            let mockParserThrows = false;
            let parseCount = 0;

            const mockParser: MockParser = {
                parse: () => {
                    if (mockParserThrows) {
                        throw new Error("Parsing error");
                    }
                    parseCount++;
                    return { rootNode: "mockNode" };
                }
            };

            const mockQuery: MockQuery = {
                captures: () => [{
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
            };

            try {
                // Override functions with mocks
                (global as any).listFiles = async () => [mockFiles, new Set()];
                (global as any).loadRequiredLanguageParsers = async () => ({
                    ts: { parser: mockParser, query: mockQuery },
                    tsx: { parser: mockParser, query: mockQuery },
                    js: { parser: mockParser, query: mockQuery },
                    py: { parser: mockParser, query: mockQuery },
                    rs: { parser: mockParser, query: mockQuery },
                    cpp: { parser: mockParser, query: mockQuery },
                    go: { parser: mockParser, query: mockQuery }
                });
                (global as any).fileExistsAtPath = async () => mockFileExists;
                (global as any).readFile = async () => mockFileContent;

                const result = await parseSourceCodeForDefinitionsTopLevel("/test/path");
                assert.ok(result.includes("class TestClass"));
                assert.ok(result.includes("testMethod()"));
                assert.ok(result.includes("|----"));
            } finally {
                // Restore original functions
                (global as any).listFiles = originalListFiles;
                (global as any).loadRequiredLanguageParsers = originalLoadParsers;
                (global as any).fileExistsAtPath = originalFileExists;
                (global as any).readFile = originalReadFile;
            }
        }
    )
);

// Test for handling parsing errors gracefully
parseTests.children.add(
    TestUtils.createTest(
        controller,
        'error',
        'should handle parsing errors gracefully',
        vscode.Uri.file(__filename),
        async run => {
            // Reset mocks before test
            let mockFileExists = true;
            let mockFiles: string[] = ["/test/path/file.ts"];
            let mockFileContent = "invalid code";
            let mockParserThrows = true;
            let parseCount = 0;

            const mockParser: MockParser = {
                parse: () => {
                    if (mockParserThrows) {
                        throw new Error("Parsing error");
                    }
                    parseCount++;
                    return { rootNode: "mockNode" };
                }
            };

            const mockQuery: MockQuery = {
                captures: () => [] as MockCapture[]
            };

            try {
                // Override functions with mocks
                (global as any).listFiles = async () => [mockFiles, new Set()];
                (global as any).loadRequiredLanguageParsers = async () => ({
                    ts: { parser: mockParser, query: mockQuery },
                    tsx: { parser: mockParser, query: mockQuery },
                    js: { parser: mockParser, query: mockQuery },
                    py: { parser: mockParser, query: mockQuery },
                    rs: { parser: mockParser, query: mockQuery },
                    cpp: { parser: mockParser, query: mockQuery },
                    go: { parser: mockParser, query: mockQuery }
                });
                (global as any).fileExistsAtPath = async () => mockFileExists;
                (global as any).readFile = async () => mockFileContent;

                const result = await parseSourceCodeForDefinitionsTopLevel("/test/path");
                assert.strictEqual(result, "No source code definitions found.");
            } finally {
                // Restore original functions
                (global as any).listFiles = originalListFiles;
                (global as any).loadRequiredLanguageParsers = originalLoadParsers;
                (global as any).fileExistsAtPath = originalFileExists;
                (global as any).readFile = originalReadFile;
            }
        }
    )
);

// Test for respecting file limit
parseTests.children.add(
    TestUtils.createTest(
        controller,
        'limit',
        'should respect file limit',
        vscode.Uri.file(__filename),
        async run => {
            // Reset mocks before test
            let mockFileExists = true;
            let mockFiles: string[] = Array(100).fill(0).map((_, i) => `/test/path/file${i}.ts`);
            let mockFileContent = "";
            let mockParserThrows = false;
            let parseCount = 0;

            const mockParser: MockParser = {
                parse: () => {
                    if (mockParserThrows) {
                        throw new Error("Parsing error");
                    }
                    parseCount++;
                    return { rootNode: "mockNode" };
                }
            };

            const mockQuery: MockQuery = {
                captures: () => [] as MockCapture[]
            };

            try {
                // Override functions with mocks
                (global as any).listFiles = async () => [mockFiles, new Set()];
                (global as any).loadRequiredLanguageParsers = async () => ({
                    ts: { parser: mockParser, query: mockQuery },
                    tsx: { parser: mockParser, query: mockQuery },
                    js: { parser: mockParser, query: mockQuery },
                    py: { parser: mockParser, query: mockQuery },
                    rs: { parser: mockParser, query: mockQuery },
                    cpp: { parser: mockParser, query: mockQuery },
                    go: { parser: mockParser, query: mockQuery }
                });
                (global as any).fileExistsAtPath = async () => mockFileExists;
                (global as any).readFile = async () => mockFileContent;

                await parseSourceCodeForDefinitionsTopLevel("/test/path");
                assert.strictEqual(parseCount, 50);
            } finally {
                // Restore original functions
                (global as any).listFiles = originalListFiles;
                (global as any).loadRequiredLanguageParsers = originalLoadParsers;
                (global as any).fileExistsAtPath = originalFileExists;
                (global as any).readFile = originalReadFile;
            }
        }
    )
);

// Test for handling various supported file extensions
parseTests.children.add(
    TestUtils.createTest(
        controller,
        'extensions',
        'should handle various supported file extensions',
        vscode.Uri.file(__filename),
        async run => {
            // Reset mocks before test
            let mockFileExists = true;
            let mockFiles: string[] = [
                "/test/path/script.js",
                "/test/path/app.py",
                "/test/path/main.rs",
                "/test/path/program.cpp",
                "/test/path/code.go"
            ];
            let mockFileContent = "function test() {}";
            let mockParserThrows = false;
            let parseCount = 0;

            const mockParser: MockParser = {
                parse: () => {
                    if (mockParserThrows) {
                        throw new Error("Parsing error");
                    }
                    parseCount++;
                    return { rootNode: "mockNode" };
                }
            };

            const mockQuery: MockQuery = {
                captures: () => [{
                    node: {
                        startPosition: { row: 0 },
                        endPosition: { row: 0 }
                    },
                    name: "name"
                }]
            };

            try {
                // Override functions with mocks
                (global as any).listFiles = async () => [mockFiles, new Set()];
                (global as any).loadRequiredLanguageParsers = async () => ({
                    ts: { parser: mockParser, query: mockQuery },
                    tsx: { parser: mockParser, query: mockQuery },
                    js: { parser: mockParser, query: mockQuery },
                    py: { parser: mockParser, query: mockQuery },
                    rs: { parser: mockParser, query: mockQuery },
                    cpp: { parser: mockParser, query: mockQuery },
                    go: { parser: mockParser, query: mockQuery }
                });
                (global as any).fileExistsAtPath = async () => mockFileExists;
                (global as any).readFile = async () => mockFileContent;

                const result = await parseSourceCodeForDefinitionsTopLevel("/test/path");
                assert.ok(result.includes("script.js"));
                assert.ok(result.includes("app.py"));
                assert.ok(result.includes("main.rs"));
                assert.ok(result.includes("program.cpp"));
                assert.ok(result.includes("code.go"));
            } finally {
                // Restore original functions
                (global as any).listFiles = originalListFiles;
                (global as any).loadRequiredLanguageParsers = originalLoadParsers;
                (global as any).fileExistsAtPath = originalFileExists;
                (global as any).readFile = originalReadFile;
            }
        }
    )
);

// Test for normalizing paths in output
parseTests.children.add(
    TestUtils.createTest(
        controller,
        'normalize',
        'should normalize paths in output',
        vscode.Uri.file(__filename),
        async run => {
            // Reset mocks before test
            let mockFileExists = true;
            let mockFiles: string[] = ["/test/path/dir\\file.ts"];
            let mockFileContent = "class Test {}";
            let mockParserThrows = false;
            let parseCount = 0;

            const mockParser: MockParser = {
                parse: () => {
                    if (mockParserThrows) {
                        throw new Error("Parsing error");
                    }
                    parseCount++;
                    return { rootNode: "mockNode" };
                }
            };

            const mockQuery: MockQuery = {
                captures: () => [{
                    node: {
                        startPosition: { row: 0 },
                        endPosition: { row: 0 }
                    },
                    name: "name"
                }]
            };

            try {
                // Override functions with mocks
                (global as any).listFiles = async () => [mockFiles, new Set()];
                (global as any).loadRequiredLanguageParsers = async () => ({
                    ts: { parser: mockParser, query: mockQuery },
                    tsx: { parser: mockParser, query: mockQuery },
                    js: { parser: mockParser, query: mockQuery },
                    py: { parser: mockParser, query: mockQuery },
                    rs: { parser: mockParser, query: mockQuery },
                    cpp: { parser: mockParser, query: mockQuery },
                    go: { parser: mockParser, query: mockQuery }
                });
                (global as any).fileExistsAtPath = async () => mockFileExists;
                (global as any).readFile = async () => mockFileContent;

                const result = await parseSourceCodeForDefinitionsTopLevel("/test/path");
                assert.ok(result.includes("dir/file.ts"));
                assert.ok(!result.includes("dir\\file.ts"));
            } finally {
                // Restore original functions
                (global as any).listFiles = originalListFiles;
                (global as any).loadRequiredLanguageParsers = originalLoadParsers;
                (global as any).fileExistsAtPath = originalFileExists;
                (global as any).readFile = originalReadFile;
            }
        }
    )
);

export function activate() {
    return controller;
}
