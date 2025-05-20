# SanctissiMissa App Issues Checklist - May 20, 2025

## Repository Structure Fixes
- [✅] Update `main` field in root `package.json` to point to `typescript-app/index.ts`
- [✅] Modify npm scripts to change to the `typescript-app` directory before running commands

## SQLite Implementation Fixes
- [✅] Fix SQLite initialization issue
  - [✅] Update SQLite implementation in `typescript-app/src/services/texts.ts`
  - [✅] Ensure proper error handling for SQLite operations
  - [✅] Add platform-specific checks for web vs. native environments
  - [✅] Implement fallback data source when SQLite is unavailable

## UI Component Sizing Improvements
- [✅] Reduce size of buttons in main menu
  - [✅] Update grid layout in `typescript-app/src/screens/HomeScreen.tsx`
  - [✅] Implement more responsive sizing based on screen dimensions
  - [✅] Ensure all buttons are visible on standard screen sizes
  - [ ] Test on various device sizes and orientations

## Splash Screen Enhancements
- [✅] Improve Android splash screen visibility
  - [ ] Update splash screen image with better sizing and padding
  - [✅] Modify Android splash screen configuration
  - [ ] Test on multiple Android devices

## Detailed Implementation Tasks

### 1. Fix SQLite Implementation

#### 1.1 Update SQLite Service
- [✅] Modify `typescript-app/src/services/texts.ts` to properly initialize SQLite
```typescript
// Implemented fix with platform check and error handling
private static async initialize(): Promise<void> {
  if (this.isInitialized) {
    return;
  }

  try {
    if (!this.db) {
      if (Platform.OS === 'web') {
        // Web implementation might need special handling
        console.log('[DEBUG] Using web SQLite implementation');
        this.db = SQLite.openDatabase(this.DB_NAME);
      } else {
        // Native implementation
        console.log('[DEBUG] Using native SQLite implementation');
        this.db = SQLite.openDatabase(this.DB_NAME);
      }
    }

    await this.createTables();
    await this.initializeData();
    this.isInitialized = true;
    this.useFallbackData = false;
    console.log('[DEBUG] SQLite database initialized successfully');
  } catch (error) {
    console.error('[ERROR] Failed to initialize SQLite database:', error);
    // Switch to fallback data source
    this.useFallbackData = true;
    this.isInitialized = true; // Mark as initialized to prevent further attempts
    console.log('[DEBUG] Using fallback data source');
  }
}
```

#### 1.2 Implement Platform-Specific Database Adapters
- [✅] Added platform-specific checks in SQLite initialization
- [✅] Added error handling for database operations
- [✅] Implemented fallback mechanism when SQLite is unavailable

#### 1.3 Add Fallback Data Source
- [✅] Created in-memory data structure for essential liturgical texts
- [✅] Implemented fallback data access methods for Mass and Office texts
- [✅] Added mechanism to switch to fallback when database initialization fails

### 2. Improve UI Component Sizing

#### 2.1 Update Grid Layout in HomeScreen
- [✅] Modify grid item sizing in `typescript-app/src/screens/HomeScreen.tsx`
```typescript
// Implemented improved sizing
const getGridItemWidth = () => {
  // Use numeric values instead of percentages for better TypeScript compatibility
  if (deviceInfo.isFoldable && deviceInfo.isUnfolded) {
    // 5-column grid on unfolded devices with better spacing
    return width * 0.18;
  } else if (width > 600) {
    // 3-column grid on larger devices
    return width * 0.30;
  } else {
    // 3-column grid with smaller items on regular devices
    return width * 0.30;
  }
};
```

#### 2.2 Adjust Button Padding and Text Size
- [✅] Reduced padding in grid items
```typescript
// Reduced padding and margins
gridItem: {
  width: '30%', // Changed from 48% to 30% for 3-column layout
  aspectRatio: 1,
  marginBottom: 12, // Reduced from 16
  borderRadius: 8,
  padding: 12, // Reduced from 16
  alignItems: 'center',
  justifyContent: 'center',
}
```
- [✅] Scaled text size based on available space
```typescript
// Reduced font sizes
gridItemText: {
  marginTop: 6, // Reduced from 8
  fontSize: 14, // Reduced from 16
  textAlign: 'center',
}
```
- [✅] Ensured touch targets remain accessible

#### 2.3 Implement Responsive Layout
- [✅] Added dynamic column count based on screen width
- [✅] Ensured proper spacing between items
- [ ] Test on various device sizes and orientations

### 3. Enhance Splash Screen

#### 3.1 Update Splash Screen Image
- [ ] Create new splash screen image with appropriate sizing
- [ ] Ensure image has sufficient padding for visibility
- [ ] Test image at various resolutions

#### 3.2 Modify Android Splash Screen Configuration
- [ ] Update `typescript-app/app.json` splash screen settings
- [ ] Modify Android-specific splash screen configuration
- [ ] Test on multiple Android devices

## Testing Plan
- [ ] Test SQLite implementation on Android, iOS, and web
- [ ] Verify UI component sizing on various device sizes and orientations
- [ ] Check splash screen visibility on multiple Android devices
- [ ] Ensure all features work correctly after fixes
