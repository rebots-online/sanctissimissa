# Traditional Liturgy of the Hours Reminder System

## Traditional Hours Structure
The traditional Roman Breviary (1962) has eight canonical hours:

1. **Matins** (during the night, often anticipated the evening before)
2. **Lauds** (dawn)
3. **Prime** (early morning, around 6 AM)
4. **Terce** (mid-morning, around 9 AM)
5. **Sext** (midday, around noon)
6. **None** (mid-afternoon, around 3 PM)
7. **Vespers** (evening, around 6 PM)
8. **Compline** (night, before retiring)

## Reminder System Design

### User Preferences Configuration
- Enable/disable reminders
- Reminder style (notification, subtle in-app, or both)
- Custom times for each hour
- Days of the week to receive reminders
- Which hours to receive reminders for
- Reminder lead time (minutes before the hour)
- Quiet hours (no notifications)

### Subtle In-App Reminder Component
For users who are actively using the app, a non-intrusive reminder:
- Small banner at the top of the screen
- Shows upcoming hour and time remaining
- Option to open directly to the correct hour
- Respectful, reverent tone

### System Notification Service
For background reminders when the app isn't open:
- Scheduled notifications for enabled hours
- Appropriate reminder text based on the hour
- Direct link to the correct office
- Respects quiet hours settings

### Liturgical Calendar Integration
The reminder system is aware of the liturgical calendar:
- Provides the correct office based on the day
- Handles special cases like First Vespers
- Accounts for ranking and precedence rules
- Links directly to the proper texts

## Visual Design for Reminders

### Subtle In-App Reminder
A non-intrusive banner that appears at the top of the screen:
```
┌─────────────────────────────────────────────────┐
│ 🕓 Vespers in 15 minutes                   Open │
└─────────────────────────────────────────────────┘
```

### Home Screen Widget (if platform supports)
A simple widget showing the next hour and time until it begins:
```
┌─────────────────────────────────┐
│ Liturgy of the Hours            │
│                                 │
│ Next: Vespers                   │
│ Time: 5:45 PM (in 12 minutes)   │
│                                 │
│ Tap to open                     │
└─────────────────────────────────┘
```

### System Notification
A standard system notification with appropriate icon and text:
```
┌─────────────────────────────────┐
│ ✝ SanctissiMissa                │
│                                 │
│ Time for Vespers                │
│ As evening falls, it is time    │
│ for Vespers.                    │
└─────────────────────────────────┘
```

## User Experience Considerations

### First-Time Setup
When users first access the Hours section:
1. Explain the traditional hours and their significance
2. Offer to set up reminders with recommended times
3. Provide options for customization
4. Explain how to adjust settings later

### Respectful Reminder Style
Ensure reminders are:
1. Reverent in tone
2. Non-intrusive
3. Optional and easily disabled
4. Contextually appropriate to the hour

### Quick Access from Reminders
When a user taps a reminder:
1. Open directly to the correct hour
2. Pre-load the texts for immediate access
3. Offer a "mark as prayed" option after completion

## Implementation Plan

### Phase 1: Core Reminder System (1 week)
1. Implement user preferences for hours
2. Create the subtle in-app reminder component
3. Set up basic notification scheduling

### Phase 2: Liturgical Integration (1 week)
1. Connect reminder system to liturgical calendar
2. Implement proper office determination
3. Create direct links to the correct texts

### Phase 3: User Experience Refinement (1 week)
1. Design and implement first-time setup flow
2. Create settings interface for customization
3. Add "mark as prayed" functionality
