import * as assert from 'assert';
import * as vscode from 'vscode';
import { HtmlGenerator } from '../../../../core/webview/ClineProviderHtml';
import { createMockExtensionContext } from '../../utils/mock-helpers';

suite('ClineProviderHtml', () => {
    let htmlGenerator: HtmlGenerator;
    let context: vscode.ExtensionContext;
    let mockWebview: vscode.Webview;

    setup(() => {
        context = createMockExtensionContext();
        mockWebview = {
            cspSource: 'vscode-webview://test',
            options: {
                enableScripts: true,
                enableForms: false,
                enableCommandUris: false
            },
            html: '',
            onDidReceiveMessage: () => ({ dispose: () => {} }),
            postMessage: async () => true,
            asWebviewUri: (uri: vscode.Uri) => {
                return vscode.Uri.parse(`vscode-webview://test/${uri.path}`);
            }
        };
        
        htmlGenerator = new HtmlGenerator(context);
    });

    test('should generate HTML content', () => {
        const html = htmlGenerator.getHtmlContent(mockWebview);
        
        // Check that the HTML contains expected elements
        assert.ok(html.includes('<!DOCTYPE html>'), 'HTML should include doctype');
        assert.ok(html.includes('<html lang="en">'), 'HTML should include html tag');
        assert.ok(html.includes('<div id="root"></div>'), 'HTML should include root div');
        assert.ok(html.includes('Content-Security-Policy'), 'HTML should include CSP');
        assert.ok(html.includes('webview-ui/build/assets/index.js'), 'HTML should reference JS file');
        assert.ok(html.includes('webview-ui/build/assets/index.css'), 'HTML should reference CSS file');
    });

    test('should include nonce in script tags', () => {
        const html = htmlGenerator.getHtmlContent(mockWebview);
        
        // Extract nonce from CSP
        const nonceMatch = html.match(/nonce-([^']*)/);
        assert.ok(nonceMatch, 'CSP should include nonce');
        
        const nonce = nonceMatch![1];
        assert.ok(html.includes(`nonce="${nonce}"`), 'Script tag should include nonce');
    });
});