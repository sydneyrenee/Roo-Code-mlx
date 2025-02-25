import * as vscode from 'vscode';
import * as assert from 'assert';

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

    static createMockProvider() {
        return {
            postMessageToWebview: async () => {},
            postStateToWebview: async () => {},
            // Add other mock implementations as needed
        };
    }
}