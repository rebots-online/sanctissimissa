# SanctissiMissa Web Application

A responsive web application for traditional Catholic liturgical texts and prayers.

## Features

- **Liturgical Texts**: Access Mass texts, Divine Office, and prayers in both Latin and English
- **Responsive Design**: Optimized for mobile, tablet, and desktop screens
- **Bilingual Support**: Toggle between Latin and English texts
- **Journal**: Keep a spiritual journal with text and audio entries
- **Liturgical Calendar**: View the liturgical calendar and access texts for specific dates

## Technology Stack

- **Frontend**: React, TypeScript, TailwindCSS
- **Database**: SQLite with SQL.js for client-side database operations
- **Routing**: React Router for navigation
- **State Management**: React Context API and hooks

## Project Structure

```
web-app/
├── public/                # Static assets and SQLite database
├── scripts/              # Build and utility scripts
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── layout/       # Layout components
│   │   ├── liturgical/   # Liturgical text components
│   │   ├── mass/         # Mass-specific components
│   │   └── navigation/   # Navigation components
│   ├── pages/            # Page components
│   ├── services/         # Service layer
│   │   └── database/     # Database services
│   ├── shared/           # Shared utilities and types
│   │   └── database/     # Database adapter and utilities
│   └── types/            # TypeScript type definitions
└── package.json          # Project dependencies
```

## Responsive Design Implementation

The application is designed to be responsive across all device sizes:

- **Mobile**: Single column layout with collapsible navigation
- **Tablet**: Two-column layout for content-heavy pages
- **Desktop**: Multi-column layout with side navigation

Key responsive components:

- `ResponsiveNavbar`: Adapts navigation menu based on screen size
- `ResponsiveLayout`: Provides consistent layout structure across the application
- `ResponsiveLiturgicalText`: Displays liturgical texts with appropriate formatting for different screen sizes

## Database Integration

The application uses SQLite with SQL.js for client-side database operations:

- **SQLiteAdapter**: Core adapter for database operations
- **LiturgicalService**: Service layer for accessing liturgical data
- **Data Types**: Strongly typed interfaces for all database entities

## Routing System

The routing system is implemented using React Router:

- **Route Configuration**: Centralized route configuration in App.tsx
- **Dynamic Routes**: Support for dynamic parameters (date, category, ID)
- **Nested Routes**: Hierarchical route structure for related content

## Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm run dev
   ```

### Building for Production

```
npm run build
```

## Testing

```
npm run test
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.
