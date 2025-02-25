"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckpointServiceFactory = void 0;
const LocalCheckpointService_1 = require("./LocalCheckpointService");
const ShadowCheckpointService_1 = require("./ShadowCheckpointService");
class CheckpointServiceFactory {
    static create(options) {
        switch (options.strategy) {
            case "local":
                return LocalCheckpointService_1.LocalCheckpointService.create(options.options);
            case "shadow":
                return ShadowCheckpointService_1.ShadowCheckpointService.create(options.options);
        }
    }
}
exports.CheckpointServiceFactory = CheckpointServiceFactory;
//# sourceMappingURL=CheckpointServiceFactory.js.map