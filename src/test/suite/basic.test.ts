import * as vscode from 'vscode';
import * as assert from 'assert';

export async function activateBasicTests(context: vscode.ExtensionContext): Promise<void> {
    const testController = vscode.tests.createTestController('basicTests', 'Basic Tests');
    context.subscriptions.push(testController);

    // Root test suite
    const rootSuite = testController.createTestItem('root', 'Basic Test Suite');
    testController.items.add(rootSuite);

    // Array operations test group
    const arraySuite = testController.createTestItem('array', 'Array Operations');
    rootSuite.children.add(arraySuite);

    // Test cases
    arraySuite.children.add(testController.createTestItem(
        'array-indexof-missing',
        'Array indexOf should return -1 for missing elements'
    ));
    arraySuite.children.add(testController.createTestItem(
        'array-indexof-present',
        'Array indexOf should return correct index for present elements'
    ));

    // Create run profile
    testController.createRunProfile('Run Tests', vscode.TestRunProfileKind.Run, async (request) => {
        const queue: vscode.TestItem[] = [];
        const run = testController.createTestRun(request);

        // Add requested tests
        if (request.include) {
            request.include.forEach(test => queue.push(test));
        } else {
            rootSuite.children.forEach(test => queue.push(test));
        }

        // Run tests
        for (const test of queue) {
            run.started(test);

            try {
                switch (test.id) {
                    case 'array-indexof-missing': {
                        assert.strictEqual(-1, [1, 2, 3].indexOf(5));
                        break;
                    }
                    case 'array-indexof-present': {
                        assert.strictEqual(2, [1, 2, 3].indexOf(3));
                        break;
                    }
                }
                run.passed(test);
            } catch (err) {
                run.failed(test, new vscode.TestMessage(err instanceof Error ? err.message : String(err)));
            }
        }

        run.end();
    });
}