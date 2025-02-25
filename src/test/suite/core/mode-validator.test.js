import * as assert from 'assert';
import { isToolAllowedForMode, getModeConfig, modes } from '../../../shared/modes';
import { validateToolUse } from '../../../core/mode-validator';
import { TOOL_GROUPS } from '../../../shared/tool-groups';
const [codeMode, architectMode, askMode] = modes.map((mode) => mode.slug);
suite('mode-validator', () => {
    suite('isToolAllowedForMode', () => {
        suite('code mode', () => {
            test('allows all code mode tools', () => {
                const mode = getModeConfig(codeMode);
                // Code mode has all groups
                Object.entries(TOOL_GROUPS).forEach(([_, config]) => {
                    config.tools.forEach((tool) => {
                        assert.strictEqual(isToolAllowedForMode(tool, codeMode, []), true, `Tool ${tool} should be allowed in code mode`);
                    });
                });
            });
            test('disallows unknown tools', () => {
                assert.strictEqual(isToolAllowedForMode('unknown_tool', codeMode, []), false, 'Unknown tools should not be allowed');
            });
        });
        suite('architect mode', () => {
            test('allows configured tools', () => {
                const mode = getModeConfig(architectMode);
                // Architect mode has read, browser, and mcp groups
                const architectTools = [
                    ...TOOL_GROUPS.read.tools,
                    ...TOOL_GROUPS.browser.tools,
                    ...TOOL_GROUPS.mcp.tools,
                ];
                architectTools.forEach((tool) => {
                    assert.strictEqual(isToolAllowedForMode(tool, architectMode, []), true, `Tool ${tool} should be allowed in architect mode`);
                });
            });
        });
        suite('ask mode', () => {
            test('allows configured tools', () => {
                const mode = getModeConfig(askMode);
                // Ask mode has read, browser, and mcp groups
                const askTools = [
                    ...TOOL_GROUPS.read.tools,
                    ...TOOL_GROUPS.browser.tools,
                    ...TOOL_GROUPS.mcp.tools
                ];
                askTools.forEach((tool) => {
                    assert.strictEqual(isToolAllowedForMode(tool, askMode, []), true, `Tool ${tool} should be allowed in ask mode`);
                });
            });
        });
        suite('custom modes', () => {
            test('allows tools from custom mode configuration', () => {
                const customModes = [{
                        slug: 'custom-mode',
                        name: 'Custom Mode',
                        roleDefinition: 'Custom role',
                        groups: ['read', 'edit'],
                    }];
                // Should allow tools from read and edit groups
                assert.strictEqual(isToolAllowedForMode('read_file', 'custom-mode', customModes), true, 'read_file should be allowed');
                assert.strictEqual(isToolAllowedForMode('write_to_file', 'custom-mode', customModes), true, 'write_to_file should be allowed');
                // Should not allow tools from other groups
                assert.strictEqual(isToolAllowedForMode('execute_command', 'custom-mode', customModes), false, 'execute_command should not be allowed');
            });
            test('allows custom mode to override built-in mode', () => {
                const customModes = [{
                        slug: codeMode,
                        name: 'Custom Code Mode',
                        roleDefinition: 'Custom role',
                        groups: ['read'],
                    }];
                // Should allow tools from read group
                assert.strictEqual(isToolAllowedForMode('read_file', codeMode, customModes), true, 'read_file should be allowed');
                // Should not allow tools from other groups
                assert.strictEqual(isToolAllowedForMode('write_to_file', codeMode, customModes), false, 'write_to_file should not be allowed');
            });
            test('respects tool requirements in custom modes', () => {
                const customModes = [{
                        slug: 'custom-mode',
                        name: 'Custom Mode',
                        roleDefinition: 'Custom role',
                        groups: ['edit'],
                    }];
                const requirements = { apply_diff: false };
                // Should respect disabled requirement even if tool group is allowed
                assert.strictEqual(isToolAllowedForMode('apply_diff', 'custom-mode', customModes, requirements), false, 'apply_diff should be disallowed when requirement is false');
                // Should allow other edit tools
                assert.strictEqual(isToolAllowedForMode('write_to_file', 'custom-mode', customModes, requirements), true, 'write_to_file should be allowed');
            });
        });
        suite('tool requirements', () => {
            test('respects tool requirements when provided', () => {
                const requirements = { apply_diff: false };
                assert.strictEqual(isToolAllowedForMode('apply_diff', codeMode, [], requirements), false, 'apply_diff should be disallowed when requirement is false');
                const enabledRequirements = { apply_diff: true };
                assert.strictEqual(isToolAllowedForMode('apply_diff', codeMode, [], enabledRequirements), true, 'apply_diff should be allowed when requirement is true');
            });
            test('allows tools when their requirements are not specified', () => {
                const requirements = { some_other_tool: true };
                assert.strictEqual(isToolAllowedForMode('apply_diff', codeMode, [], requirements), true, 'apply_diff should be allowed when requirement is not specified');
            });
            test('handles undefined and empty requirements', () => {
                assert.strictEqual(isToolAllowedForMode('apply_diff', codeMode, [], undefined), true, 'apply_diff should be allowed with undefined requirements');
                assert.strictEqual(isToolAllowedForMode('apply_diff', codeMode, [], {}), true, 'apply_diff should be allowed with empty requirements');
            });
            test('prioritizes requirements over mode configuration', () => {
                const requirements = { apply_diff: false };
                // Even in code mode which allows all tools, disabled requirement should take precedence
                assert.strictEqual(isToolAllowedForMode('apply_diff', codeMode, [], requirements), false, 'apply_diff should be disallowed when requirement is false, even in code mode');
            });
        });
    });
    suite('validateToolUse', () => {
        test('throws error for disallowed tools in architect mode', () => {
            assert.throws(() => validateToolUse('unknown_tool', 'architect', []), /Tool "unknown_tool" is not allowed in architect mode./, 'Should throw for disallowed tools');
        });
        test('does not throw for allowed tools in architect mode', () => {
            assert.doesNotThrow(() => validateToolUse('read_file', 'architect', []), 'Should not throw for allowed tools');
        });
        test('throws error when tool requirement is not met', () => {
            const requirements = { apply_diff: false };
            assert.throws(() => validateToolUse('apply_diff', codeMode, [], requirements), /Tool "apply_diff" is not allowed in code mode./, 'Should throw when requirement is not met');
        });
        test('does not throw when tool requirement is met', () => {
            const requirements = { apply_diff: true };
            assert.doesNotThrow(() => validateToolUse('apply_diff', codeMode, [], requirements), 'Should not throw when requirement is met');
        });
        test('handles undefined requirements gracefully', () => {
            assert.doesNotThrow(() => validateToolUse('apply_diff', codeMode, [], undefined), 'Should not throw with undefined requirements');
        });
    });
});
//# sourceMappingURL=mode-validator.test.js.map