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
        if (mod !== null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UrlContentFetcher = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const cheerio = __importStar(require("cheerio"));
const turndown_1 = __importDefault(require("turndown"));
// @ts-ignore
const puppeteer_chromium_resolver_1 = __importDefault(require("puppeteer-chromium-resolver"));
const fs_1 = require("../../utils/fs");
class UrlContentFetcher {
    context;
    browser;
    page;
    constructor(context) {
        this.context = context;
    }
    async ensureChromiumExists() {
        const globalStoragePath = this.context?.globalStorageUri?.fsPath;
        if (!globalStoragePath) {
            throw new Error("Global storage uri is invalid");
        }
        const puppeteerDir = path.join(globalStoragePath, "puppeteer");
        const dirExists = await (0, fs_1.fileExistsAtPath)(puppeteerDir);
        if (!dirExists) {
            await fs.mkdir(puppeteerDir, { recursive: true });
        }
        // if chromium doesn't exist, this will download it to path.join(puppeteerDir, ".chromium-browser-snapshots")
        // if it does exist it will return the path to existing chromium
        const stats = await (0, puppeteer_chromium_resolver_1.default)({
            downloadPath: puppeteerDir,
        });
        return stats;
    }
    async launchBrowser() {
        if (this.browser) {
            return;
        }
        const stats = await this.ensureChromiumExists();
        this.browser = await stats.puppeteer.launch({
            args: [
                "--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            ],
            executablePath: stats.executablePath,
        });
        // (latest version of puppeteer does not add headless to user agent)
        this.page = await this.browser?.newPage();
    }
    async closeBrowser() {
        await this.browser?.close();
        this.browser = undefined;
        this.page = undefined;
    }
    // must make sure to call launchBrowser before and closeBrowser after using this
    async urlToMarkdown(url) {
        if (!this.browser || !this.page) {
            throw new Error("Browser not initialized");
        }
        /*
        - networkidle2 is equivalent to playwright's networkidle where it waits until there are no more than 2 network connections for at least 500 ms.
        - domcontentloaded is when the basic DOM is loaded
        this should be sufficient for most doc sites
        */
        await this.page.goto(url, { timeout: 10_000, waitUntil: ["domcontentloaded", "networkidle2"] });
        const content = await this.page.content();
        // use cheerio to parse and clean up the HTML
        const $ = cheerio.load(content);
        $("script, style, nav, footer, header").remove();
        // convert cleaned HTML to markdown
        const turndownService = new turndown_1.default();
        const markdown = turndownService.turndown($.html());
        return markdown;
    }
}
exports.UrlContentFetcher = UrlContentFetcher;
//# sourceMappingURL=UrlContentFetcher.js.map