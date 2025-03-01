import * as vscode from 'vscode';
import { activateBasicTests } from './suite/basic.test';
import { activatePathTests } from '../utils/__tests__/path.test.migrated.migrated';
import { activateVsCodeLmTests } from '../api/providers/__tests__/vscode-lm.test';
import { activateClineTests } from '../core/__tests__/Cline.test';
import { activateAnthropicTests } from '../api/providers/__tests__/anthropic.test';
import { activateOpenAiTests } from '../api/providers/__tests__/openai.test';
import { activateBedrockConverseFormatTests } from '../api/transform/__tests__/bedrock-converse-format.test';
import { activateBedrockTests } from '../api/providers/__tests__/bedrock.test';
import { activateDeepSeekTests } from '../api/providers/__tests__/deepseek.test';
import { activateGeminiTests } from '../api/providers/__tests__/gemini.test';
import { activateGlamaTests } from '../api/providers/__tests__/glama.test';
import { activateMistralTests } from '../api/providers/__tests__/mistral.test';

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
import { activateTerminalProcessTests } from '../integrations/terminal/__tests__/TerminalProcess.test';
import { activateTerminalRegistryTests } from '../integrations/terminal/__tests__/TerminalRegistry.test';

/**
 * Helper function to safely activate a test suite
 */
async function safeActivate(
    activateFn: (context: vscode.ExtensionContext) => Promise<void | vscode.TestController>, 
    name: string,
    context: vscode.ExtensionContext
) {
    try {
        await activateFn(context);
        console.log(`✓ Activated ${name} tests`);
    } catch (error) {
        console.error(`✗ Failed to activate ${name} tests:`, error);
        throw error;
    }
}

/**
 * Register all VS Code Testing API tests
 * @param context The VS Code extension context
 */
export async function registerTests(context: vscode.ExtensionContext): Promise<void> {
    try {
        // Basic Tests
        await safeActivate(activateBasicTests, 'Basic', context);
        await safeActivate(activatePathTests, 'Path', context);
        
        // API Tests
        await safeActivate(activateVsCodeLmTests, 'VSCode LM', context);
        await safeActivate(activateBedrockConverseFormatTests, 'BedrockConverseFormat', context);
        await safeActivate(activateAnthropicTests, 'Anthropic', context);
        await safeActivate(activateOpenAiTests, 'OpenAI', context);
        await safeActivate(activateBedrockTests, 'Bedrock', context);
        await safeActivate(activateDeepSeekTests, 'DeepSeek', context);
        await safeActivate(activateGeminiTests, 'Gemini', context);
        await safeActivate(activateGlamaTests, 'Glama', context);
        await safeActivate(activateMistralTests, 'Mistral', context);
        
        // Core Tests
        await safeActivate(activateCodeActionProviderTests, 'CodeActionProvider', context);
        await safeActivate(activateClineTests, 'Cline', context);
        // Service Tests
        await safeActivate(activateMcpHubTests, 'McpHub', context);
        
        // Integration Tests
        await safeActivate(activateTerminalProcessTests, 'TerminalProcess', context);
        await safeActivate(activateTerminalRegistryTests, 'TerminalRegistry', context);

        // Shared Tests
        // Shared Tests  
        await safeActivate(activateVsCodeSelectorUtilsTests, 'VsCodeSelectorUtils', context);
        await safeActivate(activateSupportPromptsTests, 'SupportPrompts', context);
        await safeActivate(activateModesTests, 'Modes', context);
        await safeActivate(activateCheckExistApiConfigTests, 'CheckExistApiConfig', context);

        // Core Prompts Tests
        await safeActivate(activateSystemPromptTests, 'SystemPrompt', context);
        await safeActivate(activateSectionsPromptTests, 'SectionsPrompt', context);

        // Utility Tests
        await safeActivate(activateShellTests, 'Shell', context);
        await safeActivate(activateGitTests, 'Git', context);
        await safeActivate(activateEnhancePromptTests, 'EnhancePrompt', context);
        await safeActivate(activateCostTests, 'Cost', context);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.stack || error.message : String(error);
        console.error('Error registering tests:', errorMessage);
        throw error;
    }
}