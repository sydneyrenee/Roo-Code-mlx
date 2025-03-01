import * as vscode from 'vscode';
import * as assert from 'assert';
import { findAnchorMatch, findExactMatch, findSimilarityMatch, findLevenshteinMatch } from "../search-strategies";
import { TestUtils } from '../../../../../test/testUtils';

export async function activateSearchStrategiesTests(context: vscode.ExtensionContext): Promise<void> {
    // Create test controller
    const testController = TestUtils.createTestController('searchStrategiesTests', 'Search Strategies Tests');
    context.subscriptions.push(testController);

    // Root test suite
    const rootSuite = testController.createTestItem('search-strategies', 'Search Strategies');
    testController.items.add(rootSuite);

    // Test suites
    const exactMatchSuite = testController.createTestItem('exact-match-tests', 'findExactMatch');
    const anchorMatchSuite = testController.createTestItem('anchor-match-tests', 'findAnchorMatch');
    const similarityMatchSuite = testController.createTestItem('similarity-match-tests', 'findSimilarityMatch');
    const levenshteinMatchSuite = testController.createTestItem('levenshtein-match-tests', 'findLevenshteinMatch');
    
    rootSuite.children.add(exactMatchSuite);
    rootSuite.children.add(anchorMatchSuite);
    rootSuite.children.add(similarityMatchSuite);
    rootSuite.children.add(levenshteinMatchSuite);

    // Define test cases
    const testCases = [
        {
            name: "should return no match if the search string is not found",
            searchStr: "not found",
            content: ["line1", "line2", "line3"],
            expected: { index: -1, confidence: 0 },
            strategies: ["exact", "similarity", "levenshtein"],
        },
        {
            name: "should return a match if the search string is found",
            searchStr: "line2",
            content: ["line1", "line2", "line3"],
            expected: { index: 1, confidence: 1 },
            strategies: ["exact", "similarity", "levenshtein"],
        },
        {
            name: "should return a match with correct index when startIndex is provided",
            searchStr: "line3",
            content: ["line1", "line2", "line3", "line4", "line3"],
            startIndex: 3,
            expected: { index: 4, confidence: 1 },
            strategies: ["exact", "similarity", "levenshtein"],
        },
        {
            name: "should return a match even if there are more lines in content",
            searchStr: "line2",
            content: ["line1", "line2", "line3", "line4", "line5"],
            expected: { index: 1, confidence: 1 },
            strategies: ["exact", "similarity", "levenshtein"],
        },
        {
            name: "should return a match even if the search string is at the beginning of the content",
            searchStr: "line1",
            content: ["line1", "line2", "line3"],
            expected: { index: 0, confidence: 1 },
            strategies: ["exact", "similarity", "levenshtein"],
        },
        {
            name: "should return a match even if the search string is at the end of the content",
            searchStr: "line3",
            content: ["line1", "line2", "line3"],
            expected: { index: 2, confidence: 1 },
            strategies: ["exact", "similarity", "levenshtein"],
        },
        {
            name: "should return a match for a multi-line search string",
            searchStr: "line2\nline3",
            content: ["line1", "line2", "line3", "line4"],
            expected: { index: 1, confidence: 1 },
            strategies: ["exact", "similarity", "levenshtein"],
        },
        {
            name: "should return no match if a multi-line search string is not found",
            searchStr: "line2\nline4",
            content: ["line1", "line2", "line3", "line4"],
            expected: { index: -1, confidence: 0 },
            strategies: ["exact", "similarity"],
        },
        {
            name: "should return a match with indentation",
            searchStr: "  line2",
            content: ["line1", "  line2", "line3"],
            expected: { index: 1, confidence: 1 },
            strategies: ["exact", "similarity", "levenshtein"],
        },
        {
            name: "should return a match with more complex indentation",
            searchStr: "    line3",
            content: ["  line1", "    line2", "    line3", "  line4"],
            expected: { index: 2, confidence: 1 },
            strategies: ["exact", "similarity", "levenshtein"],
        },
        {
            name: "should return a match with mixed indentation",
            searchStr: "\tline2",
            content: ["  line1", "\tline2", "    line3"],
            expected: { index: 1, confidence: 1 },
            strategies: ["exact", "similarity", "levenshtein"],
        },
        {
            name: "should return a match with mixed indentation and multi-line",
            searchStr: "  line2\n\tline3",
            content: ["line1", "  line2", "\tline3", "    line4"],
            expected: { index: 1, confidence: 1 },
            strategies: ["exact", "similarity", "levenshtein"],
        },
        {
            name: "should return no match if mixed indentation and multi-line is not found",
            searchStr: "  line2\n    line4",
            content: ["line1", "  line2", "\tline3", "    line4"],
            expected: { index: -1, confidence: 0 },
            strategies: ["exact", "similarity"],
        },
        {
            name: "should return a match with leading and trailing spaces",
            searchStr: "  line2  ",
            content: ["line1", "  line2  ", "line3"],
            expected: { index: 1, confidence: 1 },
            strategies: ["exact", "similarity", "levenshtein"],
        },
        {
            name: "should return a match with leading and trailing tabs",
            searchStr: "\tline2\t",
            content: ["line1", "\tline2\t", "line3"],
            expected: { index: 1, confidence: 1 },
            strategies: ["exact", "similarity", "levenshtein"],
        },
        {
            name: "should return a match with mixed leading and trailing spaces and tabs",
            searchStr: " \tline2\t ",
            content: ["line1", " \tline2\t ", "line3"],
            expected: { index: 1, confidence: 1 },
            strategies: ["exact", "similarity", "levenshtein"],
        },
        {
            name: "should return a match with mixed leading and trailing spaces and tabs and multi-line",
            searchStr: " \tline2\t \n  line3  ",
            content: ["line1", " \tline2\t ", "  line3  ", "line4"],
            expected: { index: 1, confidence: 1 },
            strategies: ["exact", "similarity", "levenshtein"],
        },
        {
            name: "should return no match if mixed leading and trailing spaces and tabs and multi-line is not found",
            searchStr: " \tline2\t \n  line4  ",
            content: ["line1", " \tline2\t ", "  line3  ", "line4"],
            expected: { index: -1, confidence: 0 },
            strategies: ["exact", "similarity"],
        },
    ];

    // Create exact match tests
    for (const testCase of testCases) {
        if (!testCase.strategies?.includes("exact")) {
            continue;
        }
        
        exactMatchSuite.children.add(
            TestUtils.createTest(
                testController,
                `exact-${testCase.name.replace(/\s+/g, '-')}`,
                testCase.name,
                vscode.Uri.file(__filename),
                async (run: vscode.TestRun) => {
                    const result = findExactMatch(testCase.searchStr, testCase.content, testCase.startIndex);
                    assert.strictEqual(result.index, testCase.expected.index);
                    assert.ok(result.confidence >= testCase.expected.confidence, "Confidence should be greater than or equal to expected");
                    assert.ok(result.strategy.match(/exact(-overlapping)?/), "Strategy should be 'exact' or 'exact-overlapping'");
                }
            )
        );
    }

    // Define anchor test cases
    const anchorTestCases = [
        {
            name: "should return no match if no anchors are found",
            searchStr: "   \n   \n   ",
            content: ["line1", "line2", "line3"],
            expected: { index: -1, confidence: 0 },
        },
        {
            name: "should return no match if anchor positions cannot be validated",
            searchStr: "unique line\ncontext line 1\ncontext line 2",
            content: [
                "different line 1",
                "different line 2",
                "different line 3",
                "another unique line",
                "context line 1",
                "context line 2",
            ],
            expected: { index: -1, confidence: 0 },
        },
        {
            name: "should return a match if anchor positions can be validated",
            searchStr: "unique line\ncontext line 1\ncontext line 2",
            content: ["line1", "line2", "unique line", "context line 1", "context line 2", "line 6"],
            expected: { index: 2, confidence: 1 },
        },
        {
            name: "should return a match with correct index when startIndex is provided",
            searchStr: "unique line\ncontext line 1\ncontext line 2",
            content: ["line1", "line2", "line3", "unique line", "context line 1", "context line 2", "line 7"],
            startIndex: 3,
            expected: { index: 3, confidence: 1 },
        },
        {
            name: "should return a match even if there are more lines in content",
            searchStr: "unique line\ncontext line 1\ncontext line 2",
            content: [
                "line1",
                "line2",
                "unique line",
                "context line 1",
                "context line 2",
                "line 6",
                "extra line 1",
                "extra line 2",
            ],
            expected: { index: 2, confidence: 1 },
        },
        {
            name: "should return a match even if the anchor is at the beginning of the content",
            searchStr: "unique line\ncontext line 1\ncontext line 2",
            content: ["unique line", "context line 1", "context line 2", "line 6"],
            expected: { index: 0, confidence: 1 },
        },
        {
            name: "should return a match even if the anchor is at the end of the content",
            searchStr: "unique line\ncontext line 1\ncontext line 2",
            content: ["line1", "line2", "unique line", "context line 1", "context line 2"],
            expected: { index: 2, confidence: 1 },
        },
        {
            name: "should return no match if no valid anchor is found",
            searchStr: "non-unique line\ncontext line 1\ncontext line 2",
            content: ["line1", "line2", "non-unique line", "context line 1", "context line 2", "non-unique line"],
            expected: { index: -1, confidence: 0 },
        },
    ];

    // Create anchor match tests
    for (const testCase of anchorTestCases) {
        anchorMatchSuite.children.add(
            TestUtils.createTest(
                testController,
                `anchor-${testCase.name.replace(/\s+/g, '-')}`,
                testCase.name,
                vscode.Uri.file(__filename),
                async (run: vscode.TestRun) => {
                    const result = findAnchorMatch(testCase.searchStr, testCase.content, testCase.startIndex);
                    assert.strictEqual(result.index, testCase.expected.index);
                    assert.ok(result.confidence >= testCase.expected.confidence, "Confidence should be greater than or equal to expected");
                    assert.strictEqual(result.strategy, "anchor");
                }
            )
        );
    }

    // Create similarity match tests
    for (const testCase of testCases) {
        if (!testCase.strategies?.includes("similarity")) {
            continue;
        }
        
        similarityMatchSuite.children.add(
            TestUtils.createTest(
                testController,
                `similarity-${testCase.name.replace(/\s+/g, '-')}`,
                testCase.name,
                vscode.Uri.file(__filename),
                async (run: vscode.TestRun) => {
                    const result = findSimilarityMatch(testCase.searchStr, testCase.content, testCase.startIndex);
                    assert.strictEqual(result.index, testCase.expected.index);
                    assert.ok(result.confidence >= testCase.expected.confidence, "Confidence should be greater than or equal to expected");
                    assert.strictEqual(result.strategy, "similarity");
                }
            )
        );
    }

    // Create Levenshtein match tests
    for (const testCase of testCases) {
        if (!testCase.strategies?.includes("levenshtein")) {
            continue;
        }
        
        levenshteinMatchSuite.children.add(
            TestUtils.createTest(
                testController,
                `levenshtein-${testCase.name.replace(/\s+/g, '-')}`,
                testCase.name,
                vscode.Uri.file(__filename),
                async (run: vscode.TestRun) => {
                    const result = findLevenshteinMatch(testCase.searchStr, testCase.content, testCase.startIndex);
                    assert.strictEqual(result.index, testCase.expected.index);
                    assert.ok(result.confidence >= testCase.expected.confidence, "Confidence should be greater than or equal to expected");
                    assert.strictEqual(result.strategy, "levenshtein");
                }
            )
        );
    }
}
