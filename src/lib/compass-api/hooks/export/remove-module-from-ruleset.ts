import { db } from '@/stores';
import type { Ruleset } from '@/types';

export interface DanglingRefSummary {
  components: number;
  scripts: number;
  charts: number;
  documents: number;
  windows: number;
  attributes: number;
  actions: number;
  items: number;
}

/**
 * Collect all entity IDs that will be removed when removing the given module
 * from the target ruleset.
 */
async function getRemovedIds(
  targetRulesetId: string,
  moduleIdToRemove: string,
): Promise<{
  attributeIds: Set<string>;
  actionIds: Set<string>;
  itemIds: Set<string>;
  chartIds: Set<string>;
  documentIds: Set<string>;
  windowIds: Set<string>;
  pageIds: Set<string>;
  scriptIds: Set<string>;
  assetIds: Set<string>;
  characterIds: Set<string>;
}> {
  const [attrs, actions, items, charts, docs, windows, pages, scripts, assets, characters] =
    await Promise.all([
      db.attributes
        .where('rulesetId')
        .equals(targetRulesetId)
        .filter((a) => (a as { moduleId?: string }).moduleId === moduleIdToRemove)
        .primaryKeys(),
      db.actions
        .where('rulesetId')
        .equals(targetRulesetId)
        .filter((a) => (a as { moduleId?: string }).moduleId === moduleIdToRemove)
        .primaryKeys(),
      db.items
        .where('rulesetId')
        .equals(targetRulesetId)
        .filter((i) => (i as { moduleId?: string }).moduleId === moduleIdToRemove)
        .primaryKeys(),
      db.charts
        .where('rulesetId')
        .equals(targetRulesetId)
        .filter((c) => (c as { moduleId?: string }).moduleId === moduleIdToRemove)
        .primaryKeys(),
      db.documents
        .where('rulesetId')
        .equals(targetRulesetId)
        .filter((d) => (d as { moduleId?: string }).moduleId === moduleIdToRemove)
        .primaryKeys(),
      db.windows
        .where('rulesetId')
        .equals(targetRulesetId)
        .filter((w) => (w as { moduleId?: string }).moduleId === moduleIdToRemove)
        .primaryKeys(),
      db.pages.where('moduleId').equals(moduleIdToRemove).primaryKeys(),
      db.scripts
        .where('rulesetId')
        .equals(targetRulesetId)
        .filter((s) => (s as { moduleId?: string }).moduleId === moduleIdToRemove)
        .primaryKeys(),
      db.assets.where('moduleId').equals(moduleIdToRemove).primaryKeys(),
      db.characters
        .where('rulesetId')
        .equals(targetRulesetId)
        .filter((c) => (c as { moduleId?: string }).moduleId === moduleIdToRemove)
        .primaryKeys(),
    ]);

  return {
    attributeIds: new Set(attrs as string[]),
    actionIds: new Set(actions as string[]),
    itemIds: new Set(items as string[]),
    chartIds: new Set(charts as string[]),
    documentIds: new Set(docs as string[]),
    windowIds: new Set(windows as string[]),
    pageIds: new Set(pages as string[]),
    scriptIds: new Set(scripts as string[]),
    assetIds: new Set(assets as string[]),
    characterIds: new Set(characters as string[]),
  };
}

/**
 * Check for dangling references: native (non-module) content in the target
 * ruleset that references entities that will be removed. Returns counts per type.
 */
