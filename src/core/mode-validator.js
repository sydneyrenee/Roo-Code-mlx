"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isToolAllowedForMode = void 0;
exports.validateToolUse = validateToolUse;
const modes_1 = require("../shared/modes");
Object.defineProperty(exports, "isToolAllowedForMode", { enumerable: true, get: function () { return modes_1.isToolAllowedForMode; } });
function validateToolUse(toolName, mode, customModes, toolRequirements, toolParams) {
    if (!(0, modes_1.isToolAllowedForMode)(toolName, mode, customModes ?? [], toolRequirements, toolParams)) {
        throw new Error(`Tool "${toolName}" is not allowed in ${mode} mode.`);
    }
}
//# sourceMappingURL=mode-validator.js.map