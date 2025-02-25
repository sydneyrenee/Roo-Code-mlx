import * as assert from 'assert';
import { SearchReplaceDiffStrategy } from '../../../../../core/diff/strategies/search-replace';
import { TEST_TIMEOUTS, waitForCondition } from '../../../utils/test-setup';

suite('SearchReplaceDiffStrategy', () => {
    let strategy: SearchReplaceDiffStrategy;

    setup(() => {
        // Default 1.0 threshold for exact matching, 5 line buffer for tests
        strategy = new SearchReplaceDiffStrategy(1.0, 5);
    });

    suite('exact matching', () => {
        test('should replace matching content', async () => {
            // Arrange
            const originalContent = 'function hello() {\n    console.log("hello")\n}\n';
            const diffContent = `test.ts
<<<<<<< SEARCH
function hello() {
    console.log("hello")
}
=======
function hello() {
    console.log("hello world")
}
>>>>>>> REPLACE`;

            // Act
            const result = await strategy.applyDiff(originalContent, diffContent);

            // Assert
            assert.strictEqual(result.success, true, 'Diff should succeed');
            if (result.success) {
                assert.strictEqual(
                    result.content,
                    'function hello() {\n    console.log("hello world")\n}\n',
                    'Content should be updated correctly'
                );
            }
        });

        test('should match content with different surrounding whitespace', async () => {
            // Arrange
            const originalContent = "\nfunction example() {\n    return 42;\n}\n\n";
            const diffContent = `test.ts
<<<<<<< SEARCH
function example() {
    return 42;
}
=======
function example() {
    return 43;
}
>>>>>>> REPLACE`;

            // Act
            const result = await strategy.applyDiff(originalContent, diffContent);

            // Assert
            assert.strictEqual(result.success, true, 'Diff should succeed');
            if (result.success) {
                assert.strictEqual(
                    result.content,
                    "\nfunction example() {\n    return 43;\n}\n\n",
                    'Content should be updated with preserved whitespace'
                );
            }
        });

        test('should match content with different indentation in search block', async () => {
            // Arrange
            const originalContent = "    function test() {\n        return true;\n    }\n";
            const diffContent = `test.ts
<<<<<<< SEARCH
function test() {
    return true;
}
=======
function test() {
    return false;
}
>>>>>>> REPLACE`;

            // Act
            const result = await strategy.applyDiff(originalContent, diffContent);

            // Assert
            assert.strictEqual(result.success, true, 'Diff should succeed');
            if (result.success) {
                assert.strictEqual(
                    result.content,
                    "    function test() {\n        return false;\n    }\n",
                    'Content should be updated with preserved indentation'
                );
            }
        });

        test('should handle tab-based indentation', async () => {
            // Arrange
            const originalContent = "function test() {\n\treturn true;\n}\n";
            const diffContent = `test.ts
<<<<<<< SEARCH
function test() {
\treturn true;
}
=======
function test() {
\treturn false;
}
>>>>>>> REPLACE`;

            // Act
            const result = await strategy.applyDiff(originalContent, diffContent);

            // Assert
            assert.strictEqual(result.success, true, 'Diff should succeed');
            if (result.success) {
                assert.strictEqual(
                    result.content,
                    "function test() {\n\treturn false;\n}\n",
                    'Content should be updated with preserved tabs'
                );
            }
        });
    });

    suite('line number stripping', () => {
        test('should strip line numbers from both search and replace sections', async () => {
            // Arrange
            const originalContent = "function test() {\n    return true;\n}\n";
            const diffContent = `test.ts
<<<<<<< SEARCH
1 | function test() {
2 |     return true;
3 | }
=======
1 | function test() {
2 |     return false;
3 | }
>>>>>>> REPLACE`;

            // Act
            const result = await strategy.applyDiff(originalContent, diffContent);

            // Assert
            assert.strictEqual(result.success, true, 'Diff should succeed');
            if (result.success) {
                assert.strictEqual(
                    result.content,
                    "function test() {\n    return false;\n}\n",
                    'Content should be updated with line numbers stripped'
                );
            }
        });
    });

    suite('fuzzy matching', () => {
        setup(() => {
            // 90% similarity threshold, 5 line buffer
            strategy = new SearchReplaceDiffStrategy(0.9, 5);
        });

        test('should match content with small differences (>90% similar)', async () => {
            // Arrange
            const originalContent = "function getData() {\n    const results = fetchData();\n    return results.filter(Boolean);\n}\n";
            const diffContent = `test.ts
<<<<<<< SEARCH
function getData() {
    const result = fetchData();
    return results.filter(Boolean);
}
=======
function getData() {
    const data = fetchData();
    return data.filter(Boolean);
}
>>>>>>> REPLACE`;

            // Act
            const result = await strategy.applyDiff(originalContent, diffContent);

            // Assert
            assert.strictEqual(result.success, true, 'Diff should succeed');
            if (result.success) {
                assert.strictEqual(
                    result.content,
                    "function getData() {\n    const data = fetchData();\n    return data.filter(Boolean);\n}\n",
                    'Content should be updated with fuzzy matching'
                );
            }
        });

        test('should not match when content is too different (<90% similar)', async () => {
            // Arrange
            const originalContent = "function processUsers(data) {\n    return data.map(user => user.name);\n}\n";
            const diffContent = `test.ts
<<<<<<< SEARCH
function handleItems(items) {
    return items.map(item => item.username);
}
=======
function processData(data) {
    return data.map(d => d.value);
}
>>>>>>> REPLACE`;

            // Act
            const result = await strategy.applyDiff(originalContent, diffContent);

            // Assert
            assert.strictEqual(result.success, false, 'Diff should fail due to low similarity');
        });
    });
});