import { db } from '../../db';
import type {
  Action,
  Archetype,
  Asset,
  Attribute,
  Character,
  CharacterAttribute,
  CharacterPage,
  CharacterWindow,
  Chart,
  Component,
  Composite,
  CompositeVariant,
  DiceRoll,
  Document,
  Font,
  Inventory,
  InventoryItem,
  Item,
  Page,
  Ruleset,
  RulesetWindow,
  Script,
  Window,
} from '@/types';
import { ensureRulesetDefaultTestCharacterAndArchetype } from '@/utils/ensure-ruleset-default-bootstrap';
import { remapComponentSerializedDataAndStates } from './remap-component-entity-ids';
import { deleteModuleContentFromRuleset } from './remove-module-from-ruleset';

export interface AddModuleToRulesetParams {
  sourceRulesetId: string;
  targetRulesetId: string;
}

export interface AddModuleResult {
  counts: {
    attributes: number;
    actions: number;
    items: number;
    charts: number;
    windows: number;
    components: number;
    composites: number;
    compositeVariants: number;
    assets: number;
    fonts: number;
    documents: number;
    rulesetWindows: number;
    archetypes: number;
    characters: number;
    characterAttributes: number;
    inventories: number;
    characterWindows: number;
    characterPages: number;
    inventoryItems: number;
    scripts: number;
    pages: number;
    diceRolls: number;
  };
  /** Entity types and counts skipped due to ID conflict (e.g. { attributes: 2 }). */
  skippedByConflict: Record<string, number>;
  /** Per-entity-type details for skipped items (id and display title/name). */
  skippedDetails?: Record<string, Array<{ id: string; title?: string }>>;
}

/**
 * Add a module (ruleset with isModule === true) to another ruleset by duplicating
 * the module's content into the target. Sets moduleId, moduleEntityId, moduleName
 * on duplicated entities. The module's default archetype and test character row are
 * not copied; their character pages and character windows are cloned onto the target
 * default test character (same remaps as other module sheet content). On ID conflict,
 * skips the entity; on name conflict, appends " (<module name>)" to the title.
 */
