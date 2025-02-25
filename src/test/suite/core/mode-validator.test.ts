import * as assert from 'assert';
import { isToolAllowedForMode, validateToolUse } from '../../../core/mode-validator';
import { defaultModeSlug } from '../../../shared/modes';

suite('Mode Validator', () => {
    const readOnlyMode = {
        slug: 'read-only',
        name: 'Read Only',
        roleDefinition: 'Read only mode',
        groups: ['read']
    };

    const customModes = [readOnlyMode];

    suite('isToolAllowedForMode', () => {
        test('allows all tools in code mode', () => {
            const tools = [
                'write_to_file',
                'apply_diff',
                'read_file',
                'search_files',
                'list_files',
                'list_code_definition_names',
                'browser_action',
                'execute_command',
                'ask_followup_question',
                'attempt_completion',
                'switch_mode'
            ];

            tools.forEach(tool => {
                assert.strictEqual(
                    isToolAllowedForMode(tool, defaultModeSlug, [], { apply_diff: true }),
                    true,
                    `Tool ${tool} should be allowed in code mode`
                );
            });
        });

        test('respects mode restrictions', () => {
            // Read operations should be allowed
            assert.strictEqual(
                isToolAllowedForMode('read_file', 'read-only', customModes, { apply_diff: true }),
                true,
                'read_file should be allowed in read-only mode'
            );

            // Write operations should be blocked
            assert.strictEqual(
                isToolAllowedForMode('write_to_file', 'read-only', customModes, { apply_diff: true }),
                false,
                'write_to_file should not be allowed in read-only mode'
            );
        });

        test('handles unknown modes', () => {
            assert.strictEqual(
                isToolAllowedForMode('read_file', 'unknown-mode', customModes, { apply_diff: true }),
                false,
                'tools should not be allowed in unknown modes'
            );
        });
    });

    suite('validateToolUse', () => {
        test('validates required parameters', () => {
            assert.throws(() => {
                validateToolUse('write_to_file', defaultModeSlug, [], { apply_diff: true }, {});
            }, /Missing required parameter 'path'/);

            assert.throws(() => {
                validateToolUse('write_to_file', defaultModeSlug, [], { apply_diff: true }, {
                    path: 'test.txt'
                });
            }, /Missing required parameter 'content'/);

            // Should not throw when all required params are present
            validateToolUse('write_to_file', defaultModeSlug, [], { apply_diff: true }, {
                path: 'test.txt',
                content: 'test content',
                line_count: '1'
            });
        });

        test('validates tool is allowed in mode', () => {
            assert.throws(() => {
                validateToolUse('write_to_file', 'read-only', customModes, { apply_diff: true }, {
                    path: 'test.txt',
                    content: 'test content',
                    line_count: '1'
                });
            }, /Tool 'write_to_file' is not allowed in 'Read Only' mode/);
        });

        test('validates apply_diff tool when enabled', () => {
            // Should allow apply_diff when enabled
            validateToolUse('apply_diff', defaultModeSlug, [], { apply_diff: true }, {
                path: 'test.txt',
                diff: 'test diff',
                start_line: '1',
                end_line: '2'
            });

            // Should block apply_diff when disabled
            assert.throws(() => {
                validateToolUse('apply_diff', defaultModeSlug, [], { apply_diff: false }, {
                    path: 'test.txt',
                    diff: 'test diff',
                    start_line: '1',
                    end_line: '2'
                });
            }, /Tool 'apply_diff' is not enabled/);
        });
    });
});
