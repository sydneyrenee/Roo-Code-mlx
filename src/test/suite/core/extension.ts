import * as vscode from 'vscode';
import { activate as activateClineTests } from './Cline.test';

export async function activate(context: vscode.ExtensionContext) {
    // Register test controller
    const controller = activateClineTests();
    context.subscriptions.push(controller);

    // Run tests
    const run = controller.createTestRun(new vscode.TestRunRequest());
    
    // Queue all tests
    controller.items.forEach(test => {
        run.enqueued(test);
        if (test.children.size > 0) {
            test.children.forEach(child => run.enqueued(child));
        }
    });

    // Run all queued tests
    controller.items.forEach(async test => {
        try {
            run.started(test);
            if (test.children.size > 0) {
                test.children.forEach(async child => {
                    try {
                        run.started(child);
                        await (child as any).run?.(run);
                        run.passed(child);
                    } catch (err) {
                        run.failed(child, new vscode.TestMessage(err instanceof Error ? err.message : String(err)));
                    }
                });
            } else {
                await (test as any).run?.(run);
            }
            run.passed(test);
        } catch (err) {
            run.failed(test, new vscode.TestMessage(err instanceof Error ? err.message : String(err)));
        }
    });

    run.end();
}