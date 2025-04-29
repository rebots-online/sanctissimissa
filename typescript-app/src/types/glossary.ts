/**
 * Glossary Types
 * 
 * These types define the structure of glossary entries and categories
 * for the mobile application.
 */

import { DbEntity } from '../shared/database/types';

/**
 * Glossary entry
 */
export interface GlossaryEntry extends DbEntity {
  term: string;
  definition: string;
  termLatin?: string;
  definitionLatin?: string;
  category: string;
  tags?: string[];
  pronunciation?: string;
  etymologyNote?: string;
  usageNotes?: string;
  seeAlso?: string[];  // References to other terms
  [key: string]: any;
}

/**
 * Glossary category
 */
export interface GlossaryCategory extends DbEntity {
  name: string;
  description?: string;
  parentCategory?: string;  // For hierarchical categories
  order: number;  // For custom sorting
}

/**
 * Category hierarchy node
 * Used for building the category tree
 */
export interface CategoryNode extends GlossaryCategory {
  children: CategoryNode[];
}

/**
 * Search result type
 */
export interface GlossarySearchResult {
  entry: GlossaryEntry;
  relevance: number;  // Search relevance score
  matchedFields: string[];  // Which fields matched the search
}

/**
 * Glossary statistics
 */
export interface GlossaryStats {
  totalEntries: number;
  totalCategories: number;
  lastUpdated: number;
  categoryCounts: Record<string, number>;
}