import { describe, it, expect } from 'vitest';
import {
  parseDiceExpression,
  rollDie,
  formatSegmentResult,
  parseTextForDiceRolls,
} from '@/utils/dice-utils';
import type { SegmentResult } from '@/types';

describe('parseDiceExpression', () => {
  it('should parse simple dice expression', () => {
    const result = parseDiceExpression('2d6');
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(1);
    expect(result[0][0]).toEqual({ type: 'dice', count: 2, sides: 6 });
  });

  it('should parse dice with positive modifier', () => {
    const result = parseDiceExpression('1d20+5');
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(2);
    expect(result[0][0]).toEqual({ type: 'dice', count: 1, sides: 20 });
    expect(result[0][1]).toEqual({ type: 'modifier', value: 5 });
  });

  it('should parse dice with negative modifier', () => {
    const result = parseDiceExpression('3d8-2');
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(2);
    expect(result[0][0]).toEqual({ type: 'dice', count: 3, sides: 8 });
    expect(result[0][1]).toEqual({ type: 'modifier', value: -2 });
  });

  it('should parse dice with multiple modifiers', () => {
    const result = parseDiceExpression('2d6+4-1');
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(3);
    expect(result[0][0]).toEqual({ type: 'dice', count: 2, sides: 6 });
    expect(result[0][1]).toEqual({ type: 'modifier', value: 4 });
    expect(result[0][2]).toEqual({ type: 'modifier', value: -1 });
  });

  it('should parse multiple segments separated by commas', () => {
    const result = parseDiceExpression('2d6, 1d20+5');
    expect(result).toHaveLength(2);
    expect(result[0]).toHaveLength(1);
    expect(result[0][0]).toEqual({ type: 'dice', count: 2, sides: 6 });
    expect(result[1]).toHaveLength(2);
    expect(result[1][0]).toEqual({ type: 'dice', count: 1, sides: 20 });
    expect(result[1][1]).toEqual({ type: 'modifier', value: 5 });
  });

  it('should handle 0d6 by setting count to 0', () => {
    const result = parseDiceExpression('0d6');
    expect(result).toHaveLength(1);
    expect(result[0][0]).toEqual({ type: 'dice', count: 0, sides: 6 });
  });

  it('should handle 2d0 by setting sides to 1', () => {
    const result = parseDiceExpression('2d0');
    expect(result).toHaveLength(1);
    expect(result[0][0]).toEqual({ type: 'dice', count: 2, sides: 1 });
  });

  it('should return empty array for invalid strings', () => {
    const result = parseDiceExpression('invalid');
    expect(result).toEqual([]);
  });

  it('should return empty array for empty string', () => {
    const result = parseDiceExpression('');
    expect(result).toEqual([]);
  });

  it('should handle whitespace in dice expressions', () => {
    const result = parseDiceExpression('2 d 6 + 4');
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(2);
    expect(result[0][0]).toEqual({ type: 'dice', count: 2, sides: 6 });
    expect(result[0][1]).toEqual({ type: 'modifier', value: 4 });
  });

  it('should handle complex multi-segment expression', () => {
    const result = parseDiceExpression('1d20+5, 2d6-1, 3d4');
    expect(result).toHaveLength(3);
    expect(result[0]).toHaveLength(2);
    expect(result[1]).toHaveLength(2);
    expect(result[2]).toHaveLength(1);
  });
});

describe('rollDie', () => {
  it('should return value between 1 and sides for d6', () => {
    for (let i = 0; i < 100; i++) {
      const result = rollDie(6);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(6);
      expect(Number.isInteger(result)).toBe(true);
    }
  });

  it('should return value between 1 and sides for d20', () => {
    for (let i = 0; i < 100; i++) {
      const result = rollDie(20);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(20);
      expect(Number.isInteger(result)).toBe(true);
    }
  });

  it('should return value between 1 and sides for d4', () => {
    for (let i = 0; i < 50; i++) {
      const result = rollDie(4);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(4);
    }
  });

  it('should return value between 1 and sides for d8', () => {
    for (let i = 0; i < 50; i++) {
      const result = rollDie(8);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(8);
    }
  });

  it('should return value between 1 and sides for d10', () => {
    for (let i = 0; i < 50; i++) {
      const result = rollDie(10);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(10);
    }
  });

  it('should return value between 1 and sides for d12', () => {
    for (let i = 0; i < 50; i++) {
      const result = rollDie(12);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(12);
    }
  });

  it('should return value between 1 and sides for d100', () => {
    for (let i = 0; i < 50; i++) {
      const result = rollDie(100);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(100);
    }
  });

  it('should always return 1 for d1', () => {
    for (let i = 0; i < 20; i++) {
      const result = rollDie(1);
      expect(result).toBe(1);
    }
  });
});

