# Sanctissimissa: St. Android's Missal & Breviary

## Overview

Sanctissimissa is a comprehensive application providing access to the Traditional Latin Mass and Divine Office in the Extraordinary Form of the Roman Rite. This clean-room implementation uses React Native and Vite to create a cross-platform experience for both Android devices and the web.

## Project Name

**Full Name**: Sanctissimissa: St. Android's Missal & Breviary in the Extraordinary Form of the Roman Rite

**Short Names** (used where space is limited):
- Sanctissimissa: St. Android's Missal
- St. Android's Missal
- Sanctissimissa

## Documentation Structure

This documentation provides a comprehensive guide to the architecture, implementation, and migration process for the Sanctissimissa application:

1. **ARCHITECTURE.md**: Detailed architectural overview with diagrams
2. **IMPLEMENTATION.md**: Implementation details and code examples
3. **CHECKLIST.md**: Step-by-step implementation checklist
4. **DETAILED_IMPLEMENTATION_PLAN.md**: Comprehensive implementation plan
5. **DATABASE_SCHEMA.md**: Database structure and migration strategy
6. **MIGRATION_GUIDE.md**: Guide for migrating from Expo to React Native/Vite

## Key Features

- **Traditional Latin Mass**: Complete texts for the Mass in the Extraordinary Form
- **Divine Office**: All hours of the Divine Office (Matins, Lauds, Prime, etc.)
- **Bilingual Display**: Latin and English side-by-side
- **Liturgical Calendar**: Comprehensive implementation of the traditional calendar
- **Educational Layer**: Glossary, pronunciations, and explanations
- **Responsive Design**: Optimized for phones, tablets, and foldable devices
- **Offline Support**: Full functionality without internet connection
- **Cross-Platform**: Android native app and Progressive Web App

## Technology Stack

- **Core Framework**: React Native
- **Web Support**: Vite + React Native Web
- **State Management**: Redux Toolkit
- **Navigation**: React Navigation
- **Storage**: 
  - Native: SQLite (react-native-sqlite-storage)
  - Web: IndexedDB
- **UI Components**: Custom components with responsive design
- **Build System**: 
  - Android: Gradle
  - Web: Vite

## Project Structure

```
/
├── android/                  # Android-specific files
├── ios/                      # iOS-specific files (if needed)
├── src/
│   ├── core/                 # Platform-agnostic core logic
│   ├── components/           # Shared UI components
│   ├── services/             # Business logic services
│   ├── hooks/                # Custom React hooks
│   ├── store/                # State management
│   ├── types/                # TypeScript type definitions
│   ├── utils/                # Utility functions
│   ├── platforms/            # Platform-specific implementations
│   │   ├── native/           # Native-specific code
│   │   └── web/              # Web-specific code
│   ├── screens/              # Screen components
│   ├── navigation/           # Navigation configuration
│   └── assets/               # Shared assets
├── public/                   # Static web assets
├── docs/                     # Documentation
├── __tests__/                # Test files
├── index.js                  # Native entry point
├── index.web.js              # Web entry point
├── vite.config.ts            # Vite configuration
└── package.json              # Project dependencies
```

## Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn
- React Native CLI
- Android Studio (for Android development)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/sanctissimissa.git
   cd sanctissimissa
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   # For Android
   npm run android
   
   # For Web
   npm run web
   ```

## Building for Production

### Android

```bash
# Generate a release build
npm run build:android
```

### Web

```bash
# Build for production
npm run build:web
```

## Contributing

Please read the contribution guidelines in CONTRIBUTING.md before submitting pull requests.

## License

This project is licensed under the [MIT License](LICENSE).

## Acknowledgments

- Original Divinum Officium project for the liturgical texts and calendar logic
- Contributors to the traditional Latin Mass and Divine Office resources
