# SanctissiMissa Web Application Build Guide

This document provides instructions for building and deploying the SanctissiMissa web application.

## Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)
- Git

## Development

### Running the Development Server

1. Make sure you're in the web-app directory:
   ```bash
   cd web-app
   ```

2. Start the development server:
   ```bash
   npm run dev
   # or directly with
   npx vite
   ```

3. Open your browser to [http://localhost:5173](http://localhost:5173)

> **Important:** The development server must be run from the web-app directory, not from the root directory.

### Building for Production

1. Clone the repository:
   ```bash
   git clone https://github.com/rebots-online/sanctissimissa.git
   cd sanctissimissa/web-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run TypeScript check:
   ```bash
   npx tsc --noEmit
   ```

4. Run ESLint:
   ```bash
   npm run lint
   ```

5. Build the application:
   ```bash
   npm run build
   ```

6. Preview the build:
   ```bash
   npm run preview
   ```

### Using Build Scripts

For convenience, we've created build scripts that automate the process:

1. Standard build script (includes TypeScript checks):
   ```bash
   ./scripts/build-dev.sh
   ```

2. Bypass build script (skips TypeScript checks for development):
   ```bash
   ./scripts/build-dev-bypass.sh
   ```

3. Verify the build:
   ```bash
   ./scripts/verify-dev-build.sh
   ```

## Known Issues and Workarounds

### TypeScript Errors

There are currently some TypeScript errors in the codebase related to model definitions and database schema mismatches. For development purposes, you can use the bypass build script to build the application without TypeScript checks.

### File Casing Issues

Be careful with file names and imports. TypeScript is case-sensitive, and having files with similar names but different casing can cause build errors.

## Reference Files Setup

The application requires reference files containing liturgical data. These files are stored in a directory called `sanctissimissa-reference` which should be accessible to the web application.

### Setting Up Reference Files

1. Ensure the `sanctissimissa-reference` directory is available in the project root or at a location accessible to the web application

2. Create a symbolic link to the reference files in the web-app directory:
   ```bash
   cd web-app
   ln -s ../sanctissimissa-reference .
   ```

3. If you're using a different location for the reference files, update the symbolic link accordingly:
   ```bash
   ln -s /path/to/sanctissimissa-reference .
   ```

> **Note:** The reference files must be accessible at runtime for the application to function properly. If you're deploying the application, make sure to include the reference files in your deployment.

## Data Import Process

The application requires liturgical data to function properly. The data import process has been automated and will run on first load if no data is found in the database. This process reads data from the reference files and stores it in the IndexedDB database.

### Manual Data Import

If you need to manually trigger the data import process:

1. Clear the IndexedDB database using the browser's developer tools
2. Reload the application

### Bypass Import Check

To bypass the import check during development, add the `bypass_import` query parameter to the URL:

```
http://localhost:5173/?bypass_import=true
```

## Deployment

### Local Deployment

1. Build the application using one of the build scripts
2. Serve the `dist` directory using a static file server:
   ```bash
   npx serve dist
   ```

> **Note:** Using Vite's preview command (`npm run preview`) may result in 404 errors due to path issues. Using a static file server like `serve` is recommended for testing the production build.
>
> If you encounter 404 errors, you may need to manually edit the paths in `dist/index.html` to use relative paths (change `/assets/...` to `./assets/...`).

### Production Deployment

For production deployment, follow these additional steps:

1. Update the `vite.config.ts` file with the production base URL
2. Build the application with the production configuration:
   ```bash
   npm run build -- --mode production
   ```
3. Deploy the contents of the `dist` directory to your web server

## Troubleshooting

### Build Fails with TypeScript Errors

If the build fails with TypeScript errors, you can:

1. Fix the errors in the codebase
2. Use the bypass build script for development purposes

### Application Shows Blank Screen

If the application shows a blank screen:

1. Check the browser console for errors
2. Verify that the data import process completed successfully
3. Check if the IndexedDB database was created and populated
4. Ensure the reference files are properly linked and accessible
5. Verify that the router is configured correctly (see Router Configuration section below)

### Router Configuration

The application uses React Router for navigation. For better compatibility with static hosting and to avoid issues with path resolution, we use HashRouter instead of BrowserRouter.

If you encounter routing issues:

1. Check that App.tsx is using HashRouter:
   ```tsx
   import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom'
   ```

2. Ensure that vite.config.ts is configured correctly:
   ```ts
   // For development
   base: '/',

   // For production
   base: './',
   ```

### Import Process Fails

If the data import process fails:

1. Check the browser console for specific error messages
2. Verify that the reference files are available
3. Clear the IndexedDB database and try again
