# Test Migration Scripts

This directory contains documentation for the scripts used in the test migration process from Jest to the VS Code Testing API.

## Available Scripts

### 1. find-unregistered-tests.js

**Location**: `src/test/scripts/find-unregistered-tests.js`

**Purpose**: Finds tests that have been migrated to the VS Code Testing API but are not registered in the `registerTests.ts` file.

**Usage**:
```bash
node src/test/scripts/find-unregistered-tests.js
```

**Output**:
- Total test files found
- Tests using Jest's describe/it pattern
- Tests migrated to VS Code Testing API
- Tests registered in registerTests.ts
- Tests migrated but not registered
- Tests not matching any pattern
- Migration progress percentage
- List of unregistered tests
- Import statements to add to registerTests.ts
- Registration code to add to registerTests.ts
- Sample of tests to migrate

### 2. generate-test-migration.js

**Location**: `src/test/scripts/generate-test-migration.js`

**Purpose**: Generates a skeleton for migrating a Jest test file to the VS Code Testing API format.

**Usage**:
```bash
npm run test:generate-migration <path-to-test-file>
```

**Output**:
- A new file with the same name as the original test file but with a `.migrated.ts` extension
- The new file contains a skeleton for migrating the test to the VS Code Testing API format

### 3. run-tests.js

**Location**: `src/test/scripts/run-tests.js`

**Purpose**: Runs tests and provides a summary of the results.

**Usage**:
```bash
npm test
```

**Output**:
- Test results
- Summary of passing and failing tests

### 4. update-migration-status.js

**Location**: `src/test/scripts/update-migration-status.js`

**Purpose**: Updates the migration status document with the current state of test migration.

**Usage**:
```bash
node src/test/scripts/update-migration-status.js
```

**Output**:
- Updates the `MIGRATION_STATUS.md` file with the current state of test migration

## How to Use These Scripts

1. **Find Unregistered Tests**:
   - Run `node src/test/scripts/find-unregistered-tests.js` to get a list of tests that have been migrated but are not registered
   - Use the output to update the `registerTests.ts` file with the import statements and registration code

2. **Generate Test Migration Skeleton**:
   - Run `npm run test:generate-migration <path-to-test-file>` to generate a skeleton for migrating a Jest test file
   - Update the generated file with your test implementation

3. **Run Tests**:
   - Run `npm test` to run all registered tests
   - Check the output for passing and failing tests

4. **Update Migration Status**:
   - Run `node src/test/scripts/update-migration-status.js` to update the migration status document
   - This should be done after making significant progress in the migration process