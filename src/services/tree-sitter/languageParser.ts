import path from "path"
import fs from "fs/promises"

// Core types for web-tree-sitter
type WasmParser = any;
type WasmLanguage = any;
type WasmQuery = any;

// Define the shape we need from tree-sitter
interface TreeSitterConstructor {
    new(): WasmParser;
    init(): Promise<void>;
    Language: {
        load(path: string): Promise<WasmLanguage>;
    };
}

export interface ParserInstance {
    parser: WasmParser;
    query: WasmQuery;
}

export class LanguageParser {
    private parser?: WasmParser;
    private static parsersMap = new Map<string, ParserInstance>();
    private static treeSitterModule?: TreeSitterConstructor;

    public static async getTreeSitter(): Promise<TreeSitterConstructor> {
        if (!this.treeSitterModule) {
            const module = await import("web-tree-sitter");
            const Parser = module.default as unknown as TreeSitterConstructor;
            await Parser.init();
            this.treeSitterModule = Parser;
        }
        return this.treeSitterModule;
    }

    async init() {
        if (!this.parser) {
            const Parser = await LanguageParser.getTreeSitter();
            this.parser = new Parser();
        }
    }

    static async loadLanguage(langName: string): Promise<WasmLanguage> {
        const Parser = await this.getTreeSitter();
        return await Parser.Language.load(path.join(__dirname, `tree-sitter-${langName}.wasm`));
    }

    static async loadQueryContent(queryType: string): Promise<string> {
        const queryPath = path.join(__dirname, 'queries', `${queryType}.scm`);
        return await fs.readFile(queryPath, 'utf8');
    }

    static async initializeParser(ext: string, language: WasmLanguage, queryType: string): Promise<void> {
        const Parser = await this.getTreeSitter();
        const parser = new Parser();
        await parser.setLanguage(language);

        try {
            const queryContent = await this.loadQueryContent(queryType);
            const query = language.query(queryContent);
            this.parsersMap.set(ext, { parser, query });
        } catch (error) {
            console.error(`Failed to load query for ${queryType}:`, error);
            throw error;
        }
    }

    getParser(ext: string): ParserInstance | undefined {
        return LanguageParser.parsersMap.get(ext);
    }

    static async createParser(language: WasmLanguage): Promise<WasmParser> {
        const Parser = await this.getTreeSitter();
        const parser = new Parser();
        await parser.setLanguage(language);
        return parser;
    }

    static create(): LanguageParser {
        return new LanguageParser();
    }
}

export async function loadRequiredLanguageParsers(filesToParse: string[]): Promise<Record<string, ParserInstance>> {
    const Parser = await LanguageParser.getTreeSitter();
    const extensionsToLoad = new Set(filesToParse.map((file) => path.extname(file).toLowerCase().slice(1)));
    const parsers: Record<string, ParserInstance> = {};

    for (const ext of extensionsToLoad) {
        const language = await LanguageParser.loadLanguage(getLangNameForExt(ext));
        const queryContent = await LanguageParser.loadQueryContent(getLangNameForExt(ext));
        const parser = new Parser();
        await parser.setLanguage(language);
        const query = language.query(queryContent);
        parsers[ext] = { parser, query };
    }

    return parsers;
}

function getLangNameForExt(ext: string): string {
    switch (ext) {
        case "js":
        case "jsx":
            return "javascript";
        case "ts":
        case "tsx":
            return "typescript";
        case "py":
            return "python";
        case "rs":
            return "rust";
        case "go":
            return "go";
        case "cpp":
        case "hpp":
            return "cpp";
        case "c":
        case "h":
            return "c";
        case "cs":
            return "c_sharp";
        case "rb":
            return "ruby";
        case "java":
            return "java";
        case "php":
            return "php";
        case "swift":
            return "swift";
        default:
            throw new Error(`Unsupported language extension: ${ext}`);
    }
}
