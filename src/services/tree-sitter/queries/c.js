"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*
- struct declarations
- union declarations
- function declarations
- typedef declarations
*/
exports.default = `
(struct_specifier name: (type_identifier) @name.definition.class body:(_)) @definition.class

(declaration type: (union_specifier name: (type_identifier) @name.definition.class)) @definition.class

(function_declarator declarator: (identifier) @name.definition.function) @definition.function

(type_definition declarator: (type_identifier) @name.definition.type) @definition.type
`;
//# sourceMappingURL=c.js.map