import type { DBCore, Middleware } from 'dexie';
import { memoizedAssets } from './memoization-cache';

function resolveAssetUrl(assetId: string | null | undefined): string | undefined {
  if (!assetId) return undefined;
  try {
    return memoizedAssets[assetId];
  } catch {
    return undefined;
  }
}

function injectImageData(record: any) {
  if (!record) return record;

  let next = record;

  if (record.assetUrl) {
    next = { ...next, image: record.assetUrl };
  } else if (record.assetId) {
    const asset = resolveAssetUrl(record.assetId);
    if (asset) next = { ...next, image: asset };
  }

  if (record.backgroundAssetId) {
    const backgroundImage = resolveAssetUrl(record.backgroundAssetId);
    if (backgroundImage) next = { ...next, backgroundImage };
  }

  if (record.sprites && Array.isArray(record.sprites)) {
    next = {
      ...next,
      sprites: record.sprites.map((s: string) => {
        if (typeof s !== 'string') return s;
        if (s.startsWith('http://') || s.startsWith('https://')) return s;
        const data = resolveAssetUrl(s);
        return data ?? s;
      }),
    };
  }

  return next;
}

export const assetInjectorMiddleware: Middleware<DBCore> = {
  stack: 'dbcore',
  name: 'AssetReplacer',
  create(downlevelDatabase) {
    return {
      ...downlevelDatabase,
      table(tableName) {
        const downlevelTable = downlevelDatabase.table(tableName);

        if (
            [
            'users',
            'rulesets',
            'characters',
            'charts',
            'items',
            'actions',
            'assets',
            'documents',
            'attributes',
            'pages',
            'worlds',
            'locations',
          ].indexOf(tableName) === -1
        ) {
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
