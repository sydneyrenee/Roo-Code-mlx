import * as vscode from 'vscode'
import * as assert from 'assert'
import * as path from 'path'
import * as fs from 'fs/promises'
import { CustomModesManager } from '../CustomModesManager'
import { ModeConfig } from '../../../shared/modes'
import { fileExistsAtPath } from '../../../utils/fs'
import { TestUtils } from '../../../test/testUtils'

export async function activateCustomModesManagerTests(context: vscode.ExtensionContext): Promise<void> {
    const testController = TestUtils.createTestController('customModesTests', 'Custom Modes Manager Tests')
    context.subscriptions.push(testController)

    const rootSuite = testController.createTestItem('custom-modes', 'Custom Modes Manager')
    testController.items.add(rootSuite)

    // Create test suites
    const getCustomModesSuite = testController.createTestItem('get-custom-modes', 'getCustomModes')
    rootSuite.children.add(getCustomModesSuite)

    const updateCustomModeSuite = testController.createTestItem('update-custom-mode', 'updateCustomMode')
    rootSuite.children.add(updateCustomModeSuite)

    const fileOperationsSuite = testController.createTestItem('file-operations', 'File Operations')
    rootSuite.children.add(fileOperationsSuite)

    const deleteCustomModeSuite = testController.createTestItem('delete-custom-mode', 'deleteCustomMode')
    rootSuite.children.add(deleteCustomModeSuite)

    const updateModesInFileSuite = testController.createTestItem('update-modes-in-file', 'updateModesInFile')
    rootSuite.children.add(updateModesInFileSuite)

    const mockStoragePath = '/mock/settings'
    const mockSettingsPath = path.join(mockStoragePath, 'settings', 'cline_custom_modes.json')
    const mockRoomodes = '/mock/workspace/.roomodes'

    // Mock dependencies
    const mockFs = {
        mkdir: async () => {},
        readFile: async (path: string) => {
            if (path === mockSettingsPath) {
                return JSON.stringify({ customModes: [] })
            }
            throw new Error('File not found')
        },
        writeFile: async (...args: any[]) => {}
    }

    const mockFileExists = async (path: string) => {
        return path === mockSettingsPath || path === mockRoomodes
    }

    // Add getCustomModes tests
    getCustomModesSuite.children.add(
        TestUtils.createTest(
            testController,
            'merge-modes',
            'should merge modes with .roomodes taking precedence',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const mockOnUpdate = async () => Promise.resolve()
                const mockContext = {
                    globalState: {
                        get: () => {},
                        update: () => {}
                    },
                    globalStorageUri: {
                        fsPath: mockStoragePath
                    }
                } as unknown as vscode.ExtensionContext

                const manager = new CustomModesManager(mockContext, mockOnUpdate)

                const settingsModes = [
                    { slug: 'mode1', name: 'Mode 1', roleDefinition: 'Role 1', groups: ['read'] },
                    { slug: 'mode2', name: 'Mode 2', roleDefinition: 'Role 2', groups: ['read'] }
                ]
                const roomodesModes = [
                    { slug: 'mode2', name: 'Mode 2 Override', roleDefinition: 'Role 2 Override', groups: ['read'] },
                    { slug: 'mode3', name: 'Mode 3', roleDefinition: 'Role 3', groups: ['read'] }
                ]

                mockFs.readFile = async (path: string) => {
                    if (path === mockSettingsPath) {
                        return JSON.stringify({ customModes: settingsModes })
                    }
                    if (path === mockRoomodes) {
                        return JSON.stringify({ customModes: roomodesModes })
                    }
                    throw new Error('File not found')
                }

                const modes = await manager.getCustomModes()
                assert.strictEqual(modes.length, 3)
                assert.deepStrictEqual(modes.map(m => m.slug), ['mode2', 'mode3', 'mode1'])

                const mode2 = modes.find(m => m.slug === 'mode2')
                assert.strictEqual(mode2?.name, 'Mode 2 Override')
                assert.strictEqual(mode2?.roleDefinition, 'Role 2 Override')
            }
        )
    )

    updateCustomModeSuite.children.add(
        TestUtils.createTest(
            testController,
            'update-mode',
            'should update mode while preserving .roomodes precedence',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const mockOnUpdate = async () => Promise.resolve()
                const mockContext = {
                    globalState: {
                        get: () => {},
                        update: () => {}
                    },
                    globalStorageUri: {
                        fsPath: mockStoragePath
                    }
                } as unknown as vscode.ExtensionContext

                let settingsContent = { customModes: [] }
                let roomodesContent = { customModes: [] }

                mockFs.readFile = async (path: string) => {
                    if (path === mockSettingsPath) {
                        return JSON.stringify(settingsContent)
                    }
                    if (path === mockRoomodes) {
                        return JSON.stringify(roomodesContent)
                    }
                    throw new Error('File not found')
                }

                mockFs.writeFile = async (...args: any[]) => {
                    const [path, content] = args
                    if (path === mockSettingsPath) {
                        settingsContent = JSON.parse(content as string)
                    }
                    if (path === mockRoomodes) {
                        roomodesContent = JSON.parse(content as string)
                    }
                }

                const manager = new CustomModesManager(mockContext, mockOnUpdate)

                const newMode: ModeConfig = {
                    slug: 'mode1',
                    name: 'Updated Mode 1',
                    roleDefinition: 'Updated Role 1',
                    groups: ['read'],
                    source: 'global'
                }

                await manager.updateCustomMode('mode1', newMode)
                
                assert.ok(settingsContent.customModes.some(
                    (m: ModeConfig) => m.name === 'Updated Mode 1' && m.roleDefinition === 'Updated Role 1'
                ))
            }
        )
    )

    fileOperationsSuite.children.add(
        TestUtils.createTest(
            testController,
            'create-settings-dir',
            'creates settings directory if it does not exist',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                let mkdirCalled = false
                mockFs.mkdir = async () => { mkdirCalled = true }

                const mockOnUpdate = async () => Promise.resolve()
                const mockContext = {
                    globalState: {
                        get: () => {},
                        update: () => {}
                    },
                    globalStorageUri: {
                        fsPath: mockStoragePath
                    }
                } as unknown as vscode.ExtensionContext

                const manager = new CustomModesManager(mockContext, mockOnUpdate)
                await manager.getCustomModesFilePath()

                assert.ok(mkdirCalled)
            }
        )
    )

    deleteCustomModeSuite.children.add(
        TestUtils.createTest(
            testController,
            'delete-mode',
            'deletes mode from settings file',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const existingMode = {
                    slug: 'mode-to-delete',
                    name: 'Mode To Delete',
                    roleDefinition: 'Test role',
                    groups: ['read'],
                    source: 'global'
                }

                let settingsContent = { customModes: [existingMode] }

                mockFs.readFile = async (path: string) => {
                    if (path === mockSettingsPath) {
                        return JSON.stringify(settingsContent)
                    }
                    throw new Error('File not found')
                }

                mockFs.writeFile = async (...args: any[]) => {
                    const [path, content] = args
                    if (path === mockSettingsPath) {
                        settingsContent = JSON.parse(content as string)
                    }
                }

                const mockOnUpdate = async () => Promise.resolve()
                const mockContext = {
                    globalState: {
                        get: () => {},
                        update: (key: string, value: any) => {
                            if (key === 'customModes') {
                                settingsContent.customModes = value
                            }
                        }
                    },
                    globalStorageUri: {
                        fsPath: mockStoragePath
                    }
                } as unknown as vscode.ExtensionContext

                const manager = new CustomModesManager(mockContext, mockOnUpdate)
                await manager.deleteCustomMode('mode-to-delete')

                assert.strictEqual(settingsContent.customModes.length, 0)
            }
        )
    )

    updateModesInFileSuite.children.add(
        TestUtils.createTest(
            testController,
            'handle-corrupted-json',
            'handles corrupted JSON content gracefully',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                let writtenContent: any

                mockFs.readFile = async () => '{ invalid json content'
                mockFs.writeFile = async (...args: any[]) => {
                    const [_, content] = args
                    writtenContent = JSON.parse(content as string)
                }

                const mockOnUpdate = async () => Promise.resolve()
                const mockContext = {
                    globalState: {
                        get: () => {},
                        update: () => {}
                    },
                    globalStorageUri: {
                        fsPath: mockStoragePath
                    }
                } as unknown as vscode.ExtensionContext

                const manager = new CustomModesManager(mockContext, mockOnUpdate)

                const newMode: ModeConfig = {
                    slug: 'test-mode',
                    name: 'Test Mode',
                    roleDefinition: 'Test Role',
                    groups: ['read'],
                    source: 'global'
                }

                await manager.updateCustomMode('test-mode', newMode)

                assert.ok(writtenContent.customModes)
                assert.strictEqual(writtenContent.customModes[0].slug, 'test-mode')
                assert.strictEqual(writtenContent.customModes[0].name, 'Test Mode')
                assert.strictEqual(writtenContent.customModes[0].roleDefinition, 'Test Role')
            }
        )
    )

    // Create run profile
    testController.createRunProfile('run', vscode.TestRunProfileKind.Run, async (request) => {
        const queue: vscode.TestItem[] = []
        if (request.include) {
            request.include.forEach(test => queue.push(test))
        }

        const run = testController.createTestRun(request)

        for (const test of queue) {
            run.started(test)
            try {
                await (test as any).run?.(run)
                run.passed(test)
            } catch (err) {
                run.failed(test, new vscode.TestMessage(err instanceof Error ? err.message : String(err)))
            }
        }

        run.end()
    })
}
