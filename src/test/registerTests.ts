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
import { activateLmStudioTests } from '../api/providers/__tests__/lmstudio.test';
import { activateOllamaTests } from '../api/providers/__tests__/ollama.test';
import { activateRequestyTests } from '../api/providers/__tests__/requesty.test';
import { activateUnboundTests } from '../api/providers/__tests__/unbound.test';
import { activateVertexTests } from '../api/providers/__tests__/vertex.test';
import { activateOpenAiFormatTests } from '../api/transform/__tests__/openai-format.test';
import { activateR1FormatTests } from '../api/transform/__tests__/r1-format.test';
import { activateSimpleFormatTests } from '../api/transform/__tests__/simple-format.test';
import { activateStreamTests } from '../api/transform/__tests__/stream.test';
import { activateVsCodeLmFormatTests } from '../api/transform/__tests__/vscode-lm-format.test';
import { activateEditorUtilsTests } from '../core/__tests__/EditorUtils.test';
import { activateModeValidatorTests } from '../core/__tests__/mode-validator.test';
import { activateConfigManagerTests } from '../core/config/__tests__/ConfigManager.test';
import { activateCustomModesSchemaTests } from '../core/config/__tests__/CustomModesSchema.test';
import { activateCustomModesSettingsTests } from '../core/config/__tests__/CustomModesSettings.test';
import { activateGroupConfigSchemaTests } from '../core/config/__tests__/GroupConfigSchema.test';
import { activateNewUnifiedDiffTests } from '../core/diff/strategies/__tests__/new-unified.test';
import { activateUnifiedDiffTests } from '../core/diff/strategies/__tests__/unified.test';
import { activateEditStrategiesTests } from '../core/diff/strategies/new-unified/__tests__/edit-strategies.test';
import { activateSearchStrategiesTests } from '../core/diff/strategies/new-unified/__tests__/search-strategies.test';
import { activateMentionsTests } from '../core/mentions/__tests__/index.test';
import { activateDiffViewProviderTests } from '../integrations/editor/__tests__/DiffViewProvider.test';
import { activateDetectOmissionTests } from '../integrations/editor/__tests__/detect-omission.test';
import { activateExtractTextTests } from '../integrations/misc/__tests__/extract-text.test';
import { activateShadowCheckpointServiceTests } from './suite/services/checkpoints/ShadowCheckpointService.test';
import { activateEnhancePromptTests } from '../utils/__tests__/enhance-prompt.test';

// Import unregistered tests
import { activateShellTests } from '../utils/__tests__/shell.test';
import { activateGitTests } from '../utils/__tests__/git.test';
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
        await safeActivate(activateLmStudioTests, 'LmStudio', context);
        await safeActivate(activateBedrockConverseFormatTests, 'BedrockConverseFormat', context);
        await safeActivate(activateAnthropicTests, 'Anthropic', context);
        await safeActivate(activateOpenAiTests, 'OpenAI', context);
        await safeActivate(activateBedrockTests, 'Bedrock', context);
        await safeActivate(activateDeepSeekTests, 'DeepSeek', context);
        await safeActivate(activateGeminiTests, 'Gemini', context);
        await safeActivate(activateGlamaTests, 'Glama', context);
        await safeActivate(activateMistralTests, 'Mistral', context);
        await safeActivate(activateOllamaTests, 'Ollama', context);
        await safeActivate(activateRequestyTests, 'Requesty', context);
        await safeActivate(activateUnboundTests, 'Unbound', context);
        await safeActivate(activateVertexTests, 'Vertex', context);
        await safeActivate(activateOpenAiFormatTests, 'OpenAI Format', context);
        await safeActivate(activateR1FormatTests, 'R1 Format', context);
        await safeActivate(activateSimpleFormatTests, 'Simple Format', context);
        await safeActivate(activateStreamTests, 'Stream', context);
        await safeActivate(activateVsCodeLmFormatTests, 'VSCode LM Format', context);
        await safeActivate(activateEditorUtilsTests, 'EditorUtils', context);
        await safeActivate(activateModeValidatorTests, 'Mode Validator', context);
        await safeActivate(activateConfigManagerTests, 'ConfigManager', context);
        await safeActivate(activateCustomModesSchemaTests, 'CustomModesSchema', context);
        await safeActivate(activateCustomModesSettingsTests, 'CustomModesSettings', context);
        await safeActivate(activateGroupConfigSchemaTests, 'GroupConfigSchema', context);
        await safeActivate(activateNewUnifiedDiffTests, 'NewUnifiedDiff', context);
        await safeActivate(activateUnifiedDiffTests, 'UnifiedDiff', context);
        await safeActivate(activateEditStrategiesTests, 'EditStrategies', context);
        await safeActivate(activateSearchStrategiesTests, 'SearchStrategies', context);
        await safeActivate(activateMentionsTests, 'Mentions', context);
        await safeActivate(activateDiffViewProviderTests, 'DiffViewProvider', context);
        await safeActivate(activateDetectOmissionTests, 'DetectOmission', context);
        await safeActivate(activateExtractTextTests, 'ExtractText', context);
        await safeActivate(activateShadowCheckpointServiceTests, 'ShadowCheckpointService', context);
        
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