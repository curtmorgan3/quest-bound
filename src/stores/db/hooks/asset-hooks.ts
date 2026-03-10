import type { DB } from './types';

/** Tables and how to check/clear assetId reference for asset delete flow. */
export async function getAssetReferenceCount(db: DB, assetId: string): Promise<number> {
  const [
    itemCount,
    documentCount,
    actionCount,
    userCount,
    attributeCount,
    characterCount,
    componentCount,
    rulesetCount,
    campaignCount,
    chartCount,
    archetypeCount,
    characterPageCount,
  ] = await Promise.all([
    db.items.filter((item) => item.assetId === assetId).count(),
    db.documents
      .filter((doc) => doc.assetId === assetId || doc.pdfAssetId === assetId)
      .count(),
    db.actions.filter((action) => action.assetId === assetId).count(),
    db.users.filter((user) => user.assetId === assetId).count(),
    db.attributes.filter((attr) => attr.assetId === assetId).count(),
    db.characters.filter((char) => char.assetId === assetId).count(),
    db.components.filter((comp) => JSON.parse(comp.data)?.assetId === assetId).count(),
    db.rulesets.filter(
      (r) =>
        r.assetId === assetId ||
        r.charactersCtaAssetId === assetId ||
        r.campaignsCtaAssetId === assetId,
    ).count(),
    db.campaigns.filter((c) => c.assetId === assetId).count(),
    db.charts.filter((c) => c.assetId === assetId).count(),
    db.archetypes.filter((a) => a.assetId === assetId).count(),
    db.characterPages.filter((cp) => cp.assetId === assetId).count(),
  ]);
  return (
    itemCount +
    documentCount +
    actionCount +
    userCount +
    attributeCount +
    characterCount +
    componentCount +
    rulesetCount +
    campaignCount +
    chartCount +
    archetypeCount +
    characterPageCount
  );
}

/** Delete an asset only if nothing references it. Use when an entity clears its asset reference. */
export async function deleteAssetIfUnreferenced(db: DB, assetId: string): Promise<void> {
  const count = await getAssetReferenceCount(db, assetId);
  if (count === 0) {
    await db.assets.delete(assetId);
  }
}

/** Clear assetId (and pdfAssetId where applicable) on all entities that reference this asset. */
export async function clearAssetReferences(db: DB, assetId: string): Promise<void> {
  const [
    items,
    documents,
    actions,
    users,
    attributes,
    characters,
    components,
    rulesets,
    campaigns,
    charts,
    archetypes,
    characterPages,
  ] = await Promise.all([
    db.items.where('assetId').equals(assetId).toArray(),
    db.documents.filter((d) => d.assetId === assetId || d.pdfAssetId === assetId).toArray(),
    db.actions.where('assetId').equals(assetId).toArray(),
    db.users.where('assetId').equals(assetId).toArray(),
    db.attributes.where('assetId').equals(assetId).toArray(),
    db.characters.where('assetId').equals(assetId).toArray(),
    db.components.toArray(),
    db.rulesets
      .filter(
        (r) =>
          r.assetId === assetId ||
          r.charactersCtaAssetId === assetId ||
          r.campaignsCtaAssetId === assetId,
      )
      .toArray(),
    db.campaigns.filter((c) => c.assetId === assetId).toArray(),
    db.charts.where('assetId').equals(assetId).toArray(),
    db.archetypes.where('assetId').equals(assetId).toArray(),
    db.characterPages.where('assetId').equals(assetId).toArray(),
  ]);

  const now = new Date().toISOString();
  await Promise.all([
    ...items.map((i) => db.items.update(i.id, { assetId: null, updatedAt: now })),
    ...documents.map((d) => {
      const updates: Record<string, unknown> = { updatedAt: now };
      if (d.assetId === assetId) updates.assetId = null;
      if (d.pdfAssetId === assetId) updates.pdfAssetId = null;
      return db.documents.update(d.id, updates);
    }),
    ...actions.map((a) => db.actions.update(a.id, { assetId: null, updatedAt: now })),
    ...users.map((u) => db.users.update(u.id, { assetId: null, updatedAt: now })),
    ...attributes.map((a) => db.attributes.update(a.id, { assetId: null, updatedAt: now })),
    ...characters.map((c) => db.characters.update(c.id, { assetId: null, updatedAt: now })),
    ...rulesets.map((r) => {
      const updates: Record<string, unknown> = { updatedAt: now };
      if (r.assetId === assetId) updates.assetId = null;
      if (r.charactersCtaAssetId === assetId) updates.charactersCtaAssetId = null;
      if (r.campaignsCtaAssetId === assetId) updates.campaignsCtaAssetId = null;
      return db.rulesets.update(r.id, updates);
    }),
    ...campaigns.map((c) => db.campaigns.update(c.id, { assetId: null, updatedAt: now })),
    ...charts.map((c) => db.charts.update(c.id, { assetId: null, updatedAt: now })),
    ...archetypes.map((a) => db.archetypes.update(a.id, { assetId: null, updatedAt: now })),
    ...characterPages.map((cp) =>
      db.characterPages.update(cp.id, { assetId: null, updatedAt: now }),
    ),
  ]);

  for (const comp of components) {
    try {
      const data = JSON.parse(comp.data) as Record<string, unknown>;
      if (data.assetId === assetId) {
        data.assetId = null;
        await db.components.update(comp.id, { data: JSON.stringify(data) });
      }
    } catch {
      // skip
    }
  }
}

export function registerAssetDbHooks(_db: DB) {
  // Asset deletion: no longer block here; Assets page shows warning and lets user choose
  // (Cancel or Remove and clear references) via getAssetReferenceCount / clearAssetReferences.
}
