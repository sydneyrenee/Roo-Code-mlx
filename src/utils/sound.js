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
exports.playSound = exports.setSoundVolume = exports.setSoundEnabled = exports.isWAV = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
/**
 * Minimum interval (in milliseconds) to prevent continuous playback
 */
const MIN_PLAY_INTERVAL = 500;
/**
 * Timestamp of when sound was last played
 */
let lastPlayedTime = 0;
/**
 * Determine if a file is a WAV file
 * @param filepath string
 * @returns boolean
 */
const isWAV = (filepath) => {
    return path.extname(filepath).toLowerCase() === ".wav";
};
exports.isWAV = isWAV;
let isSoundEnabled = false;
let volume = 0.5;
/**
 * Set sound configuration
 * @param enabled boolean
 */
const setSoundEnabled = (enabled) => {
    isSoundEnabled = enabled;
};
exports.setSoundEnabled = setSoundEnabled;
/**
 * Set sound volume
 * @param volume number
 */
const setSoundVolume = (newVolume) => {
    volume = newVolume;
};
exports.setSoundVolume = setSoundVolume;
/**
 * Play a sound file
 * @param filepath string
 * @return void
 */
const playSound = (filepath) => {
    try {
        if (!isSoundEnabled) {
            return;
        }
        if (!filepath) {
            return;
        }
        if (!(0, exports.isWAV)(filepath)) {
            throw new Error("Only wav files are supported.");
        }
        const currentTime = Date.now();
        if (currentTime - lastPlayedTime < MIN_PLAY_INTERVAL) {
            return; // Skip playback within minimum interval to prevent continuous playback
        }
        const sound = require("sound-play");
        sound.play(filepath, volume).catch(() => {
            throw new Error("Failed to play sound effect");
        });
        lastPlayedTime = currentTime;
    }
    catch (error) {
        vscode.window.showErrorMessage(error.message);
    }
};
exports.playSound = playSound;
//# sourceMappingURL=sound.js.map