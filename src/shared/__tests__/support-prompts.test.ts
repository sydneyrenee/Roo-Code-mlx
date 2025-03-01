import * as vscode from 'vscode'
import * as assert from 'assert'
import { supportPrompt } from '../support-prompt'

export async function activateSupportPromptsTests(context: vscode.ExtensionContext): Promise<void> {
    const testController = vscode.tests.createTestController('supportPromptsTests', 'Support Prompts Tests')
    context.subscriptions.push(testController)

    // Root test suite
    const rootSuite = testController.createTestItem('support-prompts', 'Code Action Prompts')
    testController.items.add(rootSuite)

    // Test suites
    const explainSuite = testController.createTestItem('explain-action', 'EXPLAIN action')
    const fixSuite = testController.createTestItem('fix-action', 'FIX action')
    const improveSuite = testController.createTestItem('improve-action', 'IMPROVE action')
    const enhanceSuite = testController.createTestItem('enhance-action', 'ENHANCE action')
    const templateSuite = testController.createTestItem('template', 'get template')
    const customSuite = testController.createTestItem('custom-prompts', 'create with custom prompts')

    rootSuite.children.add(explainSuite)
    rootSuite.children.add(fixSuite)
    rootSuite.children.add(improveSuite)
    rootSuite.children.add(enhanceSuite)
    rootSuite.children.add(templateSuite)
    rootSuite.children.add(customSuite)

    // Create run profile
    testController.createRunProfile('run', vscode.TestRunProfileKind.Run, async (request) => {
        const queue: vscode.TestItem[] = []
        if (request.include) {
            request.include.forEach(test => queue.push(test))
        }

        const run = testController.createTestRun(request)

        const testFilePath = 'test/file.ts'
        const testCode = 'function test() { return true; }'

        for (const test of queue) {
            run.started(test)
            try {
                switch (test.id) {
                    case 'explain-format': {
                        const prompt = supportPrompt.create('EXPLAIN', {
                            filePath: testFilePath,
                            selectedText: testCode,
                        })
                        assert.ok(prompt.includes(`@/${testFilePath}`))
                        assert.ok(prompt.includes(testCode))
                        assert.ok(prompt.includes('purpose and functionality'))
                        assert.ok(prompt.includes('Key components'))
                        assert.ok(prompt.includes('Important patterns'))
                        break
                    }

                    case 'fix-without-diagnostics': {
                        const prompt = supportPrompt.create('FIX', {
                            filePath: testFilePath,
                            selectedText: testCode,
                        })
                        assert.ok(prompt.includes(`@/${testFilePath}`))
                        assert.ok(prompt.includes(testCode))
                        assert.ok(prompt.includes('Address all detected problems'))
                        assert.ok(!prompt.includes('Current problems detected'))
                        break
                    }

                    case 'fix-with-diagnostics': {
                        const diagnostics = [
                            {
                                source: 'eslint',
                                message: 'Missing semicolon',
                                code: 'semi',
                            },
                            {
                                message: 'Unused variable',
                                severity: 1,
                            },
                        ]
                        const prompt = supportPrompt.create('FIX', {
                            filePath: testFilePath,
                            selectedText: testCode,
                            diagnostics,
                        })
                        assert.ok(prompt.includes('Current problems detected:'))
                        assert.ok(prompt.includes('[eslint] Missing semicolon (semi)'))
                        assert.ok(prompt.includes('[Error] Unused variable'))
                        assert.ok(prompt.includes(testCode))
                        break
                    }

                    case 'improve-format': {
                        const prompt = supportPrompt.create('IMPROVE', {
                            filePath: testFilePath,
                            selectedText: testCode,
                        })
                        assert.ok(prompt.includes(`@/${testFilePath}`))
                        assert.ok(prompt.includes(testCode))
                        assert.ok(prompt.includes('Code readability'))
                        assert.ok(prompt.includes('Performance optimization'))
                        assert.ok(prompt.includes('Best practices'))
                        assert.ok(prompt.includes('Error handling'))
                        break
                    }

                    case 'enhance-format': {
                        const prompt = supportPrompt.create('ENHANCE', {
                            userInput: 'test',
                        })
                        assert.strictEqual(
                            prompt,
                            'Generate an enhanced version of this prompt (reply with only the enhanced prompt - no conversation, explanations, lead-in, bullet points, placeholders, or surrounding quotes):\n\ntest'
                        )
                        assert.ok(!prompt.includes(testFilePath))
                        assert.ok(!prompt.includes(testCode))
                        break
                    }

                    case 'default-template': {
                        const template = supportPrompt.get(undefined, 'EXPLAIN')
                        assert.strictEqual(template, supportPrompt.default.EXPLAIN)
                        break
                    }

                    case 'custom-template': {
                        const customTemplate = 'Custom template for explaining code'
                        const customSupportPrompts = {
                            EXPLAIN: customTemplate,
                        }
                        const template = supportPrompt.get(customSupportPrompts, 'EXPLAIN')
                        assert.strictEqual(template, customTemplate)
                        break
                    }

                    case 'missing-custom-template': {
                        const customSupportPrompts = {
                            SOMETHING_ELSE: 'Other template',
                        }
                        const template = supportPrompt.get(customSupportPrompts, 'EXPLAIN')
                        assert.strictEqual(template, supportPrompt.default.EXPLAIN)
                        break
                    }

                    case 'use-custom-template': {
                        const customTemplate = 'Custom template for ${filePath}'
                        const customSupportPrompts = {
                            EXPLAIN: customTemplate,
                        }
                        const prompt = supportPrompt.create(
                            'EXPLAIN',
                            {
                                filePath: testFilePath,
                                selectedText: testCode,
                            },
                            customSupportPrompts
                        )
                        assert.ok(prompt.includes(`Custom template for ${testFilePath}`))
                        assert.ok(!prompt.includes('purpose and functionality'))
                        break
                    }

                    case 'missing-type-template': {
                        const customSupportPrompts = {
                            EXPLAIN: 'Other template',
                        }
                        const prompt = supportPrompt.create(
                            'EXPLAIN',
                            {
                                filePath: testFilePath,
                                selectedText: testCode,
                            },
                            customSupportPrompts
                        )
                        assert.ok(prompt.includes('Other template'))
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

    // Add test cases
    explainSuite.children.add(testController.createTestItem(
        'explain-format',
        'should format explain prompt correctly'
    ))

    fixSuite.children.add(testController.createTestItem(
        'fix-without-diagnostics',
        'should format fix prompt without diagnostics'
    ))
    fixSuite.children.add(testController.createTestItem(
        'fix-with-diagnostics',
        'should format fix prompt with diagnostics'
    ))

    improveSuite.children.add(testController.createTestItem(
        'improve-format',
        'should format improve prompt correctly'
    ))

    enhanceSuite.children.add(testController.createTestItem(
        'enhance-format',
        'should format enhance prompt correctly'
    ))

    templateSuite.children.add(testController.createTestItem(
        'default-template',
        'should return default template when no custom prompts provided'
    ))
    templateSuite.children.add(testController.createTestItem(
        'custom-template',
        'should return custom template when provided'
    ))
    templateSuite.children.add(testController.createTestItem(
        'missing-custom-template',
        'should return default template when custom prompts does not include type'
    ))

    customSuite.children.add(testController.createTestItem(
        'use-custom-template',
        'should use custom template when provided'
    ))
    customSuite.children.add(testController.createTestItem(
        'missing-type-template',
        'should use default template when custom prompts does not include type'
    ))
}
