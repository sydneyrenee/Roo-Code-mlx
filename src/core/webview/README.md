# ClineProvider Modular Structure

This directory contains the modular implementation of the ClineProvider, which has been broken down into smaller, more manageable components.

## Files Structure

- `ClineProviderTypes.ts`: Contains type definitions and constants used throughout the ClineProvider
- `ClineProviderState.ts`: Manages global state, workspace state, and secrets
- `ClineProviderModels.ts`: Handles different model providers (Ollama, OpenAI, etc.)
- `ClineProviderTasks.ts`: Manages task-related operations (creating, clearing, exporting, etc.)
- `ClineProviderHtml.ts`: Generates HTML content for the webview
- `ClineProviderMcp.ts`: Handles Model Context Protocol (MCP) related functionality

## Main Files

- `ClineProvider.ts`: The main provider class that orchestrates all the modules
- `ClineProvider.temp.ts`: The refactored version that uses all the modules
- `getNonce.ts`: Utility for generating cryptographic nonces
- `getUri.ts`: Utility for generating URIs for webview resources

## Updating the Provider

To replace the original ClineProvider.ts with the modular version:

1. Run the update script:
   ```bash
   ./update-provider.sh
   ```

2. This will:
   - Create a backup of the original file as `ClineProvider.ts.bak`
   - Replace the original with the modular version from `ClineProvider.temp.ts`

## Module Responsibilities

### ClineProviderTypes

Defines all the types and constants used throughout the ClineProvider, including:
- `SecretKey`: Keys for storing secrets
- `GlobalStateKey`: Keys for storing global state
- `GlobalFileNames`: File names for storing data
- `TaskData`: Data structure for tasks
- `StateData`: Data structure for state

### ClineProviderState

Manages state-related operations, including:
- Global state management
- Workspace state management
- Secret storage
- State retrieval and updates
- Task history management

### ClineProviderModels

Handles model provider operations, including:
- Ollama models
- LM Studio models
- VSCode LM models
- OpenAI models
- Requesty models
- OpenRouter models
- Glama models
- Unbound models

### ClineProviderTasks

Manages task-related operations, including:
- Getting tasks by ID
- Showing tasks
- Exporting tasks
- Deleting tasks

### ClineProviderHtml

Generates HTML content for the webview, including:
- Development mode with Hot Module Replacement (HMR)
- Production mode

### ClineProviderMcp

Handles Model Context Protocol (MCP) related functionality, including:
- MCP servers directory management
- Settings directory management
- Server configuration
- Tool configuration