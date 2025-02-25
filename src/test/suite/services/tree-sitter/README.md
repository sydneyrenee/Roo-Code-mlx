# Tree-sitter Service Tests

This directory contains tests for the Tree-sitter parsing service, which is responsible for parsing source code and extracting definitions.

## Test Files

- `index.test.ts`: Tests for the main Tree-sitter service functionality
- `languageParser.test.ts`: Tests for language-specific parser loading and configuration

## Test Organization

### Index Tests
Tests for `parseSourceCodeForDefinitionsTopLevel`:
- Directory handling (non-existent, empty)
- File parsing for various languages
- Definition extraction
- Path normalization
- File limit handling
- Error handling

### Language Parser Tests
Tests for `loadRequiredLanguageParsers`:
- Parser initialization
- Language-specific parser loading
  - JavaScript/TypeScript
  - Python
  - Rust
  - Go
  - C/C++
- Error handling for unsupported languages
- Parser caching and reuse

## Test Setup

Both test suites use mocking extensively:
- `web-tree-sitter` is mocked to avoid actual WASM loading
- File system operations are mocked
- Language queries are mocked

### Common Mocks
```typescript
// Mock web-tree-sitter
const mockSetLanguage = jest.fn()
jest.mock("web-tree-sitter", () => ({
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
        setLanguage: mockSetLanguage,
    })),
}))
```

## Running Tests

Run all tree-sitter tests:
```bash
npx jest src/test/suite/services/tree-sitter --verbose
```

Run specific test file:
```bash
npx jest src/test/suite/services/tree-sitter/index.test.ts --verbose
```

## Test Coverage

The test suite covers:
- ✓ Parser initialization and caching
- ✓ Language-specific parser loading
- ✓ Source code parsing
- ✓ Definition extraction
- ✓ Error handling
- ✓ File system interactions
- ✓ Path normalization
- ✓ Performance considerations (file limits)

## Notes

- Tests use Jest's fake timers where needed
- File system operations are mocked to ensure test reliability
- WASM loading is mocked to avoid actual binary loading during tests
- Each test is isolated with proper cleanup in afterEach blocks