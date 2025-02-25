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
exports.loadRequiredLanguageParsers = loadRequiredLanguageParsers;
const path = __importStar(require("path"));
const web_tree_sitter_1 = __importDefault(require("web-tree-sitter"));
const queries_1 = require("./queries");
async function loadLanguage(langName) {
    return await web_tree_sitter_1.default.Language.load(path.join(__dirname, `tree-sitter-${langName}.wasm`));
}
let isParserInitialized = false;
async function initializeParser() {
    if (!isParserInitialized) {
        await web_tree_sitter_1.default.init();
        isParserInitialized = true;
    }
}
/*
Using node bindings for tree-sitter is problematic in vscode extensions
because of incompatibility with electron. Going the .wasm route has the
advantage of not having to build for multiple architectures.

We use web-tree-sitter and tree-sitter-wasms which provides auto-updating prebuilt WASM binaries for tree-sitter's language parsers.

This function loads WASM modules for relevant language parsers based on input files:
1. Extracts unique file extensions
2. Maps extensions to language names
3. Loads corresponding WASM files (containing grammar rules)
4. Uses WASM modules to initialize tree-sitter parsers

This approach optimizes performance by loading only necessary parsers once for all relevant files.

Sources:
- https://github.com/tree-sitter/node-tree-sitter/issues/169
- https://github.com/tree-sitter/node-tree-sitter/issues/168
- https://github.com/Gregoor/tree-sitter-wasms/blob/main/README.md
- https://github.com/tree-sitter/tree-sitter/blob/master/lib/binding_web/README.md
- https://github.com/tree-sitter/tree-sitter/blob/master/lib/binding_web/test/query-test.js
*/
async function loadRequiredLanguageParsers(filesToParse) {
    await initializeParser();
    const extensionsToLoad = new Set(filesToParse.map((file) => path.extname(file).toLowerCase().slice(1)));
    const parsers = {};
    for (const ext of extensionsToLoad) {
        let language;
        let query;
        switch (ext) {
            case "js":
            case "jsx":
                language = await loadLanguage("javascript");
                query = language.query(queries_1.javascriptQuery);
                break;
            case "ts":
                language = await loadLanguage("typescript");
                query = language.query(queries_1.typescriptQuery);
                break;
            case "tsx":
                language = await loadLanguage("tsx");
                query = language.query(queries_1.typescriptQuery);
                break;
            case "py":
                language = await loadLanguage("python");
                query = language.query(queries_1.pythonQuery);
                break;
            case "rs":
                language = await loadLanguage("rust");
                query = language.query(queries_1.rustQuery);
                break;
            case "go":
                language = await loadLanguage("go");
                query = language.query(queries_1.goQuery);
                break;
            case "cpp":
            case "hpp":
                language = await loadLanguage("cpp");
                query = language.query(queries_1.cppQuery);
                break;
            case "c":
            case "h":
                language = await loadLanguage("c");
                query = language.query(queries_1.cQuery);
                break;
            case "cs":
                language = await loadLanguage("c_sharp");
                query = language.query(queries_1.csharpQuery);
                break;
            case "rb":
                language = await loadLanguage("ruby");
                query = language.query(queries_1.rubyQuery);
                break;
            case "java":
                language = await loadLanguage("java");
                query = language.query(queries_1.javaQuery);
                break;
            case "php":
                language = await loadLanguage("php");
                query = language.query(queries_1.phpQuery);
                break;
            case "swift":
                language = await loadLanguage("swift");
                query = language.query(queries_1.swiftQuery);
                break;
            default:
                throw new Error(`Unsupported language: ${ext}`);
        }
        const parser = new web_tree_sitter_1.default();
        parser.setLanguage(language);
        parsers[ext] = { parser, query };
    }
    return parsers;
}
//# sourceMappingURL=languageParser.js.map