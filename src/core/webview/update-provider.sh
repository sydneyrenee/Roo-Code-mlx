#!/bin/bash

# Backup the original file
cp ClineProvider.ts ClineProvider.ts.bak

# Replace the original with our new version
cp ClineProvider.temp.ts ClineProvider.ts

# Handle the ClineProviderTypes.ts.new file if it exists
if [ -f "ClineProviderTypes.ts.new" ]; then
  # If we have a new version of the types file, use it
  mv ClineProviderTypes.ts.new ClineProviderTypes.ts
fi

# Clean up the temporary directories if they exist
if [ -d "types" ]; then
  rm -rf types
fi

if [ -d "state" ]; then
  rm -rf state
fi

if [ -d "html" ]; then
  rm -rf html
fi

if [ -d "tasks" ]; then
  rm -rf tasks
fi

if [ -d "models" ]; then
  rm -rf models
fi

if [ -d "mcp" ]; then
  rm -rf mcp
fi

echo "ClineProvider.ts has been updated with the modular version."
echo "A backup of the original file is saved as ClineProvider.ts.bak"
echo "Temporary directories have been cleaned up."