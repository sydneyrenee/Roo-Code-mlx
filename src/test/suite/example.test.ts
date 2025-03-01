import * as vscode from 'vscode';
import * as assert from 'assert';
import { TestUtils } from '../testUtils';

// Create test controller for this test suite
const controller = vscode.tests.createTestController('exampleTests', 'Example Tests');

// Root test item for example tests
const exampleTests = controller.createTestItem('example', 'Example', vscode.Uri.file(__filename));
controller.items.add(exampleTests);

// Test group
const utilsTests = controller.createTestItem('utils', 'Utils', vscode.Uri.file(__filename));
exampleTests.children.add(utilsTests);

// Individual tests
utilsTests.children.add(
    TestUtils.createTest(
        controller,
        'format',
        'should format string correctly',
        vscode.Uri.file(__filename),
        async run => {
            const input = 'test';
            assert.strictEqual(input.toUpperCase(), 'TEST');
        }
    )
);

utilsTests.children.add(
    TestUtils.createTest(
        controller,
        'async',
        'should handle async operations',
        vscode.Uri.file(__filename),
        async run => {
            const result = await Promise.resolve('success');
            assert.strictEqual(result, 'success');
        }
    )
);

// Test setup and cleanup
utilsTests.children.add(
    TestUtils.createTest(
        controller,
        'cleanup',
        'should clean up resources',
        vscode.Uri.file(__filename),
        async run => {
            // Setup
            const testFile = '/test/file.txt';
            await vscode.workspace.fs.writeFile(
                vscode.Uri.file(testFile),
                Buffer.from('test')
            );

            try {
                const content = await vscode.workspace.fs.readFile(vscode.Uri.file(testFile));
                assert.strictEqual(Buffer.from(content).toString(), 'test');
            } finally {
                // Cleanup
                await vscode.workspace.fs.delete(vscode.Uri.file(testFile));
            }
        }
    )
);