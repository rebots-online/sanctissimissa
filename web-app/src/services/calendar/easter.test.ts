import { calculateEaster, isEasterSunday, daysFromEaster } from './easter';

describe('Easter Calculation', () => {
  test('calculates Easter 2025 correctly', () => {
    const easter2025 = calculateEaster(2025);
    expect(easter2025.getFullYear()).toBe(2025);
    expect(easter2025.getMonth()).toBe(3); // April (0-indexed)
    expect(easter2025.getDate()).toBe(20); // April 20, 2025
  });

  test('calculates Easter 2024 correctly', () => {
    const easter2024 = calculateEaster(2024);
    expect(easter2024.getFullYear()).toBe(2024);
    expect(easter2024.getMonth()).toBe(2); // March (0-indexed)
    expect(easter2024.getDate()).toBe(31); // March 31, 2024
  });

  test('calculates Easter 2023 correctly', () => {
    const easter2023 = calculateEaster(2023);
    expect(easter2023.getFullYear()).toBe(2023);
    expect(easter2023.getMonth()).toBe(3); // April (0-indexed)
    expect(easter2023.getDate()).toBe(9); // April 9, 2023
  });

  test('identifies Easter Sunday correctly', () => {
    const easter2025 = new Date(2025, 3, 20); // April 20, 2025
    const notEaster = new Date(2025, 3, 21); // April 21, 2025
    
    expect(isEasterSunday(easter2025)).toBe(true);
    expect(isEasterSunday(notEaster)).toBe(false);
  });

  test('calculates days from Easter correctly', () => {
    const easter2025 = new Date(2025, 3, 20); // April 20, 2025
    const goodFriday = new Date(2025, 3, 18); // April 18, 2025
    const easterMonday = new Date(2025, 3, 21); // April 21, 2025
    const pentecost = new Date(2025, 5, 8); // June 8, 2025 (50 days after Easter)
    
    expect(daysFromEaster(easter2025)).toBe(0);
    expect(daysFromEaster(goodFriday)).toBe(-2);
    expect(daysFromEaster(easterMonday)).toBe(1);
    expect(daysFromEaster(pentecost)).toBe(49); // Pentecost is 49 days after Easter
  });
});
