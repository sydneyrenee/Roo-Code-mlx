# Branding System

This extension uses a flexible branding system that allows for easy customization of all branding elements.

## Overview

The branding system uses a central configuration file (`branding.json`) that defines all branding elements:
- Extension metadata (name, display name, description, etc.)
- Repository information
- UI elements (command prefix, activity bar title, colors, icons)
- Keywords for the VS Code marketplace

## Getting Started

1. Copy `branding.json.template` to `branding.json`
2. Update the values in `branding.json` with your own branding
3. Run `npm run update-branding` to apply your branding

## Build Integration

The branding system is integrated with the build process:
- The `update-branding` script runs automatically before building
- It updates `package.json` and other files with your branding values
- The VSIX package will include your custom branding

## Customization Options

### Extension Information
- `extension.name`: The extension ID (e.g., "my-extension")
- `extension.displayName`: The display name shown in VS Code
- `extension.description`: A brief description of your extension
- `extension.version`: The semantic version number
- `extension.publisher`: Your publisher ID
- `extension.author.name`: Your name or organization

### Repository Information
- `repository.url`: The Git repository URL
- `repository.homepage`: The homepage URL

### Branding Elements
- `branding.commandPrefix`: Prefix for all commands
- `branding.activityBarTitle`: Title in the activity bar
- `branding.colors.galleryBanner`: Color for the marketplace banner
- `branding.colors.theme`: Theme ("dark" or "light")
- `branding.icons.extension`: Path to the extension icon
- `branding.icons.activityBar`: Icon for the activity bar (codicon or path)

### Keywords
- `keywords`: Array of keywords for the marketplace

## Implementation Details

### Runtime Configuration

The branding system uses a runtime configuration module (`src/core/branding.ts`) that:
- Loads the branding configuration at extension activation
- Provides typed access to all branding properties
- Falls back to defaults if properties are missing

### Constants

A constants module (`src/core/constants.ts`) provides easy access to branding values:

```typescript
import { displayName, commandPrefix } from './core/constants';

// Use in code
console.log(`Using ${displayName()}`);
const commandTitle = `${commandPrefix()}: My Command`;
```

### Build Process

The build process includes:
1. Reading `branding.json`
2. Validating all branding values
3. Updating `package.json` with branding values
4. Creating a backup of modified files
5. Restoring backups on failure

## White-Labeling

To create a white-labeled version of this extension:

1. Fork the repository
2. Copy `branding.json.template` to `branding.json`
3. Update `branding.json` with your branding
4. Run `npm run update-branding`
5. Build the extension with `npm run build`

The resulting VSIX file will contain your custom branding.