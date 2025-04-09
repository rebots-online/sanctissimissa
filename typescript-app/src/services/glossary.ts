interface GlossaryEntry {
  definition: string;
  pronunciation?: string;
  category: 'liturgical' | 'theological' | 'rubrical' | 'general';
  usage?: string[];
}

interface GlossaryDatabase {
  [key: string]: GlossaryEntry;
}

// Initial glossary data - this would typically be loaded from a database
const glossaryData: GlossaryDatabase = {
  'dominus': {
    definition: 'The Lord',
    pronunciation: 'DOH-mee-nus',
    category: 'theological',
    usage: ['Dominus vobiscum', 'Dominus illuminatio mea'],
  },
  'vobiscum': {
    definition: 'with you',
    pronunciation: 'voh-BEES-kum',
    category: 'liturgical',
    usage: ['Dominus vobiscum', 'Pax vobiscum'],
  },
  'oremus': {
    definition: 'Let us pray',
    pronunciation: 'oh-REH-mus',
    category: 'liturgical',
  },
  'alleluia': {
    definition: 'Praise the Lord (from Hebrew "hallelu Yah")',
    pronunciation: 'ah-leh-LOO-yah',
    category: 'liturgical',
  },
  'sequentia': {
    definition: 'The continuation (used to introduce Gospel readings)',
    pronunciation: 'seh-KWEN-tsee-ah',
    category: 'liturgical',
  },
  'rubrica': {
    definition: 'Instructions or directions for the ceremony (printed in red)',
    pronunciation: 'ROO-bree-kah',
    category: 'rubrical',
  },
};

export class Glossary {
  private static instance: Glossary;
  private data: GlossaryDatabase;

  private constructor() {
    this.data = glossaryData;
  }

  static getInstance(): Glossary {
    if (!Glossary.instance) {
      Glossary.instance = new Glossary();
    }
    return Glossary.instance;
  }

  getDefinition(term: string): string | undefined {
    const entry = this.data[term.toLowerCase()];
    return entry?.definition;
  }

  getPronunciation(term: string): string | undefined {
    const entry = this.data[term.toLowerCase()];
    return entry?.pronunciation;
  }

  getEntry(term: string): GlossaryEntry | undefined {
    return this.data[term.toLowerCase()];
  }

  searchTerms(query: string): string[] {
    const normalizedQuery = query.toLowerCase();
    return Object.keys(this.data).filter(term => 
      term.toLowerCase().includes(normalizedQuery) ||
      this.data[term].definition.toLowerCase().includes(normalizedQuery)
    );
  }

  getTermsByCategory(category: GlossaryEntry['category']): string[] {
    return Object.entries(this.data)
      .filter(([_, entry]) => entry.category === category)
      .map(([term, _]) => term);
  }

  getAllTerms(): string[] {
    return Object.keys(this.data);
  }
}

// Export singleton instance
export const glossary = Glossary.getInstance();