# Sanctissi-Missa - Project Conventions

(C)2025 Robin L. M. Cheung, MBA. All rights reserved.

## Overview

This document outlines the conventions, standards, and best practices to be followed while working on the Sanctissi-Missa project. Adherence to these conventions ensures consistency, maintainability, and collaboration efficiency across the project.

## General Principles

1. **Clean Room Implementation**
   - No direct code copying from reference implementation
   - Independent approach to problems
   - Document architectural decisions

2. **Separation of Concerns**
   - Clear boundaries between modules
   - Single responsibility principle
   - Proper encapsulation

3. **Documentation First**
   - Document before implementing
   - Keep documentation updated
   - Use standardized formats

## Coding Standards

### TypeScript Conventions

1. **Naming**
   - **PascalCase** for classes, interfaces, types, enums
   - **camelCase** for variables, functions, methods
   - **UPPER_SNAKE_CASE** for constants
   - **kebab-case** for file assets (images, etc.)

2. **File Structure**
   - One component per file
   - File names should match export name
   - Group related files in directories

3. **Types and Interfaces**
   - Prefer interfaces for public APIs
   - Use types for complex types, unions, and intersections
   - Document interfaces with JSDoc comments

4. **Code Organization**
   - Imports grouped by external/internal
   - Constants at the top of file
   - Hooks before other functions
   - Exports at the bottom

### React Native Conventions

1. **Component Structure**
   - Functional components with hooks
   - Props typing with TypeScript interfaces
   - Destructure props in function parameters
   - Default exports for components

2. **Styling**
   - Theme-aware styling
   - Use StyleSheet.create for styles
   - Group styles by component
   - Use constants for common values

3. **State Management**
   - Redux for global state
   - Context for component trees
   - useState for component-local state
   - useMemo for computed values

## Documentation Standards

### Markdown Conventions

1. **Structure**
   - Use proper heading hierarchy (H1, H2, H3, etc.)
   - Include table of contents for long documents
   - Use lists for sequential items
   - Use tables for structured data

2. **Formatting**
   - Code blocks with language specification
   - Use bold/italic for emphasis
   - Use blockquotes for notes/warnings
   - Use horizontal rules for section separation

### Mermaid Diagrams

1. **Diagram Types**
   - Flowcharts for processes
   - Sequence diagrams for interactions
   - Class diagrams for structure
   - Entity-relationship diagrams for data models

2. **Styling**
   - Consistent color schemes
   - Clear labels
   - Direction: top-to-bottom for hierarchies
   - Direction: left-to-right for processes

## Repository Management

### Git Conventions

1. **Branching Strategy**
   - `master` for stable releases
   - `develop` for integration
   - Feature branches named `feature/<name>`
   - Bugfix branches named `bugfix/<name>`

2. **Commit Messages**
   - Imperative mood ("Add feature" not "Added feature")
   - Brief summary in first line
   - Detailed description after blank line
   - Reference issues/tickets where applicable

3. **Pull Requests**
   - Descriptive title
   - Detailed description
   - Link to related issues
   - Include test evidence

### Version Control

1. **Versioning**
   - Semantic versioning (MAJOR.MINOR.PATCH)
   - Tagged releases
   - Changelog updates with each release
   - Version bump in package.json

## Project Structure

### Directory Organization

```
sanctissi-missa/
├── reference/                 # Original Divinum Officium (Perl)
├── typescript-app/            # Modern TypeScript Implementation
│   ├── src/                   # Source code
│   │   ├── components/        # Reusable UI components
│   │   ├── screens/           # Screen components
│   │   ├── services/          # Business logic
│   │   ├── store/             # State management
│   │   ├── hooks/             # Custom hooks
│   │   ├── utils/             # Utility functions
│   │   ├── theme/             # Styling themes
│   │   └── navigation/        # Navigation setup
│   ├── assets/                # Static assets
│   ├── docs/                  # Implementation-specific docs
│   └── __tests__/             # Test files
└── docs/                      # Project Documentation
    ├── ARCHITECTURE.md        # Architectural decisions
    ├── CONVENTIONS.md         # This document
    ├── ROADMAP.md             # Development roadmap
    └── audit_trail.md         # Change tracking
```

## Checklist Standards

For each checklist item, use the following status indicators:

- `[ ]` - Not yet begun
- `[/]` - Started but not complete
- `[X]` - Completed but not thoroughly tested
- `✅` - Tested and complete

## Documentation Maintenance

1. **Regular Updates**
   - Documentation review with each sprint
   - Update diagrams to reflect implementation changes
   - Keep checklists current with project status

2. **Attribution**
   - Include copyright notice on all documents
   - Attribute contributions appropriately
   - Include timestamp for significant updates

## Performance Standards

| Metric | Target | Rationale |
|--------|---------|-----------|
| App Size | < 50MB | Minimize download size |
| Cold Start | < 2s | Quick initial loading |
| Content Load | < 1s | Responsive user experience |
| Offline Support | 100% | Full functionality without network |
| Memory Usage | < 150MB | Efficient resource utilization |
| Battery Impact | Minimal | Power-efficient implementation |

## Accessibility Standards

1. **Screen Reader Support**
   - Proper semantic HTML/components
   - Accessible labels
   - Logical navigation

2. **Visual Accessibility**
   - Color contrast compliance
   - Resizable text
   - Alternative text for images
   - No reliance on color alone for information

## Testing Conventions

1. **Unit Tests**
   - Jest for testing
   - Test each component in isolation
   - Mock dependencies
   - Cover edge cases

2. **Integration Tests**
   - Test component interactions
   - Mock external services
   - Focus on user flows

3. **End-to-End Tests**
   - Detox for E2E testing
   - Cover critical user journeys
   - Test on multiple device configurations

## Audit Trail Conventions

Each entry in the audit trail should follow this format:

```
[YYYY-MM-DD HH:MM:SS TZ] Action Type: Description
Details:
- Point 1
- Point 2

Status: [Complete/In Progress/Blocked]
Attribution: [Creator/Editor]
```

## Storage and Database Conventions

1. **SQLite Schema**
   - Table names in snake_case
   - Primary keys named `id`
   - Foreign keys with `reference_id` format
   - Include created_at and updated_at fields

2. **Data Migration**
   - Versioned migration scripts
   - Backward compatibility
   - Data validation before migration
   - Rollback capability

## Conclusion

These conventions are established to ensure project quality, consistency, and efficiency. They should be reviewed periodically and updated as necessary to adapt to changing project requirements and industry best practices.