/**
 * Glossary Service
 * 
 * This service provides access to glossary entries and categories through
 * the mobile database adapter. It includes search functionality and
 * category management.
 */

import { getDatabaseAdapter } from './database';
import { GlossaryEntry, GlossaryCategory, CategoryNode, GlossarySearchResult, GlossaryStats } from '../types/glossary';

/**
 * Get all glossary entries
 * @returns Promise resolving to array of glossary entries
 */
export const getAllEntries = async (): Promise<GlossaryEntry[]> => {
  try {
    const db = await getDatabaseAdapter();
    const result = await db.query<GlossaryEntry>(
      'SELECT * FROM glossary_entries ORDER BY term'
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting glossary entries:', error);
    throw error;
  }
};

/**
 * Get glossary entries by category
 * @param category Category name
 * @returns Promise resolving to array of glossary entries
 */
export const getEntriesByCategory = async (category: string): Promise<GlossaryEntry[]> => {
  try {
    const db = await getDatabaseAdapter();
    return await db.findBy('glossary_entries', 'category', category);
  } catch (error) {
    console.error('Error getting entries by category:', error);
    throw error;
  }
};

/**
 * Search glossary entries
 * @param query Search query
 * @param options Search options
 * @returns Promise resolving to array of search results
 */
export const searchEntries = async (
  query: string,
  options: { 
    includeLatinTerms?: boolean;
    categories?: string[];
    limit?: number;
  } = {}
): Promise<GlossarySearchResult[]> => {
  try {
    const db = await getDatabaseAdapter();
    const searchFields = ['term', 'definition'];
    if (options.includeLatinTerms) {
      searchFields.push('term_latin', 'definition_latin');
    }

    const whereConditions = searchFields.map(field => `${field} LIKE ?`);
    const searchPattern = `%${query}%`;
    const params = Array(searchFields.length).fill(searchPattern);

    if (options.categories?.length) {
      whereConditions.push(`category IN (${options.categories.map(() => '?').join(', ')})`);
      params.push(...options.categories);
    }

    const sql = `
      SELECT *, 
      (${searchFields.map(field => `(CASE WHEN ${field} LIKE ? THEN 1 ELSE 0 END)`).join(' + ')}) as relevance
      FROM glossary_entries
      WHERE ${whereConditions.join(' OR ')}
      ORDER BY relevance DESC, term
      ${options.limit ? `LIMIT ${options.limit}` : ''}
    `;

    const result = await db.query<GlossaryEntry & { relevance: number }>(sql, params);

    return result.rows.map(row => {
      const { relevance, ...entry } = row;
      const matchedFields = searchFields.filter(field => 
        row[field]?.toLowerCase().includes(query.toLowerCase())
      );

      return {
        entry,
        relevance,
        matchedFields
      };
    });
  } catch (error) {
    console.error('Error searching entries:', error);
    throw error;
  }
};

/**
 * Get all glossary categories
 * @returns Promise resolving to array of categories
 */
export const getAllCategories = async (): Promise<GlossaryCategory[]> => {
  try {
    const db = await getDatabaseAdapter();
    const result = await db.query<GlossaryCategory>(
      'SELECT * FROM glossary_categories ORDER BY "order", name'
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting glossary categories:', error);
    throw error;
  }
};

/**
 * Build category hierarchy tree
 * @returns Promise resolving to category tree
 */
export const getCategoryTree = async (): Promise<CategoryNode[]> => {
  try {
    const categories = await getAllCategories();
    const tree: CategoryNode[] = [];
    const map: Record<string, CategoryNode> = {};

    // First pass: Create nodes
    categories.forEach(category => {
      map[category.id] = { ...category, children: [] };
    });

    // Second pass: Build tree
    categories.forEach(category => {
      const node = map[category.id];
      if (category.parentCategory) {
        const parent = map[category.parentCategory];
        if (parent) {
          parent.children.push(node);
        } else {
          tree.push(node);
        }
      } else {
        tree.push(node);
      }
    });

    return tree;
  } catch (error) {
    console.error('Error building category tree:', error);
    throw error;
  }
};

/**
 * Get glossary statistics
 * @returns Promise resolving to glossary statistics
 */
export const getGlossaryStats = async (): Promise<GlossaryStats> => {
  try {
    const db = await getDatabaseAdapter();
    
    // Get total entries
    const entriesResult = await db.query<{ count: number }>(
      'SELECT COUNT(*) as count FROM glossary_entries'
    );
    
    // Get total categories
    const categoriesResult = await db.query<{ count: number }>(
      'SELECT COUNT(*) as count FROM glossary_categories'
    );
    
    // Get entries per category
    const categoryCountsResult = await db.query<{ category: string; count: number }>(
      'SELECT category, COUNT(*) as count FROM glossary_entries GROUP BY category'
    );
    
    // Get last updated timestamp
    const lastUpdatedResult = await db.query<{ max_updated: number }>(
      'SELECT MAX(updated_at) as max_updated FROM glossary_entries'
    );
    
    const categoryCounts: Record<string, number> = {};
    categoryCountsResult.rows.forEach(row => {
      categoryCounts[row.category] = row.count;
    });
    
    return {
      totalEntries: entriesResult.rows[0].count,
      totalCategories: categoriesResult.rows[0].count,
      lastUpdated: lastUpdatedResult.rows[0].max_updated,
      categoryCounts
    };
  } catch (error) {
    console.error('Error getting glossary stats:', error);
    throw error;
  }
};