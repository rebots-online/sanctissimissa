# Sanctissimissa: St. Android's Missal & Breviary - Architecture

## 1. Conceptual Architecture

### 1.1 System Overview

```mermaid
graph TD
    subgraph "Conceptual Architecture"
        A[User Interface Layer] --> B[Application Logic Layer]
        B --> C[Data Access Layer]
        C --> D[Storage Layer]
        
        E[Cross-Platform Core] --- A
        E --- B
        E --- C
        
        F[Platform-Specific Adapters] --- A
        F --- C
        F --- D
    end
    
    subgraph "Platform Implementations"
        G[Web/PWA] --> F
        H[Android Native] --> F
    end
    
    subgraph "Shared Resources"
        I[Liturgical Texts]
        J[Calendar Logic]
        K[UI Components]
        L[State Management]
    end
    
    E --> I
    E --> J
    E --> K
    E --> L
```

### 1.2 Core Principles

1. **Platform Agnosticism**: Core business logic must function identically across all platforms
2. **Dependency Injection**: Platform-specific implementations injected into core logic
3. **Single Source of Truth**: Shared data models and state management
4. **Progressive Enhancement**: Base functionality works everywhere, enhanced where supported
5. **Offline-First**: All critical functionality works without network connectivity

### 1.3 Architectural Patterns

```mermaid
graph LR
    subgraph "Architectural Patterns"
        A[Repository Pattern] --- D[Data Access]
        B[Adapter Pattern] --- E[Platform Integration]
        C[Provider Pattern] --- F[State Management]
    end
```

## 2. Detailed System Design

### 2.1 Module Structure

```mermaid
graph TD
    subgraph "Application Structure"
        A[Entry Points] --> B[Core Modules]
        A --> C[Platform Adapters]
        B --> D[Shared Components]
        B --> E[Services]
        B --> F[State Management]
        C --> G[Native Adapters]
        C --> H[Web Adapters]
    end
    
    subgraph "Entry Points"
        A1[index.js - Native]
        A2[index.web.js - Web]
    end
    
    subgraph "Core Modules"
        B1[Liturgical Calendar]
        B2[Text Processing]
        B3[Navigation]
        B4[UI Components]
    end
    
    subgraph "Platform Adapters"
        C1[Storage Adapter]
        C2[File System Adapter]
        C3[Device Info Adapter]
        C4[Navigation Adapter]
    end
```

### 2.2 Data Model

```mermaid
erDiagram
    LITURGICAL_DAY {
        string date
        string season
        string celebration
        int rank
        string color
        boolean allowsVigil
        array commemorations
    }
    
    MASS_PROPER {
        string id
        string season
        string celebration
        object introit
        object collect
        object epistle
        object gradual
        object alleluia
        object tract
        object gospel
        object offertory
        object secret
        object communion
        object postcommunion
    }
    
    OFFICE_HOUR {
        string id
        string season
        string celebration
        string hour
        object invitatory
        object hymn
        object antiphons
        object psalms
        object lessons
        object responsories
        object prayers
    }
    
    BILINGUAL_TEXT {
        string latin
        string english
        boolean isRubric
        boolean isResponse
        object glossary
        object pronunciation
    }
    
    LITURGICAL_DAY ||--o{ MASS_PROPER : has
    LITURGICAL_DAY ||--o{ OFFICE_HOUR : has
    MASS_PROPER ||--o{ BILINGUAL_TEXT : contains
    OFFICE_HOUR ||--o{ BILINGUAL_TEXT : contains
```

### 2.3 Component Hierarchy

```mermaid
graph TD
    subgraph "Component Hierarchy"
        A[App] --> B[Navigation Container]
        B --> C[Tab Navigator]
        B --> D[Stack Navigator]
        
        C --> E[Home Screen]
        C --> F[Office Tab]
        C --> G[Mass Tab]
        
        D --> H[Office Screen]
        D --> I[Mass Screen]
        D --> J[Settings Screen]
        D --> K[About Screen]
        
        E --> L[Calendar Component]
        E --> M[Day Summary]
        
        H --> N[Office Hour Content]
        I --> O[Mass Content]
        
        N --> P[Liturgical Text]
        O --> P
        
        P --> Q[Bilingual Text Display]
        Q --> R[Educational Layer]
    end
```

### 2.4 State Management

```mermaid
graph LR
    subgraph "Redux Store"
        A[Settings Slice] --> G[Root Reducer]
        B[Calendar Slice] --> G
        C[Texts Slice] --> G
        D[UI State Slice] --> G
    end
    
    subgraph "Actions"
        H[User Actions]
        I[System Actions]
    end
    
    subgraph "Effects"
        J[API Calls]
        K[Storage Operations]
        L[Calendar Calculations]
    end
    
    H --> A
    H --> B
    H --> C
    H --> D
    
    I --> B
    I --> C
    I --> D
    
    G --> J
    G --> K
    G --> L
```

## 3. Platform-Specific Implementations

### 3.1 Storage Implementation

```mermaid
graph TD
    subgraph "Storage Interface"
        A[IStorageService]
    end
    
    subgraph "Native Implementation"
        B[SQLiteStorage] --> A
        B --> C[react-native-sqlite-storage]
    end
    
    subgraph "Web Implementation"
        D[WebStorage] --> A
        D --> E[IndexedDB]
        D --> F[WebSQL]
    end
    
    subgraph "Operations"
        G[Initialize]
        H[Query]
        I[Insert]
        J[Update]
        K[Delete]
        L[Transaction]
    end
    
    A --> G
    A --> H
    A --> I
    A --> J
    A --> K
    A --> L
```

