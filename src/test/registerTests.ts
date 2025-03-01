import * as vscode from 'vscode';
import { activateBasicTests } from './suite/basic.test';
import { activatePathTests } from '../utils/__tests__/path.test.migrated.migrated';
import { activateVsCodeLmTests } from '../api/providers/__tests__/vscode-lm.test';
import { activateClineTests } from '../core/__tests__/Cline.test';  // Added import

// Import unregistered tests
import { activateShellTests } from '../utils/__tests__/shell.test';
import { activateGitTests } from '../utils/__tests__/git.test';
import { activateEnhancePromptTests } from '../utils/__tests__/enhance-prompt.test';
import { activateCostTests } from '../utils/__tests__/cost.test';
import { activateVsCodeSelectorUtilsTests } from '../shared/__tests__/vsCodeSelectorUtils.test';
import { activateSupportPromptsTests } from '../shared/__tests__/support-prompts.test';
import { activateModesTests } from '../shared/__tests__/modes.test';
import { activateCheckExistApiConfigTests } from '../shared/__tests__/checkExistApiConfig.test';
import { activateCodeActionProviderTests } from '../core/__tests__/CodeActionProvider.test';
import { activateMcpHubTests } from '../services/mcp/__tests__/McpHub.test';
import { activateSystemPromptTests } from '../core/prompts/__tests__/system.test';
import { activateSectionsPromptTests } from '../core/prompts/__tests__/sections.test';
import { activateBedrockConverseFormatTests } from '../api/transform/__tests__/bedrock-converse-format.test';

/**
 * Register all VS Code Testing API tests
 * @param context The VS Code extension context
 */
export async function registerTests(context: vscode.ExtensionContext): Promise<void> {
    // Only register tests in development mode
    if (process.env.NODE_ENV !== 'development') {
        return;
    }

    try {
        // Helper function to safely register a test activation function
        const safeActivate = async (fn: (context: vscode.ExtensionContext) => Promise<void | vscode.TestController>, name: string) => {
            try {
                await fn(context);
                console.log(`✓ Registered ${name} tests`);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.stack || error.message : String(error);
                console.error(`Failed to register ${name} tests:`, errorMessage);
                throw error;
            }
        };

        // Core Tests
        await safeActivate(activateBasicTests, 'Basic');
        await safeActivate(activatePathTests, 'Path');
        await safeActivate(activateCodeActionProviderTests, 'CodeActionProvider');
        await safeActivate(activateClineTests, 'Cline');  // Added registration
        
        // API Tests
        await safeActivate(activateVsCodeLmTests, 'VSCode LM');
        await safeActivate(activateBedrockConverseFormatTests, 'BedrockConverseFormat');
        
        // Service Tests
        await safeActivate(activateMcpHubTests, 'McpHub');

        // Shared Tests
        await safeActivate(activateVsCodeSelectorUtilsTests, 'VsCodeSelectorUtils');
        await safeActivate(activateSupportPromptsTests, 'SupportPrompts');
        await safeActivate(activateModesTests, 'Modes');
        await safeActivate(activateCheckExistApiConfigTests, 'CheckExistApiConfig');

        // Core Prompts Tests
        await safeActivate(activateSystemPromptTests, 'SystemPrompt');
        await safeActivate(activateSectionsPromptTests, 'SectionsPrompt');

        // Utility Tests
        await safeActivate(activateShellTests, 'Shell');
        await safeActivate(activateGitTests, 'Git');
        await safeActivate(activateEnhancePromptTests, 'EnhancePrompt');
        await safeActivate(activateCostTests, 'Cost');

    } catch (error) {
        const errorMessage = error instanceof Error ? error.stack || error.message : String(error);
        console.error('Error registering tests:', errorMessage);
        throw error;
    }
}