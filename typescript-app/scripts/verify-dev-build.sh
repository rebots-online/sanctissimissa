#!/bin/bash

# Sanctissi-Missa Development Build Verification Script
# This script helps verify that a development build is working correctly

# Text formatting
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Sanctissi-Missa Development Build Verification ===${NC}"

# Check if adb is installed (for Android device communication)
if ! command -v adb &> /dev/null; then
    echo -e "${RED}adb (Android Debug Bridge) could not be found. Please install Android SDK Platform Tools.${NC}"
    echo "You can still manually verify the build using the checklist below."
else
    # Check for connected devices
    DEVICES=$(adb devices | grep -v "List" | grep -v "^$" | wc -l)
    
    if [ "$DEVICES" -eq 0 ]; then
        echo -e "${YELLOW}No Android devices connected. Please connect a device with the test build installed.${NC}"
    else
        echo -e "${GREEN}Found $DEVICES connected Android device(s).${NC}"
        echo "Make sure your test build is installed on one of these devices."
    fi
fi

echo -e "\n${YELLOW}Development Build Verification Checklist${NC}"
echo "Please verify the following items manually:"

# Verification checklist
items=(
    "App installs successfully on test device"
    "Development client connects to dev server"
    "Hot reload functionality works"
    "Debug logs appear in console"
    "Can navigate between tabs"
    "App correctly loads content from database"
    "Calendar system functions properly"
    "Dark/light mode switching works"
    "Text formatting appears correct"
)

# Print interactive checklist
for i in "${!items[@]}"; do
    echo -e "[ ] ${items[$i]}"
done

echo -e "\n${YELLOW}How to verify development features:${NC}"
echo "1. Install the APK on your device."
echo "2. Run 'npm start' on your development machine."
echo "3. Open the app and it should connect to your development server."
echo "4. Make a small change to a component and save - the app should reload."
echo "5. Verify that debug logs appear in the Metro bundler console."

echo -e "\n${YELLOW}Troubleshooting:${NC}"
echo "- If the app doesn't connect to dev server, check that your device and computer are on the same network."
echo "- Try using 'adb reverse tcp:8081 tcp:8081' to forward the Metro bundler port."
echo "- Ensure the app has been built with the 'development' profile in eas.json."
echo "- Restart the Metro bundler with 'npm start -c' to clear cache if needed."

echo -e "\n${GREEN}After verifying all items, update CHECKLIST-6apr2025.md with your findings.${NC}"