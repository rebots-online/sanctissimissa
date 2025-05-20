# SanctissiMissa Repository Fixes - May 20, 2025

## 1. Repository Structure Issues

### Problem
The repository had an incorrect structure with:
1. The main entry point in the root `package.json` pointing to a non-existent `index.ts` file
2. The actual app code was in the `typescript-app` subdirectory
3. The scripts in the root `package.json` were trying to run the app from the root directory

### Solution
We fixed the issue by:
1. Updating the `main` field in the root `package.json` to point to `typescript-app/index.ts`
2. Modifying the npm scripts to change to the `typescript-app` directory before running the commands

```json
// Updated package.json
{
  "name": "sanctissi-missa",
  "version": "1.0.0",
  "main": "typescript-app/index.ts",
  "scripts": {
    "start": "cd typescript-app && expo start",
    "android": "cd typescript-app && expo run:android",
    "ios": "cd typescript-app && expo run:ios",
    "web": "cd typescript-app && expo start --web",
    "build:dev": "cd typescript-app && eas build --profile development --platform android",
    "build:dev:script": "./scripts/build-dev.sh",
    "verify:dev:build": "./scripts/verify-dev-build.sh"
  },
  // ...
}
```

## 2. SQLite Implementation Issues

### Problem
The app is using `expo-sqlite` but there are errors when trying to use the SQLite functionality:
```
ERROR Failed to prerender day: [TypeError: SQLite.openDatabase is not a function (it is undefined)]
```

### Analysis
1. The SQLite module is properly installed in the `typescript-app` directory
2. The app has type definitions for SQLite in `typescript-app/src/types/expo-sqlite.d.ts`
3. The implementation in `typescript-app/src/services/texts.ts` is using the correct import syntax
4. The issue appears to be related to how the SQLite module is initialized or accessed

### Potential Solutions
1. Update the SQLite implementation to use the correct API
2. Ensure the SQLite module is properly initialized
3. Check for platform-specific issues (web vs. native)

## 3. UI Component Sizing Issues

### Problem
The buttons in the main menu are too large, making it impossible to see all of them on the same screen.

### Analysis
1. The UI components are defined in `typescript-app/src/screens/HomeScreen.tsx`
2. The grid layout for the Divine Office buttons uses fixed sizing that doesn't adapt well to different screen sizes
3. The current implementation has some adaptive sizing based on device fold state, but it's not sufficient

### Potential Solutions
1. Reduce the size of the grid items
2. Implement a more responsive layout that adapts to screen size
3. Add scrolling capability to ensure all buttons are accessible

## 4. Splash Screen Issues

### Problem
The splash screen on Android displays at a microscopic size and is nearly unreadable.

### Analysis
1. The splash screen configuration is in `typescript-app/app.json`
2. The splash screen image is located at `typescript-app/assets/splash.png`
3. The Android-specific configuration is in `typescript-app/android/app/src/main/res/values/styles.xml`

### Potential Solutions
1. Update the splash screen image to a higher resolution
2. Modify the Android splash screen configuration to use a different resize mode
3. Ensure the splash screen image has appropriate padding and sizing for visibility
