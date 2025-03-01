import * as vscode from 'vscode';
import * as assert from 'assert';
import { applyContextMatching, applyDMP, applyGitFallback } from "../edit-strategies";
import { Hunk } from "../types";
import { TestUtils } from '../../../../../test/testUtils';

export async function activateEditStrategiesTests(context: vscode.ExtensionContext): Promise<void> {
    // Create test controller
    const testController = TestUtils.createTestController('editStrategiesTests', 'Edit Strategies Tests');
    context.subscriptions.push(testController);

    // Root test suite
    const rootSuite = testController.createTestItem('edit-strategies', 'Edit Strategies');
    testController.items.add(rootSuite);

    // Test suites
    const contextMatchingSuite = testController.createTestItem('context-matching-tests', 'applyContextMatching');
    const dmpSuite = testController.createTestItem('dmp-tests', 'applyDMP');
    const gitFallbackSuite = testController.createTestItem('git-fallback-tests', 'applyGitFallback');
    
    rootSuite.children.add(contextMatchingSuite);
    rootSuite.children.add(dmpSuite);
    rootSuite.children.add(gitFallbackSuite);

    // Define test cases
    const testCases = [
        {
            name: "should return original content if no match is found",
            hunk: {
                changes: [
                    { type: "context", content: "line1" },
                    { type: "add", content: "line2" },
                ],
            } as Hunk,
            content: ["line1", "line3"],
            matchPosition: -1,
            expected: {
                confidence: 0,
                result: ["line1", "line3"],
            },
            expectedResult: "line1\nline3",
            strategies: ["context", "dmp"],
        },
        {
            name: "should apply a simple add change",
            hunk: {
                changes: [
                    { type: "context", content: "line1" },
                    { type: "add", content: "line2" },
                ],
            } as Hunk,
            content: ["line1", "line3"],
            matchPosition: 0,
            expected: {
                confidence: 1,
                result: ["line1", "line2", "line3"],
            },
            expectedResult: "line1\nline2\nline3",
            strategies: ["context", "dmp"],
        },
        {
            name: "should apply a simple remove change",
            hunk: {
                changes: [
                    { type: "context", content: "line1" },
                    { type: "remove", content: "line2" },
                ],
            } as Hunk,
            content: ["line1", "line2", "line3"],
            matchPosition: 0,
            expected: {
                confidence: 1,
                result: ["line1", "line3"],
            },
            expectedResult: "line1\nline3",
            strategies: ["context", "dmp"],
        },
        {
            name: "should apply a simple context change",
            hunk: {
                changes: [{ type: "context", content: "line1" }],
            } as Hunk,
            content: ["line1", "line2", "line3"],
            matchPosition: 0,
            expected: {
                confidence: 1,
                result: ["line1", "line2", "line3"],
            },
            expectedResult: "line1\nline2\nline3",
            strategies: ["context", "dmp"],
        },
        {
            name: "should apply a multi-line add change",
            hunk: {
                changes: [
                    { type: "context", content: "line1" },
                    { type: "add", content: "line2\nline3" },
                ],
            } as Hunk,
            content: ["line1", "line4"],
            matchPosition: 0,
            expected: {
                confidence: 1,
                result: ["line1", "line2\nline3", "line4"],
            },
            expectedResult: "line1\nline2\nline3\nline4",
            strategies: ["context", "dmp"],
        },
        {
            name: "should apply a multi-line remove change",
            hunk: {
                changes: [
                    { type: "context", content: "line1" },
                    { type: "remove", content: "line2\nline3" },
                ],
            } as Hunk,
            content: ["line1", "line2", "line3", "line4"],
            matchPosition: 0,
            expected: {
                confidence: 1,
                result: ["line1", "line4"],
            },
            expectedResult: "line1\nline4",
            strategies: ["context", "dmp"],
        },
        {
            name: "should apply a multi-line context change",
            hunk: {
                changes: [
                    { type: "context", content: "line1" },
                    { type: "context", content: "line2\nline3" },
                ],
            } as Hunk,
            content: ["line1", "line2", "line3", "line4"],
            matchPosition: 0,
            expected: {
                confidence: 1,
                result: ["line1", "line2\nline3", "line4"],
            },
            expectedResult: "line1\nline2\nline3\nline4",
            strategies: ["context", "dmp"],
        },
        {
            name: "should apply a change with indentation",
            hunk: {
                changes: [
                    { type: "context", content: "  line1" },
                    { type: "add", content: "    line2" },
                ],
            } as Hunk,
            content: ["  line1", "  line3"],
            matchPosition: 0,
            expected: {
                confidence: 1,
                result: ["  line1", "    line2", "  line3"],
            },
            expectedResult: "  line1\n    line2\n  line3",
            strategies: ["context", "dmp"],
        },
        {
            name: "should apply a change with mixed indentation",
            hunk: {
                changes: [
                    { type: "context", content: "\tline1" },
                    { type: "add", content: "  line2" },
                ],
            } as Hunk,
            content: ["\tline1", "  line3"],
            matchPosition: 0,
            expected: {
                confidence: 1,
                result: ["\tline1", "  line2", "  line3"],
            },
            expectedResult: "\tline1\n  line2\n  line3",
            strategies: ["context", "dmp"],
        },
        {
            name: "should apply a change with mixed indentation and multi-line",
            hunk: {
                changes: [
                    { type: "context", content: "  line1" },
                    { type: "add", content: "\tline2\n    line3" },
                ],
            } as Hunk,
            content: ["  line1", "  line4"],
            matchPosition: 0,
            expected: {
                confidence: 1,
                result: ["  line1", "\tline2\n    line3", "  line4"],
            },
            expectedResult: "  line1\n\tline2\n    line3\n  line4",
            strategies: ["context", "dmp"],
        },
        {
            name: "should apply a complex change with mixed indentation and multi-line",
            hunk: {
                changes: [
                    { type: "context", content: "  line1" },
                    { type: "remove", content: "    line2" },
                    { type: "add", content: "\tline3\n      line4" },
                    { type: "context", content: "  line5" },
                ],
            } as Hunk,
            content: ["  line1", "    line2", "  line5", "  line6"],
            matchPosition: 0,
            expected: {
                confidence: 1,
                result: ["  line1", "\tline3\n      line4", "  line5", "  line6"],
            },
            expectedResult: "  line1\n\tline3\n      line4\n  line5\n  line6",
            strategies: ["context", "dmp"],
        },
        {
            name: "should apply a complex change with mixed indentation and multi-line and context",
            hunk: {
                changes: [
                    { type: "context", content: "  line1" },
                    { type: "remove", content: "    line2" },
                    { type: "add", content: "\tline3\n      line4" },
                    { type: "context", content: "  line5" },
                    { type: "context", content: "  line6" },
                ],
            } as Hunk,
            content: ["  line1", "    line2", "  line5", "  line6", "  line7"],
            matchPosition: 0,
            expected: {
                confidence: 1,
                result: ["  line1", "\tline3\n      line4", "  line5", "  line6", "  line7"],
            },
            expectedResult: "  line1\n\tline3\n      line4\n  line5\n  line6\n  line7",
            strategies: ["context", "dmp"],
        },
        {
            name: "should apply a complex change with mixed indentation and multi-line and context and a different match position",
            hunk: {
                changes: [
                    { type: "context", content: "  line1" },
                    { type: "remove", content: "    line2" },
                    { type: "add", content: "\tline3\n      line4" },
                    { type: "context", content: "  line5" },
                    { type: "context", content: "  line6" },
                ],
            } as Hunk,
            content: ["  line0", "  line1", "    line2", "  line5", "  line6", "  line7"],
            matchPosition: 1,
            expected: {
                confidence: 1,
                result: ["  line0", "  line1", "\tline3\n      line4", "  line5", "  line6", "  line7"],
            },
            expectedResult: "  line0\n  line1\n\tline3\n      line4\n  line5\n  line6\n  line7",
            strategies: ["context", "dmp"],
        },
    ];

    // Create context matching tests
    for (const testCase of testCases) {
        if (!testCase.strategies?.includes("context")) {
            continue;
        }
        
        contextMatchingSuite.children.add(
            TestUtils.createTest(
                testController,
                `context-${testCase.name.replace(/\s+/g, '-')}`,
                testCase.name,
                vscode.Uri.file(__filename),
                async (run: vscode.TestRun) => {
                    const result = applyContextMatching(testCase.hunk, testCase.content, testCase.matchPosition);
                    assert.strictEqual(result.result.join("\n"), testCase.expectedResult);
                    assert.ok(result.confidence >= testCase.expected.confidence, "Confidence should be greater than or equal to expected");
                    assert.strictEqual(result.strategy, "context");
                }
            )
        );
    }

    // Create DMP tests
    for (const testCase of testCases) {
        if (!testCase.strategies?.includes("dmp")) {
            continue;
        }
        
        dmpSuite.children.add(
            TestUtils.createTest(
                testController,
                `dmp-${testCase.name.replace(/\s+/g, '-')}`,
                testCase.name,
                vscode.Uri.file(__filename),
                async (run: vscode.TestRun) => {
                    const result = applyDMP(testCase.hunk, testCase.content, testCase.matchPosition);
                    assert.strictEqual(result.result.join("\n"), testCase.expectedResult);
                    assert.ok(result.confidence >= testCase.expected.confidence, "Confidence should be greater than or equal to expected");
                    assert.strictEqual(result.strategy, "dmp");
                }
            )
        );
    }

    // Git fallback tests
    gitFallbackSuite.children.add(
        TestUtils.createTest(
            testController,
            'successful-git-operations',
            'should successfully apply changes using git operations',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const hunk = {
                    changes: [
                        { type: "context", content: "line1", indent: "" },
                        { type: "remove", content: "line2", indent: "" },
                        { type: "add", content: "new line2", indent: "" },
                        { type: "context", content: "line3", indent: "" },
                    ],
                } as Hunk;

                const content = ["line1", "line2", "line3"];
                const result = await applyGitFallback(hunk, content);

                assert.strictEqual(result.result.join("\n"), "line1\nnew line2\nline3");
                assert.strictEqual(result.confidence, 1);
                assert.strictEqual(result.strategy, "git-fallback");
            }
        )
    );

    gitFallbackSuite.children.add(
        TestUtils.createTest(
            testController,
            'failed-git-operations',
            'should return original content with 0 confidence when changes cannot be applied',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const hunk = {
                    changes: [
                        { type: "context", content: "nonexistent", indent: "" },
                        { type: "add", content: "new line", indent: "" },
                    ],
                } as Hunk;

                const content = ["line1", "line2", "line3"];
                const result = await applyGitFallback(hunk, content);

                assert.deepStrictEqual(result.result, content);
                assert.strictEqual(result.confidence, 0);
                assert.strictEqual(result.strategy, "git-fallback");
            }
        )
    );
}
