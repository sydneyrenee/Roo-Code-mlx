# Fix for requestyDefaultModelInfo Issue

## Problem
The code is trying to use a non-existent export `requestyDefaultModelInfo`, but should be using `requestyModelInfoSaneDefaults` instead.

## Files to Update

1. webview-ui/src/context/ExtensionStateContext.tsx:
   - Change import from:
     ```typescript
     requestyDefaultModelInfo,
     ```
   - To:
     ```typescript
     requestyModelInfoSaneDefaults,
     ```
   - Update state initialization to use `requestyModelInfoSaneDefaults`

2. webview-ui/src/components/settings/ApiOptions.tsx:
   - Change import from:
     ```typescript
     requestyDefaultModelInfo,
     ```
   - To:
     ```typescript
     requestyModelInfoSaneDefaults,
     ```
   - Update the normalizeApiConfiguration function to use `requestyModelInfoSaneDefaults`

## Implementation Steps
1. Update imports in both files
2. Update usage locations
3. Test the changes by building the extension
4. Verify the settings UI works correctly for Requesty provider