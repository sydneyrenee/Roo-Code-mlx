# Build and Test Plan for Roo Code VSCode Extension

## 1. Setup and Installation

1. Install all dependencies for both the extension and webview:
```bash
npm run install:all
```

## 2. Building the Extension

1. Build the webview UI and create the VSIX package:
```bash
npm run build
```

This command will:
- Build the React-based webview UI (`npm run build:webview`)
- Create a VSIX package in the `bin` directory (`npm run vsix`)

## 3. Testing

1. Run all tests (both extension and webview):
```bash
npm run test
```

This includes:
- Jest tests for the extension
- Tests for the webview UI

2. Run integration tests:
```bash
npm run test:integration
```

## 4. Loading into VSCode

1. Install the VSIX package:
   - Open VSCode
   - Press Ctrl+Shift+P (Cmd+Shift+P on macOS)
   - Type "Install from VSIX"
   - Select the VSIX file from the `bin` directory

2. Manual Testing:
   - Verify the Roo Code icon appears in the activity bar
   - Test core functionality:
     - New Task button
     - MCP Servers button
     - Prompts button
     - History button
     - Settings button
     - Documentation button
   - Test context menu commands:
     - Explain Code
     - Fix Code
     - Improve Code
     - Add To Context
   - Test terminal integration:
     - Add Terminal Content to Context
     - Fix Command
     - Explain Command

## 5. Development Workflow

For active development:
1. Start the development server for the webview:
```bash
npm run dev
```

2. Watch for changes in the extension:
```bash
npm run watch
```

This will:
- Watch TypeScript files for changes
- Automatically rebuild on changes
- Enable hot reloading of the webview UI

## 6. Troubleshooting

If you encounter issues:
1. Check the VSCode Developer Tools (Help > Toggle Developer Tools)
2. Review the extension logs in the Output panel (View > Output, select "Roo Code")
3. Verify all dependencies are installed correctly
4. Ensure you're using the correct Node.js version (check .nvmrc)