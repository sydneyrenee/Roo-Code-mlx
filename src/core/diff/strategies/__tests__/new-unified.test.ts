import * as vscode from 'vscode';
import * as assert from 'assert';
import { NewUnifiedDiffStrategy } from "../new-unified";
import { TestUtils } from '../../../../test/testUtils';

export async function activateNewUnifiedDiffTests(context: vscode.ExtensionContext): Promise<void> {
    // Create test controller
    const testController = TestUtils.createTestController('newUnifiedDiffTests', 'New Unified Diff Tests');
    context.subscriptions.push(testController);

    // Root test suite
    const rootSuite = testController.createTestItem('new-unified-diff', 'main');
    testController.items.add(rootSuite);

    // Test suites
    const constructorSuite = testController.createTestItem('constructor-tests', 'constructor');
    const toolDescriptionSuite = testController.createTestItem('tool-description-tests', 'getToolDescription');
    const errorHandlingSuite = testController.createTestItem('error-handling-tests', 'error handling and edge cases');
    const similarCodeSuite = testController.createTestItem('similar-code-tests', 'similar code sections');
    const hunkSplittingSuite = testController.createTestItem('hunk-splitting-tests', 'hunk splitting');
    
    rootSuite.children.add(constructorSuite);
    rootSuite.children.add(toolDescriptionSuite);
    rootSuite.children.add(errorHandlingSuite);
    rootSuite.children.add(similarCodeSuite);
    rootSuite.children.add(hunkSplittingSuite);

    // Constructor tests
    constructorSuite.children.add(
        TestUtils.createTest(
            testController,
            'default-threshold',
            'should use default confidence threshold when not provided',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const defaultStrategy = new NewUnifiedDiffStrategy();
                // Access private property using indexer syntax
                assert.strictEqual(defaultStrategy['confidenceThreshold'], 1);
            }
        )
    );

    constructorSuite.children.add(
        TestUtils.createTest(
            testController,
            'custom-threshold',
            'should use provided confidence threshold',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const customStrategy = new NewUnifiedDiffStrategy(0.85);
                assert.strictEqual(customStrategy['confidenceThreshold'], 0.85);
            }
        )
    );

    constructorSuite.children.add(
        TestUtils.createTest(
            testController,
            'minimum-threshold',
            'should enforce minimum confidence threshold',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const lowStrategy = new NewUnifiedDiffStrategy(0.7); // Below minimum of 0.8
                assert.strictEqual(lowStrategy['confidenceThreshold'], 0.8);
            }
        )
    );

    // Tool description tests
    toolDescriptionSuite.children.add(
        TestUtils.createTest(
            testController,
            'correct-description',
            'should return tool description with correct cwd',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const strategy = new NewUnifiedDiffStrategy(0.97);
                const cwd = "/test/path";
                const description = strategy.getToolDescription({ cwd });

                assert.ok(description.includes("apply_diff Tool - Generate Precise Code Changes"));
                assert.ok(description.includes(cwd));
                assert.ok(description.includes("Step-by-Step Instructions"));
                assert.ok(description.includes("Requirements"));
                assert.ok(description.includes("Examples"));
                assert.ok(description.includes("Parameters:"));
            }
        )
    );

    // Basic diff tests
    rootSuite.children.add(
        TestUtils.createTest(
            testController,
            'simple-diff',
            'should apply simple diff correctly',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const strategy = new NewUnifiedDiffStrategy(0.97);
                const original = `line1
line2
line3`;

                const diff = `--- a/file.txt
+++ b/file.txt
@@ ... @@
 line1
+new line
 line2
-line3
+modified line3`;

                const result = await strategy.applyDiff(original, diff);
                assert.strictEqual(result.success, true);
                if (result.success) {
                    assert.strictEqual(result.content, `line1
new line
line2
modified line3`);
                }
            }
        )
    );

    rootSuite.children.add(
        TestUtils.createTest(
            testController,
            'multiple-hunks',
            'should handle multiple hunks',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const strategy = new NewUnifiedDiffStrategy(0.97);
                const original = `line1
line2
line3
line4
line5`;

                const diff = `--- a/file.txt
+++ b/file.txt
@@ ... @@
 line1
+new line
 line2
-line3
+modified line3
@@ ... @@
 line4
-line5
+modified line5
+new line at end`;

                const result = await strategy.applyDiff(original, diff);
                assert.strictEqual(result.success, true);
                if (result.success) {
                    assert.strictEqual(result.content, `line1
new line
line2
modified line3
line4
modified line5
new line at end`);
                }
            }
        )
    );

    rootSuite.children.add(
        TestUtils.createTest(
            testController,
            'complex-large',
            'should handle complex large',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const strategy = new NewUnifiedDiffStrategy(0.97);
                const original = `line1
line2
line3
line4
line5
line6
line7
line8
line9
line10`;

                const diff = `--- a/file.txt
+++ b/file.txt
@@ ... @@
 line1
+header line
+another header
 line2
-line3
-line4
+modified line3
+modified line4
+extra line
@@ ... @@
 line6
+middle section
 line7
-line8
+changed line8
+bonus line
@@ ... @@
 line9
-line10
+final line
+very last line`;

                const result = await strategy.applyDiff(original, diff);
                assert.strictEqual(result.success, true);
                if (result.success) {
                    assert.strictEqual(result.content, `line1
header line
another header
line2
modified line3
modified line4
extra line
line5
line6
middle section
line7
changed line8
bonus line
line9
final line
very last line`);
                }
            }
        )
    );

    rootSuite.children.add(
        TestUtils.createTest(
            testController,
            'indentation-changes',
            'should handle indentation changes',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const strategy = new NewUnifiedDiffStrategy(0.97);
                const original = `first line
  indented line
    double indented line
  back to single indent
no indent
  indented again
    double indent again
      triple indent
  back to single
last line`;

                const diff = `--- original
+++ modified
@@ ... @@
 first line
   indented line
+	tab indented line
+  new indented line
    double indented line
   back to single indent
 no indent
   indented again
     double indent again
-      triple indent
+      hi there mate
   back to single
 last line`;

                const expected = `first line
  indented line
	tab indented line
  new indented line
    double indented line
  back to single indent
no indent
  indented again
    double indent again
      hi there mate
  back to single
last line`;

                const result = await strategy.applyDiff(original, diff);
                assert.strictEqual(result.success, true);
                if (result.success) {
                    assert.strictEqual(result.content, expected);
                }
            }
        )
    );

    rootSuite.children.add(
        TestUtils.createTest(
            testController,
            'high-level-edits',
            'should handle high level edits',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const strategy = new NewUnifiedDiffStrategy(0.97);
                const original = `def factorial(n):
    if n == 0:
        return 1
    else:
        return n * factorial(n-1)`;
                
                const diff = `@@ ... @@
-def factorial(n):
-    if n == 0:
-        return 1
-    else:
-        return n * factorial(n-1)
+def factorial(number):
+    if number == 0:
+        return 1
+    else:
+        return number * factorial(number-1)`;

                const expected = `def factorial(number):
    if number == 0:
        return 1
    else:
        return number * factorial(number-1)`;

                const result = await strategy.applyDiff(original, diff);
                assert.strictEqual(result.success, true);
                if (result.success) {
                    assert.strictEqual(result.content, expected);
                }
            }
        )
    );

    rootSuite.children.add(
        TestUtils.createTest(
            testController,
            'complex-edits',
            'it should handle very complex edits',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const strategy = new NewUnifiedDiffStrategy(0.97);
                const original = `//Initialize the array that will hold the primes
var primeArray = [];
/*Write a function that checks for primeness and
 pushes those values to t*he array*/
function PrimeCheck(candidate){
  isPrime = true;
  for(var i = 2; i < candidate && isPrime; i++){
    if(candidate%i === 0){
      isPrime = false;
    } else {
      isPrime = true;
    }
  }
  if(isPrime){
    primeArray.push(candidate);
  }
  return primeArray;
}
/*Write the code that runs the above until the
  l ength of the array equa*ls the number of primes
  desired*/

var numPrimes = prompt("How many primes?");

//Display the finished array of primes

//for loop starting at 2 as that is the lowest prime number keep going until the array is as long as we requested
for (var i = 2; primeArray.length < numPrimes; i++) {
  PrimeCheck(i); //
}
console.log(primeArray);
`;

                const diff = `--- test_diff.js
+++ test_diff.js
@@ ... @@
-//Initialize the array that will hold the primes
 var primeArray = [];
-/*Write a function that checks for primeness and
- pushes those values to t*he array*/
 function PrimeCheck(candidate){
   isPrime = true;
   for(var i = 2; i < candidate && isPrime; i++){
@@ ... @@
   return primeArray;
 }
-/*Write the code that runs the above until the
-  l ength of the array equa*ls the number of primes
-  desired*/
 
 var numPrimes = prompt("How many primes?");
 
-//Display the finished array of primes
-
-//for loop starting at 2 as that is the lowest prime number keep going until the array is as long as we requested
 for (var i = 2; primeArray.length < numPrimes; i++) {
-  PrimeCheck(i); //
+  PrimeCheck(i);
 }
 console.log(primeArray);`;

                const expected = `var primeArray = [];
function PrimeCheck(candidate){
  isPrime = true;
  for(var i = 2; i < candidate && isPrime; i++){
    if(candidate%i === 0){
      isPrime = false;
    } else {
      isPrime = true;
    }
  }
  if(isPrime){
    primeArray.push(candidate);
  }
  return primeArray;
}

var numPrimes = prompt("How many primes?");

for (var i = 2; primeArray.length < numPrimes; i++) {
  PrimeCheck(i);
}
console.log(primeArray);
`;

                const result = await strategy.applyDiff(original, diff);
                assert.strictEqual(result.success, true);
                if (result.success) {
                    assert.strictEqual(result.content, expected);
                }
            }
        )
    );

    // Error handling and edge cases
    errorHandlingSuite.children.add(
        TestUtils.createTest(
            testController,
            'invalid-diff-format',
            'should reject completely invalid diff format',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const strategy = new NewUnifiedDiffStrategy(0.97);
                const original = "line1\nline2\nline3";
                const invalidDiff = "this is not a diff at all";

                const result = await strategy.applyDiff(original, invalidDiff);
                assert.strictEqual(result.success, false);
            }
        )
    );

    errorHandlingSuite.children.add(
        TestUtils.createTest(
            testController,
            'invalid-hunk-format',
            'should reject diff with invalid hunk format',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const strategy = new NewUnifiedDiffStrategy(0.97);
                const original = "line1\nline2\nline3";
                const invalidHunkDiff = `--- a/file.txt
+++ b/file.txt
invalid hunk header
 line1
-line2
+new line`;

                const result = await strategy.applyDiff(original, invalidHunkDiff);
                assert.strictEqual(result.success, false);
            }
        )
    );

    errorHandlingSuite.children.add(
        TestUtils.createTest(
            testController,
            'non-existent-content',
            'should fail when diff tries to modify non-existent content',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const strategy = new NewUnifiedDiffStrategy(0.97);
                const original = "line1\nline2\nline3";
                const nonMatchingDiff = `--- a/file.txt
+++ b/file.txt
@@ ... @@
 line1
-nonexistent line
+new line
 line3`;

                const result = await strategy.applyDiff(original, nonMatchingDiff);
                assert.strictEqual(result.success, false);
            }
        )
    );

    errorHandlingSuite.children.add(
        TestUtils.createTest(
            testController,
            'overlapping-hunks',
            'should handle overlapping hunks',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const strategy = new NewUnifiedDiffStrategy(0.97);
                const original = `line1
line2
line3
line4
line5`;
                const overlappingDiff = `--- a/file.txt
+++ b/file.txt
@@ ... @@
 line1
 line2
-line3
+modified3
 line4
@@ ... @@
 line2
-line3
-line4
+modified3and4
 line5`;

                const result = await strategy.applyDiff(original, overlappingDiff);
                assert.strictEqual(result.success, false);
            }
        )
    );

    errorHandlingSuite.children.add(
        TestUtils.createTest(
            testController,
            'empty-lines-modifications',
            'should handle empty lines modifications',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const strategy = new NewUnifiedDiffStrategy(0.97);
                const original = `line1

line3

line5`;
                const emptyLinesDiff = `--- a/file.txt
+++ b/file.txt
@@ ... @@
 line1

-line3
+line3modified

 line5`;

                const result = await strategy.applyDiff(original, emptyLinesDiff);
                assert.strictEqual(result.success, true);
                if (result.success) {
                    assert.strictEqual(result.content, `line1

line3modified

line5`);
                }
            }
        )
    );

    errorHandlingSuite.children.add(
        TestUtils.createTest(
            testController,
            'mixed-line-endings',
            'should handle mixed line endings in diff',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const strategy = new NewUnifiedDiffStrategy(0.97);
                const original = "line1\r\nline2\nline3\r\n";
                const mixedEndingsDiff = `--- a/file.txt
+++ b/file.txt
@@ ... @@
 line1\r
-line2
+modified2\r
 line3`;

                const result = await strategy.applyDiff(original, mixedEndingsDiff);
                assert.strictEqual(result.success, true);
                if (result.success) {
                    assert.strictEqual(result.content, "line1\r\nmodified2\r\nline3\r\n");
                }
            }
        )
    );

    errorHandlingSuite.children.add(
        TestUtils.createTest(
            testController,
            'partial-line-modifications',
            'should handle partial line modifications',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const strategy = new NewUnifiedDiffStrategy(0.97);
                const original = "const value = oldValue + 123;";
                const partialDiff = `--- a/file.txt
+++ b/file.txt
@@ ... @@
-const value = oldValue + 123;
+const value = newValue + 123;`;

                const result = await strategy.applyDiff(original, partialDiff);
                assert.strictEqual(result.success, true);
                if (result.success) {
                    assert.strictEqual(result.content, "const value = newValue + 123;");
                }
            }
        )
    );

    errorHandlingSuite.children.add(
        TestUtils.createTest(
            testController,
            'malformed-but-recoverable',
            'should handle slightly malformed but recoverable diff',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const strategy = new NewUnifiedDiffStrategy(0.97);
                const original = "line1\nline2\nline3";
                // Missing space after --- and +++
                const slightlyBadDiff = `---a/file.txt
+++b/file.txt
@@ ... @@
 line1
-line2
+new line
 line3`;

                const result = await strategy.applyDiff(original, slightlyBadDiff);
                assert.strictEqual(result.success, true);
                if (result.success) {
                    assert.strictEqual(result.content, "line1\nnew line\nline3");
                }
            }
        )
    );

    // Similar code sections
    similarCodeSuite.children.add(
        TestUtils.createTest(
            testController,
            'modify-right-section',
            'should correctly modify the right section when similar code exists',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const strategy = new NewUnifiedDiffStrategy(0.97);
                const original = `function add(a, b) {
  return a + b;
}

function subtract(a, b) {
  return a - b;
}

function multiply(a, b) {
  return a + b;  // Bug here
}`;

                const diff = `--- a/math.js
+++ b/math.js
@@ ... @@
 function multiply(a, b) {
-  return a + b;  // Bug here
+  return a * b;
 }`;

                const result = await strategy.applyDiff(original, diff);
                assert.strictEqual(result.success, true);
                if (result.success) {
                    assert.strictEqual(result.content, `function add(a, b) {
  return a + b;
}

function subtract(a, b) {
  return a - b;
}

function multiply(a, b) {
  return a * b;
}`);
                }
            }
        )
    );

    similarCodeSuite.children.add(
        TestUtils.createTest(
            testController,
            'multiple-similar-sections',
            'should handle multiple similar sections with correct context',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const strategy = new NewUnifiedDiffStrategy(0.97);
                const original = `if (condition) {
  doSomething();
  doSomething();
  doSomething();
}

if (otherCondition) {
  doSomething();
  doSomething();
  doSomething();
}`;

                const diff = `--- a/file.js
+++ b/file.js
@@ ... @@
 if (otherCondition) {
   doSomething();
-  doSomething();
+  doSomethingElse();
   doSomething();
 }`;

                const result = await strategy.applyDiff(original, diff);
                assert.strictEqual(result.success, true);
                if (result.success) {
                    assert.strictEqual(result.content, `if (condition) {
  doSomething();
  doSomething();
  doSomething();
}

if (otherCondition) {
  doSomething();
  doSomethingElse();
  doSomething();
}`);
                }
            }
        )
    );

    // Hunk splitting
    hunkSplittingSuite.children.add(
        TestUtils.createTest(
            testController,
            'large-non-contiguous',
            'should handle large diffs with multiple non-contiguous changes',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const strategy = new NewUnifiedDiffStrategy(0.97);
                const original = `import { readFile } from 'fs';
import { join } from 'path';
import { Logger } from './logger';

const logger = new Logger();

async function processFile(filePath: string) {
  try {
    const data = await readFile(filePath, 'utf8');
    logger.info('File read successfully');
    return data;
  } catch (error) {
    logger.error('Failed to read file:', error);
    throw error;
  }
}

function validateInput(input: string): boolean {
  if (!input) {
    logger.warn('Empty input received');
    return false;
  }
  return input.length > 0;
}

async function writeOutput(data: string) {
  logger.info('Processing output');
  // TODO: Implement output writing
  return Promise.resolve();
}

function parseConfig(configPath: string) {
  logger.debug('Reading config from:', configPath);
  // Basic config parsing
  return {
    enabled: true,
    maxRetries: 3
  };
}

export {
  processFile,
  validateInput,
  writeOutput,
  parseConfig
};`;

                const diff = `--- a/file.ts
+++ b/file.ts
@@ ... @@
-import { readFile } from 'fs';
+import { readFile, writeFile } from 'fs';
 import { join } from 'path';
-import { Logger } from './logger';
+import { Logger } from './utils/logger';
+import { Config } from './types';
 
-const logger = new Logger();
+const logger = new Logger('FileProcessor');
 
 async function processFile(filePath: string) {
   try {
     const data = await readFile(filePath, 'utf8');
-    logger.info('File read successfully');
+    logger.info(\`File \${filePath} read successfully\`);
     return data;
   } catch (error) {
-    logger.error('Failed to read file:', error);
+    logger.error(\`Failed to read file \${filePath}:\`, error);
     throw error;
   }
 }
 
 function validateInput(input: string): boolean {
   if (!input) {
-    logger.warn('Empty input received');
+    logger.warn('Validation failed: Empty input received');
     return false;
   }
-  return input.length > 0;
+  return input.trim().length > 0;
 }
 
-async function writeOutput(data: string) {
-  logger.info('Processing output');
-  // TODO: Implement output writing
-  return Promise.resolve();
+async function writeOutput(data: string, outputPath: string) {
+  try {
+    await writeFile(outputPath, data, 'utf8');
+    logger.info(\`Output written to \${outputPath}\`);
+  } catch (error) {
+    logger.error(\`Failed to write output to \${outputPath}:\`, error);
+    throw error;
+  }
 }
 
-function parseConfig(configPath: string) {
-  logger.debug('Reading config from:', configPath);
-  // Basic config parsing
-  return {
-    enabled: true,
-    maxRetries: 3
-  };
+async function parseConfig(configPath: string): Promise<Config> {
+  try {
+    const configData = await readFile(configPath, 'utf8');
+    logger.debug(\`Reading config from \${configPath}\`);
+    return JSON.parse(configData);
+  } catch (error) {
+    logger.error(\`Failed to parse config from \${configPath}:\`, error);
+    throw error;
+  }
 }
 
 export {
   processFile,
   validateInput,
   writeOutput,
-  parseConfig
+  parseConfig,
+  type Config
 };`;

                const expected = `import { readFile, writeFile } from 'fs';
import { join } from 'path';
import { Logger } from './utils/logger';
import { Config } from './types';

const logger = new Logger('FileProcessor');

async function processFile(filePath: string) {
  try {
    const data = await readFile(filePath, 'utf8');
    logger.info(\`File \${filePath} read successfully\`);
    return data;
  } catch (error) {
    logger.error(\`Failed to read file \${filePath}:\`, error);
    throw error;
  }
}

function validateInput(input: string): boolean {
  if (!input) {
    logger.warn('Validation failed: Empty input received');
    return false;
  }
  return input.trim().length > 0;
}

async function writeOutput(data: string, outputPath: string) {
  try {
    await writeFile(outputPath, data, 'utf8');
    logger.info(\`Output written to \${outputPath}\`);
  } catch (error) {
    logger.error(\`Failed to write output to \${outputPath}:\`, error);
    throw error;
  }
}

async function parseConfig(configPath: string): Promise<Config> {
  try {
    const configData = await readFile(configPath, 'utf8');
    logger.debug(\`Reading config from \${configPath}\`);
    return JSON.parse(configData);
  } catch (error) {
    logger.error(\`Failed to parse config from \${configPath}:\`, error);
    throw error;
  }
}

export {
  processFile,
  validateInput,
  writeOutput,
  parseConfig,
  type Config
};`;

                const result = await strategy.applyDiff(original, diff);
                assert.strictEqual(result.success, true);
                if (result.success) {
                    assert.strictEqual(result.content, expected);
                }
            }
        )
    );
}
