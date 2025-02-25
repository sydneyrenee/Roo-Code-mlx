import * as vscode from 'vscode';

export function createTestController(id: string, label: string) {
    const controller = vscode.tests.createTestController(id, label);
    
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