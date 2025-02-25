"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchReplaceDiffStrategy = exports.UnifiedDiffStrategy = void 0;
exports.getDiffStrategy = getDiffStrategy;
const unified_1 = require("./strategies/unified");
Object.defineProperty(exports, "UnifiedDiffStrategy", { enumerable: true, get: function () { return unified_1.UnifiedDiffStrategy; } });
const search_replace_1 = require("./strategies/search-replace");
Object.defineProperty(exports, "SearchReplaceDiffStrategy", { enumerable: true, get: function () { return search_replace_1.SearchReplaceDiffStrategy; } });
const new_unified_1 = require("./strategies/new-unified");
/**
 * Get the appropriate diff strategy for the given model
 * @param model The name of the model being used (e.g., 'gpt-4', 'claude-3-opus')
 * @returns The appropriate diff strategy for the model
 */
function getDiffStrategy(model, fuzzyMatchThreshold, experimentalDiffStrategy = false) {
    if (experimentalDiffStrategy) {
        return new new_unified_1.NewUnifiedDiffStrategy(fuzzyMatchThreshold);
    }
    return new search_replace_1.SearchReplaceDiffStrategy(fuzzyMatchThreshold);
}
//# sourceMappingURL=DiffStrategy.js.map