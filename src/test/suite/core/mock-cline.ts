import { MockClineProvider } from './mock-provider';

export class Cline {
    private _taskId: string;
    private _abandoned = false;
    private _diffEnabled: boolean;
    private _customInstructions?: string;
    private _fuzzyMatchThreshold: number;
    private _checkpointsEnabled: boolean;

    constructor(
        provider: MockClineProvider,
        apiConfig: any,
        customInstructions?: string,
        diffEnabled = false,
        checkpointsEnabled = false,
        fuzzyMatchThreshold = 1.0,
        task?: string,
        images?: string[],
        historyItem?: { id: string }
    ) {
        if (!task && !historyItem) {
            throw new Error('Either historyItem or task/images must be provided');
        }

        this._taskId = historyItem?.id || Math.random().toString();
        this._diffEnabled = diffEnabled;
        this._customInstructions = customInstructions;
        this._fuzzyMatchThreshold = fuzzyMatchThreshold;
        this._checkpointsEnabled = checkpointsEnabled;
    }

    get taskId() {
        return this._taskId;
    }

    get diffEnabled() {
        return this._diffEnabled;
    }

    get customInstructions() {
        return this._customInstructions;
    }

    get fuzzyMatchThreshold() {
        return this._fuzzyMatchThreshold;
    }

    get checkpointsEnabled() {
        return this._checkpointsEnabled;
    }

    get abandoned() {
        return this._abandoned;
    }

    async abortTask() {
        this._abandoned = true;
    }

    async say(type: string, message: string) {
        if (this._abandoned) {
            throw new Error('Roo Code instance aborted');
        }
    }
}