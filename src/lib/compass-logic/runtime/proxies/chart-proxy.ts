import type { Chart } from '@/types';
import type { StructuredCloneSafe } from '../structured-clone-safe';

/**
 * Lightweight proxy for a single chart row returned from ChartProxy.rowWhere().
 * Provides valueInColumn() for chaining in QBScript while remaining structured-clone safe
 * when sent across the worker boundary.
 */
class ChartRowProxy implements StructuredCloneSafe {
  private chartProxy: ChartProxy;
  private row: any[];

  constructor(chartProxy: ChartProxy, row: any[]) {
    this.chartProxy = chartProxy;
    this.row = row;
  }

  valueInColumn(columnName: string): any {
    return this.chartProxy.valueInColumn(columnName, this.row);
  }

  /** When serialized for postMessage, reduce to the underlying row array. */
  toStructuredCloneSafe(): any[] {
    return this.row;
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

    // Return all values in column (skip header row)
    return this.data.slice(1).map((row) => row[columnIndex]);
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
   * @returns A single value in that chart excluding the header row
   */
  randomCell(): any {
    const column = this.randomColumn();
    return column[Math.floor(Math.random() * column.length)];
  }

  /**
   * Get the value of a random non-empty cell of the chart
   * @returns A single non-empty value in that chart excluding the header row
   */
  randomNonEmptyCell(): any {
    const column = this.randomColumn().filter(
      (val: any) => val !== '' && val !== null && val !== undefined,
    );
    return column[Math.floor(Math.random() * column.length)];
  }

  /**
   * Find a value in the chart using a lookup.
   * Searches for sourceValue in sourceColumn and returns the corresponding value from targetColumn.
   *
   * @param sourceColumn - Column to search in
   * @param sourceValue - Value to search for
   * @param targetColumn - Column to return value from
   * @returns The value from targetColumn, or empty string if not found
   */
  where(columnName: string, cellValue: any, targetColumn?: string): any {
    if (!targetColumn) return '';

    const headers = this.data[0];
    const targetIndex = headers.indexOf(targetColumn);

    if (targetIndex === -1) {
      return ''; // Column not found
    }

    const rowProxy = this.rowWhere(columnName, cellValue);
    const value = rowProxy.valueInColumn(targetColumn);

    return value !== undefined ? value : ''; // No match found
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
    return targetRow[columnIndex];
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
