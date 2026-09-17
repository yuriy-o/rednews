/**
 * Tests for shared.ts types and constants
 * © 2026 Yuriy Orekhov. All rights reserved.
 */

import { IMPACT_LEVELS, ALERT_DURATIONS } from '../extension/src/shared';

describe('shared', () => {
  describe('IMPACT_LEVELS', () => {
    it('should contain all impact level types', () => {
      expect(IMPACT_LEVELS).toContain('High');
      expect(IMPACT_LEVELS).toContain('Medium');
      expect(IMPACT_LEVELS).toContain('Low');
      expect(IMPACT_LEVELS).toContain('Holiday');
    });

    it('should have exactly 4 impact levels', () => {
      expect(IMPACT_LEVELS).toHaveLength(4);
    });

    it('should be readonly', () => {
      expect(() => {
        (IMPACT_LEVELS as any)[0] = 'Invalid';
      }).toThrow();
    });
  });

  describe('ALERT_DURATIONS', () => {
    it('should contain all alert duration values', () => {
      expect(ALERT_DURATIONS).toContain(1);
      expect(ALERT_DURATIONS).toContain(10);
      expect(ALERT_DURATIONS).toContain(20);
      expect(ALERT_DURATIONS).toContain(40);
      expect(ALERT_DURATIONS).toContain(60);
    });

    it('should have exactly 5 duration values', () => {
      expect(ALERT_DURATIONS).toHaveLength(5);
    });

    it('should be in ascending order', () => {
      for (let i = 0; i < ALERT_DURATIONS.length - 1; i++) {
        expect(ALERT_DURATIONS[i]).toBeLessThan(ALERT_DURATIONS[i + 1]);
      }
    });
  });
});
