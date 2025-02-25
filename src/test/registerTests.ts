import * as vscode from 'vscode'

// Import test activation functions
import { activateCodeActionProviderTests } from '../core/__tests__/CodeActionProvider.test'
import { activateBedrockConverseFormatTests } from '../api/transform/__tests__/bedrock-converse-format.test'
import { activateVsCodeSelectorUtilsTests } from '../shared/__tests__/vsCodeSelectorUtils.test'
import { activateCheckExistApiConfigTests } from '../shared/__tests__/checkExistApiConfig.test'

/**
 * Register all VS Code Testing API tests
 * This function should only be called in development mode
 */
export async function registerTests(context: vscode.ExtensionContext): Promise<void> {
    // Only register tests in development mode
    if (process.env.NODE_ENV !== 'development') {
        return
    }

    // Register core tests
    await activateCodeActionProviderTests(context)

    // Register API transform tests
    await activateBedrockConverseFormatTests(context)

    // Register shared tests
    await activateVsCodeSelectorUtilsTests(context)
    await activateCheckExistApiConfigTests(context)

    // Add more test registrations here as they are migrated
}