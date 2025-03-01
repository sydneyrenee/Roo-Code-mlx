import * as vscode from 'vscode';
import * as assert from 'assert';
import { ZodError } from "zod";
import { CustomModeSchema, validateCustomMode } from "../CustomModesSchema";
import { ModeConfig } from "../../../shared/modes";
import { TestUtils } from '../../../test/testUtils';

export async function activateCustomModesSchemaTests(context: vscode.ExtensionContext): Promise<void> {
    // Create test controller
    const testController = TestUtils.createTestController('customModesSchemaTests', 'Custom Modes Schema Tests');
    context.subscriptions.push(testController);

    // Root test suite
    const rootSuite = testController.createTestItem('custom-modes-schema', 'CustomModeSchema');
    testController.items.add(rootSuite);

    // Test suites
    const validateSuite = testController.createTestItem('validate-custom-mode', 'validateCustomMode');
    const fileRegexSuite = testController.createTestItem('file-regex', 'fileRegex');
    
    rootSuite.children.add(validateSuite);
    rootSuite.children.add(fileRegexSuite);

    // validateCustomMode tests
    validateSuite.children.add(
        TestUtils.createTest(
            testController,
            'accepts-valid-mode',
            'accepts valid mode configuration',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const validMode = {
                    slug: "test",
                    name: "Test Mode",
                    roleDefinition: "Test role definition",
                    groups: ["read"] as const,
                } satisfies ModeConfig;

                try {
                    validateCustomMode(validMode);
                    // If we get here, the test passes
                    assert.ok(true);
                } catch (error) {
                    assert.fail("Should not have thrown an error");
                }
            }
        )
    );

    validateSuite.children.add(
        TestUtils.createTest(
            testController,
            'accepts-multiple-groups',
            'accepts mode with multiple groups',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const validMode = {
                    slug: "test",
                    name: "Test Mode",
                    roleDefinition: "Test role definition",
                    groups: ["read", "edit", "browser"] as const,
                } satisfies ModeConfig;

                try {
                    validateCustomMode(validMode);
                    // If we get here, the test passes
                    assert.ok(true);
                } catch (error) {
                    assert.fail("Should not have thrown an error");
                }
            }
        )
    );

    validateSuite.children.add(
        TestUtils.createTest(
            testController,
            'accepts-custom-instructions',
            'accepts mode with optional customInstructions',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const validMode = {
                    slug: "test",
                    name: "Test Mode",
                    roleDefinition: "Test role definition",
                    customInstructions: "Custom instructions",
                    groups: ["read"] as const,
                } satisfies ModeConfig;

                try {
                    validateCustomMode(validMode);
                    // If we get here, the test passes
                    assert.ok(true);
                } catch (error) {
                    assert.fail("Should not have thrown an error");
                }
            }
        )
    );

    validateSuite.children.add(
        TestUtils.createTest(
            testController,
            'rejects-missing-fields',
            'rejects missing required fields',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const invalidModes = [
                    {}, // All fields missing
                    { name: "Test" }, // Missing most fields
                    {
                        name: "Test",
                        roleDefinition: "Role",
                    }, // Missing slug and groups
                ];

                for (const invalidMode of invalidModes) {
                    try {
                        validateCustomMode(invalidMode);
                        assert.fail("Should have thrown an error");
                    } catch (error) {
                        assert.ok(error instanceof ZodError, "Error should be a ZodError");
                    }
                }
            }
        )
    );

    validateSuite.children.add(
        TestUtils.createTest(
            testController,
            'rejects-invalid-slug',
            'rejects invalid slug format',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const invalidMode = {
                    slug: "not@a@valid@slug",
                    name: "Test Mode",
                    roleDefinition: "Test role definition",
                    groups: ["read"] as const,
                } satisfies Omit<ModeConfig, "slug"> & { slug: string };

                try {
                    validateCustomMode(invalidMode);
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

    validateSuite.children.add(
        TestUtils.createTest(
            testController,
            'rejects-empty-strings',
            'rejects empty strings in required fields',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const emptyNameMode = {
                    slug: "123e4567-e89b-12d3-a456-426614174000",
                    name: "",
                    roleDefinition: "Test role definition",
                    groups: ["read"] as const,
                } satisfies ModeConfig;

                const emptyRoleMode = {
                    slug: "123e4567-e89b-12d3-a456-426614174000",
                    name: "Test Mode",
                    roleDefinition: "",
                    groups: ["read"] as const,
                } satisfies ModeConfig;

                try {
                    validateCustomMode(emptyNameMode);
                    assert.fail("Should have thrown an error for empty name");
                } catch (error) {
                    assert.ok((error as Error).message.includes("Name is required"), "Error should mention name is required");
                }

                try {
                    validateCustomMode(emptyRoleMode);
                    assert.fail("Should have thrown an error for empty role definition");
                } catch (error) {
                    assert.ok(
                        (error as Error).message.includes("Role definition is required"),
                        "Error should mention role definition is required"
                    );
                }
            }
        )
    );

    validateSuite.children.add(
        TestUtils.createTest(
            testController,
            'rejects-invalid-groups',
            'rejects invalid group configurations',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const invalidGroupMode = {
                    slug: "123e4567-e89b-12d3-a456-426614174000",
                    name: "Test Mode",
                    roleDefinition: "Test role definition",
                    groups: ["not-a-valid-group"] as any,
                };

                try {
                    validateCustomMode(invalidGroupMode);
                    assert.fail("Should have thrown an error");
                } catch (error) {
                    assert.ok(error instanceof ZodError, "Error should be a ZodError");
                }
            }
        )
    );

    validateSuite.children.add(
        TestUtils.createTest(
            testController,
            'handles-null-undefined',
            'handles null and undefined gracefully',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                try {
                    validateCustomMode(null as any);
                    assert.fail("Should have thrown an error for null");
                } catch (error) {
                    assert.ok(error instanceof ZodError, "Error should be a ZodError");
                }

                try {
                    validateCustomMode(undefined as any);
                    assert.fail("Should have thrown an error for undefined");
                } catch (error) {
                    assert.ok(error instanceof ZodError, "Error should be a ZodError");
                }
            }
        )
    );

    validateSuite.children.add(
        TestUtils.createTest(
            testController,
            'rejects-non-objects',
            'rejects non-object inputs',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const invalidInputs = [42, "string", true, [], () => {}];

                for (const input of invalidInputs) {
                    try {
                        validateCustomMode(input as any);
                        assert.fail("Should have thrown an error");
                    } catch (error) {
                        assert.ok(error instanceof ZodError, "Error should be a ZodError");
                    }
                }
            }
        )
    );

    // fileRegex tests
    fileRegexSuite.children.add(
        TestUtils.createTest(
            testController,
            'validates-file-restrictions',
            'validates a mode with file restrictions and descriptions',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const modeWithJustRegex = {
                    slug: "markdown-editor",
                    name: "Markdown Editor",
                    roleDefinition: "Markdown editing mode",
                    groups: ["read", ["edit", { fileRegex: "\\.md$" }], "browser"],
                };

                const modeWithDescription = {
                    slug: "docs-editor",
                    name: "Documentation Editor",
                    roleDefinition: "Documentation editing mode",
                    groups: [
                        "read",
                        ["edit", { fileRegex: "\\.(md|txt)$", description: "Documentation files only" }],
                        "browser",
                    ],
                };

                try {
                    CustomModeSchema.parse(modeWithJustRegex);
                    // If we get here, the test passes
                    assert.ok(true, "Mode with just regex should be valid");
                } catch (error) {
                    assert.fail("Should not have thrown an error for mode with just regex");
                }

                try {
                    CustomModeSchema.parse(modeWithDescription);
                    // If we get here, the test passes
                    assert.ok(true, "Mode with description should be valid");
                } catch (error) {
                    assert.fail("Should not have thrown an error for mode with description");
                }
            }
        )
    );

    fileRegexSuite.children.add(
        TestUtils.createTest(
            testController,
            'validates-regex-patterns',
            'validates file regex patterns',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const validPatterns = ["\\.md$", ".*\\.txt$", "[a-z]+\\.js$"];
                const invalidPatterns = ["[", "(unclosed", "\\"];

                for (const pattern of validPatterns) {
                    const mode = {
                        slug: "test",
                        name: "Test",
                        roleDefinition: "Test",
                        groups: ["read", ["edit", { fileRegex: pattern }]],
                    };
                    
                    try {
                        CustomModeSchema.parse(mode);
                        // If we get here, the test passes
                        assert.ok(true, `Pattern ${pattern} should be valid`);
                    } catch (error) {
                        assert.fail(`Should not have thrown an error for pattern ${pattern}`);
                    }
                }

                for (const pattern of invalidPatterns) {
                    const mode = {
                        slug: "test",
                        name: "Test",
                        roleDefinition: "Test",
                        groups: ["read", ["edit", { fileRegex: pattern }]],
                    };
                    
                    try {
                        CustomModeSchema.parse(mode);
                        assert.fail(`Should have thrown an error for pattern ${pattern}`);
                    } catch (error) {
                        // If we get here, the test passes
                        assert.ok(true, `Pattern ${pattern} should be invalid`);
                    }
                }
            }
        )
    );

    fileRegexSuite.children.add(
        TestUtils.createTest(
            testController,
            'prevents-duplicate-groups',
            'prevents duplicate groups',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const modeWithDuplicates = {
                    slug: "test",
                    name: "Test",
                    roleDefinition: "Test",
                    groups: ["read", "read", ["edit", { fileRegex: "\\.md$" }], ["edit", { fileRegex: "\\.txt$" }]],
                };

                try {
                    CustomModeSchema.parse(modeWithDuplicates);
                    assert.fail("Should have thrown an error for duplicate groups");
                } catch (error) {
                    assert.ok(
                        (error as Error).message.includes("Duplicate groups"),
                        "Error should mention duplicate groups"
                    );
                }
            }
        )
    );
}
