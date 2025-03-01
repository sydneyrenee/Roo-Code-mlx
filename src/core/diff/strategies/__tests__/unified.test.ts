import * as vscode from 'vscode';
import * as assert from 'assert';
import { UnifiedDiffStrategy } from "../unified";
import { TestUtils } from '../../../../test/testUtils';

export async function activateUnifiedDiffTests(context: vscode.ExtensionContext): Promise<void> {
    // Create test controller
    const testController = TestUtils.createTestController('unifiedDiffTests', 'Unified Diff Tests');
    context.subscriptions.push(testController);

    // Root test suite
    const rootSuite = testController.createTestItem('unified-diff', 'UnifiedDiffStrategy');
    testController.items.add(rootSuite);

    // Test suites
    const toolDescriptionSuite = testController.createTestItem('tool-description-tests', 'getToolDescription');
    const applyDiffSuite = testController.createTestItem('apply-diff-tests', 'applyDiff');
    
    rootSuite.children.add(toolDescriptionSuite);
    rootSuite.children.add(applyDiffSuite);

    // Tool description tests
    toolDescriptionSuite.children.add(
        TestUtils.createTest(
            testController,
            'correct-description',
            'should return tool description with correct cwd',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const strategy = new UnifiedDiffStrategy();
                const cwd = "/test/path";
                const description = strategy.getToolDescription({ cwd });

                assert.ok(description.includes("apply_diff"));
                assert.ok(description.includes(cwd));
                assert.ok(description.includes("Parameters:"));
                assert.ok(description.includes("Format Requirements:"));
            }
        )
    );

    // Apply diff tests
    applyDiffSuite.children.add(
        TestUtils.createTest(
            testController,
            'function-modification',
            'should successfully apply a function modification diff',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const strategy = new UnifiedDiffStrategy();
                const originalContent = `import { Logger } from '../logger';

function calculateTotal(items: number[]): number {
  return items.reduce((sum, item) => {
    return sum + item;
  }, 0);
}

export { calculateTotal };`;

                const diffContent = `--- src/utils/helper.ts
+++ src/utils/helper.ts
@@ -1,9 +1,10 @@
 import { Logger } from '../logger';
 
 function calculateTotal(items: number[]): number {
-  return items.reduce((sum, item) => {
-    return sum + item;
+  const total = items.reduce((sum, item) => {
+    return sum + item * 1.1;  // Add 10% markup
   }, 0);
+  return Math.round(total * 100) / 100;  // Round to 2 decimal places
 }
 
 export { calculateTotal };`;

                const expected = `import { Logger } from '../logger';

function calculateTotal(items: number[]): number {
  const total = items.reduce((sum, item) => {
    return sum + item * 1.1;  // Add 10% markup
  }, 0);
  return Math.round(total * 100) / 100;  // Round to 2 decimal places
}

export { calculateTotal };`;

                const result = await strategy.applyDiff(originalContent, diffContent);
                assert.strictEqual(result.success, true);
                if (result.success) {
                    assert.strictEqual(result.content, expected);
                }
            }
        )
    );

    applyDiffSuite.children.add(
        TestUtils.createTest(
            testController,
            'add-new-method',
            'should successfully apply a diff adding a new method',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const strategy = new UnifiedDiffStrategy();
                const originalContent = `class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }
}`;

                const diffContent = `--- src/Calculator.ts
+++ src/Calculator.ts
@@ -1,5 +1,9 @@
 class Calculator {
   add(a: number, b: number): number {
     return a + b;
   }
+
+  multiply(a: number, b: number): number {
+    return a * b;
+  }
 }`;

                const expected = `class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }

  multiply(a: number, b: number): number {
    return a * b;
  }
}`;

                const result = await strategy.applyDiff(originalContent, diffContent);
                assert.strictEqual(result.success, true);
                if (result.success) {
                    assert.strictEqual(result.content, expected);
                }
            }
        )
    );

    applyDiffSuite.children.add(
        TestUtils.createTest(
            testController,
            'modify-imports',
            'should successfully apply a diff modifying imports',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const strategy = new UnifiedDiffStrategy();
                const originalContent = `import { useState } from 'react';
import { Button } from './components';

function App() {
  const [count, setCount] = useState(0);
  return <Button onClick={() => setCount(count + 1)}>{count}</Button>;
}`;

                const diffContent = `--- src/App.tsx
+++ src/App.tsx
@@ -1,7 +1,8 @@
-import { useState } from 'react';
+import { useState, useEffect } from 'react';
 import { Button } from './components';
 
 function App() {
   const [count, setCount] = useState(0);
+  useEffect(() => { document.title = \`Count: \${count}\` }, [count]);
   return <Button onClick={() => setCount(count + 1)}>{count}</Button>;
 }`;

                const expected = `import { useState, useEffect } from 'react';
import { Button } from './components';

function App() {
  const [count, setCount] = useState(0);
  useEffect(() => { document.title = \`Count: \${count}\` }, [count]);
  return <Button onClick={() => setCount(count + 1)}>{count}</Button>;
}`;

                const result = await strategy.applyDiff(originalContent, diffContent);
                assert.strictEqual(result.success, true);
                if (result.success) {
                    assert.strictEqual(result.content, expected);
                }
            }
        )
    );

    applyDiffSuite.children.add(
        TestUtils.createTest(
            testController,
            'multiple-hunks',
            'should successfully apply a diff with multiple hunks',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const strategy = new UnifiedDiffStrategy();
                const originalContent = `import { readFile, writeFile } from 'fs';

function processFile(path: string) {
  readFile(path, 'utf8', (err, data) => {
    if (err) throw err;
    const processed = data.toUpperCase();
    writeFile(path, processed, (err) => {
      if (err) throw err;
    });
  });
}

export { processFile };`;

                const diffContent = `--- src/file-processor.ts
+++ src/file-processor.ts
@@ -1,12 +1,14 @@
-import { readFile, writeFile } from 'fs';
+import { promises as fs } from 'fs';
+import { join } from 'path';
 
-function processFile(path: string) {
-  readFile(path, 'utf8', (err, data) => {
-    if (err) throw err;
+async function processFile(path: string) {
+  try {
+    const data = await fs.readFile(join(__dirname, path), 'utf8');
     const processed = data.toUpperCase();
-    writeFile(path, processed, (err) => {
-      if (err) throw err;
-    });
-  });
+    await fs.writeFile(join(__dirname, path), processed);
+  } catch (error) {
+    console.error('Failed to process file:', error);
+    throw error;
+  }
 }
 
 export { processFile };`;

                const expected = `import { promises as fs } from 'fs';
import { join } from 'path';

async function processFile(path: string) {
  try {
    const data = await fs.readFile(join(__dirname, path), 'utf8');
    const processed = data.toUpperCase();
    await fs.writeFile(join(__dirname, path), processed);
  } catch (error) {
    console.error('Failed to process file:', error);
    throw error;
  }
}

export { processFile };`;

                const result = await strategy.applyDiff(originalContent, diffContent);
                assert.strictEqual(result.success, true);
                if (result.success) {
                    assert.strictEqual(result.content, expected);
                }
            }
        )
    );

    applyDiffSuite.children.add(
        TestUtils.createTest(
            testController,
            'empty-original',
            'should handle empty original content',
            vscode.Uri.file(__filename),
            async (run: vscode.TestRun) => {
                const strategy = new UnifiedDiffStrategy();
                const originalContent = "";
                const diffContent = `--- empty.ts
+++ empty.ts
@@ -0,0 +1,3 @@
+export function greet(name: string): string {
+  return \`Hello, \${name}!\`;
+}`;

                const expected = `export function greet(name: string): string {
  return \`Hello, \${name}!\`;
}\n`;

                const result = await strategy.applyDiff(originalContent, diffContent);
                assert.strictEqual(result.success, true);
                if (result.success) {
                    assert.strictEqual(result.content, expected);
                }
            }
        )
    );
}
