/**
 * This script runs the tests and provides a summary of the results.
 * 
 * Usage:
 * node src/test/scripts/run-tests.js
 * 
 * Options:
 * --verbose: Show detailed output
 * --filter=<pattern>: Only run tests matching the pattern
 */

const { spawn } = require('child_process');

// Parse command line arguments
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const filterArg = args.find(arg => arg.startsWith('--filter='));
const filter = filterArg ? filterArg.split('=')[1] : null;

// Set environment variables
const env = {
    ...process.env,
    NODE_ENV: 'development',
};

// Run the tests
console.log('Running tests...');
console.log('NODE_ENV:', env.NODE_ENV);
if (filter) {
    console.log('Filter:', filter);
}

const testCommand = 'npm';
const testArgs = ['test'];
if (filter) {
    testArgs.push(`--testNamePattern=${filter}`);
}

const testProcess = spawn(testCommand, testArgs, {
    env,
    stdio: verbose ? 'inherit' : ['ignore', 'pipe', 'pipe'],
});

// Collect output
let output = '';
let errorOutput = '';

if (!verbose) {
    testProcess.stdout.on('data', (data) => {
        output += data.toString();
    });

    testProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
    });
}

// Process results
testProcess.on('close', (code) => {
    if (code === 0) {
        console.log('\n✅ All tests passed!');
        
        // Extract and display test summary
        if (!verbose) {
            const testResults = parseTestResults(output);
            displayTestSummary(testResults);
        }
    } else {
        console.log('\n❌ Tests failed!');
        
        if (!verbose) {
            console.log('\nError output:');
            console.log(errorOutput);
            
            // Extract and display test failures
            const testResults = parseTestResults(output);
            displayTestSummary(testResults);
            displayTestFailures(testResults);
        }
    }
});

/**
 * Parse test results from the output
 * @param {string} output The test output
 * @returns {object} The parsed test results
 */
function parseTestResults(output) {
    const results = {
        passed: 0,
        failed: 0,
        skipped: 0,
        total: 0,
        failures: [],
    };
    
    // Extract test counts
    const testCountMatch = output.match(/(\d+) passing.*?(\d+) failing.*?(\d+) skipped/s);
    if (testCountMatch) {
        results.passed = parseInt(testCountMatch[1], 10);
        results.failed = parseInt(testCountMatch[2], 10);
        results.skipped = parseInt(testCountMatch[3], 10);
        results.total = results.passed + results.failed + results.skipped;
    }
    
    // Extract test failures
    const failureMatches = Array.from(output.matchAll(/\d+\) (.*?):\s*(.*?)\n([\s\S]*?)(?=\n\s*\d+\)|$)/g));
    for (const match of failureMatches) {
        const [_, suite, test, details] = match;
        results.failures.push({
            suite,
            test,
            details: details.trim(),
        });
    }
    
    return results;
}

/**
 * Display a summary of the test results
 * @param {object} results The test results
 */
function displayTestSummary(results) {
    console.log('\nTest Summary:');
    console.log(`Total: ${results.total}`);
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Skipped: ${results.skipped}`);
    console.log(`Pass Rate: ${results.total > 0 ? Math.round((results.passed / results.total) * 100) : 0}%`);
}

/**
 * Display test failures
 * @param {object} results The test results
 */
function displayTestFailures(results) {
    if (results.failures.length === 0) {
        return;
    }
    
    console.log('\nTest Failures:');
    results.failures.forEach((failure, index) => {
        console.log(`\n${index + 1}) ${failure.suite}: ${failure.test}`);
        console.log(failure.details);
    });
}