import type { DB } from './types';

export function registerAssetDbHooks(db: DB) {
  // Prevent deletion if any entity references this asset
  db.assets.hook('deleting', (primKey, obj) => {
    setTimeout(async () => {
      try {
        const [
          itemCount,
          documentCount,
          actionCount,
          userCount,
          attributeCount,
          characterCount,
          componentCount,
          rulesetCount,
          chartCount,
          archetypeCount,
          worldCount,
          tilemapCount,
        ] = await Promise.all([
          db.items.filter((item) => item.assetId === primKey).count(),
          db.documents
            .filter((doc) => doc.assetId === primKey || doc.pdfAssetId === primKey)
            .count(),
          db.actions.filter((action) => action.assetId === primKey).count(),
          db.users.filter((user) => user.assetId === primKey).count(),
          db.attributes.filter((attr) => attr.assetId === primKey).count(),
          db.characters.filter((char) => char.assetId === primKey).count(),
          db.components.filter((comp) => JSON.parse(comp.data)?.assetId === primKey).count(),
          db.rulesets.filter((r) => r.assetId === primKey).count(),
          db.charts.filter((c) => c.assetId === primKey).count(),
          db.archetypes.filter((a) => a.assetId === primKey).count(),
          db.worlds.filter((w) => w.assetId === primKey).count(),
          db.tilemaps.filter((tm) => tm.assetId === primKey).count(),
        ]);

        const totalCount =
          itemCount +
          documentCount +
          actionCount +
          userCount +
          attributeCount +
          characterCount +
          componentCount +
          rulesetCount +
          chartCount +
          archetypeCount +
          worldCount +
          tilemapCount;

        if (totalCount > 0) {
          // Re-add used asset
          db.assets.add(obj);
          return;
        }
      } catch (error) {
        console.error('Failed to delete asset:', error);
      }
    }, 0);
  });
}
