import type { Transaction } from 'dexie';

const URL_PATTERN = /^https?:\/\//i;

function isUrl(s: string): boolean {
  return URL_PATTERN.test(s);
}

/** Derive filename from URL path, or return UUID if none. */
function filenameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const seg = u.pathname.split('/').filter(Boolean).pop();
    if (seg) return seg;
  } catch {
    // ignore
  }
  return crypto.randomUUID();
}

/** Disambiguate filename: "cover.png" -> "cover (2).png" etc. */
function disambiguateFilename(base: string, existing: Set<string>): string {
  if (!existing.has(base)) return base;
  const ext = base.includes('.') ? base.slice(base.lastIndexOf('.')) : '';
  const name = base.includes('.') ? base.slice(0, base.lastIndexOf('.')) : base;
  let n = 2;
  while (existing.has(`${name} (${n})${ext}`)) n++;
  return `${name} (${n})${ext}`;
}

export async function migrate43to44(tx: Transaction): Promise<void> {
  const assetsTable = tx.table('assets');

  // 1. Directory removal: get all assets (may have directory), group by (rulesetId, filename), disambiguate
  const allAssets = (await assetsTable.toArray()) as Array<{
    id: string;
    rulesetId: string | null;
    filename: string;
    directory?: string;
    data: string;
    type: string;
    createdAt: string;
    updatedAt: string;
    moduleId?: string;
    worldId?: string | null;
  }>;

  const byKey = new Map<string, typeof allAssets>();
  for (const a of allAssets) {
    const key = `${a.rulesetId ?? 'null'}\t${a.filename}`;
    const list = byKey.get(key) ?? [];
    list.push(a);
    byKey.set(key, list);
  }

  const now = new Date().toISOString();
  for (const list of byKey.values()) {
    if (list.length <= 1) {
      const a = list[0]!;
      const { directory: _, ...rest } = a;
      await assetsTable.put({ ...rest, updatedAt: now });
      continue;
    }
    list.sort((x, y) => (x.createdAt || '').localeCompare(y.createdAt || ''));
    const used = new Set<string>();
    for (let i = 0; i < list.length; i++) {
      const a = list[i]!;
      const newFilename = i === 0 ? a.filename : disambiguateFilename(a.filename, used);
      used.add(newFilename);
      const { directory: _, ...rest } = a;
      await assetsTable.put({ ...rest, filename: newFilename, updatedAt: now });
    }
  }

  // 2. URL-on-entity -> URL assets for each entity table
  const createUrlAsset = async (
    url: string,
    rulesetId: string | null,
    worldId: string | null,
  ): Promise<string> => {
    const filename = filenameFromUrl(url);
    const id = crypto.randomUUID();
    await assetsTable.add({
      id,
      data: url,
      type: 'url',
      filename,
      createdAt: now,
      updatedAt: now,
      rulesetId,
      worldId,
    });
    return id;
  };

  const usersTable = tx.table('users');
  const users = (await usersTable.toArray()) as Array<{ id: string; image?: string | null; assetId?: string | null }>;
  for (const u of users) {
    if (u.image && isUrl(u.image) && !u.assetId) {
      const assetId = await createUrlAsset(u.image, null, null);
      await usersTable.update(u.id, { assetId, image: undefined });
    }
  }

  const rulesetsTable = tx.table('rulesets');
  const rulesets = (await rulesetsTable.toArray()) as Array<{
    id: string;
    image?: string | null;
    assetId?: string | null;
  }>;
  for (const r of rulesets) {
    if (r.image && isUrl(r.image) && !r.assetId) {
      const assetId = await createUrlAsset(r.image, r.id, null);
      await rulesetsTable.update(r.id, { assetId, image: undefined });
    }
  }

  const charactersTable = tx.table('characters');
  const characters = (await charactersTable.toArray()) as Array<{
    id: string;
    rulesetId: string;
    image?: string | null;
    assetId?: string | null;
  }>;
  for (const c of characters) {
    if (c.image && isUrl(c.image) && !c.assetId) {
      const assetId = await createUrlAsset(c.image, c.rulesetId, null);
      await charactersTable.update(c.id, { assetId, image: undefined });
    }
  }

  const chartsTable = tx.table('charts');
  const charts = (await chartsTable.toArray()) as Array<{
    id: string;
    rulesetId: string;
    image?: string | null;
    assetId?: string | null;
  }>;
  for (const c of charts) {
    if (c.image && isUrl(c.image) && !c.assetId) {
      const assetId = await createUrlAsset(c.image, c.rulesetId, null);
      await chartsTable.update(c.id, { assetId, image: undefined });
    }
  }

  const documentsTable = tx.table('documents');
  const documents = (await documentsTable.toArray()) as Array<{
    id: string;
    rulesetId: string;
    image?: string | null;
    assetId?: string | null;
  }>;
  for (const d of documents) {
    if (d.image && isUrl(d.image) && !d.assetId) {
      const assetId = await createUrlAsset(d.image, d.rulesetId, null);
      await documentsTable.update(d.id, { assetId, image: undefined });
    }
  }

  const attributesTable = tx.table('attributes');
  const attributes = (await attributesTable.toArray()) as Array<{
    id: string;
    rulesetId: string;
    image?: string | null;
    assetId?: string | null;
  }>;
  for (const a of attributes) {
    if (a.image && isUrl(a.image) && !a.assetId) {
      const assetId = await createUrlAsset(a.image, a.rulesetId, null);
      await attributesTable.update(a.id, { assetId, image: undefined });
    }
  }

  const actionsTable = tx.table('actions');
  const actions = (await actionsTable.toArray()) as Array<{
    id: string;
    rulesetId: string;
    image?: string | null;
    assetId?: string | null;
  }>;
  for (const a of actions) {
    if (a.image && isUrl(a.image) && !a.assetId) {
      const assetId = await createUrlAsset(a.image, a.rulesetId, null);
      await actionsTable.update(a.id, { assetId, image: undefined });
    }
  }

  const itemsTable = tx.table('items');
  const items = (await itemsTable.toArray()) as Array<{
    id: string;
    rulesetId: string;
    image?: string | null;
    assetId?: string | null;
  }>;
  for (const i of items) {
    if (i.image && isUrl(i.image) && !i.assetId) {
      const assetId = await createUrlAsset(i.image, i.rulesetId, null);
      await itemsTable.update(i.id, { assetId, image: undefined });
    }
  }

  const archetypesTable = tx.table('archetypes');
  const archetypes = (await archetypesTable.toArray()) as Array<{
    id: string;
    rulesetId: string;
    image?: string | null;
    assetId?: string | null;
  }>;
  for (const a of archetypes) {
    if (a.image && isUrl(a.image) && !a.assetId) {
      const assetId = await createUrlAsset(a.image, a.rulesetId, null);
      await archetypesTable.update(a.id, { assetId, image: undefined });
    }
  }

  const worldsTable = tx.table('worlds');
  const worlds = (await worldsTable.toArray()) as Array<{
    id: string;
    rulesetId?: string;
    image?: string | null;
    assetId?: string | null;
  }>;
  for (const w of worlds) {
    if (w.image && isUrl(w.image) && !w.assetId) {
      const assetId = await createUrlAsset(w.image, w.rulesetId ?? null, null);
      await worldsTable.update(w.id, { assetId, image: undefined });
    }
  }

  const characterPagesTable = tx.table('characterPages');
  const characterPages = (await characterPagesTable.toArray()) as Array<{
    id: string;
    rulesetId: string;
    assetId?: string | null;
    assetUrl?: string | null;
    image?: string | null;
  }>;
  for (const cp of characterPages) {
    const url = cp.assetUrl || (cp.image && isUrl(cp.image) ? cp.image : null);
    if (url && !cp.assetId) {
      const assetId = await createUrlAsset(url, cp.rulesetId, null);
      await characterPagesTable.update(cp.id, { assetId, assetUrl: undefined, image: undefined });
    } else if (cp.assetUrl != null || (cp.image && isUrl(cp.image))) {
      await characterPagesTable.update(cp.id, { assetUrl: undefined, image: undefined });
    }
  }

  const componentsTable = tx.table('components');
  const components = (await componentsTable.toArray()) as Array<{
    id: string;
    rulesetId: string;
    data: string;
  }>;
  for (const comp of components) {
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(comp.data) as Record<string, unknown>;
    } catch {
      continue;
    }
    const assetUrl = data.assetUrl as string | undefined;
    if (assetUrl && isUrl(assetUrl) && !data.assetId) {
      const assetId = await createUrlAsset(assetUrl, comp.rulesetId, null);
      data.assetId = assetId;
      delete data.assetUrl;
      await componentsTable.update(comp.id, { data: JSON.stringify(data) });
    } else if (assetUrl != null) {
      delete data.assetUrl;
      await componentsTable.update(comp.id, { data: JSON.stringify(data) });
    }
  }
}
