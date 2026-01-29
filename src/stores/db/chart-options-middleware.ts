import type { DBCore, Middleware } from 'dexie';
import type { Attribute } from '@/types';

// Cache for parsed chart data - populated on db ready and kept in sync via hooks
// Key is chart ID, value is parsed 2D array of chart data
export const memoizedCharts: Record<string, string[][]> = {};

function getOptionsFromChart(chartData: string[][] | undefined, columnHeader: string): string[] {
  if (!chartData || chartData.length < 2) return [];
  const headers = chartData[0] || [];
  const columnIndex = headers.indexOf(columnHeader);
  if (columnIndex === -1) return [];
  return chartData
    .slice(1)
    .map((row) => row[columnIndex] || '')
    .filter(Boolean);
}

function injectChartOptions(record: any): Attribute {
  if (!record) return record;

  // Only process list type attributes with a chart reference
  if (record.type !== 'list' || !record.optionsChartRef || !record.optionsChartColumnHeader) {
    return record;
  }

  const chartId = String(record.optionsChartRef);
  const chartData = memoizedCharts[chartId];

  if (chartData) {
    const options = getOptionsFromChart(chartData, record.optionsChartColumnHeader);
    return { ...record, options };
  }

  return record;
}

export const chartOptionsMiddleware: Middleware<DBCore> = {
  stack: 'dbcore',
  name: 'ChartOptionsInjector',
  create(downlevelDatabase) {
    return {
      ...downlevelDatabase,
      table(tableName) {
        const downlevelTable = downlevelDatabase.table(tableName);

        // Only apply to attributes table
        if (tableName !== 'attributes') {
          return downlevelTable;
        }

        return {
          ...downlevelTable,
          get: (req) => {
            return downlevelTable.get(req).then(injectChartOptions);
          },
          query: (req) => {
            return downlevelTable.query(req).then((originalResult) => {
              if (!originalResult) return originalResult;
              const records = originalResult?.result ?? [];
              const processedRecords = records.map(injectChartOptions);

              return {
                ...originalResult,
                result: processedRecords,
              };
            });
          },
        };
      },
    };
  },
};
