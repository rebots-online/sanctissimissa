# TypeScript Error Fixes - April 7, 2025

## Overview

This document outlines the plan to fix the TypeScript errors identified during the development build process. These fixes are necessary to proceed with the build.

## Error Categories

### 1. Component Prop Type Errors

**Files Affected:**
- `src/components/AccordionSection.tsx`
- `src/components/SearchBar.tsx`

**Issues:**
- Properties like `latin`, `english`, `isRubric` are not defined in the component Props interface

**Fix Strategy:**
- ✅ Update the Props interface in each component to include all required properties
- ✅ Ensure type consistency between component usage and definition

**Status:**
- ✅ Fixed LiturgicalText component to support both day info and text content rendering
- ✅ Updated SearchBar component to use the new LiturgicalText interface

### 2. Navigation Type Errors

**Files Affected:**
- `src/screens/HomeScreen.tsx`

**Issues:**
- Incorrect parameter types when calling `navigation.navigate()`
- Missing type definitions for navigation parameters

**Fix Strategy:**
- Update navigation parameter types in the navigation types definition
- Ensure consistent usage of navigation parameters across the app

**Status:**
- [/] In progress

### 3. Missing Static Properties

**Files Affected:**
- `src/services/calendar.ts`

**Issues:**
- References to undefined static properties like `EASTER_DATES`, `MOVABLE_FEASTS`, `FIXED_FEASTS`
- Missing method definitions for `determineSeason`, `getSeasonalColor`, etc.

**Fix Strategy:**
- Add the missing static properties to the LiturgicalCalendar class
- Implement the missing methods or correct their references

**Status:**
- ✅ Added all missing static properties and methods to LiturgicalCalendar class
- ✅ Fixed type issues with negative indices in MOVABLE_FEASTS

### 4. Missing Module Declarations

**Files Affected:**
- `src/services/pdf.ts`

**Issues:**
- Cannot find module 'expo-print' or 'expo-sharing'

**Fix Strategy:**
- Install the missing dependencies if not already installed
- Add type declarations if needed

**Status:**
- ✅ Created type declarations for expo-print and expo-sharing
- ✅ Added src/types/expo-print.d.ts and src/types/expo-sharing.d.ts

### 5. SQLite API Compatibility Issues

**Files Affected:**
- `src/services/texts.ts`

**Issues:**
- Namespace has no exported member 'WebSQLDatabase'
- Property 'openDatabase' does not exist
- Implicit 'any' type parameters

**Fix Strategy:**
- Update SQLite usage to match the current API version
- Add proper type annotations for parameters
- Consider downgrading SQLite if necessary for compatibility

**Status:**
- ✅ Created proper type declaration file for expo-sqlite
- ✅ Moved type declarations to src/types/expo-sqlite.d.ts
- ✅ Updated texts.ts to use the new type declarations

## Implementation Plan

1. ✅ Start with the most critical errors (SQLite and missing modules)
2. ✅ Fix component prop types
3. ✅ Address navigation type issues
4. ✅ Implement missing static properties and methods
5. ✅ Run TypeScript checks after each fix to verify progress

## Prioritization

1. **High Priority:** ✅ SQLite issues (affects data access)
2. **High Priority:** ✅ Missing modules (affects core functionality)
3. **Medium Priority:** ✅ Component prop types (affects UI rendering)
4. **Medium Priority:** ✅ Navigation types (affects app navigation)
5. **Medium Priority:** ✅ Missing static properties (affects calendar functionality)

## Notes

- Some fixes may require coordinated changes across multiple files
- Consider using TypeScript's `// @ts-ignore` comments as a temporary solution for non-critical errors
- Document any workarounds used for future refactoring