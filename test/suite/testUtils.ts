import * as vscode from 'vscode';
import * as assert from 'assert';

export interface TestFunction {
    (run: vscode.TestRun): Promise<void> | void;
}

export function createTestSuite(controller: vscode.TestController, id: string, label: string) {
    const suite = controller.createTestItem(id, label);
    controller.items.add(suite);
    return suite;
}

export function createTest(
    controller: vscode.TestController,
    id: string,
    label: string,
    testFn: TestFunction
) {
    return controller.createTestItem(id, label, undefined).with({
        async run(run: vscode.TestRun) {
            try {
                await testFn(run);
                run.passed(run.item);
            } catch (err) {
                run.failed(run.item, {
                    message: err instanceof Error ? err.message : String(err)
                });
            }
        }
    });
}

export function addTest(
    suite: vscode.TestItem,
    controller: vscode.TestController,
    id: string,
    label: string,
    testFn: TestFunction
) {
    const test = createTest(controller, id, label, testFn);
    suite.children.add(test);
    return test;
}

export function expectThrows(fn: () => any, errorType?: any) {
    let error: Error | undefined;
    try {
        fn();
    } catch (e) {
        error = e as Error;
    }
    
    assert.ok(error, 'Expected function to throw');
    if (errorType) {
        assert.ok(error instanceof errorType, `Expected error to be instance of ${errorType.name}`);
    }
    return error;
}