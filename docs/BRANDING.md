# Branding System Documentation

This document explains how to use and customize the branding system for this extension.

## Core Principles

1. **No Destructive Search-and-Replace**: The branding system NEVER uses search-and-replace operations on existing code files. Such operations can be destructive and unpredictable.

2. **Configuration-Driven**: All branding elements are defined in a central configuration file (`branding.json`) and accessed through the branding module.

3. **Code-First Approach**: Code should reference branding elements through the `branding.ts` module's accessor functions, not hardcoded strings.

4. **Template-Based Generation**: For files that need branding elements (README, etc.), use template files with placeholders that are processed during build.

5. **Git Safety**: All branding operations maintain git history and provide safety mechanisms.

## Setup Instructions

1. Copy `branding.json.template` to `branding.json`:
   ```bash
   cp branding.json.template branding.json
   ```

2. Edit `branding.json` with your custom branding values:
   ```json
   {
     "extension": {
       "name": "my-extension-name",
       "displayName": "My Extension",
       "description": "A brief description of your extension",
       "version": "1.0.0",
       "publisher": "YourPublisherName",
       "author": {
         "name": "Your Name"
       }
     },
     "repository": {
       "url": "https://github.com/yourusername/your-repo",
       "homepage": "https://github.com/yourusername/your-repo"
     },
     "branding": {
       "commandPrefix": "My Extension",
       "activityBarTitle": "My Extension",
       "colors": {
         "galleryBanner": "#4A90E2",
         "theme": "dark"
       },
       "icons": {
         "extension": "assets/icons/your-icon.png",
         "activityBar": "$(star)"
       }
     },
     "keywords": [
       "ai",
       "coding",
       "agent",
       "autonomous",
       "your-keyword"
     ]
   }
   ```

3. Run the template processing script:
   ```bash
   npm run update-branding
   ```

## Using Branding in Code

Instead of hardcoding branding values in your code, use the accessor functions from `src/core/branding.ts`:

```typescript
import { 
  displayName, 
  extensionId, 
  commandPrefix, 
  prefixCommand 
} from '../core/branding';

// Instead of:
// const EXTENSION_ID = 'RooVeterinaryInc.roo-cline';
// Use:
const EXTENSION_ID = extensionId();

// Instead of:
// const DISPLAY_NAME = 'Roo Code';
// Use:
const DISPLAY_NAME = displayName();

// Instead of:
// const COMMAND_ID = 'roo-cline.start';
// Use:
const COMMAND_ID = prefixCommand('start');
```

## Available Accessor Functions

The `src/core/branding.ts` module provides the following accessor functions:

- `extensionId()`: Returns the full extension ID (publisher.name)
- `displayName()`: Returns the display name of the extension
- `extensionName()`: Returns the extension name (used in package.json)
- `description()`: Returns the extension description
- `version()`: Returns the extension version
- `publisher()`: Returns the extension publisher
- `commandPrefix()`: Returns the command prefix used for all commands
- `prefixCommand(command)`: Creates a prefixed command ID
- `repositoryUrl()`: Returns the repository URL
- `homepageUrl()`: Returns the homepage URL
- `activityBarTitle()`: Returns the activity bar title
- `activityBarIcon()`: Returns the activity bar icon
- `extensionIcon()`: Returns the extension icon path
- `galleryBannerColor()`: Returns the gallery banner color
- `galleryBannerTheme()`: Returns the gallery banner theme
- `keywords()`: Returns the keywords array

## Template System

The template system uses handlebars-style placeholders to generate files from templates:

1. Simple placeholders: `{{extension.displayName}}`
2. Array iteration: 
   ```
   {{#each keywords}}
   "{{this}}"{{#unless @last}},{{/unless}}
   {{/each}}
   ```

Template files are stored in the `templates/` directory with a `.template` extension.

## Adding New Templates

To add a new template:

1. Create a template file in the `templates/` directory with a `.template` extension
2. Add the template mapping to the `templates` array in `scripts/process-templates.js`

## Build Integration

The branding system is integrated with the build process:

1. `npm run update-branding`: Processes all templates and updates files
2. `npm run build`: Automatically runs `update-branding` before building

## Safety Features

The branding system includes several safety features:

1. Git integration: Stashes uncommitted changes before processing templates
2. Validation: Validates branding configuration before processing
3. Error handling: Provides clear error messages and rollback on failure