"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.experimentDescriptions = exports.experimentLabels = exports.experiments = exports.experimentDefault = exports.experimentConfigsMap = exports.EXPERIMENT_IDS = void 0;
exports.EXPERIMENT_IDS = {
    DIFF_STRATEGY: "experimentalDiffStrategy",
    SEARCH_AND_REPLACE: "search_and_replace",
    INSERT_BLOCK: "insert_content",
};
exports.experimentConfigsMap = {
    DIFF_STRATEGY: {
        name: "Use experimental unified diff strategy",
        description: "Enable the experimental unified diff strategy. This strategy might reduce the number of retries caused by model errors but may cause unexpected behavior or incorrect edits. Only enable if you understand the risks and are willing to carefully review all changes.",
        enabled: false,
    },
    SEARCH_AND_REPLACE: {
        name: "Use experimental search and replace tool",
        description: "Enable the experimental search and replace tool, allowing Roo to replace multiple instances of a search term in one request.",
        enabled: false,
    },
    INSERT_BLOCK: {
        name: "Use experimental insert content tool",
        description: "Enable the experimental insert content tool, allowing Roo to insert content at specific line numbers without needing to create a diff.",
        enabled: false,
    },
};
exports.experimentDefault = Object.fromEntries(Object.entries(exports.experimentConfigsMap).map(([_, config]) => [
    exports.EXPERIMENT_IDS[_],
    config.enabled,
]));
exports.experiments = {
    get: (id) => {
        return exports.experimentConfigsMap[id];
    },
    isEnabled: (experimentsConfig, id) => {
        return experimentsConfig[id] ?? exports.experimentDefault[id];
    },
};
// Expose experiment details for UI - pre-compute from map for better performance
exports.experimentLabels = Object.fromEntries(Object.entries(exports.experimentConfigsMap).map(([_, config]) => [
    exports.EXPERIMENT_IDS[_],
    config.name,
]));
exports.experimentDescriptions = Object.fromEntries(Object.entries(exports.experimentConfigsMap).map(([_, config]) => [
    exports.EXPERIMENT_IDS[_],
    config.description,
]));
//# sourceMappingURL=experiments.js.map