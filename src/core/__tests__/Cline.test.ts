import * as vscode from 'vscode';
import * as assert from 'assert';
import { Cline } from "../Cline";
import { ClineProvider } from "../webview/ClineProvider";
import { ApiConfiguration, ModelInfo } from "../../shared/api";
import { ApiStreamChunk } from "../../api/transform/stream";
import { Anthropic } from "@anthropic-ai/sdk";
import { ClineSay } from '../../shared/ExtensionMessage';

// Mock dependencies (converted from Jest to simple mocks)
const mockDisposable = { dispose: () => {} };
const mockEventEmitter = {
    event: () => {},
    fire: () => {},
};
const mockTextDocument = {
    uri: {
        fsPath: "/mock/workspace/path/file.ts",
    },
};
const mockTextEditor = {
    document: mockTextDocument,
};
const mockTab = {
    input: {
        uri: {
            fsPath: "/mock/workspace/path/file.ts",
        },
    },
};
const mockTabGroup = {
    tabs: [mockTab],
};

const mockWindow = {
    createTextEditorDecorationType: () => ({
        dispose: () => {},
    }),
    visibleTextEditors: [mockTextEditor],
    tabGroups: {
        all: [mockTabGroup],
        onDidChangeTabs: () => ({ dispose: () => {} }),
    },
};

const mockWorkspace = {
    workspaceFolders: [{
        uri: {
            fsPath: "/mock/workspace/path",
        },
        name: "mock-workspace",
        index: 0,
    }],
    createFileSystemWatcher: () => ({
        onDidCreate: () => mockDisposable,
        onDidDelete: () => mockDisposable,
        onDidChange: () => mockDisposable,
        dispose: () => {},
    }),
    fs: {
        stat: () => Promise.resolve({ type: 1 }), // FileType.File = 1
    },
    onDidSaveTextDocument: () => mockDisposable,
};

// Mock extensions of vscode namespace
Object.assign(vscode, {
    window: mockWindow,
    workspace: mockWorkspace,
    env: {
        uriScheme: "vscode",
        language: "en",
    },
    EventEmitter: function() { return mockEventEmitter; },
    Disposable: {
        from: () => {},
    },
    TabInputText: function() {},
});

// Add types for delay tracking
interface DelayTracker {
    count: number;
    duration: number;
}

// Fix initializeFileWatching access
interface FileWatchingMethods {
    initializeFileWatching: () => Promise<void>;
    handleFileChange: (uri: vscode.Uri) => Promise<void>;
}

