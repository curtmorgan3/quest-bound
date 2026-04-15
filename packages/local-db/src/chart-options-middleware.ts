import type { Attribute } from '@quest-bound/types';
import type { DBCore, Middleware } from 'dexie';

// Cache for parsed chart data - lazy-loaded on first use and updated on chart write
// Key is chart ID, value is parsed 2D array of chart data
export const memoizedCharts: Record<string, string[][]> = {};

type GetChartData = (chartId: string) => Promise<string[][] | undefined>;

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

async function injectChartOptions(
  record: any,
  getChartData: GetChartData,
): Promise<Attribute | any> {
  if (!record) return record;

  // Only process list type attributes with a chart reference
  if (record.type !== 'list' || !record.optionsChartRef || !record.optionsChartColumnHeader) {
    return record;
  }

  const chartId = String(record.optionsChartRef);
  const chartData = await getChartData(chartId);

  if (chartData) {
    const options = getOptionsFromChart(chartData, record.optionsChartColumnHeader);
    return { ...record, options };
  }

  return record;
}

/** Injects variantOptions from chart when archetype has variantsChartRef + variantsChartColumnHeader. */
async function injectArchetypeVariantOptions(
  record: any,
  getChartData: GetChartData,
): Promise<any> {
  if (!record) return record;
  if (!record.variantsChartRef || !record.variantsChartColumnHeader) return record;

  const chartId = String(record.variantsChartRef);
  const chartData = await getChartData(chartId);
  if (chartData) {
    const variantOptions = getOptionsFromChart(chartData, record.variantsChartColumnHeader);
    return { ...record, variantOptions };
  }
  return record;
}

async function processRecord(
  tableName: string,
  record: any,
  getChartData: GetChartData,
): Promise<any> {
  if (tableName === 'attributes' || tableName === 'characterAttributes') {
    return injectChartOptions(record, getChartData);
  }
  if (tableName === 'archetypes') {
    return injectArchetypeVariantOptions(record, getChartData);
  }
  return record;
}

export const chartOptionsMiddleware: Middleware<DBCore> = {
  stack: 'dbcore',
  name: 'ChartOptionsInjector',
  create(downlevelDatabase) {
    const chartsTable = downlevelDatabase.table('charts');

    // Use a fresh transaction per load: the parent request's transaction may already be
    // finished by the time we await (after get/query resolves), which causes InvalidStateError.
    const loadChartData = async (chartId: string): Promise<string[][] | undefined> => {
      if (memoizedCharts[chartId] !== undefined) {
        return memoizedCharts[chartId];
      }
      const trans = downlevelDatabase.transaction(['charts'], 'readonly');
      const row = await chartsTable.get({ key: chartId, trans });
      if (row?.data) {
        try {
          const parsed = JSON.parse(row.data as string) as string[][];
          memoizedCharts[chartId] = parsed;
          return parsed;
        } catch {
          // Invalid JSON, skip
        }
      }
      return undefined;
    };

    return {
      ...downlevelDatabase,
      table(tableName) {
        const downlevelTable = downlevelDatabase.table(tableName);

        const applyMiddleware =
          tableName === 'attributes' ||
          tableName === 'characterAttributes' ||
          tableName === 'archetypes';

        if (tableName === 'charts') {
          return {
            ...downlevelTable,
            mutate: (req) => {
              return downlevelTable.mutate(req).then((res) => {
                const values = 'values' in req ? req.values : [];
                for (const value of values) {
                  if (value.id && value.data) {
                    try {
                      memoizedCharts[value.id] = JSON.parse(value.data as string) as string[][];
                    } catch {
                      // Invalid JSON, skip
                    }
                  }
                }
                return res;
              });
            },
          };
        }

        if (!applyMiddleware) {
          return downlevelTable;
        }

        return {
          ...downlevelTable,
          get: (req) => {
            return downlevelTable
              .get(req)
              .then((record) => processRecord(tableName, record, loadChartData));
          },
          query: (req) => {
            return downlevelTable.query(req).then(async (originalResult) => {
              if (!originalResult) return originalResult;
              const records = originalResult?.result ?? [];
              const processedRecords = await Promise.all(
                records.map((r) => processRecord(tableName, r, loadChartData)),
              );

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
