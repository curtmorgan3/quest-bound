import type { DBCore, Middleware } from 'dexie';
import { memoizedAssets } from './memoization-cache';

function injectImageData(record: any) {
  if (!record?.assetId) return record;

  try {
    const asset = memoizedAssets[record.assetId];
    if (asset) {
      return { ...record, image: asset };
    }
  } catch (error) {
    console.warn(`Failed to load asset for asset ${record.assetId}:`, error);
  }

  return record;
}

export const assetInjectorMiddleware: Middleware<DBCore> = {
  stack: 'dbcore',
  name: 'AssetReplacer',
  create(downlevelDatabase) {
    return {
      ...downlevelDatabase,
      table(tableName) {
        const downlevelTable = downlevelDatabase.table(tableName);

        // Only apply asset replacement to users, rulesets, and characters tables
        if (['users', 'rulesets', 'characters', 'assets'].indexOf(tableName) === -1) {
          return downlevelTable;
        }

        return {
          ...downlevelTable,
          get: (req) => {
            return downlevelTable.get(req).then(injectImageData);
          },
          query: (req) => {
            return downlevelTable.query(req).then(async (originalResult) => {
              if (!originalResult) return originalResult;
              const records = originalResult?.result ?? [];
              const processedRecords = records.map(injectImageData);

              return {
                ...originalResult,
                result: processedRecords,
              };
            });
          },
          mutate: (req) => {
            return downlevelTable.mutate(req).then(async (res) => {
              const myResponse = { ...res };

              // Add newly created assets to the memoization cache
              if (tableName === 'assets' && req.type === 'add') {
                for (const value of req.values) {
                  if (value.id && value.data) {
                    memoizedAssets[value.id] = value.data;
                  }
                }
              }

              if (req.type === 'put') {
                const processedRecords = await Promise.all(req.values.map(injectImageData));
                myResponse.results = processedRecords;
                return {
                  ...myResponse,
                  results: processedRecords,
                };
              }

              return myResponse;
            });
          },
        };
      },
    };
  },
};
