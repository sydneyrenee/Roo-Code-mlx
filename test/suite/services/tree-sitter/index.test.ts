import * as vscode from 'vscode';
import * as assert from 'assert';
import { parseSourceCodeForDefinitionsTopLevel } from '../../../../services/tree-sitter';
import { listFiles } from '../../../../services/glob/list-files';
import { loadRequiredLanguageParsers } from '../../../../services/tree-sitter/languageParser';
import { fileExistsAtPath } from '../../../../utils/fs';
import * as fs from 'fs/promises';

suite('Tree-sitter Service Tests', () => {
    const testController = vscode.test.createTestController('treeSitterTests', 'Tree-sitter Service Tests');
    const rootSuite = testController.createTestItem('root', 'Tree-sitter Parser Tests');

    setup(() => {
        // Reset all mocks before each test
        jest.resetAllMocks();
        (fileExistsAtPath as jest.Mock).mockResolvedValue(true);
    });

    const parsingTestSuite = testController.createTestItem('parsing', 'Source Code Parsing');
    rootSuite.children.add(parsingTestSuite);

    parsingTestSuite.children.add(
        testController.createTestItem('nonExistentDir', 'handles non-existent directory', async run => {
            (fileExistsAtPath as jest.Mock).mockResolvedValue(false);
            const result = await parseSourceCodeForDefinitionsTopLevel('/non/existent/path');
            assert.strictEqual(result, 'This directory does not exist or you do not have permission to access it.');
            run.passed();
        })
    );

    parsingTestSuite.children.add(
        testController.createTestItem('emptyDir', 'handles empty directory', async run => {
            (listFiles as jest.Mock).mockResolvedValue([[], new Set()]);
            const result = await parseSourceCodeForDefinitionsTopLevel('/test/path');
            assert.strictEqual(result, 'No source code definitions found.');
            run.passed();
        })
    );

    parsingTestSuite.children.add(
        testController.createTestItem('typescriptParsing', 'parses TypeScript files correctly', async run => {
            const mockFiles = ['/test/path/file1.ts', '/test/path/file2.tsx', '/test/path/readme.md'];
            (listFiles as jest.Mock).mockResolvedValue([mockFiles, new Set()]);
            
            const mockParser = {
                parse: jest.fn().mockReturnValue({ rootNode: 'mockNode' })
            };
            
            const mockQuery = {
                captures: jest.fn().mockReturnValue([{
                    node: {
                        startPosition: { row: 0 },
                        endPosition: { row: 0 }
                    },
                    name: 'name.definition'
                }])
            };

            (loadRequiredLanguageParsers as jest.Mock).mockResolvedValue({
                ts: { parser: mockParser, query: mockQuery },
                tsx: { parser: mockParser, query: mockQuery }
            });

            (fs.readFile as jest.Mock).mockResolvedValue('export class TestClass {\n  constructor() {}\n}');

            const result = await parseSourceCodeForDefinitionsTopLevel('/test/path');
            
            assert.ok(result.includes('file1.ts'));
            assert.ok(result.includes('file2.tsx'));
            assert.ok(!result.includes('readme.md'));
            assert.ok(result.includes('export class TestClass'));
            
            run.passed();
        })
    );

    parsingTestSuite.children.add(
        testController.createTestItem('multiLanguage', 'handles various supported file extensions', async run => {
            const mockFiles = [
                '/test/path/script.js',
                '/test/path/app.py',
                '/test/path/main.rs',
                '/test/path/program.cpp',
                '/test/path/code.go'
            ];
            
            (listFiles as jest.Mock).mockResolvedValue([mockFiles, new Set()]);
            
            const mockParser = {
                parse: jest.fn().mockReturnValue({ rootNode: 'mockNode' })
            };
            
            const mockQuery = {
                captures: jest.fn().mockReturnValue([{
                    node: {
                        startPosition: { row: 0 },
                        endPosition: { row: 0 }
                    },
                    name: 'name'
                }])
            };

            (loadRequiredLanguageParsers as jest.Mock).mockResolvedValue({
                js: { parser: mockParser, query: mockQuery },
                py: { parser: mockParser, query: mockQuery },
                rs: { parser: mockParser, query: mockQuery },
                cpp: { parser: mockParser, query: mockQuery },
                go: { parser: mockParser, query: mockQuery }
            });

            (fs.readFile as jest.Mock).mockResolvedValue('function test() {}');

            const result = await parseSourceCodeForDefinitionsTopLevel('/test/path');
            
            assert.ok(result.includes('script.js'));
            assert.ok(result.includes('app.py'));
            assert.ok(result.includes('main.rs'));
            assert.ok(result.includes('program.cpp'));
            assert.ok(result.includes('code.go'));
            
            run.passed();
        })
    );

    parsingTestSuite.children.add(
        testController.createTestItem('errorHandling', 'handles parsing errors gracefully', async run => {
            const mockFiles = ['/test/path/file.ts'];
            (listFiles as jest.Mock).mockResolvedValue([mockFiles, new Set()]);
            
            const mockParser = {
                parse: jest.fn().mockImplementation(() => {
                    throw new Error('Parsing error');
                })
            };
            
            const mockQuery = { captures: jest.fn() };

            (loadRequiredLanguageParsers as jest.Mock).mockResolvedValue({
                ts: { parser: mockParser, query: mockQuery }
            });

            (fs.readFile as jest.Mock).mockResolvedValue('invalid code');

            const result = await parseSourceCodeForDefinitionsTopLevel('/test/path');
            assert.strictEqual(result, 'No source code definitions found.');
            
            run.passed();
        })
    );

    // Add tests to controller
    testController.items.add(rootSuite);
});