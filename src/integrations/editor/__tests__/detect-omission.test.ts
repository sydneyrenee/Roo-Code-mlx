import * as vscode from 'vscode';
import * as assert from 'assert';
import { detectCodeOmission } from "../detect-omission";
import { TestUtils } from '../../../test/testUtils';

export async function activateDetectOmissionTests(context: vscode.ExtensionContext): Promise<void> {
    // Create test controller
    const testController = TestUtils.createTestController('detectOmissionTests', 'Detect Omission Tests');
    context.subscriptions.push(testController);

    // Root test suite
    const rootSuite = testController.createTestItem('detect-code-omission', 'detectCodeOmission');
    testController.items.add(rootSuite);

    // Define test data
    const originalContent = `function example() {
  // Some code
  const x = 1;
  const y = 2;
  return x + y;
}`;

    // Helper function to generate long content
    const generateLongContent = (commentLine: string, length: number = 90) => {
        return `${commentLine}
    ${Array.from({ length }, (_, i) => `const x${i} = ${i};`).join("\n")}
    const y = 2;`;
    };

    // Test: should skip comment checks for files under 100 lines
    rootSuite.children.add(
        TestUtils.createTest(
            testController,
            'skip-comment-checks-small-files',
            'should skip comment checks for files under 100 lines',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const newContent = `// Lines 1-50 remain unchanged
const z = 3;`;
                const predictedLineCount = 50;
                const result = detectCodeOmission(originalContent, newContent, predictedLineCount);
                assert.strictEqual(result, false);
            }
        )
    );

    // Test: should not detect regular comments without omission keywords
    rootSuite.children.add(
        TestUtils.createTest(
            testController,
            'no-detection-regular-comments',
            'should not detect regular comments without omission keywords',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const newContent = generateLongContent("// Adding new functionality");
                const predictedLineCount = 150;
                const result = detectCodeOmission(originalContent, newContent, predictedLineCount);
                assert.strictEqual(result, false);
            }
        )
    );

    // Test: should not detect when comment is part of original content
    rootSuite.children.add(
        TestUtils.createTest(
            testController,
            'no-detection-original-comment',
            'should not detect when comment is part of original content',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const originalWithComment = `// Content remains unchanged
${originalContent}`;
                const newContent = generateLongContent("// Content remains unchanged");
                const predictedLineCount = 150;
                const result = detectCodeOmission(originalWithComment, newContent, predictedLineCount);
                assert.strictEqual(result, false);
            }
        )
    );

    // Test: should not detect code that happens to contain omission keywords
    rootSuite.children.add(
        TestUtils.createTest(
            testController,
            'no-detection-code-with-keywords',
            'should not detect code that happens to contain omission keywords',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const newContent = generateLongContent(`const remains = 'some value';
const unchanged = true;`);
                const predictedLineCount = 150;
                const result = detectCodeOmission(originalContent, newContent, predictedLineCount);
                assert.strictEqual(result, false);
            }
        )
    );

    // Test: should detect suspicious single-line comment when content is more than 20% shorter
    rootSuite.children.add(
        TestUtils.createTest(
            testController,
            'detect-single-line-comment-shorter',
            'should detect suspicious single-line comment when content is more than 20% shorter',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const newContent = generateLongContent("// Previous content remains here\nconst x = 1;");
                const predictedLineCount = 150;
                const result = detectCodeOmission(originalContent, newContent, predictedLineCount);
                assert.strictEqual(result, true);
            }
        )
    );

    // Test: should not flag suspicious single-line comment when content is less than 20% shorter
    rootSuite.children.add(
        TestUtils.createTest(
            testController,
            'no-flag-single-line-comment-not-shorter',
            'should not flag suspicious single-line comment when content is less than 20% shorter',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const newContent = generateLongContent("// Previous content remains here", 130);
                const predictedLineCount = 150;
                const result = detectCodeOmission(originalContent, newContent, predictedLineCount);
                assert.strictEqual(result, false);
            }
        )
    );

    // Test: should detect suspicious Python-style comment when content is more than 20% shorter
    rootSuite.children.add(
        TestUtils.createTest(
            testController,
            'detect-python-comment-shorter',
            'should detect suspicious Python-style comment when content is more than 20% shorter',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const newContent = generateLongContent("# Previous content remains here\nconst x = 1;");
                const predictedLineCount = 150;
                const result = detectCodeOmission(originalContent, newContent, predictedLineCount);
                assert.strictEqual(result, true);
            }
        )
    );

    // Test: should not flag suspicious Python-style comment when content is less than 20% shorter
    rootSuite.children.add(
        TestUtils.createTest(
            testController,
            'no-flag-python-comment-not-shorter',
            'should not flag suspicious Python-style comment when content is less than 20% shorter',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const newContent = generateLongContent("# Previous content remains here", 130);
                const predictedLineCount = 150;
                const result = detectCodeOmission(originalContent, newContent, predictedLineCount);
                assert.strictEqual(result, false);
            }
        )
    );

    // Test: should detect suspicious multi-line comment when content is more than 20% shorter
    rootSuite.children.add(
        TestUtils.createTest(
            testController,
            'detect-multi-line-comment-shorter',
            'should detect suspicious multi-line comment when content is more than 20% shorter',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const newContent = generateLongContent("/* Previous content remains the same */\nconst x = 1;");
                const predictedLineCount = 150;
                const result = detectCodeOmission(originalContent, newContent, predictedLineCount);
                assert.strictEqual(result, true);
            }
        )
    );

    // Test: should not flag suspicious multi-line comment when content is less than 20% shorter
    rootSuite.children.add(
        TestUtils.createTest(
            testController,
            'no-flag-multi-line-comment-not-shorter',
            'should not flag suspicious multi-line comment when content is less than 20% shorter',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const newContent = generateLongContent("/* Previous content remains the same */", 130);
                const predictedLineCount = 150;
                const result = detectCodeOmission(originalContent, newContent, predictedLineCount);
                assert.strictEqual(result, false);
            }
        )
    );

    // Test: should detect suspicious JSX comment when content is more than 20% shorter
    rootSuite.children.add(
        TestUtils.createTest(
            testController,
            'detect-jsx-comment-shorter',
            'should detect suspicious JSX comment when content is more than 20% shorter',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const newContent = generateLongContent("{/* Rest of the code remains the same */}\nconst x = 1;");
                const predictedLineCount = 150;
                const result = detectCodeOmission(originalContent, newContent, predictedLineCount);
                assert.strictEqual(result, true);
            }
        )
    );

    // Test: should not flag suspicious JSX comment when content is less than 20% shorter
    rootSuite.children.add(
        TestUtils.createTest(
            testController,
            'no-flag-jsx-comment-not-shorter',
            'should not flag suspicious JSX comment when content is less than 20% shorter',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const newContent = generateLongContent("{/* Rest of the code remains the same */}", 130);
                const predictedLineCount = 150;
                const result = detectCodeOmission(originalContent, newContent, predictedLineCount);
                assert.strictEqual(result, false);
            }
        )
    );

    // Test: should detect suspicious HTML comment when content is more than 20% shorter
    rootSuite.children.add(
        TestUtils.createTest(
            testController,
            'detect-html-comment-shorter',
            'should detect suspicious HTML comment when content is more than 20% shorter',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const newContent = generateLongContent("<!-- Existing content unchanged -->\nconst x = 1;");
                const predictedLineCount = 150;
                const result = detectCodeOmission(originalContent, newContent, predictedLineCount);
                assert.strictEqual(result, true);
            }
        )
    );

    // Test: should not flag suspicious HTML comment when content is less than 20% shorter
    rootSuite.children.add(
        TestUtils.createTest(
            testController,
            'no-flag-html-comment-not-shorter',
            'should not flag suspicious HTML comment when content is less than 20% shorter',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const newContent = generateLongContent("<!-- Existing content unchanged -->", 130);
                const predictedLineCount = 150;
                const result = detectCodeOmission(originalContent, newContent, predictedLineCount);
                assert.strictEqual(result, false);
            }
        )
    );

    // Test: should detect suspicious square bracket notation when content is more than 20% shorter
    rootSuite.children.add(
        TestUtils.createTest(
            testController,
            'detect-bracket-notation-shorter',
            'should detect suspicious square bracket notation when content is more than 20% shorter',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const newContent = generateLongContent(
                    "[Previous content from line 1-305 remains exactly the same]\nconst x = 1;"
                );
                const predictedLineCount = 150;
                const result = detectCodeOmission(originalContent, newContent, predictedLineCount);
                assert.strictEqual(result, true);
            }
        )
    );

    // Test: should not flag suspicious square bracket notation when content is less than 20% shorter
    rootSuite.children.add(
        TestUtils.createTest(
            testController,
            'no-flag-bracket-notation-not-shorter',
            'should not flag suspicious square bracket notation when content is less than 20% shorter',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const newContent = generateLongContent("[Previous content from line 1-305 remains exactly the same]", 130);
                const predictedLineCount = 150;
                const result = detectCodeOmission(originalContent, newContent, predictedLineCount);
                assert.strictEqual(result, false);
            }
        )
    );

    // Test: should not flag content very close to predicted length
    rootSuite.children.add(
        TestUtils.createTest(
            testController,
            'no-flag-close-to-predicted',
            'should not flag content very close to predicted length',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const newContent = generateLongContent(
                    `const x = 1;
const y = 2;
// This is a legitimate comment that remains here`,
                    130
                );
                const predictedLineCount = 150;
                const result = detectCodeOmission(originalContent, newContent, predictedLineCount);
                assert.strictEqual(result, false);
            }
        )
    );

    // Test: should not flag when content is longer than predicted
    rootSuite.children.add(
        TestUtils.createTest(
            testController,
            'no-flag-longer-than-predicted',
            'should not flag when content is longer than predicted',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const newContent = generateLongContent(
                    `const x = 1;
const y = 2;
// Previous content remains here but we added more
const z = 3;
const w = 4;`,
                    160
                );
                const predictedLineCount = 150;
                const result = detectCodeOmission(originalContent, newContent, predictedLineCount);
                assert.strictEqual(result, false);
            }
        )
    );
}
