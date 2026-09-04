# Catena Aurea Knowledge Graph - Obsidian Import Guide

This project has successfully extracted and processed Thomas Aquinas' Catena Aurea from the four Gospels, creating both Markdown files and a comprehensive knowledge graph.

## What has been created:

### 1. Markdown Files (`markdown_chapters/` directory)
- **89 total chapters** organized by Gospel:
  - Matthew: 28 chapters
  - Mark: 16 chapters
  - Luke: 24 chapters  
  - John: 21 chapters
- Each file contains the complete commentary with Gospel verses and patristic sources
- Files are named like `matthew_chapter_01.md`, `mark_chapter_01.md`, etc.

### 2. Knowledge Graph (`catena_aurea_graph.json`)
- **15,018 total nodes**
- **26,140 total edges**
- **Node Types:**
  - Gospel (4 nodes: Matthew, Mark, Luke, John)
  - Chapter (89 nodes: one per Gospel chapter)
  - Gospel_Verse (thousands of individual verses)
  - Patristic_Source (major Church Fathers and sources)
  - Patristic_Narrative (individual commentary excerpts)
- **Edge Types:**
  - Chapters: Gospel → Chapter
  - Verses: Chapter → Gospel_Verse
  - Who_Wrote: Patristic_Source → Patristic_Narrative  
  - Commentary: Gospel_Verse → Patristic_Narrative

## How to Import into Obsidian:

### Method 1: Import Markdown Files
1. Copy the entire `markdown_chapters/` directory into your Obsidian vault
2. The files will appear as individual notes you can link and cross-reference
3. Use Obsidian's graph view to see connections between notes

### Method 2: Import Knowledge Graph (Advanced)
1. Install a JSON graph import plugin for Obsidian (such as "JSON/CSV Importer")
2. Import the `catena_aurea_graph.json` file
3. This will create nodes and links based on the relationships we extracted

### Method 3: Manual Graph Recreation
Using the JSON file as a reference, you can manually create:
- Index notes for each Gospel
- Chapter notes linking to their verses
- Source notes for each Church Father
- Commentary notes linking verses to sources

## Key Patristic Sources Extracted:
- Augustine, Chrysostom, Jerome, Ambrose, Origen
- Gregory, Thomas Aquinas, Bernard, Anselm
- Bede, John Damascene, Basil, Cyril, Athanasius  
- Hilary, Rabanus, Remigius, and many others

## Usage Ideas in Obsidian:
- **Verse Studies**: Find all commentary on specific Gospel passages
- **Author Studies**: See all contributions from particular Church Fathers
- **Theological Topics**: Trace themes across different Gospels and sources
- **Historical Context**: Link patristic sources by time period or region
- **Cross-References**: Connect parallel passages between Gospels

## File Structure:
```
catena-aurea-project/
├── markdown_chapters/
│   ├── matthew/
│   │   ├── matthew_chapter_01.md
│   │   ├── matthew_chapter_02.md
│   │   └── ... (28 files total)
│   ├── mark/ (16 files)
│   ├── luke/ (24 files)
│   └── john/ (21 files)
├── catena_aurea_graph.json
├── chapter_urls.json
└── catena_scraper.py
```

This represents a comprehensive digital edition of one of the most important Gospel commentaries in Christian history, now structured for modern knowledge management and research.