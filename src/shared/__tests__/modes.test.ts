import * as vscode from 'vscode'
import * as assert from 'assert'
import { isToolAllowedForMode, FileRestrictionError, ModeConfig } from '../modes'

export async function activateModesTests(context: vscode.ExtensionContext): Promise<void> {
    const testController = vscode.tests.createTestController('modesTests', 'Modes Tests')
    context.subscriptions.push(testController)

    // Root test suite
    const rootSuite = testController.createTestItem('modes', 'Mode Validation')
    testController.items.add(rootSuite)

    // Test suites
    const toolAllowanceSuite = testController.createTestItem('tool-allowance', 'Tool Allowance')
    const fileRestrictionsSuite = testController.createTestItem('file-restrictions', 'File Restrictions')
    const experimentalSuite = testController.createTestItem('experimental', 'Experimental Tools')
    const errorSuite = testController.createTestItem('errors', 'FileRestrictionError')

    rootSuite.children.add(toolAllowanceSuite)
    rootSuite.children.add(fileRestrictionsSuite)
    rootSuite.children.add(experimentalSuite)
    rootSuite.children.add(errorSuite)

    // Add test cases
    toolAllowanceSuite.children.add(testController.createTestItem(
        'always-available',
        'allows always available tools'
    ))
    toolAllowanceSuite.children.add(testController.createTestItem(
        'unrestricted',
        'allows unrestricted tools'
    ))
    toolAllowanceSuite.children.add(testController.createTestItem(
        'non-existent-mode',
        'handles non-existent modes'
    ))
    toolAllowanceSuite.children.add(testController.createTestItem(
        'tool-requirements',
        'respects tool requirements'
    ))

    fileRestrictionsSuite.children.add(testController.createTestItem(
        'matching-files',
        'allows editing matching files'
    ))
    fileRestrictionsSuite.children.add(testController.createTestItem(
        'non-matching-files',
        'rejects editing non-matching files'
    ))
    fileRestrictionsSuite.children.add(testController.createTestItem(
        'partial-streaming',
        'handles partial streaming cases (path only, no content/diff)'
    ))
    fileRestrictionsSuite.children.add(testController.createTestItem(
        'write-and-diff',
        'applies restrictions to both write_to_file and apply_diff'
    ))
    fileRestrictionsSuite.children.add(testController.createTestItem(
        'custom-description',
        'uses description in file restriction error for custom modes'
    ))
    fileRestrictionsSuite.children.add(testController.createTestItem(
        'architect-mode',
        'allows architect mode to edit markdown files only'
    ))

    experimentalSuite.children.add(testController.createTestItem(
        'disabled-experiments',
        'disables tools when experiment is disabled'
    ))
    experimentalSuite.children.add(testController.createTestItem(
        'enabled-experiments',
        'allows tools when experiment is enabled'
    ))
    experimentalSuite.children.add(testController.createTestItem(
        'non-experimental-tools',
        'allows non-experimental tools when experiments are disabled'
    ))

    errorSuite.children.add(testController.createTestItem(
        'error-without-description',
        'formats error message with pattern when no description provided'
    ))
    errorSuite.children.add(testController.createTestItem(
        'error-with-description',
        'formats error message with description when provided'
    ))

    // Create run profile
    testController.createRunProfile('run', vscode.TestRunProfileKind.Run, async (request) => {
        const queue: vscode.TestItem[] = []
        if (request.include) {
            request.include.forEach(test => queue.push(test))
        }

        const run = testController.createTestRun(request)

        const customModes: ModeConfig[] = [
            {
                slug: 'markdown-editor',
                name: 'Markdown Editor',
                roleDefinition: 'You are a markdown editor',
                groups: ['read', ['edit', { fileRegex: '\\.md$' }], 'browser'],
            },
            {
                slug: 'css-editor',
                name: 'CSS Editor',
                roleDefinition: 'You are a CSS editor',
                groups: ['read', ['edit', { fileRegex: '\\.css$' }], 'browser'],
            },
            {
                slug: 'test-exp-mode',
                name: 'Test Exp Mode',
                roleDefinition: 'You are an experimental tester',
                groups: ['read', 'edit', 'browser'],
            },
        ]

        for (const test of queue) {
            run.started(test)
            try {
                switch (test.id) {
                    case 'always-available': {
                        assert.ok(isToolAllowedForMode("ask_followup_question", "markdown-editor", customModes))
                        assert.ok(isToolAllowedForMode("attempt_completion", "markdown-editor", customModes))
                        break
                    }
                    case 'unrestricted': {
                        assert.ok(isToolAllowedForMode("read_file", "markdown-editor", customModes))
                        assert.ok(isToolAllowedForMode("browser_action", "markdown-editor", customModes))
                        break
                    }
                    case 'matching-files': {
                        // Test markdown editor mode
                        assert.ok(isToolAllowedForMode("write_to_file", "markdown-editor", customModes, undefined, {
                            path: "test.md",
                            content: "# Test",
                        }))

                        // Test CSS editor mode
                        assert.ok(isToolAllowedForMode("write_to_file", "css-editor", customModes, undefined, {
                            path: "styles.css",
                            content: ".test { color: red; }",
                        }))
                        break
                    }
                    case 'non-matching-files': {
                        // Test markdown editor mode with non-markdown file
                        assert.throws(() => {
                            isToolAllowedForMode("write_to_file", "markdown-editor", customModes, undefined, {
                                path: "test.js",
                                content: "console.log('test')",
                            })
                        }, FileRestrictionError)

                        assert.throws(() => {
                            isToolAllowedForMode("write_to_file", "markdown-editor", customModes, undefined, {
                                path: "test.js",
                                content: "console.log('test')",
                            })
                        }, /\\.md\$/)

                        // Test CSS editor mode with non-CSS file
                        assert.throws(() => {
                            isToolAllowedForMode("write_to_file", "css-editor", customModes, undefined, {
                                path: "test.js",
                                content: "console.log('test')",
                            })
                        }, FileRestrictionError)

                        assert.throws(() => {
                            isToolAllowedForMode("write_to_file", "css-editor", customModes, undefined, {
                                path: "test.js",
                                content: "console.log('test')",
                            })
                        }, /\\.css\$/)
                        break
                    }
                    case 'partial-streaming': {
                        // Should allow path-only for matching files
                        assert.ok(isToolAllowedForMode("write_to_file", "markdown-editor", customModes, undefined, {
                            path: "test.js",
                        }))
                        assert.ok(isToolAllowedForMode("apply_diff", "markdown-editor", customModes, undefined, {
                            path: "test.js",
                        }))
                        // Should allow path-only for architect mode
                        assert.ok(isToolAllowedForMode("write_to_file", "architect", [], undefined, {
                            path: "test.js",
                        }))
                        break
                    }
                    case 'write-and-diff': {
                        // Test write_to_file
                        assert.ok(isToolAllowedForMode("write_to_file", "markdown-editor", customModes, undefined, {
                            path: "test.md",
                            content: "# Test",
                        }))
                        // Test apply_diff
                        assert.ok(isToolAllowedForMode("apply_diff", "markdown-editor", customModes, undefined, {
                            path: "test.md",
                            diff: "- old\n+ new",
                        }))
                        // Test both with non-matching file
                        assert.throws(() => {
                            isToolAllowedForMode("write_to_file", "markdown-editor", customModes, undefined, {
                                path: "test.js",
                                content: "console.log('test')",
                            })
                        }, FileRestrictionError)
                        assert.throws(() => {
                            isToolAllowedForMode("apply_diff", "markdown-editor", customModes, undefined, {
                                path: "test.js",
                                diff: "- old\n+ new",
                            })
                        }, FileRestrictionError)
                        break
                    }
                    case 'custom-description': {
                        const customModesWithDescription: ModeConfig[] = [
                            {
                                slug: 'docs-editor',
                                name: 'Documentation Editor',
                                roleDefinition: 'You are a documentation editor',
                                groups: [
                                    'read',
                                    ['edit', { fileRegex: '\\.(md|txt)$', description: 'Documentation files only' }],
                                    'browser',
                                ],
                            },
                        ]

                        // Test write_to_file with non-matching file
                        assert.throws(() => {
                            isToolAllowedForMode("write_to_file", "docs-editor", customModesWithDescription, undefined, {
                                path: "test.js",
                                content: "console.log('test')",
                            })
                        }, FileRestrictionError)
                        assert.throws(() => {
                            isToolAllowedForMode("write_to_file", "docs-editor", customModesWithDescription, undefined, {
                                path: "test.js",
                                content: "console.log('test')",
                            })
                        }, /Documentation files only/)

                        // Test matching files
                        assert.ok(isToolAllowedForMode("write_to_file", "docs-editor", customModesWithDescription, undefined, {
                            path: "test.md",
                            content: "# Test",
                        }))
                        assert.ok(isToolAllowedForMode("write_to_file", "docs-editor", customModesWithDescription, undefined, {
                            path: "test.txt",
                            content: "Test content",
                        }))

                        // Test partial streaming
                        assert.ok(isToolAllowedForMode("write_to_file", "docs-editor", customModesWithDescription, undefined, {
                            path: "test.js",
                        }))
                        break
                    }
                    case 'architect-mode': {
                        // Should allow editing markdown files
                        assert.ok(isToolAllowedForMode("write_to_file", "architect", [], undefined, {
                            path: "test.md",
                            content: "# Test",
                        }))
                        // Should allow applying diffs to markdown files
                        assert.ok(isToolAllowedForMode("apply_diff", "architect", [], undefined, {
                            path: "readme.md",
                            diff: "- old\n+ new",
                        }))
                        // Should reject non-markdown files
                        assert.throws(() => {
                            isToolAllowedForMode("write_to_file", "architect", [], undefined, {
                                path: "test.js",
                                content: "console.log('test')",
                            })
                        }, FileRestrictionError)
                        assert.throws(() => {
                            isToolAllowedForMode("write_to_file", "architect", [], undefined, {
                                path: "test.js",
                                content: "console.log('test')",
                            })
                        }, /Markdown files only/)
                        // Should maintain read capabilities
                        assert.ok(isToolAllowedForMode("read_file", "architect", []))
                        assert.ok(isToolAllowedForMode("browser_action", "architect", []))
                        assert.ok(isToolAllowedForMode("use_mcp_tool", "architect", []))
                        break
                    }
                    case 'non-existent-mode': {
                        assert.ok(!isToolAllowedForMode("write_to_file", "non-existent", customModes))
                        break
                    }
                    case 'tool-requirements': {
                        const toolRequirements = {
                            write_to_file: false,
                        }
                        assert.ok(!isToolAllowedForMode("write_to_file", "markdown-editor", customModes, toolRequirements))
                        break
                    }
                    case 'disabled-experiments': {
                        const experiments = {
                            search_and_replace: false,
                            insert_content: false,
                        }
                        assert.ok(!isToolAllowedForMode(
                            "search_and_replace",
                            "test-exp-mode",
                            customModes,
                            undefined,
                            undefined,
                            experiments
                        ))
                        assert.ok(!isToolAllowedForMode(
                            "insert_content",
                            "test-exp-mode",
                            customModes,
                            undefined,
                            undefined,
                            experiments
                        ))
                        break
                    }
                    case 'enabled-experiments': {
                        const experiments = {
                            search_and_replace: true,
                            insert_content: true,
                        }
                        assert.ok(isToolAllowedForMode(
                            "search_and_replace",
                            "test-exp-mode",
                            customModes,
                            undefined,
                            undefined,
                            experiments
                        ))
                        assert.ok(isToolAllowedForMode(
                            "insert_content",
                            "test-exp-mode",
                            customModes,
                            undefined,
                            undefined,
                            experiments
                        ))
                        break
                    }
                    case 'non-experimental-tools': {
                        const experiments = {
                            search_and_replace: false,
                            insert_content: false,
                        }
                        assert.ok(isToolAllowedForMode(
                            "read_file",
                            "markdown-editor",
                            customModes,
                            undefined,
                            undefined,
                            experiments
                        ))
                        assert.ok(isToolAllowedForMode(
                            "write_to_file",
                            "markdown-editor",
                            customModes,
                            undefined,
                            { path: "test.md" },
                            experiments
                        ))
                        break
                    }
                    case 'error-without-description': {
                        const error = new FileRestrictionError('Markdown Editor', '\\.md$', undefined, 'test.js')
                        assert.strictEqual(
                            error.message,
                            'This mode (Markdown Editor) can only edit files matching pattern: \\.md$. Got: test.js'
                        )
                        assert.strictEqual(error.name, 'FileRestrictionError')
                        break
                    }
                    case 'error-with-description': {
                        const error = new FileRestrictionError('Markdown Editor', '\\.md$', 'Markdown files only', 'test.js')
                        assert.strictEqual(
                            error.message,
                            'This mode (Markdown Editor) can only edit files matching pattern: \\.md$ (Markdown files only). Got: test.js'
                        )
                        assert.strictEqual(error.name, 'FileRestrictionError')
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
