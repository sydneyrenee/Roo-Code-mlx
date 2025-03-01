import * as vscode from 'vscode'
import * as assert from 'assert'
import { addCustomInstructions } from "../sections/custom-instructions"
import { getCapabilitiesSection } from "../sections/capabilities"
import { DiffStrategy, DiffResult } from "../../diff/types"

export async function activateSectionsPromptTests(context: vscode.ExtensionContext): Promise<void> {
    const testController = vscode.tests.createTestController('sectionsPromptTests', 'Sections Prompt Tests')
    context.subscriptions.push(testController)

    const rootSuite = testController.createTestItem('sections-prompt', 'Sections Prompt')
    testController.items.add(rootSuite)

    // Test suites
    const customInstructionsSuite = testController.createTestItem('custom-instructions', 'Custom Instructions')
    rootSuite.children.add(customInstructionsSuite)

    const capabilitiesSuite = testController.createTestItem('capabilities', 'Capabilities')
    rootSuite.children.add(capabilitiesSuite)

    // Add test cases
    customInstructionsSuite.children.add(testController.createTestItem(
        'preferred-language',
        'adds preferred language to custom instructions'
    ))

    customInstructionsSuite.children.add(testController.createTestItem(
        'no-preferred-language',
        'works without preferred language'
    ))

    capabilitiesSuite.children.add(testController.createTestItem(
        'with-diff-strategy',
        'includes apply_diff in capabilities when diffStrategy is provided'
    ))

    capabilitiesSuite.children.add(testController.createTestItem(
        'without-diff-strategy',
        'excludes apply_diff from capabilities when diffStrategy is undefined'
    ))

    // Create run profile
    testController.createRunProfile('run', vscode.TestRunProfileKind.Run, async (request) => {
        const queue: vscode.TestItem[] = []
        if (request.include) {
            request.include.forEach(test => queue.push(test))
        }

        const run = testController.createTestRun(request)

        for (const test of queue) {
            run.started(test)

            try {
                switch (test.id) {
                    case 'preferred-language': {
                        const result = await addCustomInstructions(
                            "mode instructions",
                            "global instructions",
                            "/test/path",
                            "test-mode",
                            { preferredLanguage: "French" }
                        )
                        assert.ok(result.includes("Language Preference:"))
                        assert.ok(result.includes("You should always speak and think in the French language"))
                        break
                    }

                    case 'no-preferred-language': {
                        const result = await addCustomInstructions(
                            "mode instructions",
                            "global instructions",
                            "/test/path",
                            "test-mode"
                        )
                        assert.ok(!result.includes("Language Preference:"))
                        assert.ok(!result.includes("You should always speak and think in"))
                        break
                    }

                    case 'with-diff-strategy': {
                        const cwd = "/test/path"
                        const mcpHub = undefined
                        const mockDiffStrategy: DiffStrategy = {
                            getToolDescription: () => "apply_diff tool description",
                            applyDiff: async (originalContent: string, diffContent: string): Promise<DiffResult> => {
                                return { success: true, content: "mock result" }
                            },
                        }

                        const result = getCapabilitiesSection(cwd, false, mcpHub, mockDiffStrategy)

                        assert.ok(result.includes("or apply_diff"))
                        assert.ok(result.includes("then use the write_to_file or apply_diff tool"))
                        break
                    }

                    case 'without-diff-strategy': {
                        const cwd = "/test/path"
                        const mcpHub = undefined

                        const result = getCapabilitiesSection(cwd, false, mcpHub, undefined)

                        assert.ok(!result.includes("or apply_diff"))
                        assert.ok(result.includes("then use the write_to_file tool"))
                        assert.ok(!result.includes("write_to_file or apply_diff"))
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
