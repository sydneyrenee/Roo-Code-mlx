import * as vscode from 'vscode';

export interface MockClineProvider extends vscode.WebviewViewProvider {
    postMessageToWebview: () => Promise<void>;
    postStateToWebview: () => Promise<void>;
}

export class TestClineProvider implements MockClineProvider {
    resolveWebviewView(webviewView: vscode.WebviewView) {}
    async postMessageToWebview() {}
    async postStateToWebview() {}
}