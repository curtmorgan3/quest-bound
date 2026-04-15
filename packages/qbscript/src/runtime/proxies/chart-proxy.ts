import type { Chart } from '@quest-bound/types';
import type { StructuredCloneSafe } from '../structured-clone-safe';

/**
 * Coerce a raw chart cell value to a script-friendly type:
 * - Parseable ints/floats → number
 * - 'true' / 'false' (any casing) → boolean
 * - Everything else → string
 */
function coerceCellValue(value: unknown): string | number | boolean {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const lower = trimmed.toLowerCase();
    if (lower === 'true') return true;
    if (lower === 'false') return false;
    const num = Number(trimmed);
    if (trimmed !== '' && !Number.isNaN(num) && isFinite(num)) return num;
    return value;
  }
  return String(value);
}

/**
 * Lightweight proxy for a single chart row returned from ChartProxy.rowWhere() or ChartProxy.randomRow().
 *
 * This class:
 * - Behaves like an array so you can call array methods directly
 *   (e.g. rowWhere(...).map(...), rowWhere(...)[0], rowWhere(...).length)
 * - Applies type coercion to all values in the row (number/boolean/string)
 * - Provides valueInColumn() for chaining in QBScript
 * - Implements StructuredCloneSafe so it can be reduced to a plain array
 *   when sent across the worker boundary.
 */
class ChartRowProxy extends Array<any> implements StructuredCloneSafe {
  private chartProxy: ChartProxy;

  constructor(chartProxy: ChartProxy, row: any[]) {
    super(...row.map(coerceCellValue));
    this.chartProxy = chartProxy;
    // Ensure the correct prototype when targeting environments that might
    // not fully support Array subclassing semantics.
    Object.setPrototypeOf(this, ChartRowProxy.prototype);
  }

  valueInColumn(columnName: string): any {
    // Pass this array-like instance as the row to ChartProxy.
    return this.chartProxy.valueInColumn(columnName, this as any[]);
  }

  /** When serialized for postMessage, reduce to the underlying row array. */
  toStructuredCloneSafe(): any[] {
    return Array.from(this);
  }
}

/**
 * Proxy object for charts, providing methods to query chart data.
 */
export class ChartProxy {
  private chart: Chart;
  private data: any[][];

  constructor(chart: Chart) {
    this.chart = chart;
    try {
      this.data = JSON.parse(chart.data);
    } catch (e) {
      throw new Error(`Failed to parse chart data for '${chart.title}'`);
    }
  }

  /**
   * Get the column names (header row values) of the chart.
   * @returns Array of header row values
   */
  getColumnNames(): string[] {
    if (!this.data || this.data.length === 0) {
      return [];
    }
    return this.data[0].map((h: unknown) => String(h ?? ''));
  }

  /**
   * Get all values from a specific column.
   * @param columnName - The name of the column (header)
   * @returns Array of values in that column (excluding header row)
   */
  get(columnName: string): any[] {
    if (!this.data || this.data.length === 0) {
      throw new Error(`Chart '${this.chart.title}' has no data`);
    }

    const headers = this.data[0];
    const columnIndex = headers.indexOf(columnName);

    if (columnIndex === -1) {
      throw new Error(`Column '${columnName}' not found in chart '${this.chart.title}'`);
    }

    // Return all values in column (skip header row), coerced to number/boolean/string
    return this.data.slice(1).map((row) => coerceCellValue(row[columnIndex]));
  }

  /** Alias for get. Get all values from a specific column. */
  columnWhere(columnName: string): any[] {
    return this.get(columnName);
  }

  /**
   * Get all values of a random column of the chart
   * @returns An array of values in a random chart column excluding the header row
   */
  randomColumn(): any {
    if (!this.data || this.data.length === 0) {
      throw new Error(`Chart '${this.chart.title}' has no data`);
    }
    const headers = this.data[0];
    const randomHeader = headers[Math.floor(Math.random() * headers.length)];

    return this.get(randomHeader);
  }

  /**
   * Get the value of a random cell of the chart
   * @returns A single value in that chart excluding the header row (coerced to number/boolean/string)
   */
  randomCell(): string | number | boolean {
    const column = this.randomColumn();
    const value = column[Math.floor(Math.random() * column.length)];
    return coerceCellValue(value);
  }

  /**
   * Get the value of a random non-empty cell of the chart
   * @returns A single non-empty value in that chart excluding the header row (coerced to number/boolean/string)
   */
  randomNonEmptyCell(): string | number | boolean {
    const column = this.randomColumn().filter(
      (val: any) => val !== '' && val !== null && val !== undefined,
    );
    const value = column[Math.floor(Math.random() * column.length)];
    return coerceCellValue(value);
  }

  /**
   * Get a random data row from the chart (excluding the header row).
   * Returns a ChartRowProxy so you can chain valueInColumn(), e.g. chart.randomRow().valueInColumn('HP').
   * @returns ChartRowProxy for a randomly selected row, or empty row if chart has no data
   */
  randomRow(): ChartRowProxy {
    if (!this.data || this.data.length < 2) {
      return new ChartRowProxy(this, []);
    }
    const dataRows = this.data.slice(1);
    const row = dataRows[Math.floor(Math.random() * dataRows.length)];
    return new ChartRowProxy(this, row);
  }

  rowWhere(columnName: string, cellValue: any): ChartRowProxy {
    if (!this.data || this.data.length === 0) {
      return new ChartRowProxy(this, []);
    }

    const headers = this.data[0];
    const columnIndex = headers.indexOf(columnName);

    if (columnIndex === -1) {
      return new ChartRowProxy(this, []);
    }

    let row: string[] = [];

    // Find first matching row
    for (let i = 1; i < this.data.length; i++) {
      // Use loose equality to match numbers and strings
      if (this.data[i][columnIndex] == cellValue) {
        row = this.data[i];
        break;
      }
    }

    return new ChartRowProxy(this, row);
  }

  /**
   * Get the value in the specified column for a given row.
   * When called directly on the chart (without a rowWhere() chain), it defaults
   * to the first data row (the row immediately after the header row).
   *
   * Example:
   *   chart.valueInColumn("HP")                      // first data row's HP
   *   chart.rowWhere("Level", 5).valueInColumn("HP") // matching row's HP
   */
  valueInColumn(columnName: string, row?: any[]): any {
    if (!this.data || this.data.length < 2) {
      throw new Error(`Chart '${this.chart.title}' has no data rows`);
    }

    const headers = this.data[0];
    const columnIndex = headers.indexOf(columnName);

    if (columnIndex === -1) {
      throw new Error(`Column '${columnName}' not found in chart '${this.chart.title}'`);
    }

    const targetRow = row && row.length > 0 ? row : this.data[1];
    return coerceCellValue(targetRow[columnIndex] ?? '');
  }

  /**
   * Get the chart's title.
   */
  get title(): string {
    return this.chart.title;
  }

  /**
   * Get the chart's description.
   */
  get description(): string {
    return this.chart.description;
  }
}
