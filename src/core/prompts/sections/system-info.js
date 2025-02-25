"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSystemInfoSection = getSystemInfoSection;
const os_1 = __importDefault(require("os"));
const os_name_1 = __importDefault(require("os-name"));
const modes_1 = require("../../../shared/modes");
const shell_1 = require("../../../utils/shell");
function getSystemInfoSection(cwd, currentMode, customModes) {
    const findModeBySlug = (slug, modes) => modes?.find((m) => m.slug === slug);
    const currentModeName = findModeBySlug(currentMode, customModes)?.name || currentMode;
    const codeModeName = findModeBySlug(modes_1.defaultModeSlug, customModes)?.name || "Code";
    let details = `====

SYSTEM INFORMATION

Operating System: ${(0, os_name_1.default)()}
Default Shell: ${(0, shell_1.getShell)()}
Home Directory: ${os_1.default.homedir().toPosix()}
Current Working Directory: ${cwd.toPosix()}

When the user initially gives you a task, a recursive list of all filepaths in the current working directory ('/test/path') will be included in environment_details. This provides an overview of the project's file structure, offering key insights into the project from directory/file names (how developers conceptualize and organize their code) and file extensions (the language used). This can also guide decision-making on which files to explore further. If you need to further explore directories such as outside the current working directory, you can use the list_files tool. If you pass 'true' for the recursive parameter, it will list files recursively. Otherwise, it will list files at the top level, which is better suited for generic directories where you don't necessarily need the nested structure, like the Desktop.`;
    return details;
}
//# sourceMappingURL=system-info.js.map