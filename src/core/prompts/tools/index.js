"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSearchAndReplaceDescription = exports.getInsertContentDescription = exports.getSwitchModeDescription = exports.getAccessMcpResourceDescription = exports.getUseMcpToolDescription = exports.getAttemptCompletionDescription = exports.getAskFollowupQuestionDescription = exports.getBrowserActionDescription = exports.getListCodeDefinitionNamesDescription = exports.getListFilesDescription = exports.getSearchFilesDescription = exports.getWriteToFileDescription = exports.getReadFileDescription = exports.getExecuteCommandDescription = void 0;
exports.getToolDescriptionsForMode = getToolDescriptionsForMode;
const execute_command_1 = require("./execute-command");
Object.defineProperty(exports, "getExecuteCommandDescription", { enumerable: true, get: function () { return execute_command_1.getExecuteCommandDescription; } });
const read_file_1 = require("./read-file");
Object.defineProperty(exports, "getReadFileDescription", { enumerable: true, get: function () { return read_file_1.getReadFileDescription; } });
const write_to_file_1 = require("./write-to-file");
Object.defineProperty(exports, "getWriteToFileDescription", { enumerable: true, get: function () { return write_to_file_1.getWriteToFileDescription; } });
const search_files_1 = require("./search-files");
Object.defineProperty(exports, "getSearchFilesDescription", { enumerable: true, get: function () { return search_files_1.getSearchFilesDescription; } });
const list_files_1 = require("./list-files");
Object.defineProperty(exports, "getListFilesDescription", { enumerable: true, get: function () { return list_files_1.getListFilesDescription; } });
const insert_content_1 = require("./insert-content");
Object.defineProperty(exports, "getInsertContentDescription", { enumerable: true, get: function () { return insert_content_1.getInsertContentDescription; } });
const search_and_replace_1 = require("./search-and-replace");
Object.defineProperty(exports, "getSearchAndReplaceDescription", { enumerable: true, get: function () { return search_and_replace_1.getSearchAndReplaceDescription; } });
const list_code_definition_names_1 = require("./list-code-definition-names");
Object.defineProperty(exports, "getListCodeDefinitionNamesDescription", { enumerable: true, get: function () { return list_code_definition_names_1.getListCodeDefinitionNamesDescription; } });
const browser_action_1 = require("./browser-action");
Object.defineProperty(exports, "getBrowserActionDescription", { enumerable: true, get: function () { return browser_action_1.getBrowserActionDescription; } });
const ask_followup_question_1 = require("./ask-followup-question");
Object.defineProperty(exports, "getAskFollowupQuestionDescription", { enumerable: true, get: function () { return ask_followup_question_1.getAskFollowupQuestionDescription; } });
const attempt_completion_1 = require("./attempt-completion");
Object.defineProperty(exports, "getAttemptCompletionDescription", { enumerable: true, get: function () { return attempt_completion_1.getAttemptCompletionDescription; } });
const use_mcp_tool_1 = require("./use-mcp-tool");
Object.defineProperty(exports, "getUseMcpToolDescription", { enumerable: true, get: function () { return use_mcp_tool_1.getUseMcpToolDescription; } });
const access_mcp_resource_1 = require("./access-mcp-resource");
Object.defineProperty(exports, "getAccessMcpResourceDescription", { enumerable: true, get: function () { return access_mcp_resource_1.getAccessMcpResourceDescription; } });
const switch_mode_1 = require("./switch-mode");
Object.defineProperty(exports, "getSwitchModeDescription", { enumerable: true, get: function () { return switch_mode_1.getSwitchModeDescription; } });
const new_task_1 = require("./new-task");
const modes_1 = require("../../../shared/modes");
const tool_groups_1 = require("../../../shared/tool-groups");
// Map of tool names to their description functions
const toolDescriptionMap = {
    execute_command: (args) => (0, execute_command_1.getExecuteCommandDescription)(args),
    read_file: (args) => (0, read_file_1.getReadFileDescription)(args),
    write_to_file: (args) => (0, write_to_file_1.getWriteToFileDescription)(args),
    search_files: (args) => (0, search_files_1.getSearchFilesDescription)(args),
    list_files: (args) => (0, list_files_1.getListFilesDescription)(args),
    list_code_definition_names: (args) => (0, list_code_definition_names_1.getListCodeDefinitionNamesDescription)(args),
    browser_action: (args) => (0, browser_action_1.getBrowserActionDescription)(args),
    ask_followup_question: () => (0, ask_followup_question_1.getAskFollowupQuestionDescription)(),
    attempt_completion: () => (0, attempt_completion_1.getAttemptCompletionDescription)(),
    use_mcp_tool: (args) => (0, use_mcp_tool_1.getUseMcpToolDescription)(args),
    access_mcp_resource: (args) => (0, access_mcp_resource_1.getAccessMcpResourceDescription)(args),
    switch_mode: () => (0, switch_mode_1.getSwitchModeDescription)(),
    new_task: (args) => (0, new_task_1.getNewTaskDescription)(args),
    insert_content: (args) => (0, insert_content_1.getInsertContentDescription)(args),
    search_and_replace: (args) => (0, search_and_replace_1.getSearchAndReplaceDescription)(args),
    apply_diff: (args) => args.diffStrategy ? args.diffStrategy.getToolDescription({ cwd: args.cwd, toolOptions: args.toolOptions }) : "",
};
function getToolDescriptionsForMode(mode, cwd, supportsComputerUse, diffStrategy, browserViewportSize, mcpHub, customModes, experiments) {
    const config = (0, modes_1.getModeConfig)(mode, customModes);
    const args = {
        cwd,
        supportsComputerUse,
        diffStrategy,
        browserViewportSize,
        mcpHub,
    };
    const tools = new Set();
    // Add tools from mode's groups
    config.groups.forEach((groupEntry) => {
        const groupName = (0, modes_1.getGroupName)(groupEntry);
        const toolGroup = tool_groups_1.TOOL_GROUPS[groupName];
        if (toolGroup) {
            toolGroup.tools.forEach((tool) => {
                if ((0, modes_1.isToolAllowedForMode)(tool, mode, customModes ?? [], experiments ?? {})) {
                    tools.add(tool);
                }
            });
        }
    });
    // Add always available tools
    tool_groups_1.ALWAYS_AVAILABLE_TOOLS.forEach((tool) => tools.add(tool));
    // Map tool descriptions for allowed tools
    const descriptions = Array.from(tools).map((toolName) => {
        const descriptionFn = toolDescriptionMap[toolName];
        if (!descriptionFn) {
            return undefined;
        }
        return descriptionFn({
            ...args,
            toolOptions: undefined, // No tool options in group-based approach
        });
    });
    return `# Tools\n\n${descriptions.filter(Boolean).join("\n\n")}`;
}
//# sourceMappingURL=index.js.map