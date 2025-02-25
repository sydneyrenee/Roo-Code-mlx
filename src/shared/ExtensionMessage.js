"use strict";
// type that represents json data that is sent from extension to webview, called ExtensionMessage and has 'type' enum which can be 'plusButtonClicked' or 'settingsButtonClicked' or 'hello'
Object.defineProperty(exports, "__esModule", { value: true });
exports.browserActions = void 0;
// must keep in sync with system prompt
exports.browserActions = ["launch", "click", "type", "scroll_down", "scroll_up", "close"];
//# sourceMappingURL=ExtensionMessage.js.map