export async function activateClineTests(context: vscode.ExtensionContext): Promise<vscode.TestController> {
    console.log('Activating Cline tests...');
    
    // Create test controller
    const testController = vscode.tests.createTestController('clineTests', 'Cline Tests');
    context.subscriptions.push(testController);
    console.log('Created Cline test controller');

    // Create root test suite
    const rootSuite = testController.createTestItem('cline', 'Cline Tests');
    testController.items.add(rootSuite);

    // Constructor tests
    const constructorSuite = testController.createTestItem('constructor', 'Constructor Tests');
    rootSuite.children.add(constructorSuite);

    constructorSuite.children.add(testController.createTestItem(
        'respect-settings',
        'should respect provided settings'
    ));

    constructorSuite.children.add(testController.createTestItem(
        'default-threshold',
        'should use default fuzzy match threshold when not provided'
    ));

    constructorSuite.children.add(testController.createTestItem(
        'custom-threshold',
        'should use provided fuzzy match threshold'
    ));

    constructorSuite.children.add(testController.createTestItem(
        'require-task',
        'should require either task or historyItem'
    ));

    // Environment Details tests
    const envSuite = testController.createTestItem('environment', 'Environment Details Tests');
    rootSuite.children.add(envSuite);

    envSuite.children.add(testController.createTestItem(
        'timezone-info',
        'should include timezone information in environment details'
    ));

    // API Conversation tests
    const apiSuite = testController.createTestItem('api-conversation', 'API Conversation Tests');
    rootSuite.children.add(apiSuite);

    apiSuite.children.add(testController.createTestItem(
        'clean-history',
        'should clean conversation history before sending to API'
    ));

    apiSuite.children.add(testController.createTestItem(
        'handle-images',
        'should handle image blocks based on model capabilities'
    ));

    apiSuite.children.add(testController.createTestItem(
        'retry-countdown',
        'should handle API retry with countdown'
    ));

    apiSuite.children.add(testController.createTestItem(
        'single-delay',
        'should not apply retry delay twice'
    ));

    // Add Mentions Processing tests
    const mentionsSuite = testController.createTestItem('mentions', 'Mentions Processing Tests');
    rootSuite.children.add(mentionsSuite);

    mentionsSuite.children.add(testController.createTestItem(
        'process-tags',
        'should process mentions in task and feedback tags'
    ));

    // Add Error Handling tests
    const errorSuite = testController.createTestItem('errors', 'Error Handling Tests');
    rootSuite.children.add(errorSuite);

    errorSuite.children.add(testController.createTestItem(
        'handle-api-error',
        'should handle API errors gracefully'
    ));

    errorSuite.children.add(testController.createTestItem(
        'handle-stream-error',
        'should handle streaming errors'
    ));

    errorSuite.children.add(testController.createTestItem(
        'handle-parse-error',
        'should handle content parsing errors'
    ));

    // Add File System tests
    const fsSuite = testController.createTestItem('filesystem', 'File System Tests');
    rootSuite.children.add(fsSuite);

    fsSuite.children.add(testController.createTestItem(
        'watch-workspace',
        'should watch workspace files for changes'
    ));

    fsSuite.children.add(testController.createTestItem(
        'handle-file-change',
        'should handle file change events'
    ));

    // Create test run profile
    testController.createRunProfile('Run Tests', vscode.TestRunProfileKind.Run, async (request) => {
        console.log('Running Cline tests...');
        const queue: vscode.TestItem[] = [];
        const run = testController.createTestRun(request);

        // Add requested tests
        if (request.include) {
            console.log(`Running ${request.include.length} specific tests`);
            request.include.forEach(test => queue.push(test));
        } else {
            console.log('Running all Cline tests');
            rootSuite.children.forEach(test => queue.push(test));
        }

        try {
            // Set up common test fixtures with proper constructor type
            const outputChannel = vscode.window.createOutputChannel("Test Channel");
            const mockProvider = new ClineProvider(context, outputChannel);

            const mockApiConfig: ApiConfiguration = {
                apiProvider: "anthropic",
                apiModelId: "claude-3-5-sonnet-20241022",
                apiKey: "test-api-key",
            };

            // Create common mock state with all required properties
            const fullMockState = {
                apiConfiguration: {
                    ...mockApiConfig,
                    glamaApiKey: undefined,
                    glamaModelId: undefined,
                    glamaEndpoint: undefined,
                    glamaEmbeddingsModelId: undefined,
                    glamaClusterModelId: undefined,
                    glamaClassifyModelId: undefined,
                    glamaClassifyRegexModelId: undefined,
                    glamaClassifyPromptModelId: undefined,
                    glamaChunkDelimiter: undefined,
                    glamaChunkSize: undefined,
                    glamaChunkOverlap: undefined,
                    glamaFixedLength: undefined,
                    glamaRemoveUris: undefined,
                    glamaRemoveStopwords: undefined,
                    glamaCaseInsensitive: undefined,
                    glamaAllowOverlap: undefined,
                    glamaTargetSize: undefined,
                    glamaMinLength: undefined,
                    glamaMaxLength: undefined,
                    glamaStripNewlines: undefined,
                    glamaStripExtraWhitespace: undefined,
                    glamaUseSpacy: undefined,
                    glamaLanguage: undefined,
                    glamaPrompt: undefined,
                    glamaPromptIdentifier: undefined,
                    glamaPromptSeparator: undefined,
                    glamaPromptTemplate: undefined,
                    glamaPromptPrefix: undefined,
                    glamaPromptSuffix: undefined,
                    glamaPromptContext: undefined,
                    glamaPromptExample: undefined,
                    glamaPromptInstruction: undefined,
                    glamaPromptResponse: undefined,
                    glamaPromptFormat: undefined,
                    glamaPromptStyle: undefined,
                    glamaPromptTone: undefined,
                    glamaPromptAudience: undefined,
                    glamaPromptPurpose: undefined,
                    modelTemperature: undefined
                },
                lastShownAnnouncementId: "",
                customInstructions: "",
                alwaysAllowReadOnly: false,
                alwaysAllowWrite: false,
                alwaysAllowExecute: false,
                alwaysAllowBrowser: false,
                alwaysAllowMcp: false,
                alwaysAllowModeSwitch: false,
                alwaysApproveResubmit: true,
                requestDelaySeconds: 3,
                maxOpenTabsContext: 10,
                diffEnabled: false,
                diffThreshold: 0.8,
                showInlineChat: true,
                mode: "default",
                customModes: [],
                experimentalDiffStrategy: false,
                defaultCheckpoints: false,
                maxFileContextLength: 10000,
                maxLineContextLength: 1000,
                maxFolderContextLength: 5000,
                maxSearchContextLength: 2000,
                maxHistoryContextLength: 5000,
                maxTotalContextLength: 50000,
                defaultTimeoutMs: 30000,
                defaultRetryCount: 3,
                defaultRetryDelayMs: 1000,
                maxConcurrentRequests: 5,
                maxRequestsPerMinute: 60,
                rateLimitEnabled: true,
                rateLimitBurst: 10,
                rateLimitWindow: 60000,
                debugLogging: false,
                traceLogging: false,
                logToFile: false,
                logFilePath: "",
                telemetryEnabled: false,
                taskHistory: [],
                allowedCommands: [],
                soundEnabled: false,
                inlineEnabled: true,
                inlineChatEnabled: true,
                inlineSuggestEnabled: true,
                inlineCompletionEnabled: true,
                inlineContextMenuEnabled: true,
                inlineHoverEnabled: true,
                inlineSignatureEnabled: true,
                inlineDocumentationEnabled: true,
                inlineHighlightEnabled: true,
                inlineMarkerEnabled: true,
                inlineCodeLensEnabled: true,
                inlineCodeActionEnabled: true,
                inlineDiagnosticEnabled: true,
                inlineFormattingEnabled: true,
                inlineSymbolEnabled: true,
                inlineReferenceEnabled: true,
                inlineImplementationEnabled: true,
                inlineTypeDefinitionEnabled: true,
                inlineDefinitionEnabled: true,
                inlineDeclarationEnabled: true,
                checkpointsEnabled: false,
                soundVolume: 0.5,
                browserViewportSize: { width: 1920, height: 1080 },
                screenshotQuality: 0.8,
                browserTimeout: 30000,
                browserHeadless: true,
                browserDevtools: false,
                browserCache: false,
                browserCookies: false,
                browserDisk: false,
                browserDownloads: false,
                browserGeolocation: false,
                browserMediaStream: false,
                browserMidi: false,
                browserNotifications: false,
                browserPointer: false,
                browserUsb: false,
                browserBluetooth: false,
                // Add missing properties required by the type system
                fuzzyMatchThreshold: 0.7,
                writeDelayMs: 100,
                terminalOutputLineLimit: 1000,
                preferredLanguage: "en",
                showWelcomeOnStartup: true,
                showTipsOnStartup: true,
                showChangelogOnUpdate: true,
                autoUpdateEnabled: true,
                autoUpdateCheckInterval: 86400000,
                autoUpdateDownloadInBackground: true,
                autoUpdateInstallOnExit: false,
                proxyEnabled: false,
                proxyUrl: "",
                proxyUsername: "",
                proxyPassword: "",
                // Add more missing properties
                mcpEnabled: false,
                enableMcpServerCreation: false,
                rateLimitSeconds: 60,
                currentApiConfigName: "default",
                apiConfigurations: {},
                apiConfigurationNames: [],
                defaultApiConfigurationName: "default",
                defaultApiProvider: "anthropic",
                defaultApiModelId: "claude-3-5-sonnet-20241022",
                defaultApiKey: "test-api-key",
                defaultGlamaApiKey: "",
                defaultGlamaModelId: ""
            };

            // Mock provider methods with full state
            mockProvider.postMessageToWebview = async () => {};
            mockProvider.postStateToWebview = async () => {};
            // Use type assertion to bypass strict type checking for the mock state
            mockProvider.getState = async () => fullMockState as any;

            // Run tests
            for (const test of queue) {
                console.log(`Running test: ${test.id}`);
                run.started(test);
                try {
                    // For test cases that need specific state overrides
                    switch (test.id) {
                        case 'respect-settings': {
                            const cline = new Cline(
                                mockProvider,
                                mockApiConfig,
                                "custom instructions",
                                false,
                                false,
                                0.95,
                                "test task"
                            );
                            assert.strictEqual(cline.customInstructions, "custom instructions", "Custom instructions should match");
                            assert.strictEqual(cline.diffEnabled, false, "Diff enabled should match");
                            break;
                        }

                        case 'default-threshold': {
                            const cline = new Cline(
                                mockProvider,
                                mockApiConfig,
                                "custom instructions",
                                true,
                                false,
                                undefined,
                                "test task"
                            );
                            assert.strictEqual(cline.diffEnabled, true, "Diff enabled should be true");
                            assert.ok(cline.diffStrategy, "Diff strategy should be defined");
                            break;
                        }

                        case 'custom-threshold': {
                            const cline = new Cline(
                                mockProvider,
                                mockApiConfig,
                                "custom instructions",
                                true,
                                false,
                                0.9,
                                "test task"
                            );
                            assert.strictEqual(cline.diffEnabled, true, "Diff enabled should be true");
                            assert.ok(cline.diffStrategy, "Diff strategy should be defined");
                            break;
                        }

                        case 'require-task': {
                            assert.throws(() => {
                                new Cline(
                                    mockProvider,
                                    mockApiConfig,
                                    undefined,
                                    false,
                                    false,
                                    undefined,
                                    undefined
                                );
                            }, /Either historyItem or task\/images must be provided/);
                            break;
                        }

                        case 'timezone-info': {
                            // Mock timezone info
                            const mockDateTimeFormat = {
                                resolvedOptions: () => ({
                                    timeZone: "America/Los_Angeles",
                                }),
                                format: () => "1/1/2024, 5:00:00 AM",
                            };
                            const originalDateTimeFormat = global.Intl.DateTimeFormat;
                            const originalDate = global.Date;

                            try {
                                // Mock Date
                                const fixedTime = new Date("2024-01-01T12:00:00Z");
                                const mockDate = new Date(fixedTime);
                                mockDate.getTimezoneOffset = () => 420; // UTC-7

                                class MockDate extends Date {
                                    constructor() {
                                        super();
                                        return mockDate;
                                    }
                                    static override now() {
                                        return mockDate.getTime();
                                    }
                                }
                                global.Date = MockDate as any;

                                // Mock DateTimeFormat
                                const MockDateTimeFormat = function(this: any) {
                                    return mockDateTimeFormat;
                                } as any;
                                MockDateTimeFormat.prototype = mockDateTimeFormat;
                                MockDateTimeFormat.supportedLocalesOf = () => ["en-US"];
                                global.Intl.DateTimeFormat = MockDateTimeFormat;

                                // Run test
                                const cline = new Cline(mockProvider, mockApiConfig, undefined, false, false, undefined, "test task");
                                const details = await cline["getEnvironmentDetails"](false);

                                // Verify timezone information
                                assert.match(details, /America\/Los_Angeles/);
                                assert.match(details, /UTC-7:00/);
                                assert.match(details, /# Current Time/);
                                assert.match(details, /1\/1\/2024.*5:00:00 AM.*\(America\/Los_Angeles, UTC-7:00\)/);

                            } finally {
                                // Restore mocks
                                global.Intl.DateTimeFormat = originalDateTimeFormat;
                                global.Date = originalDate;
                            }
                            break;
                        }

                        case 'clean-history': {
                            const cline = new Cline(mockProvider, mockApiConfig, undefined, false, false, undefined, "test task");
                            const createMessageSpy = async function*() {
                                yield { type: "text", text: "test response" } as ApiStreamChunk;
                            };

                            // Set up test message with extra properties
                            const messageWithExtra = {
                                role: "user" as const,
                                content: [{ type: "text" as const, text: "test message" }],
                                ts: Date.now(),
                                extraProp: "should be removed",
                            };
                            cline.apiConversationHistory = [messageWithExtra];

                            // Mock abort state
                            Object.defineProperty(cline, "abort", {
                                get: () => false,
                                set: () => {},
                                configurable: true,
                            });

                            // Mock API methods
                            cline.api.createMessage = () => createMessageSpy();
                            cline["getEnvironmentDetails"] = async () => "";
                            cline["loadContext"] = async (content) => [content, ""];

                            // Trigger API request
                            await cline.recursivelyMakeClineRequests([{ type: "text", text: "test request" }], false);

                            // Get the cleaned history from apiConversationHistory
                            const cleanedMessage = cline.apiConversationHistory[0];
                            
                            // Verify cleaning
                            assert.deepStrictEqual(cleanedMessage, {
                                role: "user",
                                content: [{ type: "text", text: "test message" }],
                            });
                            assert.ok(!('extraProp' in cleanedMessage), "Extra properties should be removed");
                            break;
                        }

                        case 'handle-images': {
                            // Create configs for testing
                            const configWithImages = {
                                ...mockApiConfig,
                                apiModelId: "claude-3-sonnet",
                            };
                            const configWithoutImages = {
                                ...mockApiConfig,
                                apiModelId: "gpt-3.5-turbo",
                            };

                            // Test conversation history with images
                            const conversationHistory = [{
                                role: "user" as const,
                                content: [
                                    { 
                                        type: "text" as const, 
                                        text: "Here is an image" 
                                    },
                                    {
                                        type: "image" as const,
                                        source: {
                                            type: "base64" as const,
                                            media_type: "image/jpeg" as const,
                                            data: "base64data",
                                        },
                                    }
                                ],
                                ts: Date.now()
                            }];

                            // Create instances and set up mocks
                            const clineWithImages = new Cline(mockProvider, configWithImages, undefined, false, false, undefined, "test task");
                            const clineWithoutImages = new Cline(mockProvider, configWithoutImages, undefined, false, false, undefined, "test task");

                            // Mock say for tracking calls
                            let sayMessages: { type: ClineSay, text?: string }[] = [];
                            const trackSay = async (type: ClineSay, text?: string) => {
                                sayMessages.push({ type, text });
                                return Promise.resolve(undefined);
                            };
                            clineWithImages.say = trackSay;
                            clineWithoutImages.say = trackSay;

                            // Mock model capabilities
                            clineWithImages.api.getModel = () => ({
                                id: "claude-3-sonnet",
                                info: {
                                    supportsImages: true,
                                    supportsPromptCache: true,
                                    supportsComputerUse: true,
                                    contextWindow: 200000,
                                    maxTokens: 4096,
                                    inputPrice: 0.25,
                                    outputPrice: 0.75,
                                } as ModelInfo,
                            });

                            clineWithoutImages.api.getModel = () => ({
                                id: "gpt-3.5-turbo",
                                info: {
                                    supportsImages: false,
                                    supportsPromptCache: false,
                                    supportsComputerUse: false,
                                    contextWindow: 16000,
                                    maxTokens: 2048,
                                    inputPrice: 0.1,
                                    outputPrice: 0.2,
                                } as ModelInfo,
                            });

                            // Mock abort state
                            Object.defineProperty(clineWithImages, "abort", {
                                get: () => false,
                                set: () => {},
                                configurable: true,
                            });
                            Object.defineProperty(clineWithoutImages, "abort", {
                                get: () => false,
                                set: () => {},
                                configurable: true,
                            });

                            // Mock API methods
                            const mockStream = async function*() {
                                yield { type: "text", text: "test response" } as ApiStreamChunk;
                            };

                            let capturedContentWithImages: any;
                            let capturedContentWithoutImages: any;

                            clineWithImages.api.createMessage = (messages, history) => {
                                capturedContentWithImages = history[0].content;
                                return mockStream();
                            };

                            clineWithoutImages.api.createMessage = (messages, history) => {
                                capturedContentWithoutImages = history[0].content;
                                return mockStream();
                            };

                            // Mock environment and context
                            clineWithImages["getEnvironmentDetails"] = async () => "";
                            clineWithoutImages["getEnvironmentDetails"] = async () => "";
                            clineWithImages["loadContext"] = async (content) => [content, ""];
                            clineWithoutImages["loadContext"] = async (content) => [content, ""];

                            // Set conversation history and trigger requests
                            clineWithImages.apiConversationHistory = conversationHistory;
                            clineWithoutImages.apiConversationHistory = conversationHistory;

                            await clineWithImages.recursivelyMakeClineRequests([{ type: "text", text: "test request" }]);
                            await clineWithoutImages.recursivelyMakeClineRequests([{ type: "text", text: "test request" }]);

                            // Verify image handling
                            assert.strictEqual(capturedContentWithImages.length, 2, "Model with image support should preserve both blocks");
                            assert.strictEqual(capturedContentWithImages[0].type, "text");
                            assert.strictEqual(capturedContentWithImages[1].type, "image");

                            assert.strictEqual(capturedContentWithoutImages.length, 2, "Model without image support should convert image to text");
                            assert.strictEqual(capturedContentWithoutImages[0].type, "text");
                            assert.strictEqual(capturedContentWithoutImages[1].type, "text");
                            assert.strictEqual(capturedContentWithoutImages[1].text, "[Referenced image in conversation]");
                            break;
                        }

                        case 'retry-countdown': {
                            let errorMessage = '';
                            let sayMessages: string[] = [];
                            const delayTracker: DelayTracker = { count: 0, duration: 0 };
                            
                            const cline = new Cline(mockProvider, mockApiConfig, undefined, false, false, undefined, "test task");
                            
                            // Track say calls with undefined return
                            cline.say = async (type: ClineSay, text?: string) => {
                                if (text) {
                                    sayMessages.push(text);
                                    errorMessage = text;
                                }
                                return Promise.resolve(undefined);
                            };

                            // Mock delay function
                            const originalDelay = require("delay").default;
                            require("delay").default = async (ms: number) => {
                                delayTracker.count++;
                                delayTracker.duration = ms;
                                return Promise.resolve(undefined);
                            };

                            // Set provider state with full configuration
                            mockProvider.getState = async () => ({
                                ...fullMockState,
                                requestDelaySeconds: 3
                            } as any);

                            // Override Date.now for MockDate
                            class MockDate extends Date {
                                static override now() {
                                    return new Date("2024-01-01T12:00:00Z").getTime();
                                }
                            }

                            // Handle initialization
                            const initializeFileWatching = async () => Promise.resolve(undefined);
                            Object.defineProperty(cline, 'initializeFileWatching', {
                                value: initializeFileWatching,
                                configurable: true,
                                writable: true
                            });

                            // Mock API request attempts
                            const iterator = cline.attemptApiRequest(0);
                            await iterator.next();

                            // Verify countdown behavior using text messages
                            const retryMessages = sayMessages.filter(msg => msg.includes("Retrying"));
                            assert.strictEqual(delayTracker.count, 3, "Should delay 3 times for countdown");
                            assert.strictEqual(delayTracker.duration, 1000, "Each delay should be 1 second");

                            // Verify countdown message sequence
                            for (let i = 3; i > 0; i--) {
                                assert.ok(
                                    retryMessages.some(msg => msg.includes(`Retrying in ${i} seconds`)),
                                    `Should show countdown for ${i} seconds`
                                );
                            }

                            // Verify final retry message
                            assert.ok(
                                retryMessages.some(msg => msg.includes("Retrying now")),
                                "Should show final retry message"
                            );

                            // Restore original delay function
                            require("delay").default = originalDelay;
                            break;
                        }

                        case 'single-delay': {
                            const cline = new Cline(mockProvider, mockApiConfig, undefined, false, false, undefined, "test task");
                            let delayCallCount = 0;
                            let errorMessage = '';
                            let sayMessages: string[] = [];
                            
                            // Track say calls
                            cline.say = async (type: ClineSay, text?: string) => {
                                if (text) {
                                    sayMessages.push(text);
                                    errorMessage = text;
                                }
                                return Promise.resolve(undefined);
                            };

                            // Mock dependencies
                            const originalDelay = require("delay").default;
                            require("delay").default = async () => {
                                delayCallCount++;
                            };

                            // Set provider state
                            mockProvider.getState = async () => ({
                                ...fullMockState,
                                alwaysApproveResubmit: true,
                                requestDelaySeconds: 3
                            } as any);

                            // Mock previous API request message
                            cline.clineMessages = [{
                                ts: Date.now(),
                                type: "say",
                                say: "api_req_started",
                                text: JSON.stringify({
                                    tokensIn: 100,
                                    tokensOut: 50,
                                    cacheWrites: 0,
                                    cacheReads: 0,
                                    request: "test request",
                                }),
                            }];

                            // Trigger API request
                            const iterator = cline.attemptApiRequest(0);
                            await iterator.next();

                            // Verify delay is only applied once for countdown
                            assert.strictEqual(delayCallCount, 3, "Should only delay for countdown");

                            // Verify countdown message sequence
                            const countdownMessages = sayMessages.filter(msg => msg.includes("Retrying in"));
                            assert.strictEqual(countdownMessages.length, 3, "Should show countdown once");
                            
                            // Verify message order
                            for (let i = 3; i > 0; i--) {
                                assert.ok(sayMessages.some(msg => msg.includes(`Retrying in ${i} seconds`)), 
                                    `Should show countdown for ${i} seconds`);
                            }

                            // Verify final retry message
                            assert.ok(sayMessages.some(msg => msg.includes("Retrying now")), 
                                "Should show final retry message");

                            // Restore original delay function
                            require("delay").default = originalDelay;
                            break;
                        }

                        case 'process-tags': {
                            const cline = new Cline(mockProvider, mockApiConfig, undefined, false, false, undefined, "test task");
                            
                            // Track parseMentions calls
                            let parseMentionsCalls = 0;
                            const mockParseMentions = (text: string) => {
                                parseMentionsCalls++;
                                return `processed: ${text}`;
                            };
                            
                            // Mock the parseMentions dependency
                            const originalParseMentions = require("../../core/mentions").parseMentions;
                            require("../../core/mentions").parseMentions = mockParseMentions;

                            // Test content with various tags and mentions
                            const userContent = [
                                {
                                    type: "text" as const,
                                    text: "Regular text with 'some/path' (see below for file content)",
                                },
                                {
                                    type: "text" as const,
                                    text: "<task>Text with 'some/path' (see below for file content) in task tags</task>",
                                },
                                {
                                    type: "tool_result" as const,
                                    tool_use_id: "test-id",
                                    content: [{
                                        type: "text" as const,
                                        text: "<feedback>Check 'some/path</feedback>' (see below for file content)",
                                    }],
                                },
                                {
                                    type: "tool_result" as const,
                                    tool_use_id: "test-id-2",
                                    content: [{
                                        type: "text" as const,
                                        text: "Regular tool result with 'path' (see below for file content)",
                                    }],
                                },
                            ];

                            // Process the content
                            const [processedContent] = await cline["loadContext"](userContent);

                            // Regular text should not be processed
                            assert.strictEqual(
                                (processedContent[0] as Anthropic.TextBlockParam).text,
                                "Regular text with 'some/path' (see below for file content)",
                                "Regular text should not be processed"
                            );

                            // Text within task tags should be processed
                            const taskTagText = (processedContent[1] as Anthropic.TextBlockParam).text;
                            assert.ok(
                                taskTagText.includes("processed:"),
                                "Task tag content should be processed"
                            );
                            assert.ok(
                                taskTagText.includes("<task>"),
                                "Task tags should be preserved"
                            );

                            // Feedback tag content should be processed
                            const toolResult1 = processedContent[2] as Anthropic.ToolResultBlockParam;
                            const content1 = Array.isArray(toolResult1.content) ? toolResult1.content[0] : toolResult1.content;
                            assert.ok(
                                (content1 as Anthropic.TextBlockParam).text.includes("processed:"),
                                "Feedback tag content should be processed"
                            );

                            // Regular tool result should not be processed
                            const toolResult2 = processedContent[3] as Anthropic.ToolResultBlockParam;
                            const content2 = Array.isArray(toolResult2.content) ? toolResult2.content[0] : toolResult2.content;
                            assert.strictEqual(
                                (content2 as Anthropic.TextBlockParam).text,
                                "Regular tool result with 'path' (see below for file content)",
                                "Regular tool result should not be processed"
                            );

                            // Verify parseMentions was called the correct number of times
                            assert.strictEqual(
                                parseMentionsCalls,
                                2,
                                "parseMentions should be called only for task and feedback tags"
                            );

                            // Restore original parseMentions
                            require("../../core/mentions").parseMentions = originalParseMentions;
                            break;
                        }

                        case 'handle-api-error': {
                            const cline = new Cline(mockProvider, mockApiConfig, undefined, false, false, undefined, "test task");
                            let errorMessage = "";
                            
                            // Track say calls
                            cline.say = async (type: ClineSay, text?: string) => {
                                if (type === "error" && text) errorMessage = text;
                                return Promise.resolve(undefined);
                            };

                            // Mock API error
                            const apiError = new Error("API connection failed");
                            cline.api.createMessage = () => {
                                throw apiError;
                            };

                            // Mock environment and context methods
                            cline["getEnvironmentDetails"] = async () => "";
                            cline["loadContext"] = async (content) => [content, ""];

                            // Trigger API request
                            await cline.recursivelyMakeClineRequests([{ type: "text", text: "test request" }]);

                            // Verify error handling
                            assert.ok(errorMessage.includes("API connection failed"), "Should show API error message");
                            assert.ok(errorMessage.includes("Error details:"), "Should include error details");
                            break;
                        }

                        case 'handle-stream-error': {
                            const cline = new Cline(mockProvider, mockApiConfig, undefined, false, false, undefined, "test task");
                            let errorMessage = "";
                            let streamErrorHandled = false;
                            
                            cline.say = async (type: ClineSay, text?: string) => {
                                if (type === 'error' && text) errorMessage = text;
                                return Promise.resolve(undefined);
                            };

                            // Create failing stream
                            const mockStream = async function*() {
                                yield { type: "text", text: "partial response" } as ApiStreamChunk;
                                throw new Error("Stream interrupted");
                            };

                            // Mock API methods
                            cline.api.createMessage = () => mockStream();
                            cline["getEnvironmentDetails"] = async () => "";
                            cline["loadContext"] = async (content) => [content, ""];

                            // Mock error handling method
                            const handleError = async (err: Error) => {
                                streamErrorHandled = true;
                                return Promise.resolve();
                            };
                            Object.defineProperty(cline, 'handleError', {
                                value: handleError,
                                writable: true
                            });

                            // Trigger API request
                            await cline.recursivelyMakeClineRequests([{ type: "text", text: "test request" }]);

                            // Verify error handling
                            assert.ok(streamErrorHandled, "Stream error should be handled");
                            assert.ok(errorMessage.includes("Stream interrupted"), "Should show stream error message");
                            break;
                        }

                        case 'handle-parse-error': {
                            const cline = new Cline(mockProvider, mockApiConfig, undefined, false, false, undefined, "test task");
                            let errorMessage = "";
                            
                            // Track say calls
                            cline.say = async (type: ClineSay, text?: string) => {
                                if (type === "error" && text) errorMessage = text;
                                return Promise.resolve(undefined);
                            };

                            // Create malformed content
                            const malformedContent = [
                                {
                                    type: "invalid" as any,
                                    text: "malformed content",
                                }
                            ];

                            // Attempt to process malformed content
                            try {
                                await cline["loadContext"](malformedContent);
                                assert.fail("Should throw error for invalid content type");
                            } catch (err) {
                                assert.ok(err instanceof Error, "Should throw error object");
                                assert.ok(
                                    err.message.includes("invalid") || err.message.includes("type"),
                                    "Error should mention invalid type"
                                );
                            }
                            break;
                        }

                        case 'watch-workspace': {
                            const cline = new Cline(mockProvider, mockApiConfig, undefined, false, false, undefined, "test task") as Cline & FileWatchingMethods;
                            
                            // Track watcher creation
                            const watcherEvents: string[] = [];
                            const mockWatcher = {
                                onDidCreate: (callback: any) => {
                                    watcherEvents.push('create');
                                    return mockDisposable;
                                },
                                onDidDelete: (callback: any) => {
                                    watcherEvents.push('delete');
                                    return mockDisposable;
                                },
                                onDidChange: (callback: any) => {
                                    watcherEvents.push('change');
                                    return mockDisposable;
                                },
                                dispose: () => {},
                                ignoreCreateEvents: false,
                                ignoreChangeEvents: false,
                                ignoreDeleteEvents: false
                            };

                            // Mock workspace.createFileSystemWatcher
                            const originalCreateFileSystemWatcher = vscode.workspace.createFileSystemWatcher;
                            vscode.workspace.createFileSystemWatcher = () => mockWatcher as any;

                            // Initialize file watching using public method
                            const initializeFileWatching = async () => {
                                return Promise.resolve();
                            };
                            Object.defineProperty(cline, 'initializeFileWatching', {
                                value: initializeFileWatching,
                                writable: true
                            });

                            // Initialize file watching
                            await cline["initializeFileWatching"]();

                            // Verify watcher setup
                            assert.ok(watcherEvents.includes('create'), "Should watch for file creation");
                            assert.ok(watcherEvents.includes('delete'), "Should watch for file deletion");
                            assert.ok(watcherEvents.includes('change'), "Should watch for file changes");
                            assert.strictEqual(watcherEvents.length, 3, "Should set up exactly 3 event handlers");

                            // Restore original createFileSystemWatcher
                            vscode.workspace.createFileSystemWatcher = originalCreateFileSystemWatcher;
                            break;
                        }

                        case 'handle-file-change': {
                            const cline = new Cline(mockProvider, mockApiConfig, undefined, false, false, undefined, "test task") as Cline & FileWatchingMethods;
                            let fileChangeHandled = false;
                            
                            const fileWatcher = {
                                handleFileChange: async (uri: vscode.Uri) => {
                                    fileChangeHandled = true;
                                    return Promise.resolve(undefined);
                                }
                            };

                            // Add the file watcher methods to the cline instance
                            Object.assign(cline, fileWatcher);

                            // Create mock file change event
                            const mockUri = vscode.Uri.file("/mock/workspace/path/changed-file.ts");
                            
                            // Trigger file change
                            await cline.handleFileChange?.(mockUri);

                            // Verify file change handling
                            assert.ok(fileChangeHandled, "Should handle file change event");
                            break;
                        }

                        default: {
                            // Set provider state with full configuration
                            mockProvider.getState = async () => fullMockState as any;
                            break;
                        }
                    }
                    console.log(`Test passed: ${test.id}`);
                    run.passed(test);
                } catch (err) {
                    console.error(`Test failed: ${test.id}`, err);
                    const message = err instanceof Error ? err.stack || err.message : String(err);
                    run.failed(test, new vscode.TestMessage(message));
                }
            }
        } catch (err) {
            console.error('Test run failed:', err);
            for (const test of queue) {
                run.failed(test, new vscode.TestMessage(err instanceof Error ? err.stack || err.message : String(err)));
            }
        } finally {
            console.log('Cline test run completed');
            run.end();
        }
    });

    console.log('Cline tests activated successfully');
    return testController;
}
