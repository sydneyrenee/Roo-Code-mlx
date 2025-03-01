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
exports.BrowserSession = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const puppeteer_core_1 = require("puppeteer-core");
// @ts-ignore
const puppeteer_chromium_resolver_1 = __importDefault(require("puppeteer-chromium-resolver"));
const p_wait_for_1 = __importDefault(require("p-wait-for"));
const delay_1 = __importDefault(require("delay"));
const fs_1 = require("../../utils/fs");
class BrowserSession {
    context;
    browser;
    page;
    currentMousePosition;
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
        console.log("launch browser called");
        if (this.browser) {
            // throw new Error("Browser already launched")
            await this.closeBrowser(); // this may happen when the model launches a browser again after having used it already before
        }
        const stats = await this.ensureChromiumExists();
        this.browser = await stats.puppeteer.launch({
            args: [
                "--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            ],
            executablePath: stats.executablePath,
            defaultViewport: (() => {
                const size = this.context.globalState.get("browserViewportSize") || "900x600";
                const [width, height] = size.split("x").map(Number);
                return { width, height };
            })(),
            // headless: false,
        });
        // (latest version of puppeteer does not add headless to user agent)
        this.page = await this.browser?.newPage();
    }
    async closeBrowser() {
        if (this.browser || this.page) {
            console.log("closing browser...");
            await this.browser?.close().catch(() => { });
            this.browser = undefined;
            this.page = undefined;
            this.currentMousePosition = undefined;
        }
        return {};
    }
    async doAction(action) {
        if (!this.page) {
            throw new Error("Browser is not launched. This may occur if the browser was automatically closed by a non-`browser_action` tool.");
        }
        const logs = [];
        let lastLogTs = Date.now();
        const consoleListener = (msg) => {
            if (msg.type() === "log") {
                logs.push(msg.text());
            }
            else {
                logs.push(`[${msg.type()}] ${msg.text()}`);
            }
            lastLogTs = Date.now();
        };
        const errorListener = (err) => {
            logs.push(`[Page Error] ${err.toString()}`);
            lastLogTs = Date.now();
        };
        // Add the listeners
        this.page.on("console", consoleListener);
        this.page.on("pageerror", errorListener);
        try {
            await action(this.page);
        }
        catch (err) {
            if (!(err instanceof puppeteer_core_1.TimeoutError)) {
                logs.push(`[Error] ${err.toString()}`);
            }
        }
        // Wait for console inactivity, with a timeout
        await (0, p_wait_for_1.default)(() => Date.now() - lastLogTs >= 500, {
            timeout: 3_000,
            interval: 100,
        }).catch(() => { });
        let options = {
            encoding: "base64",
            // clip: {
            // 	x: 0,
            // 	y: 0,
            // 	width: 900,
            // 	height: 600,
            // },
        };
        let screenshotBase64 = await this.page.screenshot({
            ...options,
            type: "webp",
            quality: (await this.context.globalState.get("screenshotQuality")) ?? 75,
        });
        let screenshot = `data:image/webp;base64,${screenshotBase64}`;
        if (!screenshotBase64) {
            console.log("webp screenshot failed, trying png");
            screenshotBase64 = await this.page.screenshot({
                ...options,
                type: "png",
            });
            screenshot = `data:image/png;base64,${screenshotBase64}`;
        }
        if (!screenshotBase64) {
            throw new Error("Failed to take screenshot.");
        }
        // this.page.removeAllListeners() <- causes the page to crash!
        this.page.off("console", consoleListener);
        this.page.off("pageerror", errorListener);
        return {
            screenshot,
            logs: logs.join("\n"),
            currentUrl: this.page.url(),
            currentMousePosition: this.currentMousePosition,
        };
    }
    async navigateToUrl(url) {
        return this.doAction(async (page) => {
            // networkidle2 isn't good enough since page may take some time to load. we can assume locally running dev sites will reach networkidle0 in a reasonable amount of time
            await page.goto(url, { timeout: 7_000, waitUntil: ["domcontentloaded", "networkidle2"] });
            // await page.goto(url, { timeout: 10_000, waitUntil: "load" })
            await this.waitTillHTMLStable(page); // in case the page is loading more resources
        });
    }
    // page.goto { waitUntil: "networkidle0" } may not ever resolve, and not waiting could return page content too early before js has loaded
    // https://stackoverflow.com/questions/52497252/puppeteer-wait-until-page-is-completely-loaded/61304202#61304202
    async waitTillHTMLStable(page, timeout = 5_000) {
        const checkDurationMsecs = 500; // 1000
        const maxChecks = timeout / checkDurationMsecs;
        let lastHTMLSize = 0;
        let checkCounts = 1;
        let countStableSizeIterations = 0;
        const minStableSizeIterations = 3;
        while (checkCounts++ <= maxChecks) {
            let html = await page.content();
            let currentHTMLSize = html.length;
            // let bodyHTMLSize = await page.evaluate(() => document.body.innerHTML.length)
            console.log("last: ", lastHTMLSize, " <> curr: ", currentHTMLSize);
            if (lastHTMLSize !== 0 && currentHTMLSize === lastHTMLSize) {
                countStableSizeIterations++;
            }
            else {
                countStableSizeIterations = 0; //reset the counter
            }
            if (countStableSizeIterations >= minStableSizeIterations) {
                console.log("Page rendered fully...");
                break;
            }
            lastHTMLSize = currentHTMLSize;
            await (0, delay_1.default)(checkDurationMsecs);
        }
    }
    async click(coordinate) {
        const [x, y] = coordinate.split(",").map(Number);
        return this.doAction(async (page) => {
            // Set up network request monitoring
            let hasNetworkActivity = false;
            const requestListener = () => {
                hasNetworkActivity = true;
            };
            page.on("request", requestListener);
            // Perform the click
            await page.mouse.click(x, y);
            this.currentMousePosition = coordinate;
            // Small delay to check if click triggered any network activity
            await (0, delay_1.default)(100);
            if (hasNetworkActivity) {
                // If we detected network activity, wait for navigation/loading
                await page
                    .waitForNavigation({
                    waitUntil: ["domcontentloaded", "networkidle2"],
                    timeout: 7000,
                })
                    .catch(() => { });
                await this.waitTillHTMLStable(page);
            }
            // Clean up listener
            page.off("request", requestListener);
        });
    }
    async type(text) {
        return this.doAction(async (page) => {
            await page.keyboard.type(text);
        });
    }
    async scrollDown() {
        const size = (await this.context.globalState.get("browserViewportSize")) || "900x600";
        const height = parseInt(size.split("x")[1]);
        return this.doAction(async (page) => {
            await page.evaluate((scrollHeight) => {
                window.scrollBy({
                    top: scrollHeight,
                    behavior: "auto",
                });
            }, height);
            await (0, delay_1.default)(300);
        });
    }
    async scrollUp() {
        const size = (await this.context.globalState.get("browserViewportSize")) || "900x600";
        const height = parseInt(size.split("x")[1]);
        return this.doAction(async (page) => {
            await page.evaluate((scrollHeight) => {
                window.scrollBy({
                    top: -scrollHeight,
                    behavior: "auto",
                });
            }, height);
            await (0, delay_1.default)(300);
        });
    }
}
exports.BrowserSession = BrowserSession;
//# sourceMappingURL=BrowserSession.js.map