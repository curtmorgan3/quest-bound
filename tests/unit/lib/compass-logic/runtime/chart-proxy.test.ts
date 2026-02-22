import { describe, it, expect } from 'vitest';
import { ChartProxy } from '@/lib/compass-logic/runtime/proxies/chart-proxy';
import type { Chart } from '@/types';

describe('ChartProxy', () => {
  const chartData = [
    ['Level', 'XP Required', 'Ability Points'],
    [1, 0, 5],
    [2, 100, 6],
    [3, 300, 7],
    [4, 600, 8],
  ];

  const chart: Chart = {
    id: 'chart1',
    rulesetId: 'ruleset1',
    title: 'Level Progression',
    description: 'Experience and ability points per level',
    data: JSON.stringify(chartData),
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  };

  describe('get method', () => {
    it('should return all values from a column', () => {
      const proxy = new ChartProxy(chart);
      const levels = proxy.get('Level');
      expect(levels).toEqual([1, 2, 3, 4]);
    });

    it('should return XP values', () => {
      const proxy = new ChartProxy(chart);
      const xpValues = proxy.get('XP Required');
      expect(xpValues).toEqual([0, 100, 300, 600]);
    });

    it('should throw error for non-existent column', () => {
      const proxy = new ChartProxy(chart);
      expect(() => proxy.get('Invalid Column')).toThrow(
        "Column 'Invalid Column' not found in chart 'Level Progression'",
      );
    });

    it('should throw error for chart with no data', () => {
      const emptyChart: Chart = {
        ...chart,
        data: '[]',
      };
      const proxy = new ChartProxy(emptyChart);
      expect(() => proxy.get('Level')).toThrow("Chart 'Level Progression' has no data");
    });
  });

  describe('rowWhere and valueInColumn methods', () => {
    it('should find a row by lookup and return value via valueInColumn', () => {
      const proxy = new ChartProxy(chart);
      const row = proxy.rowWhere('Level', 3);
      const xpForLevel3 = row.valueInColumn('XP Required');
      expect(xpForLevel3).toBe(300);
    });

    it('should find ability points for level 2', () => {
      const proxy = new ChartProxy(chart);
      const row = proxy.rowWhere('Level', 2);
      const abilityPoints = row.valueInColumn('Ability Points');
      expect(abilityPoints).toBe(6);
    });

    it('should default valueInColumn to first data row when called on chart', () => {
      const proxy = new ChartProxy(chart);
      const firstRowAbilityPoints = proxy.valueInColumn('Ability Points');
      // First data row is level 1 -> Ability Points = 5
      expect(firstRowAbilityPoints).toBe(5);
    });

    it('should return empty row when no match found in rowWhere', () => {
      const proxy = new ChartProxy(chart);
      const row = proxy.rowWhere('Level', 99);
      // Underlying row array should be empty when no match
      // valueInColumn on this row should fall back to chart-level behavior (first data row)
      const xp = row.valueInColumn('XP Required');
      expect(xp).toBe(0);
    });

    it('should return empty row when source column not found', () => {
      const proxy = new ChartProxy(chart);
      const row = proxy.rowWhere('Invalid', 1);
      const xp = row.valueInColumn('XP Required');
      expect(xp).toBe(0);
    });

    it('should handle string matching with loose equality', () => {
      const proxy = new ChartProxy(chart);
      // Should match 2 as number with "2" as string
      const row = proxy.rowWhere('Level', '2');
      const abilityPoints = row.valueInColumn('Ability Points');
      expect(abilityPoints).toBe(6);
    });
  });

  describe('properties', () => {
    it('should return chart title', () => {
      const proxy = new ChartProxy(chart);
      expect(proxy.title).toBe('Level Progression');
    });

    it('should return chart description', () => {
      const proxy = new ChartProxy(chart);
      expect(proxy.description).toBe('Experience and ability points per level');
    });
  });

  describe('type coercion', () => {
    it('should return numbers for parseable int/float strings', () => {
      const stringNumberChart: Chart = {
        ...chart,
        data: JSON.stringify([
          ['Col'],
          ['42'],
          ['3.14'],
          ['0'],
          ['-10'],
        ]),
      };
      const proxy = new ChartProxy(stringNumberChart);
      const values = proxy.get('Col');
      expect(values).toEqual([42, 3.14, 0, -10]);
      expect(values.every((v) => typeof v === 'number')).toBe(true);
    });

    it('should return booleans for true/false strings in any casing', () => {
      const boolChart: Chart = {
        ...chart,
        data: JSON.stringify([
          ['Flag'],
          ['true'],
          ['TRUE'],
          ['False'],
          ['FALSE'],
        ]),
      };
      const proxy = new ChartProxy(boolChart);
      const values = proxy.get('Flag');
      expect(values).toEqual([true, true, false, false]);
      expect(values.every((v) => typeof v === 'boolean')).toBe(true);
    });

    it('should return strings for non-numeric, non-boolean values', () => {
      const stringChart: Chart = {
        ...chart,
        data: JSON.stringify([
          ['Label'],
          ['hello'],
          [''],
          ['42px'],
        ]),
      };
      const proxy = new ChartProxy(stringChart);
      const values = proxy.get('Label');
      expect(values).toEqual(['hello', '', '42px']);
      expect(values.every((v) => typeof v === 'string')).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should throw error for invalid JSON data', () => {
      const invalidChart: Chart = {
        ...chart,
        data: 'not valid json',
      };
      expect(() => new ChartProxy(invalidChart)).toThrow(
        "Failed to parse chart data for 'Level Progression'",
      );
    });
  });
});
