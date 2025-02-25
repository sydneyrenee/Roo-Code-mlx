"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkoutRestorePayloadSchema = exports.checkoutDiffPayloadSchema = void 0;
const zod_1 = require("zod");
exports.checkoutDiffPayloadSchema = zod_1.z.object({
    ts: zod_1.z.number(),
    commitHash: zod_1.z.string(),
    mode: zod_1.z.enum(["full", "checkpoint"]),
});
exports.checkoutRestorePayloadSchema = zod_1.z.object({
    ts: zod_1.z.number(),
    commitHash: zod_1.z.string(),
    mode: zod_1.z.enum(["preview", "restore"]),
});
//# sourceMappingURL=WebviewMessage.js.map