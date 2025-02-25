"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SYSTEM_PROMPT = void 0;
const modes_1 = require("../../shared/modes");
const tools_1 = require("./tools");
const sections_1 = require("./sections");
async function generatePrompt(context, cwd, supportsComputerUse, mode, mcpHub, diffStrategy, browserViewportSize, promptComponent, customModeConfigs, globalCustomInstructions, preferredLanguage, diffEnabled, experiments, enableMcpServerCreation) {
    if (!context) {
        throw new Error("Extension context is required for generating system prompt");
    }
    // If diff is disabled, don't pass the diffStrategy
    const effectiveDiffStrategy = diffEnabled ? diffStrategy : undefined;
    const [mcpServersSection, modesSection] = await Promise.all([
        (0, sections_1.getMcpServersSection)(mcpHub, effectiveDiffStrategy, enableMcpServerCreation),
        (0, sections_1.getModesSection)(context),
    ]);
    // Get the full mode config to ensure we have the role definition
    const modeConfig = (0, modes_1.getModeBySlug)(mode, customModeConfigs) || modes_1.modes.find((m) => m.slug === mode) || modes_1.modes[0];
    const roleDefinition = promptComponent?.roleDefinition || modeConfig.roleDefinition;
    const basePrompt = `${roleDefinition}

${(0, sections_1.getSharedToolUseSection)()}

${(0, tools_1.getToolDescriptionsForMode)(mode, cwd, supportsComputerUse, effectiveDiffStrategy, browserViewportSize, mcpHub, customModeConfigs, experiments)}

${(0, sections_1.getToolUseGuidelinesSection)()}

${mcpServersSection}

${(0, sections_1.getCapabilitiesSection)(cwd, supportsComputerUse, mcpHub, effectiveDiffStrategy)}

${modesSection}

${(0, sections_1.getRulesSection)(cwd, supportsComputerUse, effectiveDiffStrategy, experiments)}

${(0, sections_1.getSystemInfoSection)(cwd, mode, customModeConfigs)}

${(0, sections_1.getObjectiveSection)()}

${await (0, sections_1.addCustomInstructions)(promptComponent?.customInstructions || modeConfig.customInstructions || "", globalCustomInstructions || "", cwd, mode, { preferredLanguage })}`;
    return basePrompt;
}
const SYSTEM_PROMPT = async (context, cwd, supportsComputerUse, mcpHub, diffStrategy, browserViewportSize, mode = modes_1.defaultModeSlug, customModePrompts, customModes, globalCustomInstructions, preferredLanguage, diffEnabled, experiments, enableMcpServerCreation) => {
    if (!context) {
        throw new Error("Extension context is required for generating system prompt");
    }
    const getPromptComponent = (value) => {
        if (typeof value === "object" && value !== null) {
            return value;
        }
        return undefined;
    };
    // Check if it's a custom mode
    const promptComponent = getPromptComponent(customModePrompts?.[mode]);
    // Get full mode config from custom modes or fall back to built-in modes
    const currentMode = (0, modes_1.getModeBySlug)(mode, customModes) || modes_1.modes.find((m) => m.slug === mode) || modes_1.modes[0];
    // If diff is disabled, don't pass the diffStrategy
    const effectiveDiffStrategy = diffEnabled ? diffStrategy : undefined;
    return generatePrompt(context, cwd, supportsComputerUse, currentMode.slug, mcpHub, effectiveDiffStrategy, browserViewportSize, promptComponent, customModes, globalCustomInstructions, preferredLanguage, diffEnabled, experiments, enableMcpServerCreation);
};
exports.SYSTEM_PROMPT = SYSTEM_PROMPT;
//# sourceMappingURL=system.js.map