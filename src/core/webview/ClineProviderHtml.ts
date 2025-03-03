import * as vscode from "vscode"
import axios from "axios"
import { getUri } from "./getUri"
import { getNonce } from "./getNonce"

export class HtmlGenerator {
    constructor(private readonly context: vscode.ExtensionContext) {}

    /**
     * Generates HTML content for development mode with Hot Module Replacement (HMR)
     */
    async getHMRHtmlContent(webview: vscode.Webview): Promise<string> {
        const localPort = "5173"
        const localServerUrl = `localhost:${localPort}`

        // Check if local dev server is running.
        try {
            await axios.get(`http://${localServerUrl}`)
        } catch (error) {
            vscode.window.showErrorMessage(
                "Local development server is not running, HMR will not work. Please run 'npm run dev' before launching the extension to enable HMR.",
            )

            return this.getHtmlContent(webview)
        }

        const nonce = getNonce()
        const stylesUri = getUri(webview, this.context.extensionUri, ["webview-ui", "build", "assets", "index.css"])
        const codiconsUri = getUri(webview, this.context.extensionUri, [
            "node_modules",
            "@vscode",
            "codicons",
            "dist",
            "codicon.css",
        ])

        const file = "src/index.tsx"
        const scriptUri = `http://${localServerUrl}/${file}`

        const reactRefresh = /*html*/ `
            <script nonce="${nonce}" type="module">
                import RefreshRuntime from "http://localhost:${localPort}/@react-refresh"
                RefreshRuntime.injectIntoGlobalHook(window)
                window.$RefreshReg$ = () => {}
                window.$RefreshSig$ = () => (type) => type
                window.__vite_plugin_react_preamble_installed__ = true
            </script>
        `

        const csp = [
            "default-src 'none'",
            `font-src ${webview.cspSource}`,
            `style-src ${webview.cspSource} 'unsafe-inline' https://* http://${localServerUrl} http://0.0.0.0:${localPort}`,
            `img-src ${webview.cspSource} data:`,
            `script-src 'unsafe-eval' https://* http://${localServerUrl} http://0.0.0.0:${localPort} 'nonce-${nonce}'`,
            `connect-src https://* ws://${localServerUrl} ws://0.0.0.0:${localPort} http://${localServerUrl} http://0.0.0.0:${localPort}`,
        ]

        return /*html*/ `
            <!DOCTYPE html>
            <html lang="en">
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
                    <meta http-equiv="Content-Security-Policy" content="${csp.join("; ")}">
                    <link rel="stylesheet" type="text/css" href="${stylesUri}">
                    <link href="${codiconsUri}" rel="stylesheet" />
                    <title>Roo Code</title>
                </head>
                <body>
                    <div id="root"></div>
                    ${reactRefresh}
                    <script type="module" src="${scriptUri}"></script>
                </body>
            </html>
        `
    }

    /**
     * Defines and returns the HTML that should be rendered within the webview panel.
     *
     * @remarks This is also the place where references to the React webview build files
     * are created and inserted into the webview HTML.
     *
     * @param webview A reference to the extension webview
     * @returns A template string literal containing the HTML that should be
     * rendered within the webview panel
     */
    getHtmlContent(webview: vscode.Webview): string {
        // Get the local path to main script run in the webview,
        // then convert it to a uri we can use in the webview.

        // The CSS file from the React build output
        const stylesUri = getUri(webview, this.context.extensionUri, ["webview-ui", "build", "assets", "index.css"])
        // The JS file from the React build output
        const scriptUri = getUri(webview, this.context.extensionUri, ["webview-ui", "build", "assets", "index.js"])

        // The codicon font from the React build output
        // https://github.com/microsoft/vscode-extension-samples/blob/main/webview-codicons-sample/src/extension.ts
        // we installed this package in the extension so that we can access it how its intended from the extension (the font file is likely bundled in vscode), and we just import the css fileinto our react app we don't have access to it
        // don't forget to add font-src ${webview.cspSource};
        const codiconsUri = getUri(webview, this.context.extensionUri, [
            "node_modules",
            "@vscode",
            "codicons",
            "dist",
            "codicon.css",
        ])

        // Use a nonce to only allow a specific script to be run.
        /*
        content security policy of your webview to only allow scripts that have a specific nonce
        create a content security policy meta tag so that only loading scripts with a nonce is allowed
        As your extension grows you will likely want to add custom styles, fonts, and/or images to your webview. If you do, you will need to update the content security policy meta tag to explicity allow for these resources. E.g.
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; font-src ${webview.cspSource}; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';">
        - 'unsafe-inline' is required for styles due to vscode-webview-toolkit's dynamic style injection
        - since we pass base64 images to the webview, we need to specify img-src ${webview.cspSource} data:;

        in meta tag we add nonce attribute: A cryptographic nonce (only used once) to allow scripts. The server must generate a unique nonce value each time it transmits a policy. It is critical to provide a nonce that cannot be guessed as bypassing a resource's policy is otherwise trivial.
        */
        const nonce = getNonce()

        // Tip: Install the es6-string-html VS Code extension to enable code highlighting below
        return /*html*/ `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
            <meta name="theme-color" content="#000000">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} data:; script-src 'nonce-${nonce}';">
            <link rel="stylesheet" type="text/css" href="${stylesUri}">
            <link href="${codiconsUri}" rel="stylesheet" />
            <title>Roo Code</title>
          </head>
          <body>
            <noscript>You need to enable JavaScript to run this app.</noscript>
            <div id="root"></div>
            <script nonce="${nonce}" src="${scriptUri}"></script>
          </body>
        </html>
      `
    }
}