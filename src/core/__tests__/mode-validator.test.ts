import * as vscode from 'vscode';
import * as assert from 'assert';
import { Mode, isToolAllowedForMode, getModeConfig, modes } from "../../shared/modes";
import { validateToolUse } from "../mode-validator";
import { TOOL_GROUPS } from "../../shared/tool-groups";
import { TestUtils } from '../../test/testUtils';

const [codeMode, architectMode, askMode] = modes.map((mode) => mode.slug);

export async function activateModeValidatorTests(context: vscode.ExtensionContext): Promise<void> {
    // Create test controller
    const testController = TestUtils.createTestController('modeValidatorTests', 'Mode Validator Tests');
    context.subscriptions.push(testController);

    // Root test suite
    const rootSuite = testController.createTestItem('mode-validator', 'Mode Validator');
    testController.items.add(rootSuite);

    // Test suites
    const isAllowedSuite = testController.createTestItem('is-allowed', 'isToolAllowedForMode');
    const validateSuite = testController.createTestItem('validate', 'validateToolUse');
    
    rootSuite.children.add(isAllowedSuite);
    rootSuite.children.add(validateSuite);

    // isToolAllowedForMode test suites
    const codeSuite = testController.createTestItem('code-mode', 'Code Mode');
    const architectSuite = testController.createTestItem('architect-mode', 'Architect Mode');
    const askSuite = testController.createTestItem('ask-mode', 'Ask Mode');
    const customSuite = testController.createTestItem('custom-modes', 'Custom Modes');
    const requirementsSuite = testController.createTestItem('tool-requirements', 'Tool Requirements');
    
    isAllowedSuite.children.add(codeSuite);
    isAllowedSuite.children.add(architectSuite);
    isAllowedSuite.children.add(askSuite);
    isAllowedSuite.children.add(customSuite);
    isAllowedSuite.children.add(requirementsSuite);

    // Code Mode tests
    codeSuite.children.add(
        TestUtils.createTest(
            testController,
            'allows-all-tools',
            'allows all code mode tools',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const mode = getModeConfig(codeMode);
                // Code mode has all groups
                for (const [_, config] of Object.entries(TOOL_GROUPS)) {
                    for (const tool of config.tools) {
                        assert.strictEqual(isToolAllowedForMode(tool, codeMode, []), true);
                    }
                }
            }
        )
    );

    codeSuite.children.add(
        TestUtils.createTest(
            testController,
            'disallows-unknown',
            'disallows unknown tools',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                assert.strictEqual(isToolAllowedForMode("unknown_tool" as any, codeMode, []), false);
            }
        )
    );

    // Architect Mode tests
    architectSuite.children.add(
        TestUtils.createTest(
            testController,
            'allows-configured',
            'allows configured tools',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const mode = getModeConfig(architectMode);
                // Architect mode has read, browser, and mcp groups
                const architectTools = [
                    ...TOOL_GROUPS.read.tools,
                    ...TOOL_GROUPS.browser.tools,
                    ...TOOL_GROUPS.mcp.tools,
                ];
                for (const tool of architectTools) {
                    assert.strictEqual(isToolAllowedForMode(tool, architectMode, []), true);
                }
            }
        )
    );

    // Ask Mode tests
    askSuite.children.add(
        TestUtils.createTest(
            testController,
            'allows-configured',
            'allows configured tools',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const mode = getModeConfig(askMode);
                // Ask mode has read, browser, and mcp groups
                const askTools = [
                    ...TOOL_GROUPS.read.tools,
                    ...TOOL_GROUPS.browser.tools,
                    ...TOOL_GROUPS.mcp.tools
                ];
                for (const tool of askTools) {
                    assert.strictEqual(isToolAllowedForMode(tool, askMode, []), true);
                }
            }
        )
    );

    // Custom Modes tests
    customSuite.children.add(
        TestUtils.createTest(
            testController,
            'allows-from-config',
            'allows tools from custom mode configuration',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const customModes = [
                    {
                        slug: "custom-mode",
                        name: "Custom Mode",
                        roleDefinition: "Custom role",
                        groups: ["read", "edit"] as const,
                    },
                ];
                // Should allow tools from read and edit groups
                assert.strictEqual(isToolAllowedForMode("read_file", "custom-mode", customModes), true);
                assert.strictEqual(isToolAllowedForMode("write_to_file", "custom-mode", customModes), true);
                // Should not allow tools from other groups
                assert.strictEqual(isToolAllowedForMode("execute_command", "custom-mode", customModes), false);
            }
        )
    );

    customSuite.children.add(
        TestUtils.createTest(
            testController,
            'override-builtin',
            'allows custom mode to override built-in mode',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const customModes = [
                    {
                        slug: codeMode,
                        name: "Custom Code Mode",
                        roleDefinition: "Custom role",
                        groups: ["read"] as const,
                    },
                ];
                // Should allow tools from read group
                assert.strictEqual(isToolAllowedForMode("read_file", codeMode, customModes), true);
                // Should not allow tools from other groups
                assert.strictEqual(isToolAllowedForMode("write_to_file", codeMode, customModes), false);
            }
        )
    );

    customSuite.children.add(
        TestUtils.createTest(
            testController,
            'respects-requirements',
            'respects tool requirements in custom modes',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const customModes = [
                    {
                        slug: "custom-mode",
                        name: "Custom Mode",
                        roleDefinition: "Custom role",
                        groups: ["edit"] as const,
                    },
                ];
                const requirements = { apply_diff: false };

                // Should respect disabled requirement even if tool group is allowed
                assert.strictEqual(isToolAllowedForMode("apply_diff", "custom-mode", customModes, requirements), false);

                // Should allow other edit tools
                assert.strictEqual(isToolAllowedForMode("write_to_file", "custom-mode", customModes, requirements), true);
            }
        )
    );

    // Tool Requirements tests
    requirementsSuite.children.add(
        TestUtils.createTest(
            testController,
            'respects-requirements',
            'respects tool requirements when provided',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const requirements = { apply_diff: false };
                assert.strictEqual(isToolAllowedForMode("apply_diff", codeMode, [], requirements), false);

                const enabledRequirements = { apply_diff: true };
                assert.strictEqual(isToolAllowedForMode("apply_diff", codeMode, [], enabledRequirements), true);
            }
        )
    );

    requirementsSuite.children.add(
        TestUtils.createTest(
            testController,
            'allows-unspecified',
            'allows tools when their requirements are not specified',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const requirements = { some_other_tool: true };
                assert.strictEqual(isToolAllowedForMode("apply_diff", codeMode, [], requirements), true);
            }
        )
    );

    requirementsSuite.children.add(
        TestUtils.createTest(
            testController,
            'handles-undefined',
            'handles undefined and empty requirements',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                assert.strictEqual(isToolAllowedForMode("apply_diff", codeMode, [], undefined), true);
                assert.strictEqual(isToolAllowedForMode("apply_diff", codeMode, [], {}), true);
            }
        )
    );

    requirementsSuite.children.add(
        TestUtils.createTest(
            testController,
            'prioritizes-requirements',
            'prioritizes requirements over mode configuration',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const requirements = { apply_diff: false };
                // Even in code mode which allows all tools, disabled requirement should take precedence
                assert.strictEqual(isToolAllowedForMode("apply_diff", codeMode, [], requirements), false);
            }
        )
    );

    // validateToolUse tests
    validateSuite.children.add(
        TestUtils.createTest(
            testController,
            'throws-disallowed',
            'throws error for disallowed tools in architect mode',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                try {
                    validateToolUse("unknown_tool" as any, "architect", []);
                    assert.fail("Expected function to throw an error");
                } catch (error) {
                    assert.ok(error instanceof Error);
                    assert.strictEqual((error as Error).message, 'Tool "unknown_tool" is not allowed in architect mode.');
                }
            }
        )
    );

    validateSuite.children.add(
        TestUtils.createTest(
            testController,
            'allows-allowed',
            'does not throw for allowed tools in architect mode',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                try {
                    validateToolUse("read_file", "architect", []);
                    // If we get here, the test passes
                    assert.ok(true);
                } catch (error) {
                    assert.fail("Function should not have thrown an error");
                }
            }
        )
    );

    validateSuite.children.add(
        TestUtils.createTest(
            testController,
            'throws-requirement-not-met',
            'throws error when tool requirement is not met',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const requirements = { apply_diff: false };
                try {
                    validateToolUse("apply_diff", codeMode, [], requirements);
                    assert.fail("Expected function to throw an error");
                } catch (error) {
                    assert.ok(error instanceof Error);
                    assert.strictEqual((error as Error).message, 'Tool "apply_diff" is not allowed in code mode.');
                }
            }
        )
    );

    validateSuite.children.add(
        TestUtils.createTest(
            testController,
            'allows-requirement-met',
            'does not throw when tool requirement is met',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const requirements = { apply_diff: true };
                try {
                    validateToolUse("apply_diff", codeMode, [], requirements);
                    // If we get here, the test passes
                    assert.ok(true);
                } catch (error) {
                    assert.fail("Function should not have thrown an error");
                }
            }
        )
    );

    validateSuite.children.add(
        TestUtils.createTest(
            testController,
            'handles-undefined',
            'handles undefined requirements gracefully',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                try {
                    validateToolUse("apply_diff", codeMode, [], undefined);
                    // If we get here, the test passes
                    assert.ok(true);
                } catch (error) {
                    assert.fail("Function should not have thrown an error");
                }
            }
        )
    );
}
