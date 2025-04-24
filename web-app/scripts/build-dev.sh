#!/bin/bash

# Build script for SanctissiMissa web application
# This script builds the web application for development

# Exit on error
set -e

echo "Starting SanctissiMissa web application build..."

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

# Run TypeScript check
echo "Running TypeScript check..."
npx tsc --noEmit

# Run ESLint (but don't fail the build on linting errors)
echo "Running ESLint..."
npm run lint || echo "Linting errors found, but continuing build..."

# Build the application
echo "Building the application..."
npm run build

# Check if build was successful
if [ -d "dist" ]; then
  echo "Build completed successfully!"
  echo "The build output is in the 'dist' directory."
  echo "To preview the build, run: npm run preview"
else
  echo "Build failed. Check the error messages above."
  exit 1
fi
