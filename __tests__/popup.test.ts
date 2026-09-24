/**
 * Tests for popup calendar and date utilities
 * © 2026 Yuriy Orekhov. All rights reserved.
 */

describe('popup calendar utilities', () => {
  // Helper functions (copied from popup.ts for testing)
  const startOfMonth = (date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  };

  const endOfMonth = (date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  };

  const formatDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const parseDate = (str: string): Date | null => {
    const match = str.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!match || !match[1] || !match[2] || !match[3]) return null;
    return new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10));
  };

  describe('startOfMonth', () => {
    it('should return first day of month', () => {
      const date = new Date(2026, 8, 17); // Sept 17, 2026
      const result = startOfMonth(date);
      expect(result.getDate()).toBe(1);
      expect(result.getMonth()).toBe(8);
      expect(result.getFullYear()).toBe(2026);
    });

    it('should handle January correctly', () => {
      const date = new Date(2026, 0, 15); // Jan 15, 2026
      const result = startOfMonth(date);
      expect(result.getDate()).toBe(1);
      expect(result.getMonth()).toBe(0);
    });
  });

  describe('endOfMonth', () => {
    it('should return last day of month', () => {
      const date = new Date(2026, 8, 17); // Sept 17, 2026
      const result = endOfMonth(date);
      expect(result.getDate()).toBe(30); // September has 30 days
      expect(result.getMonth()).toBe(8);
    });

    it('should handle February in leap year', () => {
      const date = new Date(2024, 1, 15); // Feb 15, 2024 (leap year)
      const result = endOfMonth(date);
      expect(result.getDate()).toBe(29);
    });

    it('should handle February in non-leap year', () => {
      const date = new Date(2026, 1, 15); // Feb 15, 2026 (non-leap year)
      const result = endOfMonth(date);
      expect(result.getDate()).toBe(28);
    });
  });

  describe('formatDate', () => {
    it('should format date as YYYY-MM-DD', () => {
      const date = new Date(2026, 8, 17); // Sept 17, 2026
      expect(formatDate(date)).toBe('2026-09-17');
    });

    it('should pad single-digit months and days', () => {
      const date = new Date(2026, 0, 5); // Jan 5, 2026
      expect(formatDate(date)).toBe('2026-01-05');
    });
  });

  describe('parseDate', () => {
    it('should parse valid date string', () => {
      const result = parseDate('2026-09-17');
      expect(result).not.toBeNull();
      expect(result?.getFullYear()).toBe(2026);
      expect(result?.getMonth()).toBe(8); // 0-indexed
      expect(result?.getDate()).toBe(17);
    });

    it('should return null for invalid format', () => {
      expect(parseDate('2026/09/17')).toBeNull();
      expect(parseDate('09-17-2026')).toBeNull();
      expect(parseDate('invalid')).toBeNull();
    });

    it('should handle date with leading zeros', () => {
      const result = parseDate('2026-01-05');
      expect(result).not.toBeNull();
      expect(result?.getDate()).toBe(5);
      expect(result?.getMonth()).toBe(0);
    });
  });

  describe('roundtrip formatting', () => {
    it('should roundtrip format/parse correctly', () => {
      const original = new Date(2026, 8, 17);
      const formatted = formatDate(original);
      const parsed = parseDate(formatted);

      expect(parsed).not.toBeNull();
      expect(parsed?.getFullYear()).toBe(original.getFullYear());
      expect(parsed?.getMonth()).toBe(original.getMonth());
      expect(parsed?.getDate()).toBe(original.getDate());
    });
  });
});
