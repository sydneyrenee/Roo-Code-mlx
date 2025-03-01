# Register Tests Implementation Example

This document provides an example of how the `registerTests.js` file should be updated to register all migrated tests.

## Current Implementation

```javascript
// Import test activation functions
const { activateCodeActionProviderTests } = require("../core/__tests__/CodeActionProvider.test");
const { activateBedrockConverseFormatTests } = require("../api/transform/__tests__/bedrock-converse-format.test");
const { activateVsCodeSelectorUtilsTests } = require("../shared/__tests__/vsCodeSelectorUtils.test");
const { activateCheckExistApiConfigTests } = require("../shared/__tests__/checkExistApiConfig.test");

/**
 * Register all VS Code Testing API tests
 * This function should only be called in development mode
 */
async function registerTests(context) {
    // Only register tests in development mode
    if (process.env.NODE_ENV !== 'development') {
        return;
    }
    
    // Register core tests
    await activateCodeActionProviderTests(context);
    
    // Register API transform tests
    await activateBedrockConverseFormatTests(context);
    
    // Register shared tests
    await activateVsCodeSelectorUtilsTests(context);
    await activateCheckExistApiConfigTests(context);
    
    // Add more test registrations here as they are migrated
}
```

## Proposed Implementation

```javascript
// Import test activation functions

// Core Tests
const { activateCodeActionProviderTests } = require("../core/__tests__/CodeActionProvider.test");
const { activateModeValidatorTests } = require("../core/__tests__/mode-validator.test");
const { activateEditorUtilsTests } = require("../core/__tests__/EditorUtils.test");
const { activateClineTests } = require("../core/__tests__/Cline.test");
const { activateSearchReplaceStrategyTests } = require("../core/diff/strategies/__tests__/search-replace.test");
const { activateUnifiedStrategyTests } = require("../core/diff/strategies/__tests__/unified.test");
const { activateNewUnifiedStrategyTests } = require("../core/diff/strategies/__tests__/new-unified.test");
const { activateNewUnifiedSearchStrategiesTests } = require("../core/diff/strategies/new-unified/__tests__/search-strategies.test");
const { activateNewUnifiedEditStrategiesTests } = require("../core/diff/strategies/new-unified/__tests__/edit-strategies.test");
const { activateConfigManagerTests } = require("../core/config/__tests__/ConfigManager.test");
const { activateCustomModesSettingsTests } = require("../core/config/__tests__/CustomModesSettings.test");
const { activateGroupConfigSchemaTests } = require("../core/config/__tests__/GroupConfigSchema.test");
const { activateCustomModesManagerTests } = require("../core/config/__tests__/CustomModesManager.test");
const { activateCustomModesSchemaTests } = require("../core/config/__tests__/CustomModesSchema.test");
const { activateMentionsTests } = require("../core/mentions/__tests__/index.test");
const { activateSystemPromptsTests } = require("../core/prompts/__tests__/system.test");
const { activateSectionsPromptsTests } = require("../core/prompts/__tests__/sections.test");

// API Tests
const { activateOpenAIProviderTests } = require("../api/providers/__tests__/openai.test");
const { activateAnthropicProviderTests } = require("../api/providers/__tests__/anthropic.test");
const { activateGeminiProviderTests } = require("../api/providers/__tests__/gemini.test");
const { activateVertexProviderTests } = require("../api/providers/__tests__/vertex.test");
const { activateOpenRouterProviderTests } = require("../api/providers/__tests__/openrouter.test");
const { activateOllamaProviderTests } = require("../api/providers/__tests__/ollama.test");
const { activateLMStudioProviderTests } = require("../api/providers/__tests__/lmstudio.test");
const { activateOpenAINativeProviderTests } = require("../api/providers/__tests__/openai-native.test");
const { activateDeepSeekProviderTests } = require("../api/providers/__tests__/deepseek.test");
const { activateGlamaProviderTests } = require("../api/providers/__tests__/glama.test");
const { activateMistralProviderTests } = require("../api/providers/__tests__/mistral.test");
const { activateUnboundProviderTests } = require("../api/providers/__tests__/unbound.test");
const { activateBedrockProviderTests } = require("../api/providers/__tests__/bedrock.test");
const { activateVSCodeLMProviderTests } = require("../api/providers/__tests__/vscode-lm.test");
const { activateRequestyProviderTests } = require("../api/providers/__tests__/requesty.test");
const { activateBedrockConverseFormatTests } = require("../api/transform/__tests__/bedrock-converse-format.test");
const { activateStreamTransformTests } = require("../api/transform/__tests__/stream.test");
const { activateSimpleFormatTests } = require("../api/transform/__tests__/simple-format.test");
const { activateVSCodeLMFormatTests } = require("../api/transform/__tests__/vscode-lm-format.test");
const { activateOpenAIFormatTests } = require("../api/transform/__tests__/openai-format.test");
const { activateR1FormatTests } = require("../api/transform/__tests__/r1-format.test");

// Integration Tests
const { activateExtensionTests } = require("../test/suite/extension.test");
const { activateModesTests } = require("../test/suite/modes.test");
const { activateTaskTests } = require("../test/suite/task.test");
const { activateDiffViewProviderTests } = require("../integrations/editor/__tests__/DiffViewProvider.test");
const { activateDetectOmissionTests } = require("../integrations/editor/__tests__/detect-omission.test");
const { activateTerminalProcessTests } = require("../integrations/terminal/__tests__/TerminalProcess.test");
const { activateTerminalRegistryTests } = require("../integrations/terminal/__tests__/TerminalRegistry.test");
const { activateWorkspaceTrackerTests } = require("../integrations/workspace/__tests__/WorkspaceTracker.test");
const { activateExtractTextTests } = require("../integrations/misc/__tests__/extract-text.test");

// Service Tests
const { activateLocalCheckpointServiceTests } = require("../test/suite/services/checkpoints/LocalCheckpointService.test");
const { activateShadowCheckpointServiceTests } = require("../test/suite/services/checkpoints/ShadowCheckpointService.test");
const { activateMcpHubTests } = require("../test/suite/services/mcp/McpHub.test");
const { activateMcpHubServiceTests } = require("../services/mcp/__tests__/McpHub.test");
const { activateTreeSitterIndexTests } = require("../test/suite/services/tree-sitter/index.test");
const { activateLanguageParserTests } = require("../test/suite/services/tree-sitter/languageParser.test");
const { activateCacheRefreshTests } = require("../test/suite/services/vertex/cache-refresh.test");
const { activateCacheTrackerTests } = require("../test/suite/services/vertex/cache-tracker.test");
const { activateVertexHandlerCacheTests } = require("../test/suite/services/vertex/vertex-handler-cache.test");

// Utility Tests
const { activateGitUtilsTests } = require("../utils/__tests__/git.test");
const { activateCostUtilsTests } = require("../utils/__tests__/cost.test");
const { activatePathUtilsTests } = require("../utils/__tests__/path.test");
const { activateShellUtilsTests } = require("../utils/__tests__/shell.test");
const { activateEnhancePromptUtilsTests } = require("../utils/__tests__/enhance-prompt.test");
const { activateSupportPromptsTests } = require("../shared/__tests__/support-prompts.test");
const { activateModesSharedTests } = require("../shared/__tests__/modes.test");
const { activateCheckExistApiConfigTests } = require("../shared/__tests__/checkExistApiConfig.test");
const { activateVsCodeSelectorUtilsTests } = require("../shared/__tests__/vsCodeSelectorUtils.test");

// Template Tests
const { activateCommandTemplateTests } = require("../test/suite/templates/command.test");
const { activateExtensionTemplateTests } = require("../test/suite/templates/extension.test");
const { activateServiceTemplateTests } = require("../test/suite/templates/service.test");

/**
 * Register all VS Code Testing API tests
 * This function should only be called in development mode
 */
async function registerTests(context) {
    // Only register tests in development mode
    if (process.env.NODE_ENV !== 'development') {
        return;
    }
    
    try {
        // Register core tests
        await activateCodeActionProviderTests(context);
        await activateModeValidatorTests(context);
        await activateEditorUtilsTests(context);
        await activateClineTests(context);
        await activateSearchReplaceStrategyTests(context);
        await activateUnifiedStrategyTests(context);
        await activateNewUnifiedStrategyTests(context);
        await activateNewUnifiedSearchStrategiesTests(context);
        await activateNewUnifiedEditStrategiesTests(context);
        await activateConfigManagerTests(context);
        await activateCustomModesSettingsTests(context);
        await activateGroupConfigSchemaTests(context);
        await activateCustomModesManagerTests(context);
        await activateCustomModesSchemaTests(context);
        await activateMentionsTests(context);
        await activateSystemPromptsTests(context);
        await activateSectionsPromptsTests(context);
        
        // Register API tests
        await activateOpenAIProviderTests(context);
        await activateAnthropicProviderTests(context);
        await activateGeminiProviderTests(context);
        await activateVertexProviderTests(context);
        await activateOpenRouterProviderTests(context);
        await activateOllamaProviderTests(context);
        await activateLMStudioProviderTests(context);
        await activateOpenAINativeProviderTests(context);
        await activateDeepSeekProviderTests(context);
        await activateGlamaProviderTests(context);
        await activateMistralProviderTests(context);
        await activateUnboundProviderTests(context);
        await activateBedrockProviderTests(context);
        await activateVSCodeLMProviderTests(context);
        await activateRequestyProviderTests(context);
        await activateBedrockConverseFormatTests(context);
        await activateStreamTransformTests(context);
        await activateSimpleFormatTests(context);
        await activateVSCodeLMFormatTests(context);
        await activateOpenAIFormatTests(context);
        await activateR1FormatTests(context);
        
        // Register integration tests
        await activateExtensionTests(context);
        await activateModesTests(context);
        await activateTaskTests(context);
        await activateDiffViewProviderTests(context);
        await activateDetectOmissionTests(context);
        await activateTerminalProcessTests(context);
        await activateTerminalRegistryTests(context);
        await activateWorkspaceTrackerTests(context);
        await activateExtractTextTests(context);
        
        // Register service tests
        await activateLocalCheckpointServiceTests(context);
        await activateShadowCheckpointServiceTests(context);
        await activateMcpHubTests(context);
        await activateMcpHubServiceTests(context);
        await activateTreeSitterIndexTests(context);
        await activateLanguageParserTests(context);
        await activateCacheRefreshTests(context);
        await activateCacheTrackerTests(context);
        await activateVertexHandlerCacheTests(context);
        
        // Register utility tests
        await activateGitUtilsTests(context);
        await activateCostUtilsTests(context);
        await activatePathUtilsTests(context);
        await activateShellUtilsTests(context);
        await activateEnhancePromptUtilsTests(context);
        await activateSupportPromptsTests(context);
        await activateModesSharedTests(context);
        await activateCheckExistApiConfigTests(context);
        await activateVsCodeSelectorUtilsTests(context);
        
        // Register template tests
        await activateCommandTemplateTests(context);
        await activateExtensionTemplateTests(context);
        await activateServiceTemplateTests(context);
        
        console.log('All tests registered successfully');
    } catch (error) {
        console.error('Error registering tests:', error);
    }
}
```

## Implementation Notes

1. **Incremental Approach**: It's recommended to implement this incrementally, adding a few tests at a time and verifying they work before adding more.

2. **Error Handling**: The try-catch block will help identify which test registration is failing without stopping the entire registration process.

3. **Naming Conventions**: The activation function names follow a consistent pattern: `activate[TestName]Tests`.

4. **Path Adjustments**: The paths in the require statements may need to be adjusted based on the actual location of the test files.

5. **Activation Function Verification**: Before adding a test to the registration, verify that it exports an activation function with the expected name.

## Next Steps

1. Implement this updated registerTests.js file
2. Test each category of tests incrementally
3. Update the MIGRATION_STATUS.md document as tests are verified to work
4. Address any issues that arise during testing