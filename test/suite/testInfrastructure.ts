import * as vscode from 'vscode';
import * as assert from 'assert';

export interface TestDefinition {
    id: string;
    label: string;
    run: (run: vscode.TestRun) => Promise<void>;
}

export class TestInfrastructure {
    private static controllers = new Map<string, vscode.TestController>();
    private static testRunFunctions = new Map<string, (run: vscode.TestRun) => Promise<void>>();

    static getController(id: string, label: string): vscode.TestController {
        if (!this.controllers.has(id)) {
            const controller = vscode.tests.createTestController(id, label);
            this.controllers.set(id, controller);
        }
        return this.controllers.get(id)!;
    }

    static createTestSuite(
        controller: vscode.TestController,
        id: string,
        label: string,
        uri: vscode.Uri
    ): vscode.TestItem {
        const suite = controller.createTestItem(id, label, uri);
        return suite;
    }

    static createTest(
        suite: vscode.TestItem,
        definition: TestDefinition,
        controller: vscode.TestController
    ): vscode.TestItem {
        const test = controller.createTestItem(
            definition.id,
            definition.label,
            suite.uri
        );
        
        // Store the run function in the map instead of directly on the test item
        this.testRunFunctions.set(test.id, async (run: vscode.TestRun) => {
            run.started(test);
            try {
                await definition.run(run);
                run.passed(test);
            } catch (err) {
                run.failed(test, new vscode.TestMessage(`${err}`));
            }
        });
        
        return test;
    }

    static createTestRunProfile(
        controller: vscode.TestController,
        label = 'Run'
    ): void {
        controller.createRunProfile(
            label,
            vscode.TestRunProfileKind.Run,
            async (request: vscode.TestRunRequest) => {
                const queue: vscode.TestItem[] = [];
                if (request.include) {
                    request.include.forEach(test => queue.push(test));
                }

                const run = controller.createTestRun(request);
                for (const test of queue) {
                    const runFunction = this.testRunFunctions.get(test.id);
                    if (runFunction) {
                        await runFunction(run);
                    }
                }
                run.end();
            }
        );
    }

    static async assert(condition: boolean, message: string) {
        assert.ok(condition, message);
    }

    static async assertThrows(fn: () => Promise<any>, message?: string) {
        try {
            await fn();
            assert.fail('Expected function to throw');
        } catch (e) {
            // Test passed
        }
    }

    static async assertDeepEqual(actual: any, expected: any, message?: string) {
        assert.deepStrictEqual(actual, expected, message);
    }
}// Test comment
// Another test comment
// Final test comment
