"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolParamNames = exports.toolUseNames = exports.parseAssistantMessage = void 0;
var parse_assistant_message_1 = require("./parse-assistant-message");
Object.defineProperty(exports, "parseAssistantMessage", { enumerable: true, get: function () { return parse_assistant_message_1.parseAssistantMessage; } });
exports.toolUseNames = [
    "execute_command",
    "read_file",
    "write_to_file",
    "apply_diff",
    "insert_content",
    "search_and_replace",
    "search_files",
    "list_files",
    "list_code_definition_names",
    "browser_action",
    "use_mcp_tool",
    "access_mcp_resource",
    "ask_followup_question",
    "attempt_completion",
    "switch_mode",
    "new_task",
];
exports.toolParamNames = [
    "command",
    "path",
    "content",
    "line_count",
    "regex",
    "file_pattern",
    "recursive",
    "action",
    "url",
    "coordinate",
    "text",
    "server_name",
    "tool_name",
    "arguments",
    "uri",
    "question",
    "result",
    "diff",
    "start_line",
    "end_line",
    "mode_slug",
    "reason",
    "operations",
    "mode",
    "message",
];
//# sourceMappingURL=index.js.map