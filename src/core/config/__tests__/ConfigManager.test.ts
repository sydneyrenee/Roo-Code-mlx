import * as vscode from 'vscode';
import * as assert from 'assert';
import { ConfigManager, ApiConfigData } from "../ConfigManager";
import { ApiConfiguration } from "../../../shared/api";
import { TestUtils } from '../../../test/testUtils';

export async function activateConfigManagerTests(context: vscode.ExtensionContext): Promise<void> {
    // Create test controller
    const testController = TestUtils.createTestController('configManagerTests', 'Config Manager Tests');
    context.subscriptions.push(testController);

    // Root test suite
    const rootSuite = testController.createTestItem('config-manager', 'ConfigManager');
    testController.items.add(rootSuite);

    // Test suites
    const initConfigSuite = testController.createTestItem('init-config', 'initConfig');
    const listConfigSuite = testController.createTestItem('list-config', 'ListConfig');
    const saveConfigSuite = testController.createTestItem('save-config', 'SaveConfig');
    const deleteConfigSuite = testController.createTestItem('delete-config', 'DeleteConfig');
    const loadConfigSuite = testController.createTestItem('load-config', 'LoadConfig');
    const setCurrentConfigSuite = testController.createTestItem('set-current-config', 'SetCurrentConfig');
    const resetAllConfigsSuite = testController.createTestItem('reset-all-configs', 'ResetAllConfigs');
    const hasConfigSuite = testController.createTestItem('has-config', 'HasConfig');
    
    rootSuite.children.add(initConfigSuite);
    rootSuite.children.add(listConfigSuite);
    rootSuite.children.add(saveConfigSuite);
    rootSuite.children.add(deleteConfigSuite);
    rootSuite.children.add(loadConfigSuite);
    rootSuite.children.add(setCurrentConfigSuite);
    rootSuite.children.add(resetAllConfigsSuite);
    rootSuite.children.add(hasConfigSuite);

    // initConfig tests
    initConfigSuite.children.add(
        TestUtils.createTest(
            testController,
            'no-write-null',
            'should not write to storage when secrets.get returns null',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Track if store was called
                let storeWasCalled = false;
                
                // Create mock secrets
                const mockSecrets = {
                    get: async () => null,
                    store: async () => { storeWasCalled = true; },
                    delete: async () => {}
                };
                
                // Create mock context
                const mockContext = {
                    secrets: mockSecrets
                } as unknown as vscode.ExtensionContext;
                
                // Create config manager and initialize
                const configManager = new ConfigManager(mockContext);
                await configManager.initConfig();
                
                // Assert store was not called
                assert.strictEqual(storeWasCalled, false, "store should not have been called");
            }
        )
    );

    initConfigSuite.children.add(
        TestUtils.createTest(
            testController,
            'no-init-existing',
            'should not initialize config if it exists',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Track if store was called
                let storeWasCalled = false;
                
                // Create mock secrets
                const mockSecrets = {
                    get: async () => JSON.stringify({
                        currentApiConfigName: "default",
                        apiConfigs: {
                            default: {
                                config: {},
                                id: "default",
                            },
                        },
                    }),
                    store: async () => { storeWasCalled = true; },
                    delete: async () => {}
                };
                
                // Create mock context
                const mockContext = {
                    secrets: mockSecrets
                } as unknown as vscode.ExtensionContext;
                
                // Create config manager and initialize
                const configManager = new ConfigManager(mockContext);
                await configManager.initConfig();
                
                // Assert store was not called
                assert.strictEqual(storeWasCalled, false, "store should not have been called");
            }
        )
    );

    initConfigSuite.children.add(
        TestUtils.createTest(
            testController,
            'generate-ids',
            'should generate IDs for configs that lack them',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Store the config that was saved
                let storedConfig: any = null;
                
                // Create mock secrets
                const mockSecrets = {
                    get: async () => JSON.stringify({
                        currentApiConfigName: "default",
                        apiConfigs: {
                            default: {
                                config: {},
                            },
                            test: {
                                apiProvider: "anthropic",
                            },
                        },
                    }),
                    store: async (_key: string, value: string) => {
                        storedConfig = JSON.parse(value);
                    },
                    delete: async () => {}
                };
                
                // Create mock context
                const mockContext = {
                    secrets: mockSecrets
                } as unknown as vscode.ExtensionContext;
                
                // Create config manager and initialize
                const configManager = new ConfigManager(mockContext);
                await configManager.initConfig();
                
                // Assert IDs were generated
                assert.ok(storedConfig, "Config should have been stored");
                assert.ok(storedConfig.apiConfigs.default.id, "Default config should have an ID");
                assert.ok(storedConfig.apiConfigs.test.id, "Test config should have an ID");
            }
        )
    );

    initConfigSuite.children.add(
        TestUtils.createTest(
            testController,
            'throw-storage-fail',
            'should throw error if secrets storage fails',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Create mock secrets
                const mockSecrets = {
                    get: async () => { throw new Error("Storage failed"); },
                    store: async () => {},
                    delete: async () => {}
                };
                
                // Create mock context
                const mockContext = {
                    secrets: mockSecrets
                } as unknown as vscode.ExtensionContext;
                
                // Create config manager
                const configManager = new ConfigManager(mockContext);
                
                // Assert initialization throws
                try {
                    await configManager.initConfig();
                    assert.fail("Should have thrown an error");
                } catch (error) {
                    assert.ok(error instanceof Error);
                    assert.strictEqual(
                        (error as Error).message,
                        "Failed to initialize config: Error: Failed to read config from secrets: Error: Storage failed"
                    );
                }
            }
        )
    );

    // ListConfig tests
    listConfigSuite.children.add(
        TestUtils.createTest(
            testController,
            'list-all',
            'should list all available configs',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const existingConfig: ApiConfigData = {
                    currentApiConfigName: "default",
                    apiConfigs: {
                        default: {
                            id: "default",
                        },
                        test: {
                            apiProvider: "anthropic",
                            id: "test-id",
                        },
                    },
                    modeApiConfigs: {
                        code: "default",
                        architect: "default",
                        ask: "default",
                    },
                };
                
                // Create mock secrets
                const mockSecrets = {
                    get: async () => JSON.stringify(existingConfig),
                    store: async () => {},
                    delete: async () => {}
                };
                
                // Create mock context
                const mockContext = {
                    secrets: mockSecrets
                } as unknown as vscode.ExtensionContext;
                
                // Create config manager and list configs
                const configManager = new ConfigManager(mockContext);
                const configs = await configManager.listConfig();
                
                // Assert configs match expected
                assert.deepStrictEqual(configs, [
                    { name: "default", id: "default", apiProvider: undefined },
                    { name: "test", id: "test-id", apiProvider: "anthropic" },
                ]);
            }
        )
    );

    listConfigSuite.children.add(
        TestUtils.createTest(
            testController,
            'empty-config',
            'should handle empty config file',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const emptyConfig: ApiConfigData = {
                    currentApiConfigName: "default",
                    apiConfigs: {},
                    modeApiConfigs: {
                        code: "default",
                        architect: "default",
                        ask: "default",
                    },
                };
                
                // Create mock secrets
                const mockSecrets = {
                    get: async () => JSON.stringify(emptyConfig),
                    store: async () => {},
                    delete: async () => {}
                };
                
                // Create mock context
                const mockContext = {
                    secrets: mockSecrets
                } as unknown as vscode.ExtensionContext;
                
                // Create config manager and list configs
                const configManager = new ConfigManager(mockContext);
                const configs = await configManager.listConfig();
                
                // Assert configs are empty
                assert.deepStrictEqual(configs, []);
            }
        )
    );

    listConfigSuite.children.add(
        TestUtils.createTest(
            testController,
            'throw-read-fail',
            'should throw error if reading from secrets fails',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Create mock secrets
                const mockSecrets = {
                    get: async () => { throw new Error("Read failed"); },
                    store: async () => {},
                    delete: async () => {}
                };
                
                // Create mock context
                const mockContext = {
                    secrets: mockSecrets
                } as unknown as vscode.ExtensionContext;
                
                // Create config manager
                const configManager = new ConfigManager(mockContext);
                
                // Assert listing throws
                try {
                    await configManager.listConfig();
                    assert.fail("Should have thrown an error");
                } catch (error) {
                    assert.ok(error instanceof Error);
                    assert.strictEqual(
                        (error as Error).message,
                        "Failed to list configs: Error: Failed to read config from secrets: Error: Read failed"
                    );
                }
            }
        )
    );

    // SaveConfig tests
    saveConfigSuite.children.add(
        TestUtils.createTest(
            testController,
            'save-new',
            'should save new config',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                let storedConfig: any = null;
                let storedKey: string | null = null;
                
                // Create mock secrets
                const mockSecrets = {
                    get: async () => JSON.stringify({
                        currentApiConfigName: "default",
                        apiConfigs: {
                            default: {},
                        },
                        modeApiConfigs: {
                            code: "default",
                            architect: "default",
                            ask: "default",
                        },
                    }),
                    store: async (key: string, value: string) => {
                        storedKey = key;
                        storedConfig = JSON.parse(value);
                    },
                    delete: async () => {}
                };
                
                // Create mock context
                const mockContext = {
                    secrets: mockSecrets
                } as unknown as vscode.ExtensionContext;
                
                // Create config manager and save new config
                const configManager = new ConfigManager(mockContext);
                const newConfig: ApiConfiguration = {
                    apiProvider: "anthropic",
                    apiKey: "test-key",
                };
                await configManager.saveConfig("test", newConfig);
                
                // Assert config was stored correctly
                assert.strictEqual(storedKey, "roo_cline_config_api_config");
                assert.ok(storedConfig, "Config should have been stored");
                assert.strictEqual(storedConfig.currentApiConfigName, "default");
                assert.ok(storedConfig.apiConfigs.test, "Test config should exist");
                assert.strictEqual(storedConfig.apiConfigs.test.apiProvider, "anthropic");
                assert.strictEqual(storedConfig.apiConfigs.test.apiKey, "test-key");
                assert.ok(storedConfig.apiConfigs.test.id, "Test config should have an ID");
            }
        )
    );

    saveConfigSuite.children.add(
        TestUtils.createTest(
            testController,
            'update-existing',
            'should update existing config',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                let storedConfig: any = null;
                
                const existingConfig: ApiConfigData = {
                    currentApiConfigName: "default",
                    apiConfigs: {
                        test: {
                            apiProvider: "anthropic",
                            apiKey: "old-key",
                            id: "test-id",
                        },
                    },
                };
                
                // Create mock secrets
                const mockSecrets = {
                    get: async () => JSON.stringify(existingConfig),
                    store: async (_key: string, value: string) => {
                        storedConfig = JSON.parse(value);
                    },
                    delete: async () => {}
                };
                
                // Create mock context
                const mockContext = {
                    secrets: mockSecrets
                } as unknown as vscode.ExtensionContext;
                
                // Create config manager and update config
                const configManager = new ConfigManager(mockContext);
                const updatedConfig: ApiConfiguration = {
                    apiProvider: "anthropic",
                    apiKey: "new-key",
                };
                await configManager.saveConfig("test", updatedConfig);
                
                // Assert config was updated correctly
                assert.ok(storedConfig, "Config should have been stored");
                assert.strictEqual(storedConfig.apiConfigs.test.apiProvider, "anthropic");
                assert.strictEqual(storedConfig.apiConfigs.test.apiKey, "new-key");
                assert.strictEqual(storedConfig.apiConfigs.test.id, "test-id");
            }
        )
    );

    saveConfigSuite.children.add(
        TestUtils.createTest(
            testController,
            'throw-storage-fail',
            'should throw error if secrets storage fails',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Create mock secrets
                const mockSecrets = {
                    get: async () => JSON.stringify({
                        currentApiConfigName: "default",
                        apiConfigs: { default: {} },
                    }),
                    store: async () => { throw new Error("Storage failed"); },
                    delete: async () => {}
                };
                
                // Create mock context
                const mockContext = {
                    secrets: mockSecrets
                } as unknown as vscode.ExtensionContext;
                
                // Create config manager
                const configManager = new ConfigManager(mockContext);
                
                // Assert saving throws
                try {
                    await configManager.saveConfig("test", {});
                    assert.fail("Should have thrown an error");
                } catch (error) {
                    assert.ok(error instanceof Error);
                    assert.strictEqual(
                        (error as Error).message,
                        "Failed to save config: Error: Failed to write config to secrets: Error: Storage failed"
                    );
                }
            }
        )
    );

    // DeleteConfig tests
    deleteConfigSuite.children.add(
        TestUtils.createTest(
            testController,
            'delete-existing',
            'should delete existing config',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                let storedConfig: any = null;
                
                const existingConfig: ApiConfigData = {
                    currentApiConfigName: "default",
                    apiConfigs: {
                        default: {
                            id: "default",
                        },
                        test: {
                            apiProvider: "anthropic",
                            id: "test-id",
                        },
                    },
                };
                
                // Create mock secrets
                const mockSecrets = {
                    get: async () => JSON.stringify(existingConfig),
                    store: async (_key: string, value: string) => {
                        storedConfig = JSON.parse(value);
                    },
                    delete: async () => {}
                };
                
                // Create mock context
                const mockContext = {
                    secrets: mockSecrets
                } as unknown as vscode.ExtensionContext;
                
                // Create config manager and delete config
                const configManager = new ConfigManager(mockContext);
                await configManager.deleteConfig("test");
                
                // Assert config was deleted
                assert.ok(storedConfig, "Config should have been stored");
                assert.strictEqual(storedConfig.currentApiConfigName, "default");
                assert.deepStrictEqual(Object.keys(storedConfig.apiConfigs), ["default"]);
                assert.ok(storedConfig.apiConfigs.default.id, "Default config should have an ID");
            }
        )
    );

    deleteConfigSuite.children.add(
        TestUtils.createTest(
            testController,
            'throw-nonexistent',
            'should throw error when trying to delete non-existent config',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Create mock secrets
                const mockSecrets = {
                    get: async () => JSON.stringify({
                        currentApiConfigName: "default",
                        apiConfigs: { default: {} },
                    }),
                    store: async () => {},
                    delete: async () => {}
                };
                
                // Create mock context
                const mockContext = {
                    secrets: mockSecrets
                } as unknown as vscode.ExtensionContext;
                
                // Create config manager
                const configManager = new ConfigManager(mockContext);
                
                // Assert deleting throws
                try {
                    await configManager.deleteConfig("nonexistent");
                    assert.fail("Should have thrown an error");
                } catch (error) {
                    assert.ok(error instanceof Error);
                    assert.strictEqual((error as Error).message, "Config 'nonexistent' not found");
                }
            }
        )
    );

    deleteConfigSuite.children.add(
        TestUtils.createTest(
            testController,
            'throw-last-config',
            'should throw error when trying to delete last remaining config',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Create mock secrets
                const mockSecrets = {
                    get: async () => JSON.stringify({
                        currentApiConfigName: "default",
                        apiConfigs: {
                            default: {
                                id: "default",
                            },
                        },
                    }),
                    store: async () => {},
                    delete: async () => {}
                };
                
                // Create mock context
                const mockContext = {
                    secrets: mockSecrets
                } as unknown as vscode.ExtensionContext;
                
                // Create config manager
                const configManager = new ConfigManager(mockContext);
                
                // Assert deleting throws
                try {
                    await configManager.deleteConfig("default");
                    assert.fail("Should have thrown an error");
                } catch (error) {
                    assert.ok(error instanceof Error);
                    assert.strictEqual(
                        (error as Error).message,
                        "Cannot delete the last remaining configuration."
                    );
                }
            }
        )
    );

    // LoadConfig tests
    loadConfigSuite.children.add(
        TestUtils.createTest(
            testController,
            'load-and-update',
            'should load config and update current config name',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                let storedConfig: any = null;
                
                const existingConfig: ApiConfigData = {
                    currentApiConfigName: "default",
                    apiConfigs: {
                        test: {
                            apiProvider: "anthropic",
                            apiKey: "test-key",
                            id: "test-id",
                        },
                    },
                };
                
                // Create mock secrets
                const mockSecrets = {
                    get: async () => JSON.stringify(existingConfig),
                    store: async (_key: string, value: string) => {
                        storedConfig = JSON.parse(value);
                    },
                    delete: async () => {}
                };
                
                // Create mock context
                const mockContext = {
                    secrets: mockSecrets
                } as unknown as vscode.ExtensionContext;
                
                // Create config manager and load config
                const configManager = new ConfigManager(mockContext);
                const config = await configManager.loadConfig("test");
                
                // Assert config was loaded correctly
                assert.deepStrictEqual(config, {
                    apiProvider: "anthropic",
                    apiKey: "test-key",
                    id: "test-id",
                });
                
                // Assert current config was updated
                assert.ok(storedConfig, "Config should have been stored");
                assert.strictEqual(storedConfig.currentApiConfigName, "test");
                assert.deepStrictEqual(storedConfig.apiConfigs.test, {
                    apiProvider: "anthropic",
                    apiKey: "test-key",
                    id: "test-id",
                });
            }
        )
    );

    loadConfigSuite.children.add(
        TestUtils.createTest(
            testController,
            'throw-nonexistent',
            'should throw error when config does not exist',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Create mock secrets
                const mockSecrets = {
                    get: async () => JSON.stringify({
                        currentApiConfigName: "default",
                        apiConfigs: {
                            default: {
                                config: {},
                                id: "default",
                            },
                        },
                    }),
                    store: async () => {},
                    delete: async () => {}
                };
                
                // Create mock context
                const mockContext = {
                    secrets: mockSecrets
                } as unknown as vscode.ExtensionContext;
                
                // Create config manager
                const configManager = new ConfigManager(mockContext);
                
                // Assert loading throws
                try {
                    await configManager.loadConfig("nonexistent");
                    assert.fail("Should have thrown an error");
                } catch (error) {
                    assert.ok(error instanceof Error);
                    assert.strictEqual((error as Error).message, "Config 'nonexistent' not found");
                }
            }
        )
    );

    loadConfigSuite.children.add(
        TestUtils.createTest(
            testController,
            'throw-storage-fail',
            'should throw error if secrets storage fails',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Create mock secrets
                const mockSecrets = {
                    get: async () => JSON.stringify({
                        currentApiConfigName: "default",
                        apiConfigs: {
                            test: {
                                config: {
                                    apiProvider: "anthropic",
                                },
                                id: "test-id",
                            },
                        },
                    }),
                    store: async () => { throw new Error("Storage failed"); },
                    delete: async () => {}
                };
                
                // Create mock context
                const mockContext = {
                    secrets: mockSecrets
                } as unknown as vscode.ExtensionContext;
                
                // Create config manager
                const configManager = new ConfigManager(mockContext);
                
                // Assert loading throws
                try {
                    await configManager.loadConfig("test");
                    assert.fail("Should have thrown an error");
                } catch (error) {
                    assert.ok(error instanceof Error);
                    assert.strictEqual(
                        (error as Error).message,
                        "Failed to load config: Error: Failed to write config to secrets: Error: Storage failed"
                    );
                }
            }
        )
    );

    // SetCurrentConfig tests
    setCurrentConfigSuite.children.add(
        TestUtils.createTest(
            testController,
            'set-current',
            'should set current config',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                let storedConfig: any = null;
                
                const existingConfig: ApiConfigData = {
                    currentApiConfigName: "default",
                    apiConfigs: {
                        default: {
                            id: "default",
                        },
                        test: {
                            apiProvider: "anthropic",
                            id: "test-id",
                        },
                    },
                };
                
                // Create mock secrets
                const mockSecrets = {
                    get: async () => JSON.stringify(existingConfig),
                    store: async (_key: string, value: string) => {
                        storedConfig = JSON.parse(value);
                    },
                    delete: async () => {}
                };
                
                // Create mock context
                const mockContext = {
                    secrets: mockSecrets
                } as unknown as vscode.ExtensionContext;
                
                // Create config manager and set current config
                const configManager = new ConfigManager(mockContext);
                await configManager.setCurrentConfig("test");
                
                // Assert current config was updated
                assert.ok(storedConfig, "Config should have been stored");
                assert.strictEqual(storedConfig.currentApiConfigName, "test");
                assert.strictEqual(storedConfig.apiConfigs.default.id, "default");
                assert.deepStrictEqual(storedConfig.apiConfigs.test, {
                    apiProvider: "anthropic",
                    id: "test-id",
                });
            }
        )
    );

    setCurrentConfigSuite.children.add(
        TestUtils.createTest(
            testController,
            'throw-nonexistent',
            'should throw error when config does not exist',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Create mock secrets
                const mockSecrets = {
                    get: async () => JSON.stringify({
                        currentApiConfigName: "default",
                        apiConfigs: { default: {} },
                    }),
                    store: async () => {},
                    delete: async () => {}
                };
                
                // Create mock context
                const mockContext = {
                    secrets: mockSecrets
                } as unknown as vscode.ExtensionContext;
                
                // Create config manager
                const configManager = new ConfigManager(mockContext);
                
                // Assert setting throws
                try {
                    await configManager.setCurrentConfig("nonexistent");
                    assert.fail("Should have thrown an error");
                } catch (error) {
                    assert.ok(error instanceof Error);
                    assert.strictEqual((error as Error).message, "Config 'nonexistent' not found");
                }
            }
        )
    );

    setCurrentConfigSuite.children.add(
        TestUtils.createTest(
            testController,
            'throw-storage-fail',
            'should throw error if secrets storage fails',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Create mock secrets
                const mockSecrets = {
                    get: async () => JSON.stringify({
                        currentApiConfigName: "default",
                        apiConfigs: {
                            test: { apiProvider: "anthropic" },
                        },
                    }),
                    store: async () => { throw new Error("Storage failed"); },
                    delete: async () => {}
                };
                
                // Create mock context
                const mockContext = {
                    secrets: mockSecrets
                } as unknown as vscode.ExtensionContext;
                
                // Create config manager
                const configManager = new ConfigManager(mockContext);
                
                // Assert setting throws
                try {
                    await configManager.setCurrentConfig("test");
                    assert.fail("Should have thrown an error");
                } catch (error) {
                    assert.ok(error instanceof Error);
                    assert.strictEqual(
                        (error as Error).message,
                        "Failed to set current config: Error: Failed to write config to secrets: Error: Storage failed"
                    );
                }
            }
        )
    );

    // ResetAllConfigs tests
    resetAllConfigsSuite.children.add(
        TestUtils.createTest(
            testController,
            'delete-all',
            'should delete all stored configs',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                let deletedKey: string | null = null;
                
                // Create mock secrets
                const mockSecrets = {
                    get: async () => JSON.stringify({
                        currentApiConfigName: "test",
                        apiConfigs: {
                            test: {
                                apiProvider: "anthropic",
                                id: "test-id",
                            },
                        },
                    }),
                    store: async () => {},
                    delete: async (key: string) => {
                        deletedKey = key;
                    }
                };
                
                // Create mock context
                const mockContext = {
                    secrets: mockSecrets
                } as unknown as vscode.ExtensionContext;
                
                // Create config manager and reset configs
                const configManager = new ConfigManager(mockContext);
                await configManager.resetAllConfigs();
                
                // Assert configs were deleted
                assert.strictEqual(deletedKey, "roo_cline_config_api_config");
            }
        )
    );

    // HasConfig tests
    hasConfigSuite.children.add(
        TestUtils.createTest(
            testController,
            'true-existing',
            'should return true for existing config',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const existingConfig: ApiConfigData = {
                    currentApiConfigName: "default",
                    apiConfigs: {
                        default: {
                            id: "default",
                        },
                        test: {
                            apiProvider: "anthropic",
                            id: "test-id",
                        },
                    },
                };
                
                // Create mock secrets
                const mockSecrets = {
                    get: async () => JSON.stringify(existingConfig),
                    store: async () => {},
                    delete: async () => {}
                };
                
                // Create mock context
                const mockContext = {
                    secrets: mockSecrets
                } as unknown as vscode.ExtensionContext;
                
                // Create config manager and check config
                const configManager = new ConfigManager(mockContext);
                const hasConfig = await configManager.hasConfig("test");
                
                // Assert config exists
                assert.strictEqual(hasConfig, true);
            }
        )
    );

    hasConfigSuite.children.add(
        TestUtils.createTest(
            testController,
            'false-nonexistent',
            'should return false for non-existent config',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Create mock secrets
                const mockSecrets = {
                    get: async () => JSON.stringify({
                        currentApiConfigName: "default",
                        apiConfigs: { default: {} },
                    }),
                    store: async () => {},
                    delete: async () => {}
                };
                
                // Create mock context
                const mockContext = {
                    secrets: mockSecrets
                } as unknown as vscode.ExtensionContext;
                
                // Create config manager and check config
                const configManager = new ConfigManager(mockContext);
                const hasConfig = await configManager.hasConfig("nonexistent");
                
                // Assert config does not exist
                assert.strictEqual(hasConfig, false);
            }
        )
    );

    hasConfigSuite.children.add(
        TestUtils.createTest(
            testController,
            'throw-storage-fail',
            'should throw error if secrets storage fails',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                // Create mock secrets
                const mockSecrets = {
                    get: async () => { throw new Error("Storage failed"); },
                    store: async () => {},
                    delete: async () => {}
                };
                
                // Create mock context
                const mockContext = {
                    secrets: mockSecrets
                } as unknown as vscode.ExtensionContext;
                
                // Create config manager
                const configManager = new ConfigManager(mockContext);
                
                // Assert checking throws
                try {
                    await configManager.hasConfig("test");
                    assert.fail("Should have thrown an error");
                } catch (error) {
                    assert.ok(error instanceof Error);
                    assert.strictEqual(
                        (error as Error).message,
                        "Failed to check config existence: Error: Failed to read config from secrets: Error: Storage failed"
                    );
                }
            }
        )
    );
}
