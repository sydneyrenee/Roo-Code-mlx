import * as vscode from 'vscode';

export interface HistoryItem {
    id: string;
    ts: number;
    task: string;
    tokensIn: number;
    tokensOut: number;
    cacheWrites: number;
    cacheReads: number;
    totalCost: number;
}

export type ApiProvider = {
    apiProvider: string;
    id: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stop?: string[];
};