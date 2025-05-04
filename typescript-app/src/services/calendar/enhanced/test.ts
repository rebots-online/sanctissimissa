/**
 * Test file for the enhanced liturgical calendar services
 */

import { calculateEaster } from './easterCalculator';
import { getLiturgicalSeason } from './seasonCalculator';
import { getTemporalCelebration } from './temporalCycleService';
import { getSanctoralCelebration } from './sanctoralCycleService';
import { getLiturgicalDay } from './liturgicalDayService';

/**
 * Test the liturgical calendar services
 */
export function testLiturgicalCalendar(): void {
  console.log('Testing Enhanced Liturgical Calendar Services');
  console.log('--------------------------------------------');
  
  // Test Easter calculation
  const easter2025 = calculateEaster(2025);
  console.log(`Easter 2025: ${easter2025.toDateString()}`);
  
  // Test some important dates
  const testDates = [
    new Date(2025, 3, 20), // Easter Sunday (April 20, 2025)
    new Date(2025, 2, 5),  // Ash Wednesday (March 5, 2025)
    new Date(2025, 11, 25), // Christmas (December 25, 2025)
    new Date(2025, 7, 15),  // Assumption (August 15, 2025)
    new Date(2025, 5, 29),  // Sts. Peter and Paul (June 29, 2025)
    new Date(2025, 11, 8),  // Immaculate Conception (December 8, 2025)
    new Date(2025, 10, 1),  // All Saints (November 1, 2025)
    new Date(2025, 10, 2),  // All Souls (November 2, 2025)
    new Date(2025, 4, 29),  // Ascension Thursday (May 29, 2025)
    new Date(2025, 5, 8),   // Pentecost Sunday (June 8, 2025)
  ];
  
  for (const date of testDates) {
    console.log(`\nTesting date: ${date.toDateString()}`);
    
    // Get the liturgical season
    const season = getLiturgicalSeason(date);
    console.log(`Season: ${season.name} (${season.color})`);
    
    // Get the temporal celebration
    const temporalCelebration = getTemporalCelebration(date);
    if (temporalCelebration) {
      console.log(`Temporal: ${temporalCelebration.name} (Rank: ${temporalCelebration.rank}, Color: ${temporalCelebration.color})`);
    } else {
      console.log('No temporal celebration');
    }
    
    // Get the sanctoral celebration
    const sanctoralCelebration = getSanctoralCelebration(date);
    if (sanctoralCelebration) {
      console.log(`Sanctoral: ${sanctoralCelebration.name} (Rank: ${sanctoralCelebration.rank}, Color: ${sanctoralCelebration.color})`);
    } else {
      console.log('No sanctoral celebration');
    }
    
    // Get the complete liturgical day
    const liturgicalDay = getLiturgicalDay(date);
    console.log(`Liturgical Day: ${liturgicalDay.celebration} (Rank: ${liturgicalDay.rank}, Color: ${liturgicalDay.color})`);
    
    if (liturgicalDay.commemorations.length > 0) {
      console.log(`Commemorations: ${liturgicalDay.commemorations.map(c => c.name).join(', ')}`);
    }
  }
  
  console.log('\nTest completed');
}

// Run the test if this file is executed directly
if (typeof window === 'undefined') {
  testLiturgicalCalendar();
}
