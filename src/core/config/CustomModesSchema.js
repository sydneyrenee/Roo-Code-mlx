"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomModesSettingsSchema = exports.CustomModeSchema = void 0;
exports.validateCustomMode = validateCustomMode;
const zod_1 = require("zod");
const tool_groups_1 = require("../../shared/tool-groups");
// Create a schema for valid tool groups using the keys of TOOL_GROUPS
const ToolGroupSchema = zod_1.z.enum(Object.keys(tool_groups_1.TOOL_GROUPS));
// Schema for group options with regex validation
const GroupOptionsSchema = zod_1.z.object({
    fileRegex: zod_1.z
        .string()
        .optional()
        .refine((pattern) => {
        if (!pattern)
            return true; // Optional, so empty is valid
        try {
            new RegExp(pattern);
            return true;
        }
        catch {
            return false;
        }
    }, { message: "Invalid regular expression pattern" }),
    description: zod_1.z.string().optional(),
});
// Schema for a group entry - either a tool group string or a tuple of [group, options]
const GroupEntrySchema = zod_1.z.union([ToolGroupSchema, zod_1.z.tuple([ToolGroupSchema, GroupOptionsSchema])]);
// Schema for array of groups
const GroupsArraySchema = zod_1.z.array(GroupEntrySchema).refine((groups) => {
    const seen = new Set();
    return groups.every((group) => {
        // For tuples, check the group name (first element)
        const groupName = Array.isArray(group) ? group[0] : group;
        if (seen.has(groupName))
            return false;
        seen.add(groupName);
        return true;
    });
}, { message: "Duplicate groups are not allowed" });
// Schema for mode configuration
exports.CustomModeSchema = zod_1.z.object({
    slug: zod_1.z.string().regex(/^[a-zA-Z0-9-]+$/, "Slug must contain only letters numbers and dashes"),
    name: zod_1.z.string().min(1, "Name is required"),
    roleDefinition: zod_1.z.string().min(1, "Role definition is required"),
    customInstructions: zod_1.z.string().optional(),
    groups: GroupsArraySchema,
});
// Schema for the entire custom modes settings file
exports.CustomModesSettingsSchema = zod_1.z.object({
    customModes: zod_1.z.array(exports.CustomModeSchema).refine((modes) => {
        const slugs = new Set();
        return modes.every((mode) => {
            if (slugs.has(mode.slug)) {
                return false;
            }
            slugs.add(mode.slug);
            return true;
        });
    }, {
        message: "Duplicate mode slugs are not allowed",
    }),
});
/**
 * Validates a custom mode configuration against the schema
 * @throws {z.ZodError} if validation fails
 */
function validateCustomMode(mode) {
    exports.CustomModeSchema.parse(mode);
}
//# sourceMappingURL=CustomModesSchema.js.map