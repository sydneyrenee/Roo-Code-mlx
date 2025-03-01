# Test Migration Scripts

This directory contains scripts to help with the migration of tests from Jest to the VS Code Testing API.

## Scripts

### find-unregistered-tests.js

This script finds tests that have been migrated to the VS Code Testing API format but are not yet registered in `registerTests.ts`.

```bash
node src/test/scripts/find-unregistered-tests.js
```

The script will output:
- A list of all migrated tests
- A list of all registered tests
- A list of all unregistered tests
- Import statements to add to `registerTests.ts`
- Registration code to add to `registerTests.ts`

### generate-test-migration.js

This script generates a skeleton for migrating a Jest test file to the VS Code Testing API format.

```bash
node src/test/scripts/generate-test-migration.js path/to/test.js
```

The script will:
1. Parse the Jest test file to extract describe blocks and test cases
2. Generate a skeleton of the migrated test file with the VS Code Testing API format
3. Save the migrated test file with a `.migrated.ts` extension

### run-tests.js

This script runs the tests and provides a summary of the results.

```bash
node src/test/scripts/run-tests.js [--verbose] [--filter=<pattern>]
```

Options:
- `--verbose`: Show detailed output
- `--filter=<pattern>`: Only run tests matching the pattern

The script will:
1. Run the tests
2. Display a summary of the results
3. Display any test failures

### update-migration-status.js

This script updates the `MIGRATION_STATUS.md` file with the current status of test migration.

```bash
node src/test/scripts/update-migration-status.js
```

The script will:
1. Scan the project for test files
2. Determine which tests have been migrated and which are registered
3. Generate statistics about the migration progress
4. Update the `MIGRATION_STATUS.md` file with the current status

## Usage Examples

### Find and register unregistered tests

```bash
# Find unregistered tests
node src/test/scripts/find-unregistered-tests.js

# Copy the import statements and registration code to registerTests.ts

# Run the tests to verify they work
node src/test/scripts/run-tests.js
```

### Migrate a Jest test file

```bash
# Generate a skeleton for migrating a Jest test file
node src/test/scripts/generate-test-migration.js src/core/__tests__/some-test.js

# Edit the migrated test file to implement the tests
# ...

# Register the migrated test in registerTests.ts
# ...

# Run the tests to verify they work
node src/test/scripts/run-tests.js
```

### Update the migration status document

```bash
# Update the migration status document
node src/test/scripts/update-migration-status.js
```

## Tips

1. **Migrate tests incrementally**: Migrate and register a few tests at a time, and verify they work before moving on to more tests.

2. **Use the scripts together**: The scripts are designed to work together to streamline the migration process.

3. **Keep the migration status document updated**: Run `update-migration-status.js` regularly to keep the migration status document up to date.

4. **Check for errors**: If a test fails after migration, check the error message and fix the issue before moving on.

5. **Follow the migration guide**: See the [TEST_MIGRATION_GUIDE.md](../TEST_MIGRATION_GUIDE.md) for detailed instructions on how to migrate tests.