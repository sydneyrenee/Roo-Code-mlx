"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GROUP_DISPLAY_NAMES = exports.ALWAYS_AVAILABLE_TOOLS = exports.TOOL_GROUPS = exports.TOOL_DISPLAY_NAMES = void 0;
exports.getToolName = getToolName;
exports.getToolOptions = getToolOptions;
// Map of tool slugs to their display names
exports.TOOL_DISPLAY_NAMES = {
    execute_command: "run commands",
    read_file: "read files",
    write_to_file: "write files",
    apply_diff: "apply changes",
    search_files: "search files",
    list_files: "list files",
    list_code_definition_names: "list definitions",
    browser_action: "use a browser",
    use_mcp_tool: "use mcp tools",
    access_mcp_resource: "access mcp resources",
    ask_followup_question: "ask questions",
    attempt_completion: "complete tasks",
    switch_mode: "switch modes",
    new_task: "create new task",
};
// Define available tool groups
exports.TOOL_GROUPS = {
    read: {
        tools: ["read_file", "search_files", "list_files", "list_code_definition_names"],
    },
    edit: {
        tools: ["write_to_file", "apply_diff", "insert_content", "search_and_replace"],
    },
    browser: {
        tools: ["browser_action"],
    },
    command: {
        tools: ["execute_command"],
    },
    mcp: {
        tools: ["use_mcp_tool", "access_mcp_resource"],
    },
    modes: {
        tools: ["switch_mode", "new_task"],
        alwaysAvailable: true,
    },
};
// Tools that are always available to all modes
exports.ALWAYS_AVAILABLE_TOOLS = [
    "ask_followup_question",
    "attempt_completion",
    "switch_mode",
    "new_task",
];
// Tool helper functions
function getToolName(toolConfig) {
    return typeof toolConfig === "string" ? toolConfig : toolConfig[0];
}
function getToolOptions(toolConfig) {
    return typeof toolConfig === "string" ? undefined : toolConfig[1];
}
// Display names for groups in UI
exports.GROUP_DISPLAY_NAMES = {
    read: "Read Files",
    edit: "Edit Files",
    browser: "Use Browser",
    command: "Run Commands",
    mcp: "Use MCP",
};
//# sourceMappingURL=tool-groups.js.map