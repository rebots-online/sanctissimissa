#!/bin/bash

# Sanctissi-Missa Standalone Debug Build Script
# Builds a standalone APK with debug symbols and development environment variables.

# Text formatting
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Sanctissi-Missa Standalone Debug Build Process ===${NC}"
echo "Starting standalone debug build process..."

# Step 1: Environment Setup
echo -e "\n${YELLOW}Step 1: Environment Setup${NC}"
echo "Checking dependencies..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js could not be found. Please install Node.js.${NC}"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm could not be found. Please install npm.${NC}"
    exit 1
fi

# Check if eas-cli is installed
if ! command -v eas &> /dev/null; then
    echo -e "${RED}eas-cli could not be found. Please install eas-cli with 'npm install -g eas-cli'.${NC}"
    exit 1
fi

echo -e "${GREEN}Dependencies verified successfully.${NC}"

# Install/update project dependencies
echo "Installing/updating dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to install dependencies. Please check the error messages above.${NC}"
    exit 1
fi

echo -e "${GREEN}Dependencies installed/updated successfully.${NC}"

# Step 2: Pre-build Verification
echo -e "\n${YELLOW}Step 2: Pre-build Verification${NC}"

# Type checking
echo "Running TypeScript type checking..."
npm run type-check

if [ $? -ne 0 ]; then
    echo -e "${RED}Type checking failed. Please fix the type errors above before proceeding.${NC}"
    exit 1
fi

echo -e "${GREEN}Type checking passed.${NC}"

# Linting
echo "Running ESLint checks..."
npm run lint

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Warning: Linting found issues. Consider fixing them before proceeding.${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Build process aborted."
        exit 1
    fi
else
    echo -e "${GREEN}Linting passed.${NC}"
fi

# Step 3: Build Process
echo -e "\n${YELLOW}Step 3: Build Process${NC}"

# Generate native code
echo "Generating native code (prebuild)..."
npm run prebuild

if [ $? -ne 0 ]; then
    echo -e "${RED}Prebuild failed. Please check the error messages above.${NC}"
    exit 1
fi

echo -e "${GREEN}Native code generation complete.${NC}"

# Execute EAS build with development-standalone profile
echo "Starting EAS build with development-standalone profile..."
echo "This will create a standalone APK with embedded bundle."
echo "This may take some time. Please wait..."
# Ensure you have committed the latest changes before running this!
# It uses the development-standalone profile and clears cache.
eas build -p android --profile development-standalone --clear-cache

if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed. Please check the error messages above.${NC}"
    exit 1
fi

echo -e "${GREEN}Standalone debug build completed successfully!${NC}"

# Step 4: Verification Instructions
echo -e "\n${YELLOW}Step 4: Verification${NC}"
echo "To verify the build:"
echo "1. Install the generated APK on your test device (Z-Fold)"
echo "2. Launch the app and observe the initialization logs (use adb logcat)"
echo "3. Verify the app loads past the initial loading screen"
echo "4. Test basic functionality and fold state transitions"

echo -e "\n${GREEN}Build process completed! You can find the build link above or in your EAS dashboard.${NC}"