export async function addModuleToRuleset({
  sourceRulesetId,
  targetRulesetId,
}: AddModuleToRulesetParams): Promise<AddModuleResult> {
  const sourceRuleset = await db.rulesets.get(sourceRulesetId);
  const targetRuleset = await db.rulesets.get(targetRulesetId);

  if (!sourceRuleset) {
    throw new Error('Source ruleset not found');
  }
  if (!targetRuleset) {
    throw new Error('Target ruleset not found');
  }
  if (!(sourceRuleset as Ruleset & { isModule?: boolean }).isModule) {
    throw new Error('Source ruleset is not marked as a module');
  }
  if (sourceRulesetId === targetRulesetId) {
    throw new Error('Cannot add a ruleset as a module to itself');
  }

  await ensureRulesetDefaultTestCharacterAndArchetype(
    targetRulesetId,
    targetRuleset.createdBy || 'unknown',
  );

  const existingModules =
    (targetRuleset as Ruleset & { modules?: { id: string; name: string; image: string | null }[] })
      .modules ?? [];
  const isRefresh = existingModules.some((m) => m.id === sourceRulesetId);
  if (isRefresh) {
    await deleteModuleContentFromRuleset(targetRulesetId, sourceRulesetId);
  }

  const moduleName = sourceRuleset.title;
  const moduleImage = sourceRuleset.image ?? null;
  const now = new Date().toISOString();

  // Load target's existing IDs for conflict detection
  const [
    targetAttributeIds,
    targetActionIds,
    targetItemIds,
    targetChartIds,
    targetDocumentIds,
    targetWindowIds,
    targetScriptIds,
    targetAssetIds,
    targetFontIds,
    targetDiceRollIds,
  ] = await Promise.all([
    db.attributes.where('rulesetId').equals(targetRulesetId).primaryKeys(),
    db.actions.where('rulesetId').equals(targetRulesetId).primaryKeys(),
    db.items.where('rulesetId').equals(targetRulesetId).primaryKeys(),
    db.charts.where('rulesetId').equals(targetRulesetId).primaryKeys(),
    db.documents
      .where('rulesetId')
      .equals(targetRulesetId)
      .filter((d) => d.worldId == null && d.campaignId == null)
      .primaryKeys(),
    db.windows.where('rulesetId').equals(targetRulesetId).primaryKeys(),
    db.scripts.where('rulesetId').equals(targetRulesetId).primaryKeys(),
    db.assets.where('rulesetId').equals(targetRulesetId).primaryKeys(),
    db.fonts.where('rulesetId').equals(targetRulesetId).primaryKeys(),
    db.diceRolls.where('rulesetId').equals(targetRulesetId).primaryKeys(),
  ]);
  const targetIds = {
    attributes: new Set(targetAttributeIds as string[]),
    actions: new Set(targetActionIds as string[]),
    items: new Set(targetItemIds as string[]),
    charts: new Set(targetChartIds as string[]),
    documents: new Set(targetDocumentIds as string[]),
    windows: new Set(targetWindowIds as string[]),
    scripts: new Set(targetScriptIds as string[]),
    assets: new Set(targetAssetIds as string[]),
    fonts: new Set(targetFontIds as string[]),
    diceRolls: new Set(targetDiceRollIds as string[]),
  };

  // Load target titles/names for name conflict (append module name)
  const [
    targetAttributes,
    targetActions,
    targetItems,
    targetCharts,
    targetDocuments,
    targetScripts,
  ] = await Promise.all([
    db.attributes.where('rulesetId').equals(targetRulesetId).toArray(),
    db.actions.where('rulesetId').equals(targetRulesetId).toArray(),
    db.items.where('rulesetId').equals(targetRulesetId).toArray(),
    db.charts.where('rulesetId').equals(targetRulesetId).toArray(),
    db.documents
      .where('rulesetId')
      .equals(targetRulesetId)
      .filter((d) => d.worldId == null && d.campaignId == null)
      .toArray(),
    db.scripts.where('rulesetId').equals(targetRulesetId).toArray(),
  ]);
  const targetTitles = {
    attributes: new Set(targetAttributes.map((a) => a.title)),
    actions: new Set(targetActions.map((a) => a.title)),
    items: new Set(targetItems.map((i) => i.title)),
    charts: new Set(targetCharts.map((c) => c.title)),
    documents: new Set(targetDocuments.map((d) => d.title)),
    scripts: new Set(targetScripts.map((s) => s.name)),
  };

  const skippedByConflict: Record<string, number> = {};
  const skippedDetails: Record<string, Array<{ id: string; title?: string }>> = {};
  const pushSkipped = (entityType: string, id: string, title?: string) => {
    skippedByConflict[entityType] = (skippedByConflict[entityType] ?? 0) + 1;
    if (!skippedDetails[entityType]) skippedDetails[entityType] = [];
    skippedDetails[entityType].push({ id, title });
  };

  // Load all source entities
  const [
    sourceAttributes,
    sourceActions,
    sourceItems,
    sourceCharts,
    sourceDocuments,
    sourceWindows,
    sourceAssets,
    sourceFonts,
    sourceScripts,
    sourcePages,
    sourceRulesetWindows,
    sourceDiceRolls,
  ] = await Promise.all([
    db.attributes.where('rulesetId').equals(sourceRulesetId).toArray(),
    db.actions.where('rulesetId').equals(sourceRulesetId).toArray(),
    db.items.where('rulesetId').equals(sourceRulesetId).toArray(),
    db.charts.where('rulesetId').equals(sourceRulesetId).toArray(),
    db.documents
      .where('rulesetId')
      .equals(sourceRulesetId)
      .filter((d) => d.worldId == null && d.campaignId == null)
      .toArray(),
    db.windows.where('rulesetId').equals(sourceRulesetId).toArray(),
    db.assets.where('rulesetId').equals(sourceRulesetId).toArray(),
    db.fonts.where('rulesetId').equals(sourceRulesetId).toArray(),
    db.scripts.where('rulesetId').equals(sourceRulesetId).toArray(),
    db.pages.where('rulesetId').equals(sourceRulesetId).toArray(),
    db.rulesetWindows.where('rulesetId').equals(sourceRulesetId).toArray(),
    db.diceRolls.where('rulesetId').equals(sourceRulesetId).toArray(),
  ]);

  const windowIds = sourceWindows.map((w) => w.id);
  const sourceComponents =
    windowIds.length > 0
      ? await db.components
          .where('windowId')
          .anyOf(windowIds as string[])
          .toArray()
      : [];

  const sourceComposites = await db.composites.where('rulesetId').equals(sourceRulesetId).toArray();
  const sourceCompositeVariants =
    sourceComposites.length > 0
      ? await db.compositeVariants.where('rulesetId').equals(sourceRulesetId).toArray()
      : [];

  const sourceArchetypes = await db.archetypes
    .where('rulesetId')
    .equals(sourceRulesetId)
    .sortBy('loadOrder');
  /** Default archetype / test character row stay on the module only; sheet layout merges into target default TC. */
  const archetypesToClone = sourceArchetypes.filter((a) => !a.isDefault);
  const testCharacterIds = [
    ...new Set(archetypesToClone.map((a) => a.testCharacterId).filter(Boolean)),
  ];
  const testCharacterIdSet = new Set(testCharacterIds);

  const targetArchetypesSnapshot = await db.archetypes
    .where('rulesetId')
    .equals(targetRulesetId)
    .toArray();
  const targetDefaultArchetype = targetArchetypesSnapshot.find((a) => a.isDefault);
  const targetDefaultTestCharacterId = targetDefaultArchetype?.testCharacterId ?? null;

  const sourceDefaultArchetype = sourceArchetypes.find((a) => a.isDefault);
  const sourceDefaultTestCharacterId = sourceDefaultArchetype?.testCharacterId ?? null;

  /** When false, the module default TC is already cloned as a non-default archetype's TC — skip duplicate layout merge. */
  const mergeModuleDefaultTestCharacterLayout =
    Boolean(
      sourceDefaultTestCharacterId &&
        targetDefaultTestCharacterId &&
        !testCharacterIdSet.has(sourceDefaultTestCharacterId),
    );

  let defaultSourceCharacterPages: CharacterPage[] = [];
  let defaultSourceCharacterWindows: CharacterWindow[] = [];
  if (mergeModuleDefaultTestCharacterLayout) {
    [defaultSourceCharacterPages, defaultSourceCharacterWindows] = await Promise.all([
      db.characterPages.where('characterId').equals(sourceDefaultTestCharacterId!).toArray(),
      db.characterWindows.where('characterId').equals(sourceDefaultTestCharacterId!).toArray(),
    ]);
  }

  let sourceCharacterAttributes: CharacterAttribute[] = [];
  let sourceCharacterPages: CharacterPage[] = [];
  let sourceCharacterWindows: CharacterWindow[] = [];
  let sourceInventories: Inventory[] = [];
  let sourceInventoryItems: InventoryItem[] = [];

  if (testCharacterIds.length > 0) {
    [sourceCharacterAttributes, sourceCharacterPages, sourceCharacterWindows] = await Promise.all([
      db.characterAttributes.where('characterId').anyOf(testCharacterIds).toArray(),
      db.characterPages.where('characterId').anyOf(testCharacterIds).toArray(),
      db.characterWindows.where('characterId').anyOf(testCharacterIds).toArray(),
    ]);
    sourceInventories = await db.inventories.where('characterId').anyOf(testCharacterIds).toArray();
    const sourceInventoryIds = sourceInventories.map((inv) => inv.id);
    sourceInventoryItems =
      sourceInventoryIds.length > 0
        ? await db.inventoryItems
            .where('inventoryId')
            .anyOf(sourceInventoryIds as string[])
            .toArray()
        : [];
  }

  const assetIdMap = new Map<string, string>();
  const fontIdMap = new Map<string, string>();
  const chartIdMap = new Map<string, string>();
  const attributeIdMap = new Map<string, string>();
  const actionIdMap = new Map<string, string>();
  const itemIdMap = new Map<string, string>();
  const documentIdMap = new Map<string, string>();
  const windowIdMap = new Map<string, string>();
  const componentIdMap = new Map<string, string>();
  const compositeIdMap = new Map<string, string>();
  const characterIdMap = new Map<string, string>();
  const characterPageIdMap = new Map<string, string>();
  const inventoryIdMap = new Map<string, string>();
  const archetypeIdMap = new Map<string, string>();
  const pageIdMap = new Map<string, string>();

  const counts = {
    attributes: 0,
    actions: 0,
    items: 0,
    charts: 0,
    windows: 0,
    components: 0,
    composites: 0,
    compositeVariants: 0,
    assets: 0,
    fonts: 0,
    documents: 0,
    rulesetWindows: 0,
    archetypes: 0,
    characters: 0,
    characterAttributes: 0,
    inventories: 0,
    characterWindows: 0,
    characterPages: 0,
    inventoryItems: 0,
    scripts: 0,
    pages: 0,
    diceRolls: 0,
  };

  function resolveTitle(type: keyof typeof targetTitles, title: string): string {
    if (targetTitles[type].has(title)) {
      return `${title} (${moduleName})`;
    }
    return title;
  }

  /** Pre-assign so component `data`/`states` can reference merged script ids before script rows exist. */
  const scriptIdMap = new Map<string, string>();
  for (const s of sourceScripts) {
    if (!targetIds.scripts.has(s.id)) {
      scriptIdMap.set(s.id, crypto.randomUUID());
    }
  }
  for (const c of sourceComponents) {
    componentIdMap.set(c.id, crypto.randomUUID());
  }

  // 1. Assets
  for (const asset of sourceAssets as Asset[]) {
    if (targetIds.assets.has(asset.id)) {
      pushSkipped('assets', asset.id, (asset as { name?: string }).name);
      continue;
    }
    const newId = crypto.randomUUID();
    assetIdMap.set(asset.id, newId);
    const { id, rulesetId, createdAt, updatedAt, ...rest } = asset;
    await db.assets.add({
      ...rest,
      id: newId,
      rulesetId: targetRulesetId,
      moduleId: sourceRulesetId,
      moduleEntityId: asset.id,
      moduleName,
      createdAt: now,
      updatedAt: now,
    } as Asset & { moduleId: string; moduleEntityId: string; moduleName: string });
    counts.assets++;
  }

  // 2. Fonts
  for (const font of sourceFonts as Font[]) {
    if (targetIds.fonts.has(font.id)) {
      pushSkipped('fonts', font.id, (font as { name?: string }).name);
      continue;
    }
    const newId = crypto.randomUUID();
    fontIdMap.set(font.id, newId);
    const { id, rulesetId, createdAt, updatedAt, ...rest } = font;
    await db.fonts.add({
      ...rest,
      id: newId,
      rulesetId: targetRulesetId,
      moduleId: sourceRulesetId,
      moduleEntityId: font.id,
      moduleName,
      createdAt: now,
      updatedAt: now,
    } as Font & { moduleId: string; moduleEntityId: string; moduleName: string });
    counts.fonts++;
  }

  // 3. Dice rolls
  for (const roll of sourceDiceRolls as DiceRoll[]) {
    if (targetIds.diceRolls.has(roll.id)) {
      pushSkipped('diceRolls', roll.id, (roll as { name?: string }).name);
      continue;
    }
    const newId = crypto.randomUUID();
    const { id, rulesetId, createdAt, updatedAt, ...rest } = roll;
    await db.diceRolls.add({
      ...rest,
      id: newId,
      rulesetId: targetRulesetId,
      moduleId: sourceRulesetId,
      moduleEntityId: roll.id,
      moduleName,
      createdAt: now,
      updatedAt: now,
    } as DiceRoll & { moduleId: string; moduleEntityId: string; moduleName: string });
    counts.diceRolls++;
  }

  // 4. Charts
  for (const chart of sourceCharts as Chart[]) {
    if (targetIds.charts.has(chart.id)) {
      pushSkipped('charts', chart.id, chart.title);
      continue;
    }
    const newId = crypto.randomUUID();
    chartIdMap.set(chart.id, newId);
    const { id, rulesetId, createdAt, updatedAt, assetId, ...rest } = chart;
    const mappedAssetId = assetId ? (assetIdMap.get(assetId) ?? assetId) : (assetId ?? null);
    const title = resolveTitle('charts', rest.title);
    await db.charts.add({
      ...rest,
      title,
      id: newId,
      rulesetId: targetRulesetId,
      assetId: mappedAssetId,
      moduleId: sourceRulesetId,
      moduleEntityId: chart.id,
      moduleName,
      createdAt: now,
      updatedAt: now,
    } as Chart & { moduleId: string; moduleEntityId: string; moduleName: string });
    counts.charts++;
  }

  // 5. Attributes
  for (const attribute of sourceAttributes as Attribute[]) {
    if (targetIds.attributes.has(attribute.id)) {
      pushSkipped('attributes', attribute.id, attribute.title);
      continue;
    }
    const newId = crypto.randomUUID();
    attributeIdMap.set(attribute.id, newId);
    const { id, rulesetId, createdAt, updatedAt, assetId, optionsChartRef, ...rest } = attribute;
    const mappedAssetId = assetId ? (assetIdMap.get(assetId) ?? assetId) : (assetId ?? null);
    let mappedOptionsChartRef = optionsChartRef;
    if (optionsChartRef != null) {
      const mappedChartId = chartIdMap.get(String(optionsChartRef));
      if (mappedChartId) mappedOptionsChartRef = mappedChartId as unknown as number;
    }
    const title = resolveTitle('attributes', rest.title);
    await db.attributes.add({
      ...rest,
      title,
      id: newId,
      rulesetId: targetRulesetId,
      assetId: mappedAssetId,
      optionsChartRef: mappedOptionsChartRef,
      moduleId: sourceRulesetId,
      moduleEntityId: attribute.id,
      moduleName,
      createdAt: now,
      updatedAt: now,
    } as Attribute & { moduleId: string; moduleEntityId: string; moduleName: string });
    counts.attributes++;
  }

  // 6. Actions
  for (const action of sourceActions as Action[]) {
    if (targetIds.actions.has(action.id)) {
      pushSkipped('actions', action.id, action.title);
      continue;
    }
    const newId = crypto.randomUUID();
    actionIdMap.set(action.id, newId);
    const { id, rulesetId, createdAt, updatedAt, assetId, ...rest } = action;
    const mappedAssetId = assetId ? (assetIdMap.get(assetId) ?? assetId) : (assetId ?? null);
    const title = resolveTitle('actions', rest.title);
    await db.actions.add({
      ...rest,
      title,
      id: newId,
      rulesetId: targetRulesetId,
      assetId: mappedAssetId,
      moduleId: sourceRulesetId,
      moduleEntityId: action.id,
      moduleName,
      createdAt: now,
      updatedAt: now,
    } as Action & { moduleId: string; moduleEntityId: string; moduleName: string });
    counts.actions++;
  }

  // 7. Items
  for (const item of sourceItems as Item[]) {
    if (targetIds.items.has(item.id)) {
      pushSkipped('items', item.id, item.title);
      continue;
    }
    const newId = crypto.randomUUID();
    itemIdMap.set(item.id, newId);
    const { id, rulesetId, createdAt, updatedAt, assetId, ...rest } = item;
    const mappedAssetId = assetId ? (assetIdMap.get(assetId) ?? assetId) : (assetId ?? null);
    const title = resolveTitle('items', rest.title);
    await db.items.add({
      ...rest,
      title,
      id: newId,
      rulesetId: targetRulesetId,
      assetId: mappedAssetId,
      moduleId: sourceRulesetId,
      moduleEntityId: item.id,
      moduleName,
      createdAt: now,
      updatedAt: now,
    } as Item & { moduleId: string; moduleEntityId: string; moduleName: string });
    counts.items++;
  }

  // 8. Documents
  for (const document of sourceDocuments as Document[]) {
    if (targetIds.documents.has(document.id)) {
      pushSkipped('documents', document.id, document.title);
      continue;
    }
    const newId = crypto.randomUUID();
    documentIdMap.set(document.id, newId);
    const {
      id,
      rulesetId,
      worldId,
      locationId,
      campaignId,
      createdAt,
      updatedAt,
      assetId,
      pdfAssetId,
      ...rest
    } = document;
    const mappedAssetId = assetId ? (assetIdMap.get(assetId) ?? assetId) : (assetId ?? null);
    const mappedPdfAssetId = pdfAssetId
      ? (assetIdMap.get(pdfAssetId) ?? pdfAssetId)
      : (pdfAssetId ?? null);
    const title = resolveTitle('documents', rest.title);
    await db.documents.add({
      ...rest,
      title,
      id: newId,
      rulesetId: targetRulesetId,
      assetId: mappedAssetId,
      pdfAssetId: mappedPdfAssetId,
      moduleId: sourceRulesetId,
      moduleEntityId: document.id,
      moduleName,
      createdAt: now,
      updatedAt: now,
    } as Document & { moduleId: string; moduleEntityId: string; moduleName: string });
    counts.documents++;
  }

  // 9. Windows
  for (const window of sourceWindows as Window[]) {
    if (targetIds.windows.has(window.id)) {
      pushSkipped('windows', window.id, (window as { title?: string }).title);
      continue;
    }
    const newId = crypto.randomUUID();
    windowIdMap.set(window.id, newId);
    const { id, rulesetId, createdAt, updatedAt, ...rest } = window;
    await db.windows.add({
      ...rest,
      id: newId,
      rulesetId: targetRulesetId,
      moduleId: sourceRulesetId,
      moduleEntityId: window.id,
      moduleName,
      createdAt: now,
      updatedAt: now,
    } as Window & { moduleId: string; moduleEntityId: string; moduleName: string });
    counts.windows++;
  }

  // 10. Pages (ruleset templates; before components so `pageId` in component data remaps correctly)
  for (const sourcePage of sourcePages as Page[]) {
    const newPageId = crypto.randomUUID();
    pageIdMap.set(sourcePage.id, newPageId);
    const { id: _pageId, createdAt: _c, updatedAt: _u, ...pageRest } = sourcePage;
    await db.pages.add({
      ...pageRest,
      id: newPageId,
      rulesetId: targetRulesetId,
      moduleId: sourceRulesetId,
      moduleEntityId: sourcePage.id,
      moduleName,
      createdAt: now,
      updatedAt: now,
    } as Page & { moduleId: string; moduleEntityId: string; moduleName: string });
    counts.pages++;
  }

  // 11. Ruleset windows
  for (const rw of sourceRulesetWindows as RulesetWindow[]) {
    const newId = crypto.randomUUID();
    const { id, rulesetId, pageId, windowId, createdAt, updatedAt, ...rest } = rw;
    const mappedPageId = pageId ? (pageIdMap.get(pageId) ?? null) : null;
    const mappedWindowId = windowIdMap.get(windowId) ?? windowId;
    await db.rulesetWindows.add({
      id: newId,
      rulesetId: targetRulesetId,
      pageId: mappedPageId,
      windowId: mappedWindowId,
      ...rest,
      moduleId: sourceRulesetId,
      moduleEntityId: rw.id,
      moduleName,
      createdAt: now,
      updatedAt: now,
    } as RulesetWindow & { moduleId: string; moduleEntityId: string; moduleName: string });
    counts.rulesetWindows++;
  }

  const componentRemapMaps = {
    pageIdMap,
    attributeIdMap,
    actionIdMap,
    windowIdMap,
    scriptIdMap,
    assetIdMap,
    itemIdMap,
  };

  // 12. Components (remap `data`/`states`: view attribute clicks, open page, etc.; no module tracking per spec)
  for (const component of sourceComponents as Component[]) {
    const newId = componentIdMap.get(component.id);
    if (!newId) continue;

    const {
      id: _cid,
      rulesetId: _crid,
      createdAt: _cc,
      updatedAt: _cu,
      windowId,
      attributeId,
      actionId,
      childWindowId,
      scriptId,
      parentComponentId,
      groupId,
      assetId: topLevelAssetId,
      data,
      states,
      ...rest
    }: Component & { assetId?: string | null } = component;

    const { data: remappedData, states: remappedStates } = remapComponentSerializedDataAndStates(
      data,
      states ?? null,
      componentRemapMaps,
    );

    const mappedWindowId = windowIdMap.get(windowId) ?? windowId;
    const mappedAttributeId = attributeId
      ? (attributeIdMap.get(attributeId) ?? attributeId)
      : attributeId;
    const mappedActionId = actionId ? (actionIdMap.get(actionId) ?? actionId) : actionId;
    const mappedChildWindowId = childWindowId
      ? (windowIdMap.get(childWindowId) ?? childWindowId)
      : childWindowId;
    const mappedScriptId = scriptId ? (scriptIdMap.get(scriptId) ?? scriptId) : scriptId;
    const mappedParentId = parentComponentId
      ? (componentIdMap.get(parentComponentId) ?? null)
      : null;
    const mappedGroupId = groupId ? (componentIdMap.get(groupId) ?? null) : null;
    const mappedTopAssetId =
      topLevelAssetId != null && topLevelAssetId !== ''
        ? (assetIdMap.get(topLevelAssetId) ?? topLevelAssetId)
        : topLevelAssetId;

    await db.components.add({
      ...rest,
      id: newId,
      rulesetId: targetRulesetId,
      windowId: mappedWindowId,
      data: remappedData,
      states: remappedStates ?? null,
      attributeId: mappedAttributeId,
      actionId: mappedActionId,
      childWindowId: mappedChildWindowId,
      scriptId: mappedScriptId ?? null,
      parentComponentId: mappedParentId,
      groupId: mappedGroupId,
      assetId: mappedTopAssetId ?? null,
      createdAt: now,
      updatedAt: now,
    } as Component);
    counts.components++;
  }

  // 13. Composites and composite variants
  for (const comp of sourceComposites as Composite[]) {
    const newRootId = componentIdMap.get(comp.rootComponentId);
    if (!newRootId) continue;
    const newId = crypto.randomUUID();
    compositeIdMap.set(comp.id, newId);
    const { id, rulesetId, createdAt, updatedAt, ...restComp } = comp;
    await db.composites.add({
      ...restComp,
      id: newId,
      rulesetId: targetRulesetId,
      rootComponentId: newRootId,
      createdAt: now,
      updatedAt: now,
    } as Composite);
    counts.composites++;
  }

  for (const v of sourceCompositeVariants as CompositeVariant[]) {
    const newCompositeId = compositeIdMap.get(v.compositeId);
    const newGroupId = componentIdMap.get(v.groupComponentId);
    if (!newCompositeId || !newGroupId) continue;
    const { id, rulesetId, createdAt, updatedAt, ...restV } = v;
    await db.compositeVariants.add({
      ...restV,
      id: crypto.randomUUID(),
      rulesetId: targetRulesetId,
      compositeId: newCompositeId,
      groupComponentId: newGroupId,
      createdAt: now,
      updatedAt: now,
    } as CompositeVariant);
    counts.compositeVariants++;
  }

  // 14. Test characters and non-default archetypes (target keeps its own default)
  for (const testCharId of testCharacterIds) {
    const srcChar = await db.characters.get(testCharId);
    if (!srcChar || !srcChar.isTestCharacter) continue;

    const charAttrs = sourceCharacterAttributes.filter((ca) => ca.characterId === testCharId);
    const charPages = sourceCharacterPages.filter((cp) => cp.characterId === testCharId);
    const charWindows = sourceCharacterWindows.filter((cw) => cw.characterId === testCharId);
    const charInvs = sourceInventories.filter((inv) => inv.characterId === testCharId);
    const charInvIds = charInvs.map((inv) => inv.id);
    const charInvItems = sourceInventoryItems.filter((ii) => charInvIds.includes(ii.inventoryId));

    const newCharacterId = crypto.randomUUID();
    characterIdMap.set(testCharId, newCharacterId);
    const {
      id: _cid,
      rulesetId: _crid,
      createdAt: _cc,
      updatedAt: _cu,
      inventoryId,
      pinnedSidebarDocuments,
      pinnedSidebarCharts,
      ...restCharacter
    } = srcChar;
    const mappedPinnedDocs = (pinnedSidebarDocuments || []).map(
      (docId) => documentIdMap.get(docId) ?? docId,
    );
    const mappedPinnedCharts = (pinnedSidebarCharts || []).map(
      (chartId) => chartIdMap.get(chartId) ?? chartId,
    );
    await db.characters.add({
      ...restCharacter,
      id: newCharacterId,
      rulesetId: targetRulesetId,
      inventoryId: inventoryId,
      pinnedSidebarDocuments: mappedPinnedDocs,
      pinnedSidebarCharts: mappedPinnedCharts,
      moduleId: sourceRulesetId,
      moduleEntityId: srcChar.id,
      moduleName,
      createdAt: now,
      updatedAt: now,
    } as Character & { moduleId: string; moduleEntityId: string; moduleName: string });
    counts.characters++;

    for (const cp of charPages as CharacterPage[]) {
      const newCpId = crypto.randomUUID();
      characterPageIdMap.set(cp.id, newCpId);
      const mappedTemplatePageId = pageIdMap.get(cp.pageId) ?? cp.pageId;
      const { id: _cpid, createdAt: _cpc, updatedAt: _cpu, characterId: _cid2, ...cpRest } = cp;
      await db.characterPages.add({
        ...cpRest,
        id: newCpId,
        characterId: newCharacterId,
        pageId: mappedTemplatePageId,
        rulesetId: targetRulesetId,
        moduleId: sourceRulesetId,
        moduleEntityId: cp.id,
        moduleName,
        createdAt: now,
        updatedAt: now,
      } as CharacterPage & { moduleId: string; moduleEntityId: string; moduleName: string });
      counts.characterPages++;
    }

    let newDefaultInventoryId: string | null = null;
    for (const inv of charInvs as Inventory[]) {
      const newInvId = crypto.randomUUID();
      inventoryIdMap.set(inv.id, newInvId);
      const { id, createdAt, updatedAt, characterId, ...rest } = inv;
      await db.inventories.add({
        ...rest,
        id: newInvId,
        characterId: newCharacterId,
        rulesetId: targetRulesetId,
        createdAt: now,
        updatedAt: now,
      } as Inventory);
      counts.inventories++;
      if (inventoryId && inv.id === inventoryId) {
        newDefaultInventoryId = newInvId;
      }
    }
    if (newDefaultInventoryId) {
      await db.characters.update(newCharacterId, { inventoryId: newDefaultInventoryId });
    }

    for (const invItem of charInvItems as InventoryItem[]) {
      const newInvItemId = crypto.randomUUID();
      const {
        id: _invItemId,
        createdAt: _c,
        updatedAt: _u,
        inventoryId: oldInventoryId,
        entityId,
        componentId,
        ...rest
      } = invItem;
      const mappedInventoryId = inventoryIdMap.get(oldInventoryId);
      if (!mappedInventoryId) continue;
      const type = invItem.type;
      let mappedEntityId = entityId;
      if (type === 'attribute') mappedEntityId = attributeIdMap.get(entityId) ?? entityId;
      else if (type === 'item') mappedEntityId = itemIdMap.get(entityId) ?? entityId;
      else if (type === 'action') mappedEntityId = actionIdMap.get(entityId) ?? entityId;
      const mappedComponentId = componentId
        ? (componentIdMap.get(componentId) ?? componentId)
        : componentId;
      await db.inventoryItems.add({
        ...rest,
        id: newInvItemId,
        inventoryId: mappedInventoryId,
        entityId: mappedEntityId,
        componentId: mappedComponentId,
        createdAt: now,
        updatedAt: now,
      } as InventoryItem);
      counts.inventoryItems++;
    }

    for (const ca of charAttrs as CharacterAttribute[]) {
      const {
        id: _caId,
        createdAt: _c,
        updatedAt: _u,
        characterId: _charId,
        attributeId,
        ...rest
      } = ca as CharacterAttribute & { assetId?: string | null; optionsChartRef?: number };
      const newCaId = crypto.randomUUID();
      const mappedAttributeId = attributeIdMap.get(attributeId) ?? attributeId;
      const mappedAssetId = (ca as Attribute).assetId
        ? (assetIdMap.get((ca as Attribute).assetId!) ?? (ca as Attribute).assetId)
        : ((ca as Attribute).assetId ?? null);
      let mappedOptionsChartRef = (ca as Attribute).optionsChartRef;
      if (mappedOptionsChartRef != null) {
        const mappedChartId = chartIdMap.get(String(mappedOptionsChartRef));
        if (mappedChartId) mappedOptionsChartRef = mappedChartId as unknown as number;
      }
      await db.characterAttributes.add({
        ...rest,
        assetId: mappedAssetId,
        optionsChartRef: mappedOptionsChartRef,
        id: newCaId,
        characterId: newCharacterId,
        attributeId: mappedAttributeId,
        createdAt: now,
        updatedAt: now,
      } as CharacterAttribute);
      counts.characterAttributes++;
    }

    for (const cw of charWindows as CharacterWindow[]) {
      const newCwId = crypto.randomUUID();
      const { id, createdAt, updatedAt, characterId, characterPageId, windowId, ...rest } = cw;
      const mappedCharacterPageId = characterPageId
        ? (characterPageIdMap.get(characterPageId) ?? characterPageId)
        : characterPageId;
      const mappedWindowId = windowIdMap.get(windowId) ?? windowId;
      await db.characterWindows.add({
        ...rest,
        id: newCwId,
        characterId: newCharacterId,
        characterPageId: mappedCharacterPageId,
        windowId: mappedWindowId,
        moduleId: sourceRulesetId,
        moduleEntityId: cw.id,
        moduleName,
        createdAt: now,
        updatedAt: now,
      } as CharacterWindow & { moduleId: string; moduleEntityId: string; moduleName: string });
      counts.characterWindows++;
    }
  }

  // 14b. Module default test character → target default test character (pages + windows only)
  if (
    mergeModuleDefaultTestCharacterLayout &&
    (defaultSourceCharacterPages.length > 0 || defaultSourceCharacterWindows.length > 0)
  ) {
    const targetTc = targetDefaultTestCharacterId
      ? await db.characters.get(targetDefaultTestCharacterId)
      : undefined;
    const sourceTc = sourceDefaultTestCharacterId
      ? await db.characters.get(sourceDefaultTestCharacterId)
      : undefined;
    if (targetTc?.isTestCharacter && sourceTc?.isTestCharacter) {
      const defaultTcCharacterPageIdMap = new Map<string, string>();
      for (const cp of defaultSourceCharacterPages as CharacterPage[]) {
        const newCpId = crypto.randomUUID();
        defaultTcCharacterPageIdMap.set(cp.id, newCpId);
        const mappedTemplatePageId = pageIdMap.get(cp.pageId) ?? cp.pageId;
        const { id: _cpid, createdAt: _cpc, updatedAt: _cpu, characterId: _cid2, ...cpRest } = cp;
        await db.characterPages.add({
          ...cpRest,
          id: newCpId,
          characterId: targetDefaultTestCharacterId!,
          pageId: mappedTemplatePageId,
          rulesetId: targetRulesetId,
          moduleId: sourceRulesetId,
          moduleEntityId: cp.id,
          moduleName,
          createdAt: now,
          updatedAt: now,
        } as CharacterPage & { moduleId: string; moduleEntityId: string; moduleName: string });
        counts.characterPages++;
      }
      for (const cw of defaultSourceCharacterWindows as CharacterWindow[]) {
        const newCwId = crypto.randomUUID();
        const { id: _cwid, createdAt: _cwc, updatedAt: _cwu, characterId: _cwcId, characterPageId, windowId, ...rest } =
          cw;
        const mappedCharacterPageId = characterPageId
          ? (defaultTcCharacterPageIdMap.get(characterPageId) ?? null)
          : characterPageId;
        const mappedWindowId = windowIdMap.get(windowId) ?? windowId;
        await db.characterWindows.add({
          ...rest,
          id: newCwId,
          characterId: targetDefaultTestCharacterId!,
          characterPageId: mappedCharacterPageId,
          windowId: mappedWindowId,
          moduleId: sourceRulesetId,
          moduleEntityId: cw.id,
          moduleName,
          createdAt: now,
          updatedAt: now,
        } as CharacterWindow & { moduleId: string; moduleEntityId: string; moduleName: string });
        counts.characterWindows++;
      }
    }
  }

  // Clone archetypes (with new testCharacterId, map variantsChartRef to new chart id)
  for (const arch of archetypesToClone as Archetype[]) {
    if (!characterIdMap.has(arch.testCharacterId)) {
      pushSkipped('archetypes', arch.id, arch.name);
      continue;
    }
    const newArchId = crypto.randomUUID();
    archetypeIdMap.set(arch.id, newArchId);
    const newTestCharId = characterIdMap.get(arch.testCharacterId)!;
    const {
      id: _aid,
      rulesetId: _arid,
      createdAt: _ac,
      updatedAt: _au,
      variantsChartRef,
      ...restArch
    } = arch;
    let mappedVariantsChartRef = variantsChartRef;
    if (variantsChartRef != null) {
      const mappedChartId = chartIdMap.get(String(variantsChartRef));
      if (mappedChartId) {
        mappedVariantsChartRef = mappedChartId as unknown as number;
      }
    }
    await db.archetypes.add({
      ...restArch,
      id: newArchId,
      rulesetId: targetRulesetId,
      testCharacterId: newTestCharId,
      variantsChartRef: mappedVariantsChartRef,
      moduleId: sourceRulesetId,
      moduleEntityId: arch.id,
      moduleName,
      createdAt: now,
      updatedAt: now,
    } as Archetype & { moduleId: string; moduleEntityId: string; moduleName: string });
    counts.archetypes++;
  }

  // 15. Scripts (after archetypes so archetypeIdMap is available; id pre-assigned before 1. Assets for component click remaps)
  for (const script of sourceScripts as Script[]) {
    if (targetIds.scripts.has(script.id)) {
      pushSkipped('scripts', script.id, script.name);
      continue;
    }
    const newId = scriptIdMap.get(script.id);
    if (!newId) continue;
    const { id, rulesetId, createdAt, updatedAt, entityId, entityType, ...rest } = script;
    let mappedEntityId = entityId;
    if (entityId && !script.isGlobal) {
      switch (entityType) {
        case 'attribute':
          mappedEntityId = attributeIdMap.get(entityId) ?? entityId;
          break;
        case 'action':
          mappedEntityId = actionIdMap.get(entityId) ?? entityId;
          break;
        case 'item':
          mappedEntityId = itemIdMap.get(entityId) ?? entityId;
          break;
        case 'archetype':
          mappedEntityId = archetypeIdMap.has(entityId)
            ? archetypeIdMap.get(entityId)!
            : null;
          break;
      }
    }
    const name = resolveTitle('scripts', rest.name);
    await db.scripts.add({
      ...rest,
      name,
      id: newId,
      rulesetId: targetRulesetId,
      entityId: mappedEntityId,
      entityType,
      moduleId: sourceRulesetId,
      moduleEntityId: script.id,
      moduleName,
      createdAt: now,
      updatedAt: now,
    } as Script & { moduleId: string; moduleEntityId: string; moduleName: string });
    counts.scripts++;
  }

  // Mirror Script.entityId → Attribute|Action|Item|Archetype.scriptId (new script ids; copied `...rest` still had source script ids)
  const moduleScriptsWithEntity = await db.scripts
    .where('rulesetId')
    .equals(targetRulesetId)
    .filter(
      (s) =>
        s.moduleId === sourceRulesetId && s.entityId != null && s.entityType !== 'global',
    )
    .toArray();

  type BulkScriptLinkEntry = { key: string; changes: { scriptId: string } };
  const attributeScriptLinks: BulkScriptLinkEntry[] = [];
  const actionScriptLinks: BulkScriptLinkEntry[] = [];
  const itemScriptLinks: BulkScriptLinkEntry[] = [];
  const archetypeScriptLinks: BulkScriptLinkEntry[] = [];

  for (const s of moduleScriptsWithEntity) {
    if (!s.entityId) continue;
    const entry = { key: s.entityId, changes: { scriptId: s.id } };
    if (s.entityType === 'attribute') attributeScriptLinks.push(entry);
    else if (s.entityType === 'action') actionScriptLinks.push(entry);
    else if (s.entityType === 'item') itemScriptLinks.push(entry);
    else if (s.entityType === 'archetype') archetypeScriptLinks.push(entry);
  }

  if (
    attributeScriptLinks.length ||
    actionScriptLinks.length ||
    itemScriptLinks.length ||
    archetypeScriptLinks.length
  ) {
    await db.transaction(
      'rw',
      db.attributes,
      db.actions,
      db.items,
      db.archetypes,
      async () => {
        if (attributeScriptLinks.length) await db.attributes.bulkUpdate(attributeScriptLinks);
        if (actionScriptLinks.length) await db.actions.bulkUpdate(actionScriptLinks);
        if (itemScriptLinks.length) await db.items.bulkUpdate(itemScriptLinks);
        if (archetypeScriptLinks.length) await db.archetypes.bulkUpdate(archetypeScriptLinks);
      },
    );
  }

  // Update ruleset.modules: append if new, or update name/image if refresh
  const modules = isRefresh
    ? existingModules.map((m) =>
        m.id === sourceRulesetId ? { ...m, name: moduleName, image: moduleImage } : m,
      )
    : [...existingModules, { id: sourceRulesetId, name: moduleName, image: moduleImage }];
  await db.rulesets.update(targetRulesetId, {
    modules,
    updatedAt: now,
  });

  return { counts, skippedByConflict, skippedDetails };
}
