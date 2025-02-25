# Test Workspace

This workspace is used for running VSCode extension integration tests. It provides a controlled environment with predefined settings and configurations to ensure consistent test execution.

## Structure

- `settings.json`: Contains default VSCode settings for testing
- Other test files will be created and cleaned up during test execution

## Usage

This workspace is automatically used when running extension tests via:

```bash
npm test
```

The test runner will:
1. Load this workspace
2. Apply the settings
3. Run the integration tests
4. Clean up any test artifacts

## Settings

The workspace comes with predefined settings for the Roo Code extension:
- Empty allowed commands list
- Sound disabled by default
- Diff enabled
- MCP enabled
- Standard write delay and terminal output limits

These settings provide a known starting state for testing configuration changes and feature interactions.