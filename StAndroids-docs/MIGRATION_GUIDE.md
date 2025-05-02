# Sanctissimissa: St. Android's Missal & Breviary - Migration Guide

This document outlines the strategy for migrating from the Expo-based implementation to the clean-room React Native/Vite implementation.

## 1. Code Migration Strategy

### 1.1 Core Logic Migration

The core business logic should be migrated with minimal changes to ensure functional equivalence:

| Component | Migration Approach | Notes |
|-----------|-------------------|-------|
| Calendar Logic | Direct port with interface updates | Preserve all calculations and algorithms |
| Text Processing | Direct port with interface updates | Maintain text formatting and parsing logic |
| Data Models | Direct port with TypeScript enhancements | Add stronger typing and validation |
| State Management | Refactor to use Redux Toolkit | Preserve state structure and actions |

### 1.2 UI Component Migration

UI components require more significant adaptation for the new architecture:

| Component | Migration Approach | Notes |
|-----------|-------------------|-------|
| Screen Components | Refactor with platform adapters | Maintain layout and functionality |
| Navigation | Reimplement with React Navigation | Preserve navigation structure |
| Responsive Design | Enhance with custom hooks | Improve support for different devices |
| Educational Layer | Direct port with interface updates | Maintain glossary and educational features |

### 1.3 Platform-Specific Code

Expo-specific code must be replaced with platform-specific implementations:

| Expo Module | Replacement | Migration Approach |
|-------------|-------------|-------------------|
| expo-sqlite | react-native-sqlite-storage / IndexedDB | Create storage adapter interface |
| expo-file-system | react-native-fs / File API | Create file system adapter interface |
| expo-device | react-native-device-info / Browser API | Create device info adapter interface |
| expo-splash-screen | react-native-splash-screen | Direct replacement |
| expo-status-bar | react-native-status-bar | Direct replacement |

## 2. Data Migration Strategy

### 2.1 Database Migration

The SQLite database structure will be preserved with enhancements:

1. **Extract Schema**: Document the current schema structure
2. **Create Migration Scripts**: Develop scripts to migrate data to the new schema
3. **Implement Data Validation**: Add validation to ensure data integrity
4. **Test Migration**: Verify data consistency after migration

### 2.2 User Preferences Migration

User preferences and settings will be migrated to maintain user experience:

1. **Identify Settings**: Document all user-configurable settings
2. **Create Migration Utility**: Develop utility to extract and transform settings
3. **Implement Import/Export**: Add functionality for users to backup/restore settings
4. **Test Settings Migration**: Verify settings are correctly preserved

### 2.3 Assets Migration

Static assets will be migrated with organization improvements:

1. **Categorize Assets**: Organize assets by type and purpose
2. **Optimize Assets**: Compress and optimize for different platforms
3. **Create Asset Loading System**: Implement efficient asset loading
4. **Test Asset Loading**: Verify assets display correctly on all platforms

## 3. Implementation Migration Process

### 3.1 Phase-Based Migration

The migration will follow a phased approach:

1. **Phase 1**: Set up new project structure and core infrastructure
2. **Phase 2**: Migrate core business logic and data models
3. **Phase 3**: Implement UI components and navigation
4. **Phase 4**: Add platform-specific features and optimizations
5. **Phase 5**: Test and refine the implementation

### 3.2 Testing Strategy

Comprehensive testing will ensure functional equivalence:

1. **Unit Tests**: Test individual components and functions
2. **Integration Tests**: Test component interactions and data flow
3. **End-to-End Tests**: Test complete user workflows
4. **Cross-Platform Tests**: Verify functionality on all target platforms
5. **Performance Tests**: Ensure performance meets or exceeds the original

### 3.3 Deployment Strategy

A staged deployment approach will minimize user disruption:

1. **Alpha Release**: Internal testing with limited users
2. **Beta Release**: Expanded testing with opt-in users
3. **Staged Rollout**: Gradual release to production users
4. **Full Release**: Complete migration for all users

## 4. Code Reference Guide

### 4.1 Original Implementation Reference

Key files from the original implementation to reference:

| File | Purpose | Migration Notes |
|------|---------|----------------|
| `src/services/calendar.ts` | Liturgical calendar calculations | Preserve all algorithms |
| `src/services/texts.ts` | Text retrieval and formatting | Maintain data access patterns |
| `src/services/dataManager.ts` | Central data coordination | Refactor with adapter pattern |
| `src/components/LiturgicalText.tsx` | Bilingual text display | Preserve rendering logic |
| `src/screens/HomeScreen.tsx` | Main dashboard | Maintain layout and navigation |
| `src/screens/MassScreen.tsx` | Mass text display | Preserve content organization |
| `src/screens/OfficeScreen.tsx` | Office hour display | Maintain hour selection and display |

### 4.2 New Implementation Structure

Key files in the new implementation:

| File | Purpose | Implementation Notes |
|------|---------|---------------------|
| `src/core/calendar.ts` | Platform-agnostic calendar logic | Pure TypeScript implementation |
| `src/core/texts.ts` | Platform-agnostic text processing | Pure TypeScript implementation |
| `src/platforms/storage-adapter.ts` | Storage abstraction | Platform-specific implementations |
| `src/platforms/file-system-adapter.ts` | File system abstraction | Platform-specific implementations |
| `src/components/liturgical-text.tsx` | Bilingual text display | Enhanced with educational features |
| `src/screens/home-screen.tsx` | Main dashboard | Responsive design for all platforms |
| `src/services/data-manager.ts` | Central data coordination | Uses dependency injection |

## 5. Troubleshooting Guide

### 5.1 Common Migration Issues

| Issue | Solution |
|-------|----------|
| SQLite compatibility | Use the storage adapter to abstract database differences |
| Navigation differences | Ensure consistent navigation patterns across platforms |
| Asset loading | Implement platform-specific asset loading strategies |
| Performance issues | Profile and optimize critical paths |
| UI inconsistencies | Use responsive design principles and platform detection |

### 5.2 Platform-Specific Considerations

| Platform | Considerations |
|----------|---------------|
| Android | Test on various screen sizes and Android versions |
| Web | Ensure PWA features work correctly (offline, installation) |
| Foldable Devices | Test different fold states and screen configurations |

## 6. Timeline and Milestones

| Milestone | Estimated Timeline | Key Deliverables |
|-----------|-------------------|-----------------|
| Project Setup | Week 1 | Repository, structure, core dependencies |
| Core Logic Migration | Weeks 2-3 | Calendar, texts, data models |
| UI Implementation | Weeks 4-5 | Screens, components, navigation |
| Platform Features | Weeks 6-7 | Native and web-specific features |
| Testing and Refinement | Weeks 8-9 | Comprehensive testing, bug fixes |
| Initial Release | Week 10 | Web and Android releases |