describe('formatSegmentResult', () => {
  it('should format result with rolls and no modifier', () => {
    const segment: SegmentResult = {
      notation: '2d6',
      rolls: [
        { type: 'd6', value: 3 },
        { type: 'd6', value: 5 },
      ],
      modifier: 0,
      segmentTotal: 8,
    };
    const result = formatSegmentResult(segment);
    expect(result).toBe('2d6: [3, 5] = 8');
  });

  it('should format result with rolls and positive modifier', () => {
    const segment: SegmentResult = {
      notation: '1d20+5',
      rolls: [{ type: 'd20', value: 15 }],
      modifier: 5,
      segmentTotal: 20,
    };
    const result = formatSegmentResult(segment);
    expect(result).toBe('1d20+5: [15] +5 = 20');
  });

  it('should format result with rolls and negative modifier', () => {
    const segment: SegmentResult = {
      notation: '3d8-2',
      rolls: [
        { type: 'd8', value: 4 },
        { type: 'd8', value: 6 },
        { type: 'd8', value: 3 },
      ],
      modifier: -2,
      segmentTotal: 11,
    };
    const result = formatSegmentResult(segment);
    expect(result).toBe('3d8-2: [4, 6, 3] -2 = 11');
  });

  it('should format result with no rolls (modifier only)', () => {
    const segment: SegmentResult = {
      notation: '+5',
      rolls: [],
      modifier: 5,
      segmentTotal: 5,
    };
    const result = formatSegmentResult(segment);
    expect(result).toBe('+5: = 5');
  });

  it('should format result with single roll', () => {
    const segment: SegmentResult = {
      notation: '1d4',
      rolls: [{ type: 'd4', value: 2 }],
      modifier: 0,
      segmentTotal: 2,
    };
    const result = formatSegmentResult(segment);
    expect(result).toBe('1d4: [2] = 2');
  });
});

describe('parseTextForDiceRolls', () => {
  it('should extract single dice expression from text', () => {
    const result = parseTextForDiceRolls('Restores 1d6 HP');
    expect(result).toEqual(['1d6']);
  });

  it('should extract multiple dice expressions from text', () => {
    const result = parseTextForDiceRolls('Deals 2d6+4 damage and 1d4 fire');
    expect(result).toEqual(['2d6+4', '1d4']);
  });

  it('should return empty array for text with no dice expressions', () => {
    const result = parseTextForDiceRolls('This has no dice');
    expect(result).toEqual([]);
  });

  it('should return empty array for undefined input', () => {
    const result = parseTextForDiceRolls(undefined);
    expect(result).toEqual([]);
  });

  it('should return empty array for empty string', () => {
    const result = parseTextForDiceRolls('');
    expect(result).toEqual([]);
  });

  it('should handle complex text with mixed content', () => {
    const result = parseTextForDiceRolls(
      'Attack deals 1d8+3 slashing damage. On a critical hit, add 2d6 extra damage.',
    );
    expect(result).toEqual(['1d8+3', '2d6']);
  });

  it('should remove whitespace from extracted dice expressions', () => {
    const result = parseTextForDiceRolls('Roll 2 d 6 + 4 for damage');
    expect(result).toEqual(['2d6+4']);
  });

  it('should handle multiple modifiers in dice expression', () => {
    const result = parseTextForDiceRolls('Roll 1d20+5 for attack');
    expect(result).toEqual(['1d20+5']);
  });

  it('should extract dice with negative modifiers', () => {
    const result = parseTextForDiceRolls('Roll 3d8-2 for effect');
    expect(result).toEqual(['3d8-2']);
  });

  it('should handle text with multiple dice of different types', () => {
    const result = parseTextForDiceRolls('Roll 1d20 for attack, 2d6 for damage, and 1d4+2 for bonus');
    expect(result).toEqual(['1d20', '2d6', '1d4+2']);
  });
});
