import * as vscode from "vscode";
import { userInfo } from "os";
import * as assert from 'assert';
import { getShell } from "../shell";

// Mock types
type MockUserInfo = typeof userInfo;

export async function activateShellTests(context: vscode.ExtensionContext): Promise<void> {
    const testController = vscode.tests.createTestController('shellTests', 'Shell Detection Tests');
    context.subscriptions.push(testController);

    // Root test suite
    const rootSuite = testController.createTestItem('shell-detection', 'Shell Detection');
    testController.items.add(rootSuite);

    // Platform-specific suites
    const windowsSuite = testController.createTestItem('windows-tests', 'Windows Shell Detection');
    const macosSuite = testController.createTestItem('macos-tests', 'macOS Shell Detection');
    const linuxSuite = testController.createTestItem('linux-tests', 'Linux Shell Detection');
    const errorSuite = testController.createTestItem('error-tests', 'Error Handling');
    
    rootSuite.children.add(windowsSuite);
    rootSuite.children.add(macosSuite);
    rootSuite.children.add(linuxSuite);
    rootSuite.children.add(errorSuite);

    // Helper to mock VS Code configuration
    function mockVsCodeConfig(platformKey: string, defaultProfileName: string, profiles: Record<string, any>): void {
        const mockConfig: Partial<vscode.WorkspaceConfiguration> = {
            get: (key: string) => {
                if (key === `defaultProfile.${platformKey}`) {
                    return defaultProfileName;
                }
                if (key === `profiles.${platformKey}`) {
                    return profiles;
                }
                return undefined;
            },
            has: () => false,
            inspect: () => undefined,
            update: () => Promise.resolve(),
        };
        (vscode.workspace as any).getConfiguration = () => mockConfig;
    }

    // Add Windows test cases
    windowsSuite.children.add(testController.createTestItem(
        'win-powershell7-path',
        'uses explicit PowerShell 7 path from VS Code config'
    ));
    windowsSuite.children.add(testController.createTestItem(
        'win-powershell7-source',
        'uses PowerShell 7 path if source is PowerShell'
    ));
    windowsSuite.children.add(testController.createTestItem(
        'win-legacy-powershell',
        'falls back to legacy PowerShell'
    ));
    windowsSuite.children.add(testController.createTestItem(
        'win-wsl-source',
        'uses WSL bash when profile indicates WSL source'
    ));
    windowsSuite.children.add(testController.createTestItem(
        'win-wsl-name',
        'uses WSL bash when profile name includes wsl'
    ));
    windowsSuite.children.add(testController.createTestItem(
        'win-cmd-default',
        'defaults to cmd.exe'
    ));
    windowsSuite.children.add(testController.createTestItem(
        'win-undefined-profile',
        'handles undefined profile'
    ));
    windowsSuite.children.add(testController.createTestItem(
        'win-userinfo',
        'respects userInfo() if no VS Code config'
    ));
    windowsSuite.children.add(testController.createTestItem(
        'win-comspec',
        'respects COMSPEC if no userInfo shell'
    ));

    // Add macOS test cases
    macosSuite.children.add(testController.createTestItem(
        'mac-profile-path',
        'uses VS Code profile path if available'
    ));
    macosSuite.children.add(testController.createTestItem(
        'mac-userinfo',
        'falls back to userInfo().shell if no VS Code config'
    ));
    macosSuite.children.add(testController.createTestItem(
        'mac-shell-env',
        'falls back to SHELL env var if no userInfo shell'
    ));
    macosSuite.children.add(testController.createTestItem(
        'mac-default',
        'falls back to /bin/zsh if no config available'
    ));

    // Add Linux test cases
    linuxSuite.children.add(testController.createTestItem(
        'linux-profile-path',
        'uses VS Code profile path if available'
    ));
    linuxSuite.children.add(testController.createTestItem(
        'linux-userinfo',
        'falls back to userInfo().shell if no VS Code config'
    ));
    linuxSuite.children.add(testController.createTestItem(
        'linux-shell-env',
        'falls back to SHELL env var if no userInfo shell'
    ));
    linuxSuite.children.add(testController.createTestItem(
        'linux-default',
        'falls back to /bin/bash if nothing is set'
    ));

    // Add error handling test cases
    errorSuite.children.add(testController.createTestItem(
        'unknown-platform',
        'falls back to /bin/sh for unknown platforms'
    ));
    errorSuite.children.add(testController.createTestItem(
        'config-error',
        'handles VS Code config errors gracefully'
    ));
    errorSuite.children.add(testController.createTestItem(
        'userinfo-error',
        'handles userInfo errors gracefully'
    ));
    errorSuite.children.add(testController.createTestItem(
        'full-fallback',
        'falls back to defaults if everything fails'
    ));

    // Create run profile
    testController.createRunProfile('run', vscode.TestRunProfileKind.Run, async (request) => {
        const queue: vscode.TestItem[] = [];
        if (request.include) {
            request.include.forEach(test => queue.push(test));
        }
        const run = testController.createTestRun(request);
        
        // Initialize with current values
        let originalPlatform: string = process.platform;
        let originalEnv: NodeJS.ProcessEnv = { ...process.env };
        let originalGetConfig: typeof vscode.workspace.getConfiguration = vscode.workspace.getConfiguration;
        let originalUserInfo: MockUserInfo = userInfo;

        for (const test of queue) {
            run.started(test);
            try {
                // Store original references before each test
                originalPlatform = process.platform;
                originalEnv = { ...process.env };
                originalGetConfig = vscode.workspace.getConfiguration;
                originalUserInfo = userInfo;
                
                // Clear environment variables for clean test
                delete process.env.SHELL;
                delete process.env.COMSPEC;
                
                // Setup clean mock userInfo
                (global as any).userInfo = () => ({ shell: null });

                switch (test.id) {
                    // Windows tests
                    case 'win-powershell7-path': {
                        Object.defineProperty(process, "platform", { value: "win32" });
                        mockVsCodeConfig("windows", "PowerShell", {
                            PowerShell: { path: "C:\\Program Files\\PowerShell\\7\\pwsh.exe" },
                        });
                        assert.strictEqual(getShell(), "C:\\Program Files\\PowerShell\\7\\pwsh.exe");
                        break;
                    }
                    case 'win-powershell7-source': {
                        Object.defineProperty(process, "platform", { value: "win32" });
                        mockVsCodeConfig("windows", "PowerShell", {
                            PowerShell: { source: "PowerShell" },
                        });
                        assert.strictEqual(getShell(), "C:\\Program Files\\PowerShell\\7\\pwsh.exe");
                        break;
                    }
                    case 'win-legacy-powershell': {
                        Object.defineProperty(process, "platform", { value: "win32" });
                        mockVsCodeConfig("windows", "PowerShell", {
                            PowerShell: {},
                        });
                        assert.strictEqual(getShell(), "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe");
                        break;
                    }
                    case 'win-wsl-source': {
                        Object.defineProperty(process, "platform", { value: "win32" });
                        mockVsCodeConfig("windows", "WSL", {
                            WSL: { source: "WSL" },
                        });
                        assert.strictEqual(getShell(), "/bin/bash");
                        break;
                    }
                    case 'win-wsl-name': {
                        Object.defineProperty(process, "platform", { value: "win32" });
                        mockVsCodeConfig("windows", "Ubuntu WSL", {
                            "Ubuntu WSL": {},
                        });
                        assert.strictEqual(getShell(), "/bin/bash");
                        break;
                    }
                    case 'win-cmd-default': {
                        Object.defineProperty(process, "platform", { value: "win32" });
                        mockVsCodeConfig("windows", "CommandPrompt", {
                            CommandPrompt: {},
                        });
                        assert.strictEqual(getShell(), "C:\\Windows\\System32\\cmd.exe");
                        break;
                    }
                    case 'win-undefined-profile': {
                        Object.defineProperty(process, "platform", { value: "win32" });
                        mockVsCodeConfig("windows", "NonexistentProfile", {});
                        assert.strictEqual(getShell(), "C:\\Windows\\System32\\cmd.exe");
                        break;
                    }
                    case 'win-userinfo': {
                        Object.defineProperty(process, "platform", { value: "win32" });
                        (vscode.workspace as any).getConfiguration = () => ({ get: () => undefined });
                        (global as any).userInfo = () => ({ shell: "C:\\Custom\\PowerShell.exe" });
                        assert.strictEqual(getShell(), "C:\\Custom\\PowerShell.exe");
                        break;
                    }
                    case 'win-comspec': {
                        Object.defineProperty(process, "platform", { value: "win32" });
                        (vscode.workspace as any).getConfiguration = () => ({ get: () => undefined });
                        process.env.COMSPEC = "D:\\CustomCmd\\cmd.exe";
                        assert.strictEqual(getShell(), "D:\\CustomCmd\\cmd.exe");
                        break;
                    }

                    // macOS tests
                    case 'mac-profile-path': {
                        Object.defineProperty(process, "platform", { value: "darwin" });
                        mockVsCodeConfig("osx", "MyCustomShell", {
                            MyCustomShell: { path: "/usr/local/bin/fish" },
                        });
                        assert.strictEqual(getShell(), "/usr/local/bin/fish");
                        break;
                    }
                    case 'mac-userinfo': {
                        Object.defineProperty(process, "platform", { value: "darwin" });
                        (vscode.workspace as any).getConfiguration = () => ({ get: () => undefined });
                        (global as any).userInfo = () => ({ shell: "/opt/homebrew/bin/zsh" });
                        assert.strictEqual(getShell(), "/opt/homebrew/bin/zsh");
                        break;
                    }
                    case 'mac-shell-env': {
                        Object.defineProperty(process, "platform", { value: "darwin" });
                        (vscode.workspace as any).getConfiguration = () => ({ get: () => undefined });
                        process.env.SHELL = "/usr/local/bin/zsh";
                        assert.strictEqual(getShell(), "/usr/local/bin/zsh");
                        break;
                    }
                    case 'mac-default': {
                        Object.defineProperty(process, "platform", { value: "darwin" });
                        (vscode.workspace as any).getConfiguration = () => ({ get: () => undefined });
                        assert.strictEqual(getShell(), "/bin/zsh");
                        break;
                    }

                    // Linux tests
                    case 'linux-profile-path': {
                        Object.defineProperty(process, "platform", { value: "linux" });
                        mockVsCodeConfig("linux", "CustomProfile", {
                            CustomProfile: { path: "/usr/bin/fish" },
                        });
                        assert.strictEqual(getShell(), "/usr/bin/fish");
                        break;
                    }
                    case 'linux-userinfo': {
                        Object.defineProperty(process, "platform", { value: "linux" });
                        (vscode.workspace as any).getConfiguration = () => ({ get: () => undefined });
                        (global as any).userInfo = () => ({ shell: "/usr/bin/zsh" });
                        assert.strictEqual(getShell(), "/usr/bin/zsh");
                        break;
                    }
                    case 'linux-shell-env': {
                        Object.defineProperty(process, "platform", { value: "linux" });
                        (vscode.workspace as any).getConfiguration = () => ({ get: () => undefined });
                        process.env.SHELL = "/usr/bin/fish";
                        assert.strictEqual(getShell(), "/usr/bin/fish");
                        break;
                    }
                    case 'linux-default': {
                        Object.defineProperty(process, "platform", { value: "linux" });
                        (vscode.workspace as any).getConfiguration = () => ({ get: () => undefined });
                        assert.strictEqual(getShell(), "/bin/bash");
                        break;
                    }

                    // Error handling tests
                    case 'unknown-platform': {
                        Object.defineProperty(process, "platform", { value: "sunos" });
                        (vscode.workspace as any).getConfiguration = () => ({ get: () => undefined });
                        assert.strictEqual(getShell(), "/bin/sh");
                        break;
                    }
                    case 'config-error': {
                        Object.defineProperty(process, "platform", { value: "linux" });
                        (vscode.workspace as any).getConfiguration = () => {
                            throw new Error("Configuration error");
                        };
                        (global as any).userInfo = () => ({ shell: "/bin/bash" });
                        assert.strictEqual(getShell(), "/bin/bash");
                        break;
                    }
                    case 'userinfo-error': {
                        Object.defineProperty(process, "platform", { value: "darwin" });
                        (vscode.workspace as any).getConfiguration = () => ({ get: () => undefined });
                        (global as any).userInfo = () => {
                            throw new Error("userInfo error");
                        };
                        process.env.SHELL = "/bin/zsh";
                        assert.strictEqual(getShell(), "/bin/zsh");
                        break;
                    }
                    case 'full-fallback': {
                        Object.defineProperty(process, "platform", { value: "linux" });
                        (vscode.workspace as any).getConfiguration = () => {
                            throw new Error("Configuration error");
                        };
                        (global as any).userInfo = () => {
                            throw new Error("userInfo error");
                        };
                        delete process.env.SHELL;
                        assert.strictEqual(getShell(), "/bin/bash");
                        break;
                    }
                }
                
                run.passed(test);
            } catch (err) {
                run.failed(test, new vscode.TestMessage(err instanceof Error ? err.message : String(err)));
            } finally {
                // Restore original values after each test
                Object.defineProperty(process, "platform", { value: originalPlatform });
                process.env = { ...originalEnv };
                (vscode.workspace as any).getConfiguration = originalGetConfig;
                (global as any).userInfo = originalUserInfo;
            }
        }
        run.end();
    });
}