/**
 * Enhanced Precedence Service
 * 
 * This service handles the precedence rules for the liturgical calendar,
 * determining which celebration takes precedence when multiple coincide.
 */

import { LiturgicalRank } from '../../../models/calendar';
import { TemporalCelebration } from './temporalCycleService';
import { SanctoralCelebration } from './sanctoralCycleService';

/**
 * Interface representing a commemoration
 */
export interface Commemoration {
  id: string;
  name: string;
  description?: string;
}

/**
 * Interface representing the result of precedence determination
 */
export interface PrecedenceResult {
  primaryCelebration: TemporalCelebration | SanctoralCelebration;
  commemorations: Commemoration[];
  action: 'primary' | 'transfer' | 'commemorate' | 'suppress';
}

/**
 * Determine which celebration takes precedence when multiple coincide
 * 
 * @param temporalCelebration The temporal celebration for the date
 * @param sanctoralCelebration The sanctoral celebration for the date
 * @returns The precedence result
 */
export function determinePrecedence(
  temporalCelebration: TemporalCelebration | null,
  sanctoralCelebration: SanctoralCelebration | null
): PrecedenceResult {
  const commemorations: Commemoration[] = [];
  
  // If only one celebration exists, it takes precedence
  if (temporalCelebration && !sanctoralCelebration) {
    return {
      primaryCelebration: temporalCelebration,
      commemorations,
      action: 'primary'
    };
  }
  
  if (!temporalCelebration && sanctoralCelebration) {
    return {
      primaryCelebration: sanctoralCelebration,
      commemorations,
      action: 'primary'
    };
  }
  
  // If both exist, compare ranks
  if (temporalCelebration && sanctoralCelebration) {
    if (temporalCelebration.rank < sanctoralCelebration.rank) {
      // Temporal takes precedence (lower rank number = higher precedence)
      if (shouldCommemorate(sanctoralCelebration.rank)) {
        commemorations.push({
          id: sanctoralCelebration.id,
          name: sanctoralCelebration.name,
          description: sanctoralCelebration.description
        });
      }
      
      return {
        primaryCelebration: temporalCelebration,
        commemorations,
        action: shouldCommemorate(sanctoralCelebration.rank) ? 'commemorate' : 'suppress'
      };
    } else {
      // Sanctoral takes precedence
      if (shouldCommemorate(temporalCelebration.rank)) {
        commemorations.push({
          id: temporalCelebration.id,
          name: temporalCelebration.name,
          description: temporalCelebration.description
        });
      }
      
      return {
        primaryCelebration: sanctoralCelebration,
        commemorations,
        action: shouldCommemorate(temporalCelebration.rank) ? 'commemorate' : 'suppress'
      };
    }
  }
  
  // This should never happen, but TypeScript requires a return
  throw new Error('No celebrations provided for precedence determination');
}

/**
 * Determine if a celebration should be commemorated when it coincides with a higher-ranking celebration
 * 
 * @param rank The rank of the celebration
 * @returns True if the celebration should be commemorated
 */
function shouldCommemorate(rank: LiturgicalRank): boolean {
  // First, Second, and Third Class feasts are commemorated
  // Fourth Class feasts are suppressed
  return rank <= LiturgicalRank.THIRD_CLASS;
}

/**
 * Determine if a celebration should be transferred when it coincides with a higher-ranking celebration
 * 
 * @param celebration The celebration to check
 * @returns True if the celebration should be transferred
 */
export function shouldTransfer(celebration: TemporalCelebration | SanctoralCelebration): boolean {
  // Only First Class feasts are transferred
  // Some specific Second Class feasts may also be transferred
  return celebration.rank === LiturgicalRank.FIRST_CLASS;
}

/**
 * Get the next available date for a transferred feast
 * 
 * @param celebration The celebration to transfer
 * @param startDate The original date of the celebration
 * @param occupiedDates Array of dates that already have First Class feasts
 * @returns The next available date for the transferred feast
 */
export function getTransferDate(
  celebration: TemporalCelebration | SanctoralCelebration,
  startDate: Date,
  occupiedDates: Date[]
): Date {
  // Start from the day after the original date
  const transferDate = new Date(startDate);
  transferDate.setDate(transferDate.getDate() + 1);
  
  // Keep checking dates until an available one is found
  while (isDateOccupied(transferDate, occupiedDates)) {
    transferDate.setDate(transferDate.getDate() + 1);
  }
  
  return transferDate;
}

/**
 * Check if a date is already occupied by a First Class feast
 * 
 * @param date The date to check
 * @param occupiedDates Array of dates that already have First Class feasts
 * @returns True if the date is occupied
 */
function isDateOccupied(date: Date, occupiedDates: Date[]): boolean {
  return occupiedDates.some(occupiedDate => 
    date.getDate() === occupiedDate.getDate() &&
    date.getMonth() === occupiedDate.getMonth() &&
    date.getFullYear() === occupiedDate.getFullYear()
  );
}