### 3.2 File System Implementation

```mermaid
graph TD
    subgraph "File System Interface"
        A[IFileSystem]
    end
    
    subgraph "Native Implementation"
        B[NativeFileSystem] --> A
        B --> C[react-native-fs]
    end
    
    subgraph "Web Implementation"
        D[WebFileSystem] --> A
        D --> E[File API]
        D --> F[LocalStorage]
    end
    
    subgraph "Operations"
        G[ReadFile]
        H[WriteFile]
        I[DeleteFile]
        J[ListDirectory]
        K[CreateDirectory]
        L[FileExists]
    end
    
    A --> G
    A --> H
    A --> I
    A --> J
    A --> K
    A --> L
```

### 3.3 Device Information

```mermaid
graph TD
    subgraph "Device Info Interface"
        A[IDeviceInfo]
    end
    
    subgraph "Native Implementation"
        B[NativeDeviceInfo] --> A
        B --> C[react-native-device-info]
    end
    
    subgraph "Web Implementation"
        D[WebDeviceInfo] --> A
        D --> E[Browser API]
        D --> F[Media Queries]
    end
    
    subgraph "Properties"
        G[DeviceType]
        H[ScreenDimensions]
        I[IsFoldable]
        J[FoldState]
        K[Orientation]
        L[Platform]
    end
    
    A --> G
    A --> H
    A --> I
    A --> J
    A --> K
    A --> L
```

## 4. Implementation Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant UI as UI Components
    participant Nav as Navigation
    participant State as State Management
    participant Calendar as Calendar Service
    participant Texts as Texts Service
    participant Storage as Storage Adapter
    
    User->>UI: Open App
    UI->>Nav: Initialize Navigation
    Nav->>State: Initialize State
    State->>Calendar: Get Current Day
    Calendar->>Storage: Query Calendar Data
    Storage-->>Calendar: Return Day Info
    Calendar-->>State: Update Current Day
    State-->>UI: Render Home Screen
    
    User->>UI: Select Mass
    UI->>Nav: Navigate to Mass Screen
    Nav->>State: Request Mass Texts
    State->>Texts: Get Mass Proper
    Texts->>Storage: Query Mass Texts
    Storage-->>Texts: Return Mass Content
    Texts-->>State: Update Current Texts
    State-->>UI: Render Mass Screen
```

## 5. Migration Strategy

### 5.1 Data Migration Flow

```mermaid
graph TD
    A[Identify Data Sources] --> B[Extract Data Schema]
    B --> C[Create Migration Scripts]
    C --> D[Test Migration]
    D --> E[Execute Migration]
    E --> F[Verify Data Integrity]
    
    subgraph "Data Sources"
        G[SQLite Database]
        H[Flat Text Files]
        I[AsyncStorage]
    end
    
    subgraph "Target Storage"
        J[Native SQLite]
        K[Web IndexedDB]
        L[LocalStorage]
    end
    
    A --> G
    A --> H
    A --> I
    
    E --> J
    E --> K
    E --> L
```

### 5.2 Code Migration Strategy

```mermaid
graph TD
    A[Analyze Current Codebase] --> B[Identify Core Logic]
    B --> C[Extract Platform-Agnostic Code]
    C --> D[Create Adapter Interfaces]
    D --> E[Implement Platform-Specific Adapters]
    E --> F[Integrate and Test]
    
    subgraph "Core Logic"
        G[Calendar Calculations]
        H[Text Processing]
        I[State Management]
    end
    
    subgraph "Platform-Specific"
        J[Storage]
        K[File System]
        L[Device Info]
    end
    
    C --> G
    C --> H
    C --> I
    
    E --> J
    E --> K
    E --> L
```

## 6. Technical Implementation Details

### 6.1 Database Schema

```sql
-- Liturgical Calendar Table
CREATE TABLE IF NOT EXISTS calendar_days (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  season TEXT NOT NULL,
  celebration TEXT,
  rank INTEGER NOT NULL,
  color TEXT NOT NULL,
  allows_vigil INTEGER NOT NULL,
  commemorations TEXT
);

-- Mass Texts Table
CREATE TABLE IF NOT EXISTS mass_texts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  season TEXT NOT NULL,
  celebration TEXT,
  part TEXT NOT NULL,
  latin TEXT NOT NULL,
  english TEXT NOT NULL,
  is_rubric INTEGER DEFAULT 0,
  is_response INTEGER DEFAULT 0
);

-- Office Texts Table
CREATE TABLE IF NOT EXISTS office_texts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  season TEXT NOT NULL,
  celebration TEXT,
  hour TEXT NOT NULL,
  part TEXT NOT NULL,
  latin TEXT NOT NULL,
  english TEXT NOT NULL,
  is_rubric INTEGER DEFAULT 0,
  is_response INTEGER DEFAULT 0
);

-- Glossary Table
CREATE TABLE IF NOT EXISTS glossary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  term TEXT NOT NULL,
  definition TEXT NOT NULL,
  pronunciation TEXT,
  category TEXT NOT NULL
);
```
