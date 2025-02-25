"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listFiles = listFiles;
const globby_1 = require("globby");
const os_1 = __importDefault(require("os"));
const path = __importStar(require("path"));
const path_1 = require("../../utils/path");
async function listFiles(dirPath, recursive, limit) {
    const absolutePath = path.resolve(dirPath);
    // Do not allow listing files in root or home directory, which cline tends to want to do when the user's prompt is vague.
    const root = process.platform === "win32" ? path.parse(absolutePath).root : "/";
    const isRoot = (0, path_1.arePathsEqual)(absolutePath, root);
    if (isRoot) {
        return [[root], false];
    }
    const homeDir = os_1.default.homedir();
    const isHomeDir = (0, path_1.arePathsEqual)(absolutePath, homeDir);
    if (isHomeDir) {
        return [[homeDir], false];
    }
    const dirsToIgnore = [
        "node_modules",
        "__pycache__",
        "env",
        "venv",
        "target/dependency",
        "build/dependencies",
        "dist",
        "out",
        "bundle",
        "vendor",
        "tmp",
        "temp",
        "deps",
        "pkg",
        "Pods",
        ".*", // '!**/.*' excludes hidden directories, while '!**/.*/**' excludes only their contents. This way we are at least aware of the existence of hidden directories.
    ].map((dir) => `**/${dir}/**`);
    const options = {
        cwd: dirPath,
        dot: true, // do not ignore hidden files/directories
        absolute: true,
        markDirectories: true, // Append a / on any directories matched (/ is used on windows as well, so dont use path.sep)
        gitignore: recursive, // globby ignores any files that are gitignored
        ignore: recursive ? dirsToIgnore : undefined, // just in case there is no gitignore, we ignore sensible defaults
        onlyFiles: false, // true by default, false means it will list directories on their own too
    };
    // * globs all files in one dir, ** globs files in nested directories
    const files = recursive ? await globbyLevelByLevel(limit, options) : (await (0, globby_1.globby)("*", options)).slice(0, limit);
    return [files, files.length >= limit];
}
/*
Breadth-first traversal of directory structure level by level up to a limit:
   - Queue-based approach ensures proper breadth-first traversal
   - Processes directory patterns level by level
   - Captures a representative sample of the directory structure up to the limit
   - Minimizes risk of missing deeply nested files

- Notes:
   - Relies on globby to mark directories with /
   - Potential for loops if symbolic links reference back to parent (we could use followSymlinks: false but that may not be ideal for some projects and it's pointless if they're not using symlinks wrong)
   - Timeout mechanism prevents infinite loops
*/
async function globbyLevelByLevel(limit, options) {
    let results = new Set();
    let queue = ["*"];
    const globbingProcess = async () => {
        while (queue.length > 0 && results.size < limit) {
            const pattern = queue.shift();
            const filesAtLevel = await (0, globby_1.globby)(pattern, options);
            for (const file of filesAtLevel) {
                if (results.size >= limit) {
                    break;
                }
                results.add(file);
                if (file.endsWith("/")) {
                    queue.push(`${file}*`);
                }
            }
        }
        return Array.from(results).slice(0, limit);
    };
    // Timeout after 10 seconds and return partial results
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Globbing timeout")), 10_000);
    });
    try {
        return await Promise.race([globbingProcess(), timeoutPromise]);
    }
    catch (error) {
        console.warn("Globbing timed out, returning partial results");
        return Array.from(results);
    }
}
//# sourceMappingURL=list-files.js.map