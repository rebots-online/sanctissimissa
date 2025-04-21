# SanctissiMissa Development Roadmap

This roadmap outlines the planned development phases for the SanctissiMissa application, a web-first implementation of a traditional Catholic liturgical app focusing on the Extraordinary Form.

## Phase 1: Core Infrastructure (Current Phase)

### Web Application Foundation
- [x] Initialize React + TypeScript project with Vite
- [x] Configure Tailwind CSS for styling
- [x] Set up project structure (components, services, models)
- [x] Configure routing with React Router
- [x] Create basic layout with navigation

### Liturgical Calendar
- [x] Implement Easter date calculation algorithm
- [x] Create liturgical day model and interfaces
- [x] Implement basic liturgical calendar service
- [x] Create calendar page with date navigation
- [x] Display current liturgical day information

### Database Layer
- [ ] Set up IndexedDB database schema
- [ ] Create data access services for liturgical texts
- [ ] Implement data import functionality
- [ ] Create sample data files for testing
- [ ] Add database initialization to application startup

## Phase 2: Liturgical Texts Implementation

### Mass Texts
- [x] Create Mass text models and interfaces
- [x] Implement Mass text retrieval service
- [x] Design Mass text display components
- [x] Create Mass page with proper and ordinary texts
- [x] Add rubrics and explanations

### Divine Office
- [x] Create Divine Office models and interfaces
- [x] Implement hour selection (Matins, Lauds, etc.)
- [x] Design Office text display components
- [x] Create Office page with psalms, readings, etc.
- [x] Add proper antiphons and prayers

### Prayer Texts
- [x] Create prayer models and interfaces
- [x] Implement prayer category organization
- [x] Add Rosary prayers and mysteries
- [x] Add Divine Mercy Chaplet
- [x] Add other traditional prayers

## Phase 3: User Features

### User Journal
- [x] Create journal entry model and interface
- [x] Implement journal entry creation and editing
- [x] Add audio recording functionality
- [x] Implement context menu for note creation
- [ ] Display notes at their saved positions on the canvas
- [ ] Implement editing and deletion of existing notes
- [ ] Create journal entry listing and filtering
- [ ] Add tagging and categorization
- [ ] Add search functionality for notes
- [ ] Implement note sharing and export

### Settings and Preferences
- [ ] Create user settings model
- [ ] Implement language preference (Latin/English)
- [ ] Add dark mode support
- [ ] Create settings page
- [ ] Implement settings persistence

### Offline Support
- [ ] Configure service worker for PWA
- [ ] Implement caching strategy for liturgical texts
- [ ] Add offline indicator and synchronization
- [ ] Test offline functionality
- [ ] Create installation instructions

## Phase 4: Enhanced Features

### Print & Export Features (High Priority)
- [ ] Add "Print" and "Export to PDF" button for current day's Mass and Breviary Office (single-day export)
- [ ] Implement print-optimized stylesheets for PDF/print output
- [ ] Create batch export tool to pre-render and export a set of Masses, Propers, and Breviary Offices for a date range (multi-day export)
- [ ] Add UI for selecting date/time ranges and export type
- [ ] Ensure both single and batch exports are accessible from the web interface

### Altar Server Resource
- [ ] Create conceptual explanations for liturgical actions
- [ ] Design interactive rubrics guide
- [ ] Add visual aids and diagrams
- [ ] Implement step-by-step instructions
- [ ] Add search and reference functionality
- [ ] Add a few more Devotions;

### Community Features
- [ ] Design user account system
- [ ] Implement data synchronization
- [ ] Add sharing functionality for journal entries
- [ ] Create community prayer requests
- [ ] Implement parish finder

### Advanced Calendar Features
- [ ] Add local feast day support
- [ ] Implement calendar customization
- [ ] Add liturgical season visualizations
- [ ] Create calendar export functionality
- [ ] Add reminders for holy days and feast days

## Phase 5: Deployment and Expansion

### Web Deployment
- [ ] Set up CI/CD pipeline
- [ ] Configure hosting and domain
- [ ] Implement analytics and monitoring
- [ ] Create user documentation
- [ ] Launch web application

### Mobile Optimization
- [ ] Enhance responsive design for mobile devices
- [ ] Test on various screen sizes and devices
- [ ] Optimize performance for mobile browsers
- [ ] Add mobile-specific features
- [ ] Create installation instructions for home screen

### Future Considerations
- [ ] Evaluate native app development using React Native
- [ ] Consider adding Ordinary Form (Novus Ordo) support
- [ ] Explore integration with external calendars
- [ ] Add multilingual support beyond Latin/English
- [ ] Develop companion applications for specific use cases

## Timeline

- **Phase 1**: Q2 2025
- **Phase 2**: Q3 2025
- **Phase 3**: Q4 2025
- **Phase 4**: Q1 2026
- **Phase 5**: Q2 2026

This timeline is subject to adjustment based on development progress and feedback.
