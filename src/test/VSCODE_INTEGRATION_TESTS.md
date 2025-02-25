# VSCode Integration Tests

This document describes the integration test setup for the Roo Code VSCode extension.

## Overview

The integration tests use the `@vscode/test-electron` package to run tests in a real VSCode environment. These tests verify that the extension works correctly within VSCode, including features like mode switching, webview interactions, and API communication.

## Test Setup

### Directory Structure

```
src/test/
├── runTest.ts           # Main test runner
├── suite/
│   ├── index.ts        # Test suite configuration
│   ├── modes.test.ts   # Mode switching tests
│   ├── tasks.test.ts   # Task execution tests
│   └── extension.test.ts # Extension activation tests
```

### Test Runner Configuration

The test runner (`runTest.ts`) is responsible for:

- Setting up the extension development path
- Configuring the test environment
- Running the integration tests using `@vscode/test-electron`

### Environment Setup

1. Create a `.env.integration` file in the root directory with required environment variables:

```
OPENROUTER_API_KEY=sk-or-v1-...
```

2. The test suite (`suite/index.ts`) configures:

- Mocha test framework with TDD interface
- 10-minute timeout for LLM communication
- Global extension API access
- WebView panel setup
- OpenRouter API configuration

## Test Suite Structure

Tests are organized using Mocha's TDD interface (`suite` and `test` functions). The main test files are:

- `modes.test.ts`: Tests mode switching functionality
- `tasks.test.ts`: Tests task execution
- `extension.test.ts`: Tests extension activation

### Global Objects

The following global objects are available in tests:

```typescript
declare global {
    var api: ClineAPI
    var provider: ClineProvider
    var extension: vscode.Extension<ClineAPI>
    var panel: vscode.WebviewPanel
}
```

## Running Tests

1. Ensure you have the required environment variables set in `.env.integration`

2. Run the integration tests:

```bash
npm run test:integration
```

3. Run specific test files:

```bash
# Run a specific test file
npm run test:integration -- --testFile=extension.test.ts

# Run tests matching a pattern
npm run test:integration -- --testFile="**/modes*.test.ts"
```

The tests will:

- Download and launch a clean VSCode instance
- Install the extension
- Execute the test suite
- Report results

## Writing New Tests

When writing new integration tests:

1. Create a new test file in `src/test/suite/` with the `.test.ts` extension

2. Structure your tests using the TDD interface:

```typescript
import * as assert from "assert"
import * as vscode from "vscode"

suite("Your Test Suite Name", () => {
    test("Should do something specific", async function () {
        // Your test code here
    })
})
```

3. Use the global objects (`api`, `provider`, `extension`, `panel`) to interact with the extension

### Best Practices

1. **Timeouts**: Use appropriate timeouts for async operations:

```typescript
const timeout = 30000
const interval = 1000
```

2. **State Management**: Reset extension state before/after tests:

```typescript
await globalThis.provider.updateGlobalState("mode", "Ask")
await globalThis.provider.updateGlobalState("alwaysAllowModeSwitch", true)
```

3. **Assertions**: Use clear assertions with meaningful messages:

```typescript
assert.ok(condition, "Descriptive message about what failed")
```

4. **Error Handling**: Wrap test code in try/catch blocks and clean up resources:

```typescript
try {
    // Test code
} finally {
    // Cleanup code
}
```

5. **Wait for Operations**: Use polling when waiting for async operations:

```typescript
let startTime = Date.now()
while (Date.now() - startTime < timeout) {
    if (condition) break
    await new Promise((resolve) => setTimeout(resolve, interval))
}
```

6. **Grading**: When grading tests, use the `Grade:` format:

```typescript
await globalThis.api.startNewTask(
    `Given this prompt: ${testPrompt} grade the response from 1 to 10 in the format of "Grade: (1-10)": ${output} \n Be sure to say 'I AM DONE GRADING' after the task is complete`,
)
```

## Common Test Patterns

### 1. Testing Command Registration

```typescript
test("Commands should be registered", async () => {
    const commands = await vscode.commands.getCommands()
    const expectedCommands = [
        "roo-cline.plusButtonClicked",
        "roo-cline.mcpButtonClicked",
        // ... other commands
    ]
    
    for (const cmd of expectedCommands) {
        assert.ok(commands.includes(cmd), `Command ${cmd} should be registered`)
    }
})
```

### 2. Testing Mode Switching

```typescript
test("Should switch modes correctly", async () => {
    await globalThis.api.switchMode("code")
    const currentMode = await globalThis.provider.getGlobalState("mode")
    assert.strictEqual(currentMode, "code", "Mode should be set to code")
})
```

### 3. Testing WebView Interactions

```typescript
test("Should handle webview messages", async () => {
    const message = { type: "testMessage", data: {} }
    await globalThis.provider.postMessageToWebview(message)
    // Assert expected behavior
})
```

## CI/CD Integration

### GitHub Actions Configuration

The integration tests are run in CI using GitHub Actions:

```yaml
name: Integration Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
      - name: Install dependencies
        run: npm ci
      - name: Run integration tests
        run: xvfb-run -a npm run test:integration
        env:
          OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
```

### Test Reports

Integration test results are:
- Published as GitHub Actions artifacts
- Available in the Actions tab
- Included in PR status checks

## Troubleshooting

### Common Issues

1. **Test Timeouts**
   - Increase timeout in test file
   - Check for hanging async operations
   - Verify API key configuration

2. **WebView Issues**
   - Ensure panel is initialized
   - Check message passing
   - Verify state management

3. **Environment Setup**
   - Verify .env.integration file
   - Check API key format
   - Confirm VSCode version

### Debug Mode

Run tests in debug mode:
```bash
npm run test:integration:debug
```

Then:
1. Open VSCode Debug view
2. Select "Attach to Integration Tests"
3. Set breakpoints and debug

## Relationship to Jest Tests

While integration tests verify the extension in VSCode, unit tests (using Jest) verify individual components:

- Integration tests: `src/test/suite/*.test.ts`
- Unit tests: `src/**/__tests__/*.test.ts`

Choose the appropriate test type:
- Use integration tests for VSCode-specific functionality
- Use Jest tests for isolated component testing
- Consider both for critical features

See [Jest Test Documentation](../jest-tests.md) for unit testing details.
