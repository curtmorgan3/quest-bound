import type { DBCore, Middleware } from 'dexie';
import { memoizedAssets } from './memoization-cache';

type GetAssetData = (assetId: string) => Promise<string | undefined>;

async function injectImageData(record: any, getAssetData: GetAssetData): Promise<any> {
  if (!record) return record;

  let next = record;

  if (record.assetId) {
    const asset = await getAssetData(record.assetId);
    if (asset) next = { ...next, image: asset };
  }

  if (record.pdfAssetId) {
    const pdfData = await getAssetData(record.pdfAssetId as string);
    if (pdfData) next = { ...next, pdfData };
  }

  if (record.backgroundAssetId) {
    const backgroundImage = await getAssetData(record.backgroundAssetId);
    if (backgroundImage) next = { ...next, backgroundImage };
  }

  if (record.charactersCtaAssetId) {
    const charactersCtaImage = await getAssetData(record.charactersCtaAssetId);
    if (charactersCtaImage) next = { ...next, charactersCtaImage };
  }

  if (record.campaignsCtaAssetId) {
    const campaignsCtaImage = await getAssetData(record.campaignsCtaAssetId);
    if (campaignsCtaImage) next = { ...next, campaignsCtaImage };
  }

  // Inject image data for image-typed custom properties whose defaultValue holds an assetId.
  if (record.type === 'image' && typeof record.defaultValue === 'string') {
    const imageData = await getAssetData(record.defaultValue);
    if (imageData) {
      next = { ...next, defaultValue: imageData };
    }
  }

  return next;
}

export const assetInjectorMiddleware: Middleware<DBCore> = {
  stack: 'dbcore',
  name: 'AssetReplacer',
  create(downlevelDatabase) {
    const assetsTable = downlevelDatabase.table('assets');

    // Use a fresh transaction per load: the parent request's transaction may already be
    // finished by the time we await (after get/query resolves), which causes InvalidStateError.
    const loadAsset = async (assetId: string): Promise<string | undefined> => {
      if (memoizedAssets[assetId] !== undefined) {
        return memoizedAssets[assetId];
      }
      const trans = downlevelDatabase.transaction(['assets'], 'readonly');
      const row = await assetsTable.get({ key: assetId, trans });
      if (row?.data) {
        memoizedAssets[assetId] = row.data as string;
        return row.data as string;
      }
      return undefined;
    };

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
            return downlevelTable.get(req).then((record) => injectImageData(record, loadAsset));
          },
          getMany: (req) => {
            return downlevelTable
              .getMany(req)
              .then((results) => Promise.all(results.map((r) => injectImageData(r, loadAsset))));
          },
          query: (req) => {
            return downlevelTable.query(req).then(async (originalResult) => {
              if (!originalResult) return originalResult;
              const records = originalResult?.result ?? [];
              const processedRecords = await Promise.all(
                records.map((r) => injectImageData(r, loadAsset)),
              );

              return {
                ...originalResult,
                result: processedRecords,
              };
            });
          },
          mutate: (req) => {
            return downlevelTable.mutate(req).then(async (res) => {
              const myResponse = { ...res };

              // Add newly created or updated assets to the memoization cache (lazy-load on write)
              if (tableName === 'assets' && (req.type === 'add' || req.type === 'put')) {
                const values = 'values' in req ? req.values : [];
                for (const value of values) {
                  if (value.id && value.data) {
                    memoizedAssets[value.id] = value.data as string;
                  }
                }
              }

              if (req.type === 'put') {
                const values = 'values' in req ? req.values : [];
                const processedRecords = await Promise.all(
                  values.map((v: any) => injectImageData(v, loadAsset)),
                );
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
