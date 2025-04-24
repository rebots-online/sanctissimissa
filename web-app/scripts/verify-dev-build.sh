#!/bin/bash

# Verification script for SanctissiMissa web application build
# This script verifies the build output and runs a local server for testing

# Exit on error
set -e

echo "Verifying SanctissiMissa web application build..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "Error: package.json not found. Make sure you're in the web-app directory."
  exit 1
fi

# Check if the build directory exists
if [ ! -d "dist" ]; then
  echo "Error: dist directory not found. Run the build script first."
  exit 1
fi

# Check for essential files in the build
echo "Checking for essential files in the build..."
ESSENTIAL_FILES=("index.html" "assets")
for file in "${ESSENTIAL_FILES[@]}"; do
  if [ ! -e "dist/$file" ]; then
    echo "Error: Essential file/directory not found in build: $file"
    exit 1
  fi
done

# Start the preview server
echo "Starting preview server..."
echo "You can access the application at http://localhost:4173"
echo "Press Ctrl+C to stop the server"
npm run preview