export async function getDanglingReferencesForModuleRemoval(
  targetRulesetId: string,
  moduleIdToRemove: string,
): Promise<DanglingRefSummary> {
  const removed = await getRemovedIds(targetRulesetId, moduleIdToRemove);

  const summary: DanglingRefSummary = {
    components: 0,
    scripts: 0,
    charts: 0,
    documents: 0,
    windows: 0,
    attributes: 0,
    actions: 0,
    items: 0,
  };

  // Components: in target ruleset, window not in removed set, but references removed id
  const targetWindows = await db.windows.where('rulesetId').equals(targetRulesetId).toArray();
  const nativeWindowIds = new Set(
    targetWindows
      .filter((w) => (w as { moduleId?: string }).moduleId !== moduleIdToRemove)
      .map((w) => w.id),
  );
  if (nativeWindowIds.size > 0) {
    const components = await db.components
      .where('windowId')
      .anyOf([...nativeWindowIds])
      .toArray();
    for (const c of components) {
      const refsRemoved =
        (c.attributeId && removed.attributeIds.has(c.attributeId)) ||
        (c.actionId && removed.actionIds.has(c.actionId)) ||
        (c.windowId && removed.windowIds.has(c.windowId)) ||
        (c.childWindowId && removed.windowIds.has(c.childWindowId));
      let dataRefsRemoved = false;
      if (c.data) {
        try {
          const parsed = JSON.parse(c.data) as Record<string, unknown>;
          if (
            typeof parsed.conditionalRenderAttributeId === 'string' &&
            removed.attributeIds.has(parsed.conditionalRenderAttributeId)
          )
            dataRefsRemoved = true;
          if (
            typeof parsed.pageId === 'string' &&
            removed.pageIds.has(parsed.pageId)
          )
            dataRefsRemoved = true;
        } catch {
          // ignore
        }
      }
      if (refsRemoved || dataRefsRemoved) summary.components++;
    }
  }

  // Scripts: rulesetId = target, not from this module, entityId in removed
  const scripts = await db.scripts.where('rulesetId').equals(targetRulesetId).toArray();
  for (const s of scripts) {
    const modId = (s as { moduleId?: string }).moduleId;
    if (modId === moduleIdToRemove) continue;
    if (s.entityId && !s.isGlobal) {
      if (
        removed.attributeIds.has(s.entityId) ||
        removed.actionIds.has(s.entityId) ||
        removed.itemIds.has(s.entityId)
      ) {
        summary.scripts++;
      }
    }
  }

  // Charts: rulesetId = target, not from this module, assetId in removed
  const charts = await db.charts.where('rulesetId').equals(targetRulesetId).toArray();
  for (const c of charts) {
    if ((c as { moduleId?: string }).moduleId === moduleIdToRemove) continue;
    if (c.assetId && removed.assetIds.has(c.assetId)) summary.charts++;
  }

  // Documents: rulesetId = target, not from this module, assetId or pdfAssetId in removed
  const documents = await db.documents.where('rulesetId').equals(targetRulesetId).toArray();
  for (const d of documents) {
    if ((d as { moduleId?: string }).moduleId === moduleIdToRemove) continue;
    const refsRemoved =
      (d.assetId && removed.assetIds.has(d.assetId)) ||
      (d.pdfAssetId && removed.assetIds.has(d.pdfAssetId));
    if (refsRemoved) summary.documents++;
  }

  // Windows: rulesetId = target, not from this module, pageId or assetId in removed
  for (const w of targetWindows) {
    if ((w as { moduleId?: string }).moduleId === moduleIdToRemove) continue;
    const win = w as { pageId?: string; assetId?: string | null };
    const refsRemoved =
      (win.pageId && removed.pageIds.has(win.pageId)) ||
      (win.assetId && removed.assetIds.has(win.assetId));
    if (refsRemoved) summary.windows++;
  }

  // Attributes, actions, items: rulesetId = target, not from this module, scriptId or assetId in removed
  const attributes = await db.attributes.where('rulesetId').equals(targetRulesetId).toArray();
  for (const a of attributes) {
    if ((a as { moduleId?: string }).moduleId === moduleIdToRemove) continue;
    if (
      (a.scriptId && removed.scriptIds.has(a.scriptId)) ||
      (a.assetId && removed.assetIds.has(a.assetId))
    )
      summary.attributes++;
  }
  const actions = await db.actions.where('rulesetId').equals(targetRulesetId).toArray();
  for (const a of actions) {
    if ((a as { moduleId?: string }).moduleId === moduleIdToRemove) continue;
    if (
      (a.scriptId && removed.scriptIds.has(a.scriptId)) ||
      (a.assetId && removed.assetIds.has(a.assetId))
    )
      summary.actions++;
  }
  const items = await db.items.where('rulesetId').equals(targetRulesetId).toArray();
  for (const i of items) {
    if ((i as { moduleId?: string }).moduleId === moduleIdToRemove) continue;
    if (
      (i.scriptId && removed.scriptIds.has(i.scriptId)) ||
      (i.assetId && removed.assetIds.has(i.assetId))
    )
      summary.items++;
  }

  return summary;
}

function hasAnyDanglingRefs(summary: DanglingRefSummary): boolean {
  return Object.values(summary).some((n) => n > 0);
}

export interface RemoveModuleFromRulesetParams {
  targetRulesetId: string;
  moduleIdToRemove: string;
  /** If true, skip dangling-ref check and remove anyway. Caller should show warning first. */
  force?: boolean;
}

/**
 * Remove a module from a ruleset: delete all entities with that moduleId,
 * remove the module from ruleset.modules, and clean up script errors/logs.
 * Use getDanglingReferencesForModuleRemoval first and show a confirmation dialog
 * when there are dangling refs; call with force: true after user confirms.
 */
