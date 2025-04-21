# Data Conversion: Flat Text to Relational Schema (ERD)

## Pre-Relational (Flat Text)
- **liturgical_days.txt:**  `date|title|season|color|rank|notes`
- **mass_texts.txt:**       `date|section|latin|english|rubrics`
- **office_texts.txt:**     `date|hour|section|latin|english|rubrics`
- **prayers.txt:**          `id|category|title|latin|english|tags`
- **journal_entries.txt:**  `id|title|content|type|tags|createdAt|updatedAt|audioBlob`

---

## Relational/IndexedDB (Current Schema)

```mermaid
erDiagram
    LITURGICAL_DAY {
      string id PK
      string date
      string title
      string season
      string color
      string rank
      string notes
    }
    MASS_TEXT {
      string id PK
      string date
      string section
      string latin
      string english
      string rubrics
    }
    OFFICE_TEXT {
      string id PK
      string date
      string hour
      string section
      string latin
      string english
      string rubrics
    }
    PRAYER {
      string id PK
      string category
      string title
      string latin
      string english
      string tags
    }
    JOURNAL_ENTRY {
      string id PK
      string title
      string content
      string type
      string[] tags
      string createdAt
      string updatedAt
      blob audioBlob
      number posX
      number posY
    }

    LITURGICAL_DAY ||--o{ MASS_TEXT : "has"
    LITURGICAL_DAY ||--o{ OFFICE_TEXT : "has"
    MASS_TEXT ||--|| LITURGICAL_DAY : "for"
    OFFICE_TEXT ||--|| LITURGICAL_DAY : "for"
    JOURNAL_ENTRY }|..|{ PRAYER : "may reference"
```

---

**Legend:**
- Each box = an object store/table in IndexedDB.
- PK = Primary Key.
- Relationships show how Mass/Office texts are linked to liturgical days, and how journal entries may reference prayers.
