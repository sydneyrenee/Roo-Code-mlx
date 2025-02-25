import * as path from 'path';
import Mocha = require('mocha');
import * as glob from 'glob';

export async function run(): Promise<void> {
    // Create the mocha test
    const mocha = new Mocha({
        ui: 'tdd',
        color: true,
        timeout: 60000
    });

    const testsRoot = path.resolve(__dirname, '.');

    // Add files to the test suite
    const files = await glob.sync('**/mock-cline.test.js', { cwd: testsRoot });
    
    // No files found
    if (files.length === 0) {
        throw new Error('No test files found');
    }

    // Add all files to mocha
    files.forEach(f => {
        console.log(`Adding test file: ${f}`);
        mocha.addFile(path.resolve(testsRoot, f));
    });

    try {
        // Run the mocha test
        const failures = await new Promise<number>((resolve) => {
            mocha.run(resolve);
        });

        if (failures > 0) {
            throw new Error(`${failures} tests failed.`);
        }
    } catch (err) {
        console.error('Test run failed:', err);
        throw err;
    }
}
