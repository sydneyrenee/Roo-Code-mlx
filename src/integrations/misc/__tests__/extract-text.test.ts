import * as vscode from 'vscode';
import * as assert from 'assert';
import { addLineNumbers, everyLineHasLineNumbers, stripLineNumbers, truncateOutput } from "../extract-text";
import { TestUtils } from '../../../test/testUtils';

export async function activateExtractTextTests(context: vscode.ExtensionContext): Promise<void> {
    // Create test controller
    const testController = TestUtils.createTestController('extractTextTests', 'Extract Text Tests');
    context.subscriptions.push(testController);

    // Root test suite
    const rootSuite = testController.createTestItem('extract-text', 'Extract Text');
    testController.items.add(rootSuite);

    // Test suites
    const addLineNumbersSuite = testController.createTestItem('add-line-numbers-tests', 'addLineNumbers');
    const everyLineHasLineNumbersSuite = testController.createTestItem('every-line-has-line-numbers-tests', 'everyLineHasLineNumbers');
    const stripLineNumbersSuite = testController.createTestItem('strip-line-numbers-tests', 'stripLineNumbers');
    const truncateOutputSuite = testController.createTestItem('truncate-output-tests', 'truncateOutput');
    
    rootSuite.children.add(addLineNumbersSuite);
    rootSuite.children.add(everyLineHasLineNumbersSuite);
    rootSuite.children.add(stripLineNumbersSuite);
    rootSuite.children.add(truncateOutputSuite);

    // addLineNumbers tests
    addLineNumbersSuite.children.add(
        TestUtils.createTest(
            testController,
            'default-line-numbers',
            'should add line numbers starting from 1 by default',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const input = "line 1\nline 2\nline 3";
                const expected = "1 | line 1\n2 | line 2\n3 | line 3";
                const result = addLineNumbers(input);
                assert.strictEqual(result, expected);
            }
        )
    );

    addLineNumbersSuite.children.add(
        TestUtils.createTest(
            testController,
            'specified-start-line',
            'should add line numbers starting from specified line number',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const input = "line 1\nline 2\nline 3";
                const expected = "10 | line 1\n11 | line 2\n12 | line 3";
                const result = addLineNumbers(input, 10);
                assert.strictEqual(result, expected);
            }
        )
    );

    addLineNumbersSuite.children.add(
        TestUtils.createTest(
            testController,
            'empty-content',
            'should handle empty content',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                assert.strictEqual(addLineNumbers(""), "1 | ");
                assert.strictEqual(addLineNumbers("", 5), "5 | ");
            }
        )
    );

    addLineNumbersSuite.children.add(
        TestUtils.createTest(
            testController,
            'single-line-content',
            'should handle single line content',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                assert.strictEqual(addLineNumbers("single line"), "1 | single line");
                assert.strictEqual(addLineNumbers("single line", 42), "42 | single line");
            }
        )
    );

    addLineNumbersSuite.children.add(
        TestUtils.createTest(
            testController,
            'padding-line-numbers',
            'should pad line numbers based on the highest line number',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const input = "line 1\nline 2";
                // When starting from 99, highest line will be 100, so needs 3 spaces padding
                const expected = " 99 | line 1\n100 | line 2";
                const result = addLineNumbers(input, 99);
                assert.strictEqual(result, expected);
            }
        )
    );

    // everyLineHasLineNumbers tests
    everyLineHasLineNumbersSuite.children.add(
        TestUtils.createTest(
            testController,
            'content-with-line-numbers',
            'should return true for content with line numbers',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const input = "1 | line one\n2 | line two\n3 | line three";
                const result = everyLineHasLineNumbers(input);
                assert.strictEqual(result, true);
            }
        )
    );

    everyLineHasLineNumbersSuite.children.add(
        TestUtils.createTest(
            testController,
            'content-with-padded-line-numbers',
            'should return true for content with padded line numbers',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const input = "  1 | line one\n  2 | line two\n  3 | line three";
                const result = everyLineHasLineNumbers(input);
                assert.strictEqual(result, true);
            }
        )
    );

    everyLineHasLineNumbersSuite.children.add(
        TestUtils.createTest(
            testController,
            'content-without-line-numbers',
            'should return false for content without line numbers',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const input = "line one\nline two\nline three";
                const result = everyLineHasLineNumbers(input);
                assert.strictEqual(result, false);
            }
        )
    );

    everyLineHasLineNumbersSuite.children.add(
        TestUtils.createTest(
            testController,
            'mixed-content',
            'should return false for mixed content',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const input = "1 | line one\nline two\n3 | line three";
                const result = everyLineHasLineNumbers(input);
                assert.strictEqual(result, false);
            }
        )
    );

    everyLineHasLineNumbersSuite.children.add(
        TestUtils.createTest(
            testController,
            'empty-content-check',
            'should handle empty content',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const result = everyLineHasLineNumbers("");
                assert.strictEqual(result, false);
            }
        )
    );

    everyLineHasLineNumbersSuite.children.add(
        TestUtils.createTest(
            testController,
            'pipe-without-line-numbers',
            'should return false for content with pipe but no line numbers',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const input = "a | b\nc | d";
                const result = everyLineHasLineNumbers(input);
                assert.strictEqual(result, false);
            }
        )
    );

    // stripLineNumbers tests
    stripLineNumbersSuite.children.add(
        TestUtils.createTest(
            testController,
            'strip-line-numbers',
            'should strip line numbers from content',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const input = "1 | line one\n2 | line two\n3 | line three";
                const expected = "line one\nline two\nline three";
                const result = stripLineNumbers(input);
                assert.strictEqual(result, expected);
            }
        )
    );

    stripLineNumbersSuite.children.add(
        TestUtils.createTest(
            testController,
            'strip-padded-line-numbers',
            'should strip padded line numbers',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const input = "  1 | line one\n  2 | line two\n  3 | line three";
                const expected = "line one\nline two\nline three";
                const result = stripLineNumbers(input);
                assert.strictEqual(result, expected);
            }
        )
    );

    stripLineNumbersSuite.children.add(
        TestUtils.createTest(
            testController,
            'content-without-line-numbers',
            'should handle content without line numbers',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const input = "line one\nline two\nline three";
                const result = stripLineNumbers(input);
                assert.strictEqual(result, input);
            }
        )
    );

    stripLineNumbersSuite.children.add(
        TestUtils.createTest(
            testController,
            'empty-content-strip',
            'should handle empty content',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const result = stripLineNumbers("");
                assert.strictEqual(result, "");
            }
        )
    );

    stripLineNumbersSuite.children.add(
        TestUtils.createTest(
            testController,
            'preserve-pipe-without-line-numbers',
            'should preserve content with pipe but no line numbers',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const input = "a | b\nc | d";
                const result = stripLineNumbers(input);
                assert.strictEqual(result, input);
            }
        )
    );

    stripLineNumbersSuite.children.add(
        TestUtils.createTest(
            testController,
            'windows-line-endings',
            'should handle windows-style line endings',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const input = "1 | line one\r\n2 | line two\r\n3 | line three";
                const expected = "line one\r\nline two\r\nline three";
                const result = stripLineNumbers(input);
                assert.strictEqual(result, expected);
            }
        )
    );

    stripLineNumbersSuite.children.add(
        TestUtils.createTest(
            testController,
            'varying-line-number-widths',
            'should handle content with varying line number widths',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const input = "  1 | line one\n 10 | line two\n100 | line three";
                const expected = "line one\nline two\nline three";
                const result = stripLineNumbers(input);
                assert.strictEqual(result, expected);
            }
        )
    );

    // truncateOutput tests
    truncateOutputSuite.children.add(
        TestUtils.createTest(
            testController,
            'no-line-limit',
            'returns original content when no line limit provided',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const content = "line1\nline2\nline3";
                const result = truncateOutput(content);
                assert.strictEqual(result, content);
            }
        )
    );

    truncateOutputSuite.children.add(
        TestUtils.createTest(
            testController,
            'under-limit',
            'returns original content when lines are under limit',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const content = "line1\nline2\nline3";
                const result = truncateOutput(content, 5);
                assert.strictEqual(result, content);
            }
        )
    );

    truncateOutputSuite.children.add(
        TestUtils.createTest(
            testController,
            'truncate-with-split',
            'truncates content with 20/80 split when over limit',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Create 25 lines of content
                const lines = Array.from({ length: 25 }, (_, i) => `line${i + 1}`);
                const content = lines.join("\n");

                // Set limit to 10 lines
                const result = truncateOutput(content, 10);

                // Should keep:
                // - First 2 lines (20% of 10)
                // - Last 8 lines (80% of 10)
                // - Omission indicator in between
                const expectedLines = [
                    "line1",
                    "line2",
                    "",
                    "[...15 lines omitted...]",
                    "",
                    "line18",
                    "line19",
                    "line20",
                    "line21",
                    "line22",
                    "line23",
                    "line24",
                    "line25",
                ];
                assert.strictEqual(result, expectedLines.join("\n"));
            }
        )
    );

    truncateOutputSuite.children.add(
        TestUtils.createTest(
            testController,
            'empty-content-truncate',
            'handles empty content',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const result = truncateOutput("", 10);
                assert.strictEqual(result, "");
            }
        )
    );

    truncateOutputSuite.children.add(
        TestUtils.createTest(
            testController,
            'single-line-truncate',
            'handles single line content',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const result = truncateOutput("single line", 10);
                assert.strictEqual(result, "single line");
            }
        )
    );

    truncateOutputSuite.children.add(
        TestUtils.createTest(
            testController,
            'windows-line-endings-truncate',
            'handles windows-style line endings',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Create content with windows line endings
                const lines = Array.from({ length: 15 }, (_, i) => `line${i + 1}`);
                const content = lines.join("\r\n");

                const result = truncateOutput(content, 5);

                // Should keep first line (20% of 5 = 1) and last 4 lines (80% of 5 = 4)
                // Split result by either \r\n or \n to normalize line endings
                const resultLines = result.split(/\r?\n/);
                const expectedLines = ["line1", "", "[...10 lines omitted...]", "", "line12", "line13", "line14", "line15"];
                assert.deepStrictEqual(resultLines, expectedLines);
            }
        )
    );
}
