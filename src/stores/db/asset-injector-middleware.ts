import type { DBCore, Middleware } from 'dexie';
import { memoizedAssets } from './memoization-cache';

/**
 * Injects asset data into a record using only the memoization cache (sync).
 * Resolving after awaiting would run outside the Dexie transaction; Dexie's
 * cache layer then reads ctx.trans.mode and throws when trans is undefined.
 * So we only inject when data is already cached and never await in the chain.
 */
function injectImageDataSync(record: any): any {
  if (!record) return record;

  let next = record;

  if (record.assetId && memoizedAssets[record.assetId] !== undefined) {
    next = { ...next, image: memoizedAssets[record.assetId] };
  }
  if (record.pdfAssetId && memoizedAssets[record.pdfAssetId as string] !== undefined) {
    next = { ...next, pdfData: memoizedAssets[record.pdfAssetId as string] };
  }
  if (record.backgroundAssetId && memoizedAssets[record.backgroundAssetId] !== undefined) {
    next = { ...next, backgroundImage: memoizedAssets[record.backgroundAssetId] };
  }
  if (record.charactersCtaAssetId && memoizedAssets[record.charactersCtaAssetId] !== undefined) {
    next = { ...next, charactersCtaImage: memoizedAssets[record.charactersCtaAssetId] };
  }
  if (record.campaignsCtaAssetId && memoizedAssets[record.campaignsCtaAssetId] !== undefined) {
    next = { ...next, campaignsCtaImage: memoizedAssets[record.campaignsCtaAssetId] };
  }
  if (
    record.type === 'image' &&
    typeof record.defaultValue === 'string' &&
    memoizedAssets[record.defaultValue] !== undefined
  ) {
    next = { ...next, defaultValue: memoizedAssets[record.defaultValue] };
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
            'campaigns',
            'characters',
            'charts',
            'items',
            'actions',
            'archetypes',
            'assets',
            'documents',
            'attributes',
            'pages',
            'locations',
            'tilemaps',
            'customProperties',
            'characterPages',
            'components',
          ].indexOf(tableName) === -1
        ) {
          return downlevelTable;
        }

        return {
          ...downlevelTable,
          get: (req) => {
            return downlevelTable.get(req).then(injectImageDataSync);
          },
          getMany: (req) => {
            return downlevelTable.getMany(req).then((results) => results.map(injectImageDataSync));
          },
          query: (req) => {
            return downlevelTable.query(req).then((originalResult) => {
              if (!originalResult) return originalResult;
              const records = originalResult.result ?? [];
              return {
                ...originalResult,
                result: records.map(injectImageDataSync),
              };
            });
          },
          mutate: (req) => {
            return downlevelTable.mutate(req).then((res) => {
              const myResponse = res != null ? { ...res } : { numFailures: 0, failures: {}, lastResult: undefined };

              // Add newly created or updated assets to the memoization cache (lazy-load on write)
              if (tableName === 'assets' && (req.type === 'add' || req.type === 'put')) {
                const values = 'values' in req ? req.values : [];
                for (const value of values) {
                  if (value?.id && value?.data) {
                    memoizedAssets[value.id] = value.data as string;
                  }
                }
              }

              if (req.type === 'put' && myResponse.results) {
                myResponse.results = (myResponse.results as any[]).map(injectImageDataSync);
              }

              return myResponse;
            });
          },
        };
      },
    };
  },
};
