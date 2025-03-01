import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
    try {
        // The folder containing the Extension Manifest package.json
        const extensionDevelopmentPath = path.resolve(__dirname, '../../');
        
        // The path to the extension test script
        const extensionTestsPath = path.resolve(__dirname, './registerTests');
        
        // The path to test workspace
        const testWorkspacePath = path.resolve(__dirname, './workspace');
        
        // Run the integration tests
        const result = await runTests({
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs: [
                testWorkspacePath,
                '--disable-extensions', // Disable other extensions
                '--disable-workspace-trust', // Disable workspace trust dialog
                '--verbose' // Enable verbose logging
            ],
            extensionTestsEnv: {
                NODE_ENV: 'development' // Enable test registration
            }
        });

        process.exit(result);
    } catch (err) {
        console.error('Failed to run tests');
        if (err instanceof Error) {
            console.error('Error:', err.message);
            console.error('Stack:', err.stack);
        } else {
            console.error('Unknown error:', err);
        }
        process.exit(1);
    }
}

main();
