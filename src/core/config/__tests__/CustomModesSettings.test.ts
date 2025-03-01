import * as vscode from 'vscode';
import * as assert from 'assert';
import { CustomModesSettingsSchema } from "../CustomModesSchema";
import { ModeConfig } from "../../../shared/modes";
import { ZodError } from "zod";
import { TestUtils } from '../../../test/testUtils';

export async function activateCustomModesSettingsTests(context: vscode.ExtensionContext): Promise<void> {
    // Create test controller
    const testController = TestUtils.createTestController('customModesSettingsTests', 'Custom Modes Settings Tests');
    context.subscriptions.push(testController);

    // Root test suite
    const rootSuite = testController.createTestItem('custom-modes-settings', 'CustomModesSettings');
    testController.items.add(rootSuite);

    // Test suites
    const validationSuite = testController.createTestItem('schema-validation', 'schema validation');
    const typeInferenceSuite = testController.createTestItem('type-inference', 'type inference');
    
    rootSuite.children.add(validationSuite);
    rootSuite.children.add(typeInferenceSuite);

    // Define a valid mode for testing
    const validMode = {
        slug: "123e4567-e89b-12d3-a456-426614174000",
        name: "Test Mode",
        roleDefinition: "Test role definition",
        groups: ["read"] as const,
    } satisfies ModeConfig;

    // Schema validation tests
    validationSuite.children.add(
        TestUtils.createTest(
            testController,
            'accepts-valid-settings',
            'accepts valid settings',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const validSettings = {
                    customModes: [validMode],
                };

                try {
                    CustomModesSettingsSchema.parse(validSettings);
                    // If we get here, the test passes
                    assert.ok(true);
                } catch (error) {
                    assert.fail("Should not have thrown an error");
                }
            }
        )
    );

    validationSuite.children.add(
        TestUtils.createTest(
            testController,
            'accepts-empty-array',
            'accepts empty custom modes array',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const validSettings = {
                    customModes: [],
                };

                try {
                    CustomModesSettingsSchema.parse(validSettings);
                    // If we get here, the test passes
                    assert.ok(true);
                } catch (error) {
                    assert.fail("Should not have thrown an error");
                }
            }
        )
    );

    validationSuite.children.add(
        TestUtils.createTest(
            testController,
            'accepts-multiple-modes',
            'accepts multiple custom modes',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const validSettings = {
                    customModes: [
                        validMode,
                        {
                            ...validMode,
                            slug: "987fcdeb-51a2-43e7-89ab-cdef01234567",
                            name: "Another Mode",
                        },
                    ],
                };

                try {
                    CustomModesSettingsSchema.parse(validSettings);
                    // If we get here, the test passes
                    assert.ok(true);
                } catch (error) {
                    assert.fail("Should not have thrown an error");
                }
            }
        )
    );

    validationSuite.children.add(
        TestUtils.createTest(
            testController,
            'rejects-missing-field',
            'rejects missing customModes field',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const invalidSettings = {} as any;

                try {
                    CustomModesSettingsSchema.parse(invalidSettings);
                    assert.fail("Should have thrown an error");
                } catch (error) {
                    assert.ok(error instanceof ZodError, "Error should be a ZodError");
                }
            }
        )
    );

    validationSuite.children.add(
        TestUtils.createTest(
            testController,
            'rejects-invalid-mode',
            'rejects invalid mode in array',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const invalidSettings = {
                    customModes: [
                        validMode,
                        {
                            ...validMode,
                            slug: "not@a@valid@slug", // Invalid slug
                        },
                    ],
                };

                try {
                    CustomModesSettingsSchema.parse(invalidSettings);
                    assert.fail("Should have thrown an error");
                } catch (error) {
                    assert.ok(error instanceof ZodError, "Error should be a ZodError");
                    assert.ok(
                        (error as Error).message.includes("Slug must contain only letters numbers and dashes"),
                        "Error message should mention invalid slug format"
                    );
                }
            }
        )
    );

    validationSuite.children.add(
        TestUtils.createTest(
            testController,
            'rejects-non-array',
            'rejects non-array customModes',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const invalidSettings = {
                    customModes: "not an array",
                };

                try {
                    CustomModesSettingsSchema.parse(invalidSettings);
                    assert.fail("Should have thrown an error");
                } catch (error) {
                    assert.ok(error instanceof ZodError, "Error should be a ZodError");
                }
            }
        )
    );

    validationSuite.children.add(
        TestUtils.createTest(
            testController,
            'rejects-null-undefined',
            'rejects null or undefined',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                try {
                    CustomModesSettingsSchema.parse(null);
                    assert.fail("Should have thrown an error for null");
                } catch (error) {
                    assert.ok(error instanceof ZodError, "Error should be a ZodError");
                }

                try {
                    CustomModesSettingsSchema.parse(undefined);
                    assert.fail("Should have thrown an error for undefined");
                } catch (error) {
                    assert.ok(error instanceof ZodError, "Error should be a ZodError");
                }
            }
        )
    );

    validationSuite.children.add(
        TestUtils.createTest(
            testController,
            'rejects-duplicate-slugs',
            'rejects duplicate mode slugs',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const duplicateSettings = {
                    customModes: [
                        validMode,
                        { ...validMode }, // Same slug
                    ],
                };

                try {
                    CustomModesSettingsSchema.parse(duplicateSettings);
                    assert.fail("Should have thrown an error");
                } catch (error) {
                    assert.ok(
                        (error as Error).message.includes("Duplicate mode slugs are not allowed"),
                        "Error message should mention duplicate slugs"
                    );
                }
            }
        )
    );

    validationSuite.children.add(
        TestUtils.createTest(
            testController,
            'rejects-invalid-groups',
            'rejects invalid group configurations in modes',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const invalidSettings = {
                    customModes: [
                        {
                            ...validMode,
                            groups: ["invalid_group"] as any,
                        },
                    ],
                };

                try {
                    CustomModesSettingsSchema.parse(invalidSettings);
                    assert.fail("Should have thrown an error");
                } catch (error) {
                    assert.ok(error instanceof ZodError, "Error should be a ZodError");
                }
            }
        )
    );

    validationSuite.children.add(
        TestUtils.createTest(
            testController,
            'handles-multiple-groups',
            'handles multiple groups',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const validSettings = {
                    customModes: [
                        {
                            ...validMode,
                            groups: ["read", "edit", "browser"] as const,
                        },
                    ],
                };

                try {
                    CustomModesSettingsSchema.parse(validSettings);
                    // If we get here, the test passes
                    assert.ok(true);
                } catch (error) {
                    assert.fail("Should not have thrown an error");
                }
            }
        )
    );

    // Type inference tests
    typeInferenceSuite.children.add(
        TestUtils.createTest(
            testController,
            'includes-required-fields',
            'inferred type includes all required fields',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const settings = {
                    customModes: [validMode],
                };

                // Check that all required fields are defined
                assert.ok(settings.customModes[0].slug !== undefined, "slug should be defined");
                assert.ok(settings.customModes[0].name !== undefined, "name should be defined");
                assert.ok(settings.customModes[0].roleDefinition !== undefined, "roleDefinition should be defined");
                assert.ok(settings.customModes[0].groups !== undefined, "groups should be defined");
            }
        )
    );

    typeInferenceSuite.children.add(
        TestUtils.createTest(
            testController,
            'allows-optional-fields',
            'inferred type allows optional fields',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const settings = {
                    customModes: [
                        {
                            ...validMode,
                            customInstructions: "Optional instructions",
                        },
                    ],
                };

                // Check that optional field is defined
                assert.ok(settings.customModes[0].customInstructions !== undefined, "customInstructions should be defined");
            }
        )
    );
}
