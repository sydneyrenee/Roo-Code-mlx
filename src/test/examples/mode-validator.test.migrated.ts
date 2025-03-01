import * as vscode from 'vscode'
import * as assert from 'assert'
import { Mode, isToolAllowedForMode, getModeConfig, modes } from "../../shared/modes"
import { validateToolUse } from "../../core/mode-validator"
import { TOOL_GROUPS } from "../../shared/tool-groups"

export async function activateModeValidatorTests(context: vscode.ExtensionContext): Promise<void> {
    const testController = vscode.tests.createTestController('modeValidatorTests', 'Mode Validator Tests')
    context.subscriptions.push(testController)

    // Root test item
    const rootSuite = testController.createTestItem('mode-validator', 'Mode Validator')
    testController.items.add(rootSuite)

    // Create test suites
    const isAllowedSuite = testController.createTestItem('is-allowed', 'isToolAllowedForMode')
    rootSuite.children.add(isAllowedSuite)

    const validateSuite = testController.createTestItem('validate', 'validateToolUse')
    rootSuite.children.add(validateSuite)

    // Create test groups for isToolAllowedForMode
    const codeSuite = testController.createTestItem('code-mode', 'Code Mode')
    isAllowedSuite.children.add(codeSuite)

    const architectSuite = testController.createTestItem('architect-mode', 'Architect Mode')
    isAllowedSuite.children.add(architectSuite)

    const askSuite = testController.createTestItem('ask-mode', 'Ask Mode')
    isAllowedSuite.children.add(askSuite)

    const customSuite = testController.createTestItem('custom-modes', 'Custom Modes')
    isAllowedSuite.children.add(customSuite)

    const requirementsSuite = testController.createTestItem('tool-requirements', 'Tool Requirements')
    isAllowedSuite.children.add(requirementsSuite)

    // Add test cases for code mode
    codeSuite.children.add(testController.createTestItem(
        'allows-all-tools',
        'allows all code mode tools'
    ))

    codeSuite.children.add(testController.createTestItem(
        'disallows-unknown',
        'disallows unknown tools'
    ))

    // Add test cases for architect mode
    architectSuite.children.add(testController.createTestItem(
        'allows-configured',
        'allows configured tools'
    ))

    // Add test cases for ask mode
    askSuite.children.add(testController.createTestItem(
        'allows-configured',
        'allows configured tools'
    ))

    // Add test cases for custom modes
    customSuite.children.add(testController.createTestItem(
        'allows-custom-tools',
        'allows tools from custom mode configuration'
    ))

    customSuite.children.add(testController.createTestItem(
        'allows-override',
        'allows custom mode to override built-in mode'
    ))

    customSuite.children.add(testController.createTestItem(
        'respects-requirements',
        'respects tool requirements in custom modes'
    ))

    // Add test cases for tool requirements
    requirementsSuite.children.add(testController.createTestItem(
        'respects-requirements',
        'respects tool requirements when provided'
    ))

    requirementsSuite.children.add(testController.createTestItem(
        'allows-unspecified',
        'allows tools when their requirements are not specified'
    ))

    requirementsSuite.children.add(testController.createTestItem(
        'handles-undefined',
        'handles undefined and empty requirements'
    ))

    requirementsSuite.children.add(testController.createTestItem(
        'prioritizes-requirements',
        'prioritizes requirements over mode configuration'
    ))

    // Add test cases for validateToolUse
    validateSuite.children.add(testController.createTestItem(
        'throws-disallowed',
        'throws error for disallowed tools in architect mode'
    ))

    validateSuite.children.add(testController.createTestItem(
        'no-throw-allowed',
        'does not throw for allowed tools in architect mode'
    ))

    validateSuite.children.add(testController.createTestItem(
        'throws-requirement-not-met',
        'throws error when tool requirement is not met'
    ))

    validateSuite.children.add(testController.createTestItem(
        'no-throw-requirement-met',
        'does not throw when tool requirement is met'
    ))

    validateSuite.children.add(testController.createTestItem(
        'handles-undefined-requirements',
        'handles undefined requirements gracefully'
    ))

    // Create run profile
    testController.createRunProfile('run', vscode.TestRunProfileKind.Run, async (request) => {
        const queue: vscode.TestItem[] = []
        if (request.include) {
            request.include.forEach(test => queue.push(test))
        }

        const run = testController.createTestRun(request)
        const [codeMode, architectMode, askMode] = modes.map((mode) => mode.slug)

        for (const test of queue) {
            run.started(test)
            try {
                switch (test.id) {
                    // Code mode tests
                    case 'allows-all-tools': {
                        const mode = getModeConfig(codeMode)
                        // Code mode has all groups
                        Object.entries(TOOL_GROUPS).forEach(([_, config]) => {
                            config.tools.forEach((tool: string) => {
                                assert.strictEqual(isToolAllowedForMode(tool, codeMode, []), true, 
                                    `Tool ${tool} should be allowed in code mode`)
                            })
                        })
                        break
                    }
                    case 'disallows-unknown': {
                        assert.strictEqual(isToolAllowedForMode("unknown_tool" as any, codeMode, []), false,
                            "Unknown tool should not be allowed in code mode")
                        break
                    }

                    // Architect mode tests
                    case 'allows-configured': {
                        const mode = getModeConfig(architectMode)
                        // Architect mode has read, browser, and mcp groups
                        const architectTools = [
                            ...TOOL_GROUPS.read.tools,
                            ...TOOL_GROUPS.browser.tools,
                            ...TOOL_GROUPS.mcp.tools,
                        ]
                        architectTools.forEach((tool) => {
                            assert.strictEqual(isToolAllowedForMode(tool, architectMode, []), true,
                                `Tool ${tool} should be allowed in architect mode`)
                        })
                        break
                    }

                    // Ask mode tests
                    case 'allows-configured': {
                        const mode = getModeConfig(askMode)
                        // Ask mode has read, browser, and mcp groups
                        const askTools = [
                            ...TOOL_GROUPS.read.tools, 
                            ...TOOL_GROUPS.browser.tools, 
                            ...TOOL_GROUPS.mcp.tools
                        ]
                        askTools.forEach((tool) => {
                            assert.strictEqual(isToolAllowedForMode(tool, askMode, []), true,
                                `Tool ${tool} should be allowed in ask mode`)
                        })
                        break
                    }

                    // Custom modes tests
                    case 'allows-custom-tools': {
                        const customModes = [
                            {
                                slug: "custom-mode",
                                name: "Custom Mode",
                                roleDefinition: "Custom role",
                                groups: ["read", "edit"] as const,
                            },
                        ]
                        // Should allow tools from read and edit groups
                        assert.strictEqual(isToolAllowedForMode("read_file", "custom-mode", customModes), true,
                            "read_file should be allowed in custom mode")
                        assert.strictEqual(isToolAllowedForMode("write_to_file", "custom-mode", customModes), true,
                            "write_to_file should be allowed in custom mode")
                        // Should not allow tools from other groups
                        assert.strictEqual(isToolAllowedForMode("execute_command", "custom-mode", customModes), false,
                            "execute_command should not be allowed in custom mode")
                        break
                    }
                    case 'allows-override': {
                        const customModes = [
                            {
                                slug: codeMode,
                                name: "Custom Code Mode",
                                roleDefinition: "Custom role",
                                groups: ["read"] as const,
                            },
                        ]
                        // Should allow tools from read group
                        assert.strictEqual(isToolAllowedForMode("read_file", codeMode, customModes), true,
                            "read_file should be allowed in custom code mode")
                        // Should not allow tools from other groups
                        assert.strictEqual(isToolAllowedForMode("write_to_file", codeMode, customModes), false,
                            "write_to_file should not be allowed in custom code mode")
                        break
                    }
                    case 'respects-requirements': {
                        const customModes = [
                            {
                                slug: "custom-mode",
                                name: "Custom Mode",
                                roleDefinition: "Custom role",
                                groups: ["edit"] as const,
                            },
                        ]
                        const requirements = { apply_diff: false }

                        // Should respect disabled requirement even if tool group is allowed
                        assert.strictEqual(isToolAllowedForMode("apply_diff", "custom-mode", customModes, requirements), false,
                            "apply_diff should not be allowed when requirement is false")

                        // Should allow other edit tools
                        assert.strictEqual(isToolAllowedForMode("write_to_file", "custom-mode", customModes, requirements), true,
                            "write_to_file should be allowed in custom mode")
                        break
                    }

                    // Tool requirements tests
                    case 'respects-requirements': {
                        const requirements = { apply_diff: false }
                        assert.strictEqual(isToolAllowedForMode("apply_diff", codeMode, [], requirements), false,
                            "apply_diff should not be allowed when requirement is false")

                        const enabledRequirements = { apply_diff: true }
                        assert.strictEqual(isToolAllowedForMode("apply_diff", codeMode, [], enabledRequirements), true,
                            "apply_diff should be allowed when requirement is true")
                        break
                    }
                    case 'allows-unspecified': {
                        const requirements = { some_other_tool: true }
                        assert.strictEqual(isToolAllowedForMode("apply_diff", codeMode, [], requirements), true,
                            "apply_diff should be allowed when its requirement is not specified")
                        break
                    }
                    case 'handles-undefined': {
                        assert.strictEqual(isToolAllowedForMode("apply_diff", codeMode, [], undefined), true,
                            "apply_diff should be allowed with undefined requirements")
                        assert.strictEqual(isToolAllowedForMode("apply_diff", codeMode, [], {}), true,
                            "apply_diff should be allowed with empty requirements")
                        break
                    }
                    case 'prioritizes-requirements': {
                        const requirements = { apply_diff: false }
                        // Even in code mode which allows all tools, disabled requirement should take precedence
                        assert.strictEqual(isToolAllowedForMode("apply_diff", codeMode, [], requirements), false,
                            "apply_diff should not be allowed when requirement is false, even in code mode")
                        break
                    }

                    // validateToolUse tests
                    case 'throws-disallowed': {
                        assert.throws(() => validateToolUse("unknown_tool" as any, "architect", []),
                            /Tool "unknown_tool" is not allowed in architect mode/,
                            "validateToolUse should throw for disallowed tools")
                        break
                    }
                    case 'no-throw-allowed': {
                        assert.doesNotThrow(() => validateToolUse("read_file", "architect", []),
                            "validateToolUse should not throw for allowed tools")
                        break
                    }
                    case 'throws-requirement-not-met': {
                        const requirements = { apply_diff: false }
                        assert.throws(() => validateToolUse("apply_diff", codeMode, [], requirements),
                            /Tool "apply_diff" is not allowed in code mode/,
                            "validateToolUse should throw when tool requirement is not met")
                        break
                    }
                    case 'no-throw-requirement-met': {
                        const requirements = { apply_diff: true }
                        assert.doesNotThrow(() => validateToolUse("apply_diff", codeMode, [], requirements),
                            "validateToolUse should not throw when tool requirement is met")
                        break
                    }
                    case 'handles-undefined-requirements': {
                        assert.doesNotThrow(() => validateToolUse("apply_diff", codeMode, [], undefined),
                            "validateToolUse should handle undefined requirements gracefully")
                        break
                    }
                }
                run.passed(test)
            } catch (err) {
                run.failed(test, new vscode.TestMessage(err instanceof Error ? err.message : String(err)))
            }
        }
        run.end()
    })
}