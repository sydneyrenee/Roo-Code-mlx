import * as vscode from 'vscode';
import * as assert from 'assert';
import { CustomModeSchema } from "../CustomModesSchema";
import { ModeConfig } from "../../../shared/modes";
import { TestUtils } from '../../../test/testUtils';

export async function activateGroupConfigSchemaTests(context: vscode.ExtensionContext): Promise<void> {
    // Create test controller
    const testController = TestUtils.createTestController('groupConfigSchemaTests', 'Group Config Schema Tests');
    context.subscriptions.push(testController);

    // Root test suite
    const rootSuite = testController.createTestItem('group-config-schema', 'GroupConfigSchema');
    testController.items.add(rootSuite);

    // Test suites
    const formatValidationSuite = testController.createTestItem('group-format-validation', 'group format validation');
    rootSuite.children.add(formatValidationSuite);

    // Define a valid base mode for testing
    const validBaseMode = {
        slug: "123e4567-e89b-12d3-a456-426614174000",
        name: "Test Mode",
        roleDefinition: "Test role definition",
    };

    // Group format validation tests
    formatValidationSuite.children.add(
        TestUtils.createTest(
            testController,
            'accepts-single-group',
            'accepts single group',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const mode = {
                    ...validBaseMode,
                    groups: ["read"] as const,
                } satisfies ModeConfig;

                try {
                    CustomModeSchema.parse(mode);
                    // If we get here, the test passes
                    assert.ok(true);
                } catch (error) {
                    assert.fail("Should not have thrown an error");
                }
            }
        )
    );

    formatValidationSuite.children.add(
        TestUtils.createTest(
            testController,
            'accepts-multiple-groups',
            'accepts multiple groups',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const mode = {
                    ...validBaseMode,
                    groups: ["read", "edit", "browser"] as const,
                } satisfies ModeConfig;

                try {
                    CustomModeSchema.parse(mode);
                    // If we get here, the test passes
                    assert.ok(true);
                } catch (error) {
                    assert.fail("Should not have thrown an error");
                }
            }
        )
    );

    formatValidationSuite.children.add(
        TestUtils.createTest(
            testController,
            'accepts-all-groups',
            'accepts all available groups',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const mode = {
                    ...validBaseMode,
                    groups: ["read", "edit", "browser", "command", "mcp"] as const,
                } satisfies ModeConfig;

                try {
                    CustomModeSchema.parse(mode);
                    // If we get here, the test passes
                    assert.ok(true);
                } catch (error) {
                    assert.fail("Should not have thrown an error");
                }
            }
        )
    );

    formatValidationSuite.children.add(
        TestUtils.createTest(
            testController,
            'rejects-non-array',
            'rejects non-array group format',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const mode = {
                    ...validBaseMode,
                    groups: "not-an-array" as any,
                };

                try {
                    CustomModeSchema.parse(mode);
                    assert.fail("Should have thrown an error");
                } catch (error) {
                    // If we get here, the test passes
                    assert.ok(true);
                }
            }
        )
    );

    formatValidationSuite.children.add(
        TestUtils.createTest(
            testController,
            'rejects-invalid-names',
            'rejects invalid group names',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const mode = {
                    ...validBaseMode,
                    groups: ["invalid_group"] as any,
                };

                try {
                    CustomModeSchema.parse(mode);
                    assert.fail("Should have thrown an error");
                } catch (error) {
                    // If we get here, the test passes
                    assert.ok(true);
                }
            }
        )
    );

    formatValidationSuite.children.add(
        TestUtils.createTest(
            testController,
            'rejects-duplicates',
            'rejects duplicate groups',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const mode = {
                    ...validBaseMode,
                    groups: ["read", "read"] as any,
                };

                try {
                    CustomModeSchema.parse(mode);
                    assert.fail("Should have thrown an error");
                } catch (error) {
                    assert.ok(
                        (error as Error).message.includes("Duplicate groups are not allowed"),
                        "Error message should mention duplicate groups"
                    );
                }
            }
        )
    );

    formatValidationSuite.children.add(
        TestUtils.createTest(
            testController,
            'rejects-null-undefined',
            'rejects null or undefined groups',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const modeWithNull = {
                    ...validBaseMode,
                    groups: null as any,
                };

                const modeWithUndefined = {
                    ...validBaseMode,
                    groups: undefined as any,
                };

                try {
                    CustomModeSchema.parse(modeWithNull);
                    assert.fail("Should have thrown an error for null groups");
                } catch (error) {
                    // If we get here, the test passes for null
                    assert.ok(true);
                }

                try {
                    CustomModeSchema.parse(modeWithUndefined);
                    assert.fail("Should have thrown an error for undefined groups");
                } catch (error) {
                    // If we get here, the test passes for undefined
                    assert.ok(true);
                }
            }
        )
    );
}