export async function removeModuleFromRuleset({
  targetRulesetId,
  moduleIdToRemove,
  force = false,
}: RemoveModuleFromRulesetParams): Promise<void> {
  const ruleset = await db.rulesets.get(targetRulesetId);
  if (!ruleset) throw new Error('Ruleset not found');

  if (!force) {
    const dangling = await getDanglingReferencesForModuleRemoval(
      targetRulesetId,
      moduleIdToRemove,
    );
    if (hasAnyDanglingRefs(dangling)) {
      throw new Error(
        'DANGLING_REFERENCES:' +
          JSON.stringify(dangling) +
          ' (call with force: true after user confirms)',
      );
    }
  }

  await deleteModuleContentFromRuleset(targetRulesetId, moduleIdToRemove);

  // Remove module from ruleset.modules
  const modules = (ruleset as Ruleset & { modules?: { id: string }[] }).modules ?? [];
  const nextModules = modules.filter((m) => m.id !== moduleIdToRemove);
  await db.rulesets.update(targetRulesetId, {
    modules: nextModules,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Delete all entities with the given moduleId from the target ruleset, without
 * removing the module from ruleset.modules. Used for re-import (refresh).
 */
export async function deleteModuleContentFromRuleset(
  targetRulesetId: string,
  moduleIdToRemove: string,
): Promise<void> {
  const removed = await getRemovedIds(targetRulesetId, moduleIdToRemove);

  // 1. Inventory items for inventories that belong to removed characters
  const removedInventories = await db.inventories
    .where('characterId')
    .anyOf([...removed.characterIds])
    .primaryKeys();
  if (removedInventories.length > 0) {
    await db.inventoryItems
      .where('inventoryId')
      .anyOf(removedInventories as string[])
      .delete();
  }

  // 2. Inventories for removed characters
  await db.inventories.where('characterId').anyOf([...removed.characterIds]).delete();

  // 3. Character attributes, character pages for removed characters
  await db.characterAttributes
    .where('characterId')
    .anyOf([...removed.characterIds])
    .delete();
  await db.characterPages.where('characterId').anyOf([...removed.characterIds]).delete();

  // 4. Character windows (by moduleId)
  await db.characterWindows.where('moduleId').equals(moduleIdToRemove).delete();

  // 5. Characters (by moduleId)
  await db.characters
    .where('rulesetId')
    .equals(targetRulesetId)
    .filter((c) => (c as { moduleId?: string }).moduleId === moduleIdToRemove)
    .delete();

  // 6. Components whose window is being removed
  if (removed.windowIds.size > 0) {
    await db.components.where('windowId').anyOf([...removed.windowIds]).delete();
  }

  // 7. Ruleset windows (by moduleId)
  await db.rulesetWindows.where('moduleId').equals(moduleIdToRemove).delete();

  // 8. Ruleset pages that point to removed pages
  if (removed.pageIds.size > 0) {
    const rulesetPageJoins = await db.rulesetPages
      .where('rulesetId')
      .equals(targetRulesetId)
      .toArray();
    const toDelete = rulesetPageJoins
      .filter((rp) => removed.pageIds.has(rp.pageId))
      .map((rp) => rp.id);
    if (toDelete.length > 0) {
      await db.rulesetPages.bulkDelete(toDelete);
    }
  }

  // 9. Pages (by moduleId)
  await db.pages.where('moduleId').equals(moduleIdToRemove).delete();

  // 10. Windows (by moduleId)
  await db.windows
    .where('rulesetId')
    .equals(targetRulesetId)
    .filter((w) => (w as { moduleId?: string }).moduleId === moduleIdToRemove)
    .delete();

  // 11. Attributes, actions, items, charts, documents, scripts, diceRolls, assets, fonts (by moduleId)
  await db.attributes
    .where('rulesetId')
    .equals(targetRulesetId)
    .filter((a) => (a as { moduleId?: string }).moduleId === moduleIdToRemove)
    .delete();
  await db.actions
    .where('rulesetId')
    .equals(targetRulesetId)
    .filter((a) => (a as { moduleId?: string }).moduleId === moduleIdToRemove)
    .delete();
  await db.items
    .where('rulesetId')
    .equals(targetRulesetId)
    .filter((i) => (i as { moduleId?: string }).moduleId === moduleIdToRemove)
    .delete();
  await db.charts
    .where('rulesetId')
    .equals(targetRulesetId)
    .filter((c) => (c as { moduleId?: string }).moduleId === moduleIdToRemove)
    .delete();
  await db.documents
    .where('rulesetId')
    .equals(targetRulesetId)
    .filter((d) => (d as { moduleId?: string }).moduleId === moduleIdToRemove)
    .delete();
  await db.scripts
    .where('rulesetId')
    .equals(targetRulesetId)
    .filter((s) => (s as { moduleId?: string }).moduleId === moduleIdToRemove)
    .delete();
  await db.diceRolls.where('moduleId').equals(moduleIdToRemove).delete();
  await db.assets.where('moduleId').equals(moduleIdToRemove).delete();
  await db.fonts
    .where('rulesetId')
    .equals(targetRulesetId)
    .filter((f) => (f as { moduleId?: string }).moduleId === moduleIdToRemove)
    .delete();

  // 12. Script errors and logs for removed scripts
  if (removed.scriptIds.size > 0) {
    await db.scriptErrors
      .where('rulesetId')
      .equals(targetRulesetId)
      .filter((e) => removed.scriptIds.has(e.scriptId))
      .delete();
    await db.scriptLogs
      .where('rulesetId')
      .equals(targetRulesetId)
      .filter((l) => removed.scriptIds.has(l.scriptId))
      .delete();
    await db.dependencyGraphNodes
      .where('rulesetId')
      .equals(targetRulesetId)
      .filter((n) => removed.scriptIds.has(n.scriptId))
      .delete();
  }
}
