# Code Quality Guidelines

This document outlines the code quality guidelines for the Roo Code project.

## 1. Test Coverage

- Before attempting completion, always make sure that any code changes have test coverage
- Ensure all tests pass before submitting changes
- Aim for at least 80% code coverage for all new code
- Write tests for both success and error cases

## 2. Lint Rules

- Never disable any lint rules without explicit user approval
- If a lint rule needs to be disabled, ask the user first and explain why
- Prefer fixing the underlying issue over disabling the lint rule
- Document any approved lint rule disabling with a comment explaining the reason

## 3. Logging Guidelines

- Always instrument code changes using the logger exported from `src\utils\logging\index.ts`
  - This will facilitate efficient debugging without impacting production (as the logger no-ops outside of a test environment)
- Logs can be found in `logs\app.log`
  - Logfile is overwritten on each run to keep it to a manageable volume

## 4. Styling Guidelines

- Use Tailwind CSS classes instead of inline style objects for new markup
- VSCode CSS variables must be added to webview-ui/src/index.css before using them in Tailwind classes
- Example: `<div className="text-md text-vscode-descriptionForeground mb-2" />` instead of style objects

## 5. Documentation Guidelines

- Document all public APIs and functions
- Keep documentation up-to-date with code changes
- Follow the documentation structure outlined in the project
- Include examples where appropriate

## Related Documentation

- [Testing Guidelines](../../technical/testing/testing-overview.md)
- [Settings Configuration](../../technical/settings/settings.md)