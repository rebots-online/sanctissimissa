#!/bin/bash

# Build script for SanctissiMissa web application
# This script builds the web application for development, bypassing TypeScript errors

# Exit on error
set -e

echo "Starting SanctissiMissa web application build (bypassing TypeScript errors)..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "Error: package.json not found. Make sure you're in the web-app directory."
  exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Skip TypeScript check and build directly with Vite
echo "Building the application (bypassing TypeScript errors)..."
npx vite build --emptyOutDir

# Check if build was successful
if [ -d "dist" ]; then
  echo "Build completed successfully!"
  echo "The build output is in the 'dist' directory."
  echo "To preview the build, run: npm run preview"
else
  echo "Build failed. Check the error messages above."
  exit 1
fi
