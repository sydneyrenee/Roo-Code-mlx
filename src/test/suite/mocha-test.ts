import * as assert from 'assert';

suite('Mocha Tests', () => {
    test('Basic Math', () => {
        assert.strictEqual(1 + 1, 2, 'Basic math should work');
    });

    test('String Concatenation', () => {
        assert.strictEqual('a' + 'b', 'ab', 'String concatenation should work');
    });

    test('Array Operations', () => {
        const arr = [1, 2, 3];
        assert.strictEqual(arr.length, 3, 'Array length should be correct');
        assert.deepStrictEqual(arr.map(x => x * 2), [2, 4, 6], 'Array map should work');
    });

    test('Async Operations', async () => {
        const result = await Promise.resolve('success');
        assert.strictEqual(result, 'success', 'Async operation should resolve');
    });
});