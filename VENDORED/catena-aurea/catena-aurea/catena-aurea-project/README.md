# Catena Aurea Knowledge Graph

> *"Golden Chain of Scripture Commentary"* - A comprehensive digital transformation of Thomas Aquinas' monumental Gospel commentary into a modern knowledge graph.

## 🎯 Project Overview

This project successfully extracts, processes, and structures Thomas Aquinas' **Catena Aurea** - one of the most important Gospel commentaries in Christian history - into a modern, searchable knowledge graph suitable for digital research and study.

## 📊 Project Achievements

- **✅ 89 Gospel chapters** completely processed and converted to Markdown
- **✅ 15,018 knowledge graph nodes** representing verses, sources, and commentaries  
- **✅ 26,140 relationship edges** mapping connections between entities
- **✅ 19 major patristic sources** identified and linked
- **✅ 3,761 individual Gospel verses** extracted and catalogued
- **✅ 11,145 commentary excerpts** parsed and connected

## 🏛️ Patristic Sources Included

**Major Church Fathers & Sources:**
- **John Chrysostom** (2,686 commentaries)
- **Augustine of Hippo** (2,048 commentaries)  
- **Bede the Venerable** (1,254 commentaries)
- **Jerome** (1,102 commentaries)
- **Origen**, **Gregory the Great**, **Ambrose of Milan**
- **Hilary of Poitiers**, **Cyril of Alexandria**, **Rabanus Maurus**
- **Basil the Great**, **Anselm**, **Athanasius**, and others

## 🗂️ Project Structure

```
catena-aurea-project/
├── markdown_chapters/              # 89 Gospel chapters in Markdown
│   ├── matthew/ (28 chapters)      # Complete Gospel of Matthew
│   ├── mark/ (16 chapters)         # Complete Gospel of Mark  
│   ├── luke/ (24 chapters)         # Complete Gospel of Luke
│   └── john/ (21 chapters)         # Complete Gospel of John
├── catena_aurea_graph.json         # Complete knowledge graph (11.8MB)
├── catena_scraper.py               # Main web scraper and processor
├── analyze_graph.py                # Graph analysis and statistics
├── OBSIDIAN_IMPORT_README.md       # Obsidian import instructions
└── PROJECT_SUMMARY.md              # Detailed project summary
```

## 🚀 Quick Start

### For Researchers & Students:
1. Browse the `markdown_chapters/` directory for readable Gospel commentaries
2. Use the knowledge graph JSON for advanced analysis
3. Import into Obsidian for interactive study (see `OBSIDIAN_IMPORT_README.md`)

### For Developers:
1. **Run the scraper:** `python catena_scraper.py`
2. **Analyze results:** `python analyze_graph.py`
3. **Explore the data:** Load `catena_aurea_graph.json` into your preferred graph analysis tool

## 📈 Knowledge Graph Structure

### Node Types:
- **Gospel** (4): Matthew, Mark, Luke, John
- **Chapter** (89): Individual Gospel chapters
- **Gospel_Verse** (3,761): Specific verses with their text
- **Patristic_Source** (19): Church Fathers and authorities  
- **Patristic_Narrative** (11,145): Individual commentary excerpts

### Relationship Types:
- **Chapters**: Gospel → Chapter
- **Verses**: Chapter → Gospel_Verse
- **Who_Wrote**: Patristic_Source → Patristic_Narrative
- **Commentary**: Gospel_Verse → Patristic_Narrative

## 🔧 Technical Details

**Built with:**
- Python 3.x
- BeautifulSoup4 for HTML parsing
- Requests for web scraping  
- HTML2Text for Markdown conversion
- JSON for knowledge graph serialization

**Data Source:** [eCatholic2000.com](https://www.ecatholic2000.com/catena/)

## 📖 Usage Examples

**Find all commentary on a specific verse:**
```python
# Load the knowledge graph
import json
with open('catena_aurea_graph.json', 'r') as f:
    graph = json.load(f)

# Find commentaries on Matthew 1:1
verse_id = "verse_matthew_1_1"
# ... query the graph for related commentaries
```

**Browse by Church Father:**
Navigate to any Gospel chapter Markdown file and search for specific patristic sources like "CHRYSOSTOM" or "AUGUSTINE".

## 🎓 Academic Applications

- **Biblical Studies**: Cross-reference patristic interpretations across Gospel passages
- **Theology**: Trace theological themes through multiple Church Fathers
- **Digital Humanities**: Apply graph analytics to medieval commentary traditions
- **Historical Research**: Study patterns in early Christian biblical interpretation

## 🔄 For Obsidian Users

Complete import instructions available in `OBSIDIAN_IMPORT_README.md`. The knowledge graph can be imported to create:
- Interactive verse-commentary networks
- Church Father relationship maps  
- Cross-Gospel parallel studies
- Thematic exploration tools

## 📜 Historical Significance

The **Catena Aurea** (*Golden Chain*) was compiled by Thomas Aquinas in the 13th century, weaving together commentary from dozens of Church Fathers to create one of the most comprehensive Gospel commentaries ever assembled. This project makes this medieval masterwork accessible for modern digital scholarship.

## 🤝 Contributing

This is a research project extracting historical commentary. The source material is Thomas Aquinas' compilation of patristic sources, faithfully digitized and structured.

## 📄 License

The original Catena Aurea is in the public domain. This digital transformation and the code used to create it are made available for educational and research purposes.

---

*"The end we ought to propose to ourselves is to become, in this life, the most perfect worshipers of God we can possibly be, as we hope to be through all eternity."* - Thomas Aquinas