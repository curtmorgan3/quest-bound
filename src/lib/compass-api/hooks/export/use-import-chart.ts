import { useErrorHandler } from '@/hooks/use-error-handler';
import { db } from '@/stores';
import { useState } from 'react';

export interface ImportChartResult {
  success: boolean;
  message: string;
  rowsAdded: number;
  errors: string[];
}

/**
 * Parses a TSV string into a 2D array
 */
function parseTsv(tsvString: string): string[][] {
  const lines = tsvString.split('\n');
  return lines
    .map((line) => line.replace(/\r/g, '').split('\t'))
    .filter((row) => row.some((cell) => cell.trim() !== '')); // Filter out empty rows
}

/**
 * Checks if two header rows match (case-insensitive, trimmed)
 */
function headersMatch(existingHeaders: string[], importHeaders: string[]): boolean {
  if (existingHeaders.length !== importHeaders.length) return false;
  return existingHeaders.every(
    (header, index) =>
      header.trim().toLowerCase() === importHeaders[index].trim().toLowerCase()
  );
}

export const useImportChart = (chartId: string) => {
  const [isLoading, setIsLoading] = useState(false);
  const { handleError } = useErrorHandler();

  const importChartData = async (file: File): Promise<ImportChartResult> => {
    setIsLoading(true);

    try {
      // Fetch the existing chart
      const chart = await db.charts.get(chartId);

      if (!chart) {
        return {
          success: false,
          message: 'Chart not found',
          rowsAdded: 0,
          errors: ['Chart not found'],
        };
      }

      // Read and parse the TSV file
      const text = await file.text();
      const importedData = parseTsv(text);

      if (importedData.length === 0) {
        return {
          success: false,
          message: 'TSV file is empty',
          rowsAdded: 0,
          errors: ['TSV file contains no data'],
        };
      }

      const importHeaders = importedData[0];
      const importRows = importedData.slice(1);

      if (importRows.length === 0) {
        return {
          success: false,
          message: 'TSV file contains only headers',
          rowsAdded: 0,
          errors: ['TSV file must contain at least one data row'],
        };
      }

      // Parse existing chart data
      let existingData: string[][] = [];
      try {
        existingData = JSON.parse(chart.data ?? '[[]]');
      } catch {
        existingData = [[]];
      }

      let finalData: string[][];
      let rowsAdded = 0;

      // Check if chart has existing data with headers
      const hasExistingData = existingData.length > 0 && existingData[0].some((cell) => cell);

      if (!hasExistingData) {
        // Chart is empty, use imported data as-is
        finalData = importedData;
        rowsAdded = importRows.length;
      } else {
        const existingHeaders = existingData[0];

        // Check if headers match
        if (!headersMatch(existingHeaders, importHeaders)) {
          return {
            success: false,
            message: 'Headers do not match existing chart',
            rowsAdded: 0,
            errors: [
              `Import headers: ${importHeaders.join(', ')}`,
              `Chart headers: ${existingHeaders.join(', ')}`,
              'Headers must match to import additively',
            ],
          };
        }

        // Additive import: append new rows to existing data
        finalData = [...existingData, ...importRows];
        rowsAdded = importRows.length;
      }

      // Update the chart with merged data
      await db.charts.update(chartId, {
        data: JSON.stringify(finalData),
        updatedAt: new Date().toISOString(),
      });

      return {
        success: true,
        message: `Successfully added ${rowsAdded} rows`,
        rowsAdded,
        errors: [],
      };
    } catch (error) {
      await handleError(error as Error, {
        component: 'useImportChart/importChartData',
        severity: 'medium',
      });

      return {
        success: false,
        message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        rowsAdded: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    importChartData,
    isLoading,
  };
};
