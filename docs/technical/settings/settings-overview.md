# Settings Configuration Guide

This guide explains how to add and manage settings in Roo Code. Settings are persistent configurations that affect how the extension behaves.

## Table of Contents

1. [General Settings Process](#general-settings-process)
2. [Checkbox Settings](#checkbox-settings)
3. [Select/Dropdown Settings](#selectdropdown-settings)
4. [Best Practices](#best-practices)
5. [Troubleshooting](#troubleshooting)

## General Settings Process

### 1. Add Setting to ExtensionMessage.ts
```typescript
interface ExtensionState {
    preferredLanguage: string;  // Required if has default
    customTheme?: string;      // Optional if can be undefined
}
```

### 2. Add Test Coverage
- Add to mockState in ClineProvider.test.ts
- Add test cases for persistence
- Add state update tests
- Verify all tests pass

## Checkbox Settings

### 1. Update WebviewMessage.ts
```typescript
type WebviewMessage = 
    | "multisearchDiffEnabled"
    // ... other message types
```

### 2. Update ExtensionStateContext.tsx
```typescript
interface ExtensionStateContextType {
    multisearchDiffEnabled: boolean;
    setMultisearchDiffEnabled: (value: boolean) => void;
}
```

### 3. Update ClineProvider.ts
- Add to GlobalStateKey type union
- Add to getState Promise.all array
- Add default value in getState
- Add to getStateToPostToWebview
- Add message handler case

### 4. Add UI Component
```typescript
<VSCodeCheckbox
    checked={multisearchDiffEnabled}
    onChange={(e: any) => setMultisearchDiffEnabled(e.target.checked)}
>
    <span style={{ fontWeight: "500" }}>Enable multi-search diff matching</span>
</VSCodeCheckbox>
```

### 5. Update handleSubmit
```typescript
vscode.postMessage({ 
    type: "multisearchDiffEnabled", 
    bool: multisearchDiffEnabled 
});
```

## Select/Dropdown Settings

### 1. Update WebviewMessage.ts
```typescript
type WebviewMessage = 
    | "preferredLanguage"
    // ... other message types
```

### 2. Update ExtensionStateContext.tsx
```typescript
interface ExtensionStateContextType {
    preferredLanguage: string;
    setPreferredLanguage: (value: string) => void;
}
```

### 3. Update ClineProvider.ts
- Add to GlobalStateKey type union
- Add to getState Promise.all array
- Add default value in getState
- Add to getStateToPostToWebview
- Add message handler case

### 4. Add UI Component
```typescript
<select
    value={preferredLanguage}
    onChange={(e) => setPreferredLanguage(e.target.value)}
    style={{
        width: "100%",
        padding: "4px 8px",
        backgroundColor: "var(--vscode-input-background)",
        color: "var(--vscode-input-foreground)",
        border: "1px solid var(--vscode-input-border)",
        borderRadius: "2px"
    }}>
    <option value="English">English</option>
    <option value="Spanish">Spanish</option>
</select>
```

### 5. Update handleSubmit
```typescript
vscode.postMessage({ 
    type: "preferredLanguage", 
    text: preferredLanguage 
});
```

## Best Practices

1. **Type Safety**
   - Use proper TypeScript types
   - Avoid any where possible
   - Document type constraints

2. **State Management**
   - Initialize with sensible defaults
   - Handle undefined states
   - Validate state updates

3. **UI Components**
   - Follow VSCode theming
   - Maintain accessibility
   - Provide clear labels

4. **Testing**
   - Cover all state changes
   - Test edge cases
   - Verify persistence

## Troubleshooting

### Common Issues

1. **Settings Not Persisting**
   - Verify GlobalStateKey includes setting
   - Check updateGlobalState call
   - Verify storage implementation

2. **UI Not Updating**
   - Check state context setup
   - Verify message handling
   - Check component props

3. **Type Errors**
   - Verify interface definitions
   - Check message type unions
   - Validate state types

### Getting Help

If you encounter issues:
1. Check existing documentation
2. Review test cases
3. Open an issue on GitHub
4. Join our Discord community