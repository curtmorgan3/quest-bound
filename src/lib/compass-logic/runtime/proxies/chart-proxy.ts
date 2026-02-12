import type { Chart } from '@/types';

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
   * Find a value in the chart using a lookup.
   * Searches for sourceValue in sourceColumn and returns the corresponding value from targetColumn.
   * 
   * @param sourceColumn - Column to search in
   * @param sourceValue - Value to search for
   * @param targetColumn - Column to return value from
   * @returns The value from targetColumn, or empty string if not found
   */
  where(sourceColumn: string, sourceValue: any, targetColumn: string): any {
    if (!this.data || this.data.length === 0) {
      return '';
    }

    const headers = this.data[0];
    const sourceIndex = headers.indexOf(sourceColumn);
    const targetIndex = headers.indexOf(targetColumn);

    if (sourceIndex === -1 || targetIndex === -1) {
      return ''; // Column not found
    }

    // Find first matching row
    for (let i = 1; i < this.data.length; i++) {
      // Use loose equality to match numbers and strings
      if (this.data[i][sourceIndex] == sourceValue) {
        return this.data[i][targetIndex];
      }
    }

    return ''; // No match found
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
