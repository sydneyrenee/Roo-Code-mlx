import * as vscode from 'vscode';
import * as assert from 'assert';

// Keep track of created controllers to ensure unique IDs
const createdControllers = new Set<string>();

export class TestUtils {
    static async assertThrows(fn: () => Promise<any>, message?: string) {
        try {
            await fn();
            assert.fail('Expected function to throw');
        } catch (e) {
            // Test passed
        }
    }

    static createTest(
        controller: vscode.TestController,
        id: string,
        label: string,
        uri: vscode.Uri,
        run: (run: vscode.TestRun) => Promise<void>
    ) {
        const test = controller.createTestItem(id, label, uri);
        (test as any).run = run;
        return test;
    }

    static createTestController(id: string, label: string) {
        // Ensure unique ID
        let uniqueId = id;
        let counter = 1;
        
        while (createdControllers.has(uniqueId)) {
            uniqueId = `${id}_${counter++}`;
        }
        
        createdControllers.add(uniqueId);
        
        const controller = vscode.tests.createTestController(uniqueId, label);
        
        controller.createRunProfile(
            'Run Tests',
            vscode.TestRunProfileKind.Run,
            async (request, token) => {
                const run = controller.createTestRun(request);
                const queue: vscode.TestItem[] = [];
                
                // Add all tests if no tests specifically requested
                if (!request.include) {
                    controller.items.forEach(test => queue.push(test));
                } else {
                    request.include.forEach(test => queue.push(test));
                }
                
                // Run all queued tests
                while (queue.length > 0 && !token.isCancellationRequested) {
                    const test = queue.pop()!;
                    
                    // If test has children, add them to queue
                    if (test.children.size > 0) {
                        test.children.forEach(child => queue.push(child));
                        continue;
                    }
                    
                    // Run the test
                    run.started(test);
                    try {
                        await (test as any).run?.(run);
                        run.passed(test);
                    } catch (err) {
                        run.failed(test, new vscode.TestMessage(err instanceof Error ? err.message : String(err)));
                    }
                }
                
                run.end();
            }
        );
        
        return controller;
    }

    static createMockProvider() {
        return {
            postMessageToWebview: async () => {},
            postStateToWebview: async () => {},
            // Add other mock implementations as needed
        };
    }
}