# Build Process Documentation

This document provides an overview of the build process, npm commands, and related configuration files for the Roo Code project.

## Build Process Overview

The Roo Code extension uses a two-step build process:
1. TypeScript compilation (tsc) - Compiles TypeScript files to JavaScript
2. Bundling (esbuild) - Bundles the compiled JavaScript files into a single file

## Directory Structure

- `src/` - Source code
- `out/` - Output directory for TypeScript compilation
- `dist/` - Output directory for bundled extension
- `bin/` - Output directory for packaged VSIX files

## Configuration Files

| File | Purpose |
|------|---------|
| `tsconfig.json` | TypeScript compiler configuration for main extension |
| `tsconfig.integration.json` | TypeScript compiler configuration for integration tests |
| `esbuild.js` | esbuild configuration for bundling |
| `.vscode-test.json` | Test configuration for VS Code Test CLI |
| `.eslintrc.json` | ESLint configuration |
| `.prettierrc.json` | Prettier configuration |
| `.vscodeignore` | Files to exclude from the extension package |

## NPM Commands

### Build Commands

| Command | Description | Files/Folders |
|---------|-------------|---------------|
| `npm run compile` | Compiles TypeScript and bundles with esbuild | Outputs to `out/` and `dist/` |
| `npm run compile:tsc` | Compiles TypeScript only | Outputs to `out/` |
| `npm run watch` | Watches for changes and compiles TypeScript | Outputs to `out/` |
| `npm run build` | Full build process including VSIX packaging | Outputs to `out/`, `dist/`, and `bin/` |
| `npm run vsix` | Packages the extension as a VSIX file | Outputs to `bin/` |
| `npm run vscode:prepublish` | Prepublish script for VS Code Marketplace | Runs `compile` |
| `npm run lint` | Runs ESLint on source files | Checks `src/` |

### Test Commands

For detailed information about testing, please refer to the [Testing Guide](../TESTING.md) and [Testing Overview](testing/testing-overview.md).

| Command | Description | Reference |
|---------|-------------|-----------|
| `npm test` | Runs all tests | [Testing Guide](../TESTING.md#running-tests) |
| `npm run test:vscode` | Runs VS Code extension tests | [VS Code Test Runner Guide](testing/vscode-test-runner.md) |
| `npm run pretest` | Compiles tests and runs linting | [Testing Guide](../TESTING.md) |
| `npm run test:find-unregistered` | Finds unregistered tests | [Testing Guide](../TESTING.md) |
| `npm run test:generate-migration` | Generates test migration | [Testing Guide](../TESTING.md) |
| `npm run test:run` | Runs tests with custom runner | [Testing Guide](../TESTING.md) |
| `npm run test:run:verbose` | Runs tests with verbose output | [Testing Guide](../TESTING.md) |
| `npm run test:update-status` | Updates migration status | [Testing Guide](../TESTING.md) |

## Build Configuration Details

### TypeScript Configuration (tsconfig.json)

The main TypeScript configuration includes:
- Target: ES2022
- Module: CommonJS
- Source maps enabled for development
- Strict type checking
- Output directory: `out/`

### esbuild Configuration (esbuild.js)

The esbuild configuration:
- Bundles the extension into a single file
- Excludes test files from the bundle
- Copies necessary WASM files for tree-sitter
- Provides source maps in development mode
- Minifies in production mode
- Output file: `dist/extension.js`

### VS Code Extension Packaging

The extension is packaged using:
- `.vscodeignore` - Excludes development files from the package
- `vsce package` - Creates a VSIX file for distribution
- Output directory: `bin/`

#### .vscodeignore Configuration

The `.vscodeignore` file specifies which files and directories should be excluded from the VSIX package. This is important to keep the package size small and exclude files that are not needed for the extension to run.

Files and directories that should be excluded include:
- Development files (`.github`, `.husky`, `.vscode`, etc.)
- Source files (`src/**`, except for specific included files)
- Test files and directories (`out-integration/**`, `test-results/**`, `coverage/**`)
- Configuration files not needed at runtime (`.gitignore`, `.prettierrc.json`, etc.)
- Temporary and log files (`output.txt`, `test-output.log`, etc.)
- Nix configuration files (`flake.lock`, `flake.nix`)

Files that should be included:
- Compiled and bundled extension code (`dist/extension.js`)
- Assets needed at runtime (`assets/icons/**`)
- Required dependencies (specified with `!` prefix)

To check what files will be included in the VSIX package:
```bash
npx vsce ls --tree
```

## Environment Setup

### Development Environment

1. Node.js LTS version (see `.nvmrc`)
2. VS Code (v1.85.0 or higher)
3. Required extensions (see `.vscode/extensions.json`):
   - ESLint
   - esbuild Problem Matchers
   - Extension Test Runner

### Build Process Flow

1. TypeScript compilation:
   ```
   tsc -p . --outDir out
   ```

2. Bundle with esbuild:
   ```
   node esbuild.js
   ```

3. Package as VSIX:
   ```
   vsce package --out bin
   ```

## Recommended Workflow

1. Development:
   ```
   npm run watch
   ```

2. Testing:
   ```
   npm test
   ```

3. Building for distribution:
   ```
   npm run build
   ```

## Troubleshooting

### VSIX Package Size Issues

If the VSIX package is too large or includes files that shouldn't be there:

1. Check the `.vscodeignore` file to ensure all unnecessary files are excluded
2. Use `npx vsce ls --tree` to see what files will be included in the package
3. Add additional exclusions to `.vscodeignore` as needed
4. Rebuild the VSIX package with `npm run vsix`

### Common Issues

- **Large VSIX file size**: Usually caused by missing exclusions in `.vscodeignore`
- **Missing assets in the package**: Check for proper inclusion patterns (using `!` prefix)
- **Build errors**: Check the TypeScript and esbuild configurations

## Additional Resources

- [VS Code Extension Development](https://code.visualstudio.com/api)
- [esbuild Documentation](https://esbuild.github.io/)
- [VS Code Extension Packaging](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [vsce Documentation](https://github.com/microsoft/vscode-vsce)