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
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSourceCodeForDefinitionsTopLevel = parseSourceCodeForDefinitionsTopLevel;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const list_files_1 = require("../glob/list-files");
const languageParser_1 = require("./languageParser");
const fs_1 = require("../../utils/fs");
// TODO: implement caching behavior to avoid having to keep analyzing project for new tasks.
async function parseSourceCodeForDefinitionsTopLevel(dirPath) {
    // check if the path exists
    const dirExists = await (0, fs_1.fileExistsAtPath)(path.resolve(dirPath));
    if (!dirExists) {
        return "This directory does not exist or you do not have permission to access it.";
    }
    // Get all files at top level (not gitignored)
    const [allFiles, _] = await (0, list_files_1.listFiles)(dirPath, false, 200);
    let result = "";
    // Separate files to parse and remaining files
    const { filesToParse, remainingFiles } = separateFiles(allFiles);
    const languageParsers = await (0, languageParser_1.loadRequiredLanguageParsers)(filesToParse);
    // Parse specific files we have language parsers for
    // const filesWithoutDefinitions: string[] = []
    for (const file of filesToParse) {
        const definitions = await parseFile(file, languageParsers);
        if (definitions) {
            result += `${path.relative(dirPath, file).toPosix()}\n${definitions}\n`;
        }
        // else {
        // 	filesWithoutDefinitions.push(file)
        // }
    }
    // List remaining files' paths
    // let didFindUnparsedFiles = false
    // filesWithoutDefinitions
    // 	.concat(remainingFiles)
    // 	.sort()
    // 	.forEach((file) => {
    // 		if (!didFindUnparsedFiles) {
    // 			result += "# Unparsed Files\n\n"
    // 			didFindUnparsedFiles = true
    // 		}
    // 		result += `${path.relative(dirPath, file)}\n`
    // 	})
    return result ? result : "No source code definitions found.";
}
function separateFiles(allFiles) {
    const extensions = [
        "js",
        "jsx",
        "ts",
        "tsx",
        "py",
        // Rust
        "rs",
        "go",
        // C
        "c",
        "h",
        // C++
        "cpp",
        "hpp",
        // C#
        "cs",
        // Ruby
        "rb",
        "java",
        "php",
        "swift",
    ].map((e) => `.${e}`);
    const filesToParse = allFiles.filter((file) => extensions.includes(path.extname(file))).slice(0, 50); // 50 files max
    const remainingFiles = allFiles.filter((file) => !filesToParse.includes(file));
    return { filesToParse, remainingFiles };
}
/*
Parsing files using tree-sitter

1. Parse the file content into an AST (Abstract Syntax Tree) using the appropriate language grammar (set of rules that define how the components of a language like keywords, expressions, and statements can be combined to create valid programs).
2. Create a query using a language-specific query string, and run it against the AST's root node to capture specific syntax elements.
    - We use tag queries to identify named entities in a program, and then use a syntax capture to label the entity and its name. A notable example of this is GitHub's search-based code navigation.
    - Our custom tag queries are based on tree-sitter's default tag queries, but modified to only capture definitions.
3. Sort the captures by their position in the file, output the name of the definition, and format by i.e. adding "|----\n" for gaps between captured sections.

This approach allows us to focus on the most relevant parts of the code (defined by our language-specific queries) and provides a concise yet informative view of the file's structure and key elements.

- https://github.com/tree-sitter/node-tree-sitter/blob/master/test/query_test.js
- https://github.com/tree-sitter/tree-sitter/blob/master/lib/binding_web/test/query-test.js
- https://github.com/tree-sitter/tree-sitter/blob/master/lib/binding_web/test/helper.js
- https://tree-sitter.github.io/tree-sitter/code-navigation-systems
*/
async function parseFile(filePath, languageParsers) {
    const fileContent = await fs.readFile(filePath, "utf8");
    const ext = path.extname(filePath).toLowerCase().slice(1);
    const { parser, query } = languageParsers[ext] || {};
    if (!parser || !query) {
        return `Unsupported file type: ${filePath}`;
    }
    let formattedOutput = "";
    try {
        // Parse the file content into an Abstract Syntax Tree (AST), a tree-like representation of the code
        const tree = parser.parse(fileContent);
        // Apply the query to the AST and get the captures
        // Captures are specific parts of the AST that match our query patterns, each capture represents a node in the AST that we're interested in.
        const captures = query.captures(tree.rootNode);
        // Sort captures by their start position
        captures.sort((a, b) => a.node.startPosition.row - b.node.startPosition.row);
        // Split the file content into individual lines
        const lines = fileContent.split("\n");
        // Keep track of the last line we've processed
        let lastLine = -1;
        captures.forEach((capture) => {
            const { node, name } = capture;
            // Get the start and end lines of the current AST node
            const startLine = node.startPosition.row;
            const endLine = node.endPosition.row;
            // Once we've retrieved the nodes we care about through the language query, we filter for lines with definition names only.
            // name.startsWith("name.reference.") > refs can be used for ranking purposes, but we don't need them for the output
            // previously we did `name.startsWith("name.definition.")` but this was too strict and excluded some relevant definitions
            // Add separator if there's a gap between captures
            if (lastLine !== -1 && startLine > lastLine + 1) {
                formattedOutput += "|----\n";
            }
            // Only add the first line of the definition
            // query captures includes the definition name and the definition implementation, but we only want the name (I found discrepencies in the naming structure for various languages, i.e. javascript names would be 'name' and typescript names would be 'name.definition)
            if (name.includes("name") && lines[startLine]) {
                formattedOutput += `│${lines[startLine]}\n`;
            }
            // Adds all the captured lines
            // for (let i = startLine; i <= endLine; i++) {
            // 	formattedOutput += `│${lines[i]}\n`
            // }
            //}
            lastLine = endLine;
        });
    }
    catch (error) {
        console.log(`Error parsing file: ${error}\n`);
    }
    if (formattedOutput.length > 0) {
        return `|----\n${formattedOutput}|----\n`;
    }
    return undefined;
}
//# sourceMappingURL=index.js.map