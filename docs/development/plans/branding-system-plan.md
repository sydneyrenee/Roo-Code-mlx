# Branding System Plan

## 1. Configuration File Structure (branding.json)

```json
{
  "extension": {
    "name": "roo-cline",
    "displayName": "Roo Code",
    "description": "An AI-powered autonomous coding agent that lives in your editor.",
    "version": "3.3.20",
    "publisher": "RooVeterinaryInc",
    "author": {
      "name": "Roo Vet"
    }
  },
  "repository": {
    "url": "https://github.com/RooVetGit/Roo-Code",
    "homepage": "https://github.com/RooVetGit/Roo-Code"
  },
  "branding": {
    "commandPrefix": "Roo Code",
    "activityBarTitle": "Roo Code",
    "colors": {
      "galleryBanner": "#617A91",
      "theme": "dark"
    },
    "icons": {
      "extension": "assets/icons/rocket.png",
      "activityBar": "$(rocket)"
    }
  },
  "keywords": [
    "cline",
    "claude",
    "dev",
    "mcp",
    "openrouter",
    "coding",
    "agent",
    "autonomous",
    "chatgpt",
    "sonnet",
    "ai",
    "llama"
  ]
}
```

## 2. Template File (branding.json.template)

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

## 3. Build System Updates

1. Create a build script that:
   - Reads branding.json
   - Updates package.json with branding values
   - Updates relevant source files with branding strings
   - Validates all branding changes

2. Files to update during build:
   - package.json
   - README.md (with template variables)
   - Source files containing branding strings
   - Configuration property names
   - Command names and categories

## 4. Implementation Steps

1. Create Configuration System:
   - Create branding.json with default values
   - Add branding.json.template as an example
   - Add branding.json to .gitignore

2. Create Build Tools:
   - Create update-branding.js script
   - Add npm script: "update-branding"
   - Add validation for branding values

3. Update Source Files:
   - Add template variables to README.md
   - Extract hardcoded branding strings to constants
   - Update command registration to use branding prefix

4. Documentation:
   - Add BRANDING.md explaining the system
   - Update CONTRIBUTING.md with branding guidelines
   - Add examples of customization

## 5. Usage Instructions

1. Fork the repository
2. Copy branding.json.template to branding.json
3. Update branding.json with your values
4. Run `npm run update-branding`
5. Build the extension

## 6. Validation Rules

1. Required Fields:
   - All extension fields
   - Basic branding colors and icons
   - At least one keyword

2. Format Validation:
   - Valid semver for version
   - Valid URLs for repository
   - Valid color codes
   - Valid icon paths

## 7. Safety Features

1. Backup System:
   - Backup original files before modification
   - Restore on build failure
   - Version control for branding changes

2. Error Handling:
   - Validate all inputs
   - Clear error messages
   - Rollback on failure

## 8. Implementation Order

1. Create initial files:
   - branding.json.template
   - branding.js (build script)
   - BRANDING.md (documentation)

2. Update build system:
   - Add update-branding npm script
   - Integrate with existing build process
   - Add validation and error handling

3. Update source code:
   - Extract branding strings to constants
   - Update command registration
   - Add template variables to documentation

4. Test and verify:
   - Test with different configurations
   - Verify all branding elements update correctly
   - Check error handling and recovery

## Next Steps

1. Switch to Code mode to implement:
   - Create branding.json.template
   - Create update-branding.js script
   - Update package.json with new build scripts
   - Create BRANDING.md documentation