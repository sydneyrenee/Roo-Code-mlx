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
exports.extractTextFromFile = extractTextFromFile;
exports.addLineNumbers = addLineNumbers;
exports.everyLineHasLineNumbers = everyLineHasLineNumbers;
exports.stripLineNumbers = stripLineNumbers;
exports.truncateOutput = truncateOutput;
const path = __importStar(require("path"));
// @ts-ignore-next-line
const pdf_parse_1 = __importDefault(require("pdf-parse/lib/pdf-parse"));
const mammoth_1 = __importDefault(require("mammoth"));
const promises_1 = __importDefault(require("fs/promises"));
const isbinaryfile_1 = require("isbinaryfile");
async function extractTextFromFile(filePath) {
    try {
        await promises_1.default.access(filePath);
    }
    catch (error) {
        throw new Error(`File not found: ${filePath}`);
    }
    const fileExtension = path.extname(filePath).toLowerCase();
    switch (fileExtension) {
        case ".pdf":
            return extractTextFromPDF(filePath);
        case ".docx":
            return extractTextFromDOCX(filePath);
        case ".ipynb":
            return extractTextFromIPYNB(filePath);
        default:
            const isBinary = await (0, isbinaryfile_1.isBinaryFile)(filePath).catch(() => false);
            if (!isBinary) {
                return addLineNumbers(await promises_1.default.readFile(filePath, "utf8"));
            }
            else {
                throw new Error(`Cannot read text for file type: ${fileExtension}`);
            }
    }
}
async function extractTextFromPDF(filePath) {
    const dataBuffer = await promises_1.default.readFile(filePath);
    const data = await (0, pdf_parse_1.default)(dataBuffer);
    return addLineNumbers(data.text);
}
async function extractTextFromDOCX(filePath) {
    const result = await mammoth_1.default.extractRawText({ path: filePath });
    return addLineNumbers(result.value);
}
async function extractTextFromIPYNB(filePath) {
    const data = await promises_1.default.readFile(filePath, "utf8");
    const notebook = JSON.parse(data);
    let extractedText = "";
    for (const cell of notebook.cells) {
        if ((cell.cell_type === "markdown" || cell.cell_type === "code") && cell.source) {
            extractedText += cell.source.join("\n") + "\n";
        }
    }
    return addLineNumbers(extractedText);
}
function addLineNumbers(content, startLine = 1) {
    const lines = content.split("\n");
    const maxLineNumberWidth = String(startLine + lines.length - 1).length;
    return lines
        .map((line, index) => {
        const lineNumber = String(startLine + index).padStart(maxLineNumberWidth, " ");
        return `${lineNumber} | ${line}`;
    })
        .join("\n");
}
// Checks if every line in the content has line numbers prefixed (e.g., "1 | content" or "123 | content")
// Line numbers must be followed by a single pipe character (not double pipes)
function everyLineHasLineNumbers(content) {
    const lines = content.split(/\r?\n/);
    return lines.length > 0 && lines.every((line) => /^\s*\d+\s+\|(?!\|)/.test(line));
}
// Strips line numbers from content while preserving the actual content
// Handles formats like "1 | content", " 12 | content", "123 | content"
// Preserves content that naturally starts with pipe characters
function stripLineNumbers(content) {
    // Split into lines to handle each line individually
    const lines = content.split(/\r?\n/);
    // Process each line
    const processedLines = lines.map((line) => {
        // Match line number pattern and capture everything after the pipe
        const match = line.match(/^\s*\d+\s+\|(?!\|)\s?(.*)$/);
        return match ? match[1] : line;
    });
    // Join back with original line endings
    const lineEnding = content.includes("\r\n") ? "\r\n" : "\n";
    return processedLines.join(lineEnding);
}
/**
 * Truncates multi-line output while preserving context from both the beginning and end.
 * When truncation is needed, it keeps 20% of the lines from the start and 80% from the end,
 * with a clear indicator of how many lines were omitted in between.
 *
 * @param content The multi-line string to truncate
 * @param lineLimit Optional maximum number of lines to keep. If not provided or 0, returns the original content
 * @returns The truncated string with an indicator of omitted lines, or the original content if no truncation needed
 *
 * @example
 * // With 10 line limit on 25 lines of content:
 * // - Keeps first 2 lines (20% of 10)
 * // - Keeps last 8 lines (80% of 10)
 * // - Adds "[...15 lines omitted...]" in between
 */
function truncateOutput(content, lineLimit) {
    if (!lineLimit) {
        return content;
    }
    const lines = content.split("\n");
    if (lines.length <= lineLimit) {
        return content;
    }
    const beforeLimit = Math.floor(lineLimit * 0.2); // 20% of lines before
    const afterLimit = lineLimit - beforeLimit; // remaining 80% after
    return [
        ...lines.slice(0, beforeLimit),
        `\n[...${lines.length - lineLimit} lines omitted...]\n`,
        ...lines.slice(-afterLimit),
    ].join("\n");
}
//# sourceMappingURL=extract-text.js.map