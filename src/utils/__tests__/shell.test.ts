import * as vscode from "vscode"
import * as assert from "assert"
import { userInfo } from "os"
import { getShell } from "../shell"

// Helper to mock VS Code configuration
function mockVsCodeConfig(platformKey: string, defaultProfileName: string | null, profiles: Record<string, any>) {
    vscode.workspace.getConfiguration = () =>
        ({
            get: (key: string) => {
                if (key === `defaultProfile.${platformKey}`) {
                    return defaultProfileName
                }
                if (key === `profiles.${platformKey}`) {
                    return profiles
                }
                return undefined
            },
        }) as any
}

export async function activateShellTests(context: vscode.ExtensionContext): Promise<void> {
    const testController = vscode.tests.createTestController('shellTests', 'Shell Tests')
    context.subscriptions.push(testController)

    const rootSuite = testController.createTestItem('shell', 'Shell Utils')
    testController.items.add(rootSuite)

    // Store original values
    const originalPlatform = process.platform
    const originalEnv = { ...process.env }
    const originalGetConfig = vscode.workspace.getConfiguration
    const originalUserInfo = userInfo

    testController.createRunProfile('run', vscode.TestRunProfileKind.Run, async (request) => {
        const queue: vscode.TestItem[] = []

        if (request.include) {
            request.include.forEach(test => queue.push(test))
        }

        const run = testController.createTestRun(request)

        for (const test of queue) {
            run.started(test)

            try {
                // Reset environment before each test
                delete process.env.SHELL
                delete process.env.COMSPEC
                ;(userInfo as any) = () => ({ shell: null })

                switch (test.id) {
                    // Windows Tests
                    case 'win.powershell7.path': {
                        Object.defineProperty(process, "platform", { value: "win32" })
                        mockVsCodeConfig("windows", "PowerShell", {
                            PowerShell: { path: "C:\\Program Files\\PowerShell\\7\\pwsh.exe" },
                        })
                        assert.strictEqual(getShell(), "C:\\Program Files\\PowerShell\\7\\pwsh.exe")
                        break
                    }

                    case 'win.powershell7.source': {
                        Object.defineProperty(process, "platform", { value: "win32" })
                        mockVsCodeConfig("windows", "PowerShell", {
                            PowerShell: { source: "PowerShell" },
                        })
                        assert.strictEqual(getShell(), "C:\\Program Files\\PowerShell\\7\\pwsh.exe")
                        break
                    }

                    case 'win.powershell.legacy': {
                        Object.defineProperty(process, "platform", { value: "win32" })
                        mockVsCodeConfig("windows", "PowerShell", {
                            PowerShell: {},
                        })
                        assert.strictEqual(getShell(), "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe")
                        break
                    }

                    case 'win.wsl.source': {
                        Object.defineProperty(process, "platform", { value: "win32" })
                        mockVsCodeConfig("windows", "WSL", {
                            WSL: { source: "WSL" },
                        })
                        assert.strictEqual(getShell(), "/bin/bash")
                        break
                    }

                    case 'win.wsl.name': {
                        Object.defineProperty(process, "platform", { value: "win32" })
                        mockVsCodeConfig("windows", "Ubuntu WSL", {
                            "Ubuntu WSL": {},
                        })
                        assert.strictEqual(getShell(), "/bin/bash")
                        break
                    }

                    case 'win.cmd.default': {
                        Object.defineProperty(process, "platform", { value: "win32" })
                        mockVsCodeConfig("windows", "CommandPrompt", {
                            CommandPrompt: {},
                        })
                        assert.strictEqual(getShell(), "C:\\Windows\\System32\\cmd.exe")
                        break
                    }

                    case 'win.userinfo': {
                        Object.defineProperty(process, "platform", { value: "win32" })
                        vscode.workspace.getConfiguration = () => ({ get: () => undefined }) as any
                        ;(userInfo as any) = () => ({ shell: "C:\\Custom\\PowerShell.exe" })
                        assert.strictEqual(getShell(), "C:\\Custom\\PowerShell.exe")
                        break
                    }

                    // macOS Tests
                    case 'mac.profile.path': {
                        Object.defineProperty(process, "platform", { value: "darwin" })
                        mockVsCodeConfig("osx", "MyCustomShell", {
                            MyCustomShell: { path: "/usr/local/bin/fish" },
                        })
                        assert.strictEqual(getShell(), "/usr/local/bin/fish")
                        break
                    }

                    case 'mac.userinfo': {
                        Object.defineProperty(process, "platform", { value: "darwin" })
                        vscode.workspace.getConfiguration = () => ({ get: () => undefined }) as any
                        ;(userInfo as any) = () => ({ shell: "/opt/homebrew/bin/zsh" })
                        assert.strictEqual(getShell(), "/opt/homebrew/bin/zsh")
                        break
                    }

                    case 'mac.env': {
                        Object.defineProperty(process, "platform", { value: "darwin" })
                        vscode.workspace.getConfiguration = () => ({ get: () => undefined }) as any
                        process.env.SHELL = "/usr/local/bin/zsh"
                        assert.strictEqual(getShell(), "/usr/local/bin/zsh")
                        break
                    }

                    case 'mac.default': {
                        Object.defineProperty(process, "platform", { value: "darwin" })
                        vscode.workspace.getConfiguration = () => ({ get: () => undefined }) as any
                        assert.strictEqual(getShell(), "/bin/zsh")
                        break
                    }

                    // Linux Tests
                    case 'linux.profile.path': {
                        Object.defineProperty(process, "platform", { value: "linux" })
                        mockVsCodeConfig("linux", "CustomProfile", {
                            CustomProfile: { path: "/usr/bin/fish" },
                        })
                        assert.strictEqual(getShell(), "/usr/bin/fish")
                        break
                    }

                    case 'linux.userinfo': {
                        Object.defineProperty(process, "platform", { value: "linux" })
                        vscode.workspace.getConfiguration = () => ({ get: () => undefined }) as any
                        ;(userInfo as any) = () => ({ shell: "/usr/bin/zsh" })
                        assert.strictEqual(getShell(), "/usr/bin/zsh")
                        break
                    }

                    case 'linux.env': {
                        Object.defineProperty(process, "platform", { value: "linux" })
                        vscode.workspace.getConfiguration = () => ({ get: () => undefined }) as any
                        process.env.SHELL = "/usr/bin/fish"
                        assert.strictEqual(getShell(), "/usr/bin/fish")
                        break
                    }

                    case 'linux.default': {
                        Object.defineProperty(process, "platform", { value: "linux" })
                        vscode.workspace.getConfiguration = () => ({ get: () => undefined }) as any
                        assert.strictEqual(getShell(), "/bin/bash")
                        break
                    }

                    // Error Handling Tests
                    case 'error.unknown': {
                        Object.defineProperty(process, "platform", { value: "sunos" })
                        vscode.workspace.getConfiguration = () => ({ get: () => undefined }) as any
                        assert.strictEqual(getShell(), "/bin/sh")
                        break
                    }

                    case 'error.config': {
                        Object.defineProperty(process, "platform", { value: "linux" })
                        vscode.workspace.getConfiguration = () => {
                            throw new Error("Configuration error")
                        }
                        ;(userInfo as any) = () => ({ shell: "/bin/bash" })
                        assert.strictEqual(getShell(), "/bin/bash")
                        break
                    }

                    case 'error.userinfo': {
                        Object.defineProperty(process, "platform", { value: "darwin" })
                        vscode.workspace.getConfiguration = () => ({ get: () => undefined }) as any
                        ;(userInfo as any) = () => {
                            throw new Error("userInfo error")
                        }
                        process.env.SHELL = "/bin/zsh"
                        assert.strictEqual(getShell(), "/bin/zsh")
                        break
                    }

                    case 'error.all': {
                        Object.defineProperty(process, "platform", { value: "linux" })
                        vscode.workspace.getConfiguration = () => {
                            throw new Error("Configuration error")
                        }
                        ;(userInfo as any) = () => {
                            throw new Error("userInfo error")
                        }
                        delete process.env.SHELL
                        assert.strictEqual(getShell(), "/bin/bash")
                        break
                    }
                }
                run.passed(test)
            } catch (err) {
                run.failed(test, new vscode.TestMessage(`Test failed: ${err}`))
            }

            // Restore original values after each test
            Object.defineProperty(process, "platform", { value: originalPlatform })
            process.env = { ...originalEnv }
            vscode.workspace.getConfiguration = originalGetConfig
            ;(userInfo as any) = originalUserInfo
        }

        run.end()
    })

    // Windows Tests
    const windowsSuite = testController.createTestItem('windows', 'Windows Shell Detection')
    rootSuite.children.add(windowsSuite)

    windowsSuite.children.add(testController.createTestItem(
        'win.powershell7.path',
        'uses explicit PowerShell 7 path from VS Code config'
    ))

    windowsSuite.children.add(testController.createTestItem(
        'win.powershell7.source',
        'uses PowerShell 7 path if source is PowerShell'
    ))

    windowsSuite.children.add(testController.createTestItem(
        'win.powershell.legacy',
        'falls back to legacy PowerShell'
    ))

    windowsSuite.children.add(testController.createTestItem(
        'win.wsl.source',
        'uses WSL bash when profile indicates WSL source'
    ))

    windowsSuite.children.add(testController.createTestItem(
        'win.wsl.name',
        'uses WSL bash when profile name includes wsl'
    ))

    windowsSuite.children.add(testController.createTestItem(
        'win.cmd.default',
        'defaults to cmd.exe'
    ))

    windowsSuite.children.add(testController.createTestItem(
        'win.userinfo',
        'respects userInfo() if no VS Code config'
    ))

    // macOS Tests
    const macosSuite = testController.createTestItem('macos', 'macOS Shell Detection')
    rootSuite.children.add(macosSuite)

    macosSuite.children.add(testController.createTestItem(
        'mac.profile.path',
        'uses VS Code profile path if available'
    ))

    macosSuite.children.add(testController.createTestItem(
        'mac.userinfo',
        'falls back to userInfo().shell'
    ))

    macosSuite.children.add(testController.createTestItem(
        'mac.env',
        'falls back to SHELL env var'
    ))

    macosSuite.children.add(testController.createTestItem(
        'mac.default',
        'falls back to /bin/zsh'
    ))

    // Linux Tests
    const linuxSuite = testController.createTestItem('linux', 'Linux Shell Detection')
    rootSuite.children.add(linuxSuite)

    linuxSuite.children.add(testController.createTestItem(
        'linux.profile.path',
        'uses VS Code profile path if available'
    ))

    linuxSuite.children.add(testController.createTestItem(
        'linux.userinfo',
        'falls back to userInfo().shell'
    ))

    linuxSuite.children.add(testController.createTestItem(
        'linux.env',
        'falls back to SHELL env var'
    ))

    linuxSuite.children.add(testController.createTestItem(
        'linux.default',
        'falls back to /bin/bash'
    ))

    // Error Handling Tests
    const errorSuite = testController.createTestItem('error', 'Error Handling')
    rootSuite.children.add(errorSuite)

    errorSuite.children.add(testController.createTestItem(
        'error.unknown',
        'falls back to /bin/sh for unknown platforms'
    ))

    errorSuite.children.add(testController.createTestItem(
        'error.config',
        'handles VS Code config errors gracefully'
    ))

    errorSuite.children.add(testController.createTestItem(
        'error.userinfo',
        'handles userInfo errors gracefully'
    ))

    errorSuite.children.add(testController.createTestItem(
        'error.all',
        'falls back fully to default shell paths if everything fails'
    ))
}
