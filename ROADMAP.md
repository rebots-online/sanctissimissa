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
- [ ] Create Mass text models and interfaces
- [ ] Implement Mass text retrieval service
- [ ] Design Mass text display components
- [ ] Create Mass page with proper and ordinary texts
- [ ] Add rubrics and explanations

### Divine Office
- [ ] Create Divine Office models and interfaces
- [ ] Implement hour selection (Matins, Lauds, etc.)
- [ ] Design Office text display components
- [ ] Create Office page with psalms, readings, etc.
- [ ] Add proper antiphons and prayers

### Prayer Texts
- [ ] Create prayer models and interfaces
- [ ] Implement prayer category organization
- [ ] Add Rosary prayers and mysteries
- [ ] Add Divine Mercy Chaplet
- [ ] Add other traditional prayers

## Phase 3: User Features

### User Journal
- [ ] Create journal entry model and interface
- [ ] Implement journal entry creation and editing
- [ ] Add audio recording functionality
- [ ] Create journal entry listing and filtering
- [ ] Add tagging and categorization

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

### Altar Server Resource
- [ ] Create conceptual explanations for liturgical actions
- [ ] Design interactive rubrics guide
- [ ] Add visual aids and diagrams
- [ ] Implement step-by-step instructions
- [ ] Add search and reference functionality

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
