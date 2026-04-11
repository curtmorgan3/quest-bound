import { db } from '@/stores';
import type {
  Action,
  Archetype,
  ArchetypeCustomProperty,
  Asset,
  Attribute,
  Character,
  CharacterAttribute,
  CharacterPage,
  CharacterWindow,
  Chart,
  Component,
  ComponentStateEntry,
  Composite,
  CompositeVariant,
  CustomProperty,
  Document,
  Font,
  Inventory,
  InventoryItem,
  Item,
  ItemCustomProperty,
  Page,
  Ruleset,
  Window,
  Script,
  RulesetWindow,
} from '@/types';

/** Maps used to rewrite ids inside component `data` / `states` and top-level click/script fields. */
type RulesetDuplicateIdMaps = {
  pageIdMap: Map<string, string>;
  attributeIdMap: Map<string, string>;
  actionIdMap: Map<string, string>;
  windowIdMap: Map<string, string>;
  scriptIdMap: Map<string, string>;
  assetIdMap: Map<string, string>;
  itemIdMap: Map<string, string>;
};

function mapOptionalEntityId(
  value: unknown,
  map: Map<string, string>,
): string | null | undefined {
  if (value == null || value === '') return value as null | undefined;
  if (typeof value !== 'string') return value as undefined;
  return map.get(value) ?? value;
}

/**
 * Remap ruleset entity ids in a parsed `ComponentData` object (base layer or state diff).
 * Keeps `null` / explicit clears; only string ids are passed through maps.
 */
function remapComponentDataIds(data: Record<string, unknown>, m: RulesetDuplicateIdMaps): void {
  if (typeof data.pageId === 'string' && data.pageId) {
    data.pageId = m.pageIdMap.get(data.pageId) ?? data.pageId;
  }

  for (const key of [
    'viewAttributeId',
    'toggleBooleanAttributeId',
    'tooltipAttributeId',
    'conditionalRenderAttributeId',
  ] as const) {
    if (key in data && data[key] != null && data[key] !== '') {
      data[key] = mapOptionalEntityId(data[key], m.attributeIdMap);
    }
  }

  if ('clickActionId' in data) {
    data.clickActionId = mapOptionalEntityId(data.clickActionId, m.actionIdMap);
  }
  if ('clickChildWindowId' in data) {
    data.clickChildWindowId = mapOptionalEntityId(data.clickChildWindowId, m.windowIdMap);
  }
  if ('clickScriptId' in data) {
    data.clickScriptId = mapOptionalEntityId(data.clickScriptId, m.scriptIdMap);
  }

  for (const key of ['assetId'] as const) {
    if (key in data && typeof data[key] === 'string' && data[key]) {
      data[key] = m.assetIdMap.get(data[key] as string) ?? data[key];
    }
  }

  for (const key of ['checkedAssetId', 'uncheckedAssetId'] as const) {
    if (key in data && typeof data[key] === 'string' && data[key]) {
      data[key] = m.assetIdMap.get(data[key] as string) ?? data[key];
    }
  }

  if (typeof data.itemRestrictionRef === 'string' && data.itemRestrictionRef) {
    data.itemRestrictionRef = m.itemIdMap.get(data.itemRestrictionRef) ?? data.itemRestrictionRef;
  }
  if (typeof data.actionRestrictionRef === 'string' && data.actionRestrictionRef) {
    data.actionRestrictionRef =
      m.actionIdMap.get(data.actionRestrictionRef) ?? data.actionRestrictionRef;
  }

  for (const key of ['numeratorAttributeId', 'denominatorAttributeId'] as const) {
    if (key in data && data[key] != null && data[key] !== '') {
      data[key] = mapOptionalEntityId(data[key], m.attributeIdMap);
    }
  }
}

function remapComponentSerializedDataAndStates(
  dataJson: string,
  statesJson: string | null | undefined,
  m: RulesetDuplicateIdMaps,
): { data: string; states: string | null | undefined } {
  let data = dataJson;
  try {
    const parsed = JSON.parse(dataJson) as Record<string, unknown>;
    remapComponentDataIds(parsed, m);
    data = JSON.stringify(parsed);
  } catch {
    // leave data unchanged if not valid JSON
  }

  let states = statesJson;
  if (statesJson == null || statesJson === '') {
    return { data, states: statesJson };
  }
  try {
    const entries = JSON.parse(statesJson) as ComponentStateEntry[];
    if (!Array.isArray(entries)) {
      return { data, states };
    }
    for (const entry of entries) {
      if (entry?.data && typeof entry.data === 'string' && entry.data.trim() !== '') {
        try {
          const partial = JSON.parse(entry.data) as Record<string, unknown>;
          remapComponentDataIds(partial, m);
          entry.data = JSON.stringify(partial);
        } catch {
          // keep state data string
        }
      }
    }
    states = JSON.stringify(entries);
  } catch {
    // keep states unchanged
  }

  return { data, states };
}

export interface DuplicateRulesetParams {
  /** Existing ruleset id to copy from */
  sourceRulesetId: string;
  /** Newly created ruleset id to copy into */
  targetRulesetId: string;
}

export interface RulesetDuplicationCounts {
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
  pages: number;
  rulesetWindows: number;
  archetypes: number;
  customProperties: number;
  archetypeCustomProperties: number;
  itemCustomProperties: number;
  characters: number;
  characterAttributes: number;
  inventories: number;
  characterWindows: number;
  characterPages: number;
  inventoryItems: number;
  scripts: number;
  campaigns: number;
  campaignScenes: number;
  campaignCharacters: number;
  campaignEvents: number;
  sceneTurnCallbacks: number;
}

/**
 * Duplicate a ruleset and its associated entities into an already-created target ruleset.
 *
 * This function:
 * - Clones ruleset-level entities (assets, fonts, charts, attributes, actions, items, documents, windows, pages, …)
 * - Pre-assigns ids for window components and scripts, then inserts scripts before components so click `scriptId` remaps cleanly
 * - Remaps component group trees (`parentComponentId` / `groupId`), merged click targets in `data` / `states`, and top-level click fields
 * - Clones the test character for the ruleset (if present) and its related entities
 * - Generates new IDs for all cloned entities and remaps cross-entity references
 * - Removes the auto-created test character for the target ruleset (created by Dexie hook)
 */
export async function duplicateRuleset({
  sourceRulesetId,
  targetRulesetId,
}: DuplicateRulesetParams): Promise<RulesetDuplicationCounts> {
  const now = new Date().toISOString();

  // Load all ruleset-level entities for the source ruleset
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
    sourceCustomProperties,
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
    db.customProperties.where('rulesetId').equals(sourceRulesetId).toArray(),
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

  // Load source archetypes (each has a test character)
  const sourceArchetypes = await db.archetypes
    .where('rulesetId')
    .equals(sourceRulesetId)
    .sortBy('loadOrder');

  // Fallback: if no archetypes (legacy), use first test character
  const sourceCharacters = await db.characters.where('rulesetId').equals(sourceRulesetId).toArray();
  const sourceTestCharacter = sourceCharacters.find((c: Character) => c.isTestCharacter);

  // Identify the auto-created test character for the target ruleset so we can remove it later
  const targetCharacters = await db.characters.where('rulesetId').equals(targetRulesetId).toArray();
  const autoTestCharacter = targetCharacters.find((c: Character) => c.isTestCharacter);
  const autoTestCharacterId = autoTestCharacter?.id;

  // Character-related entities: collect per test character (from archetypes or fallback)
  const testCharacterIds = [
    ...new Set(
      sourceArchetypes.length > 0
        ? sourceArchetypes.map((a) => a.testCharacterId).filter(Boolean)
        : sourceTestCharacter
          ? [sourceTestCharacter.id]
          : [],
    ),
  ];

  // ID maps for remapping references
  const assetIdMap = new Map<string, string>();
  const fontIdMap = new Map<string, string>();
  const chartIdMap = new Map<string, string>();
  const attributeIdMap = new Map<string, string>();
  const actionIdMap = new Map<string, string>();
  const itemIdMap = new Map<string, string>();
  const documentIdMap = new Map<string, string>();
  const windowIdMap = new Map<string, string>();
  const componentIdMap = new Map<string, string>();
  const scriptIdMap = new Map<string, string>();
  const compositeIdMap = new Map<string, string>();
  const characterIdMap = new Map<string, string>();
  const characterPageIdMap = new Map<string, string>();
  const inventoryIdMap = new Map<string, string>();
  const archetypeIdMap = new Map<string, string>();
  const customPropertyIdMap = new Map<string, string>();
  /** Maps source page id -> new page id for ruleset template pages (shared with test character pages when same) */
  const pageIdMap = new Map<string, string>();

  const counts: RulesetDuplicationCounts = {
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
    pages: 0,
    rulesetWindows: 0,
    archetypes: 0,
    customProperties: 0,
    archetypeCustomProperties: 0,
    itemCustomProperties: 0,
    characters: 0,
    characterAttributes: 0,
    inventories: 0,
    characterWindows: 0,
    characterPages: 0,
    inventoryItems: 0,
    scripts: 0,
    campaigns: 0,
    campaignScenes: 0,
    campaignCharacters: 0,
    campaignEvents: 0,
    sceneTurnCallbacks: 0,
  };

  // 1. Assets
  for (const asset of sourceAssets as Asset[]) {
    const newId = crypto.randomUUID();
    assetIdMap.set(asset.id, newId);

    const { id, rulesetId, createdAt, updatedAt, ...rest } = asset;
    await db.assets.add({
      ...rest,
      id: newId,
      rulesetId: targetRulesetId,
      createdAt: now,
      updatedAt: now,
    } as Asset);
    counts.assets++;
  }

  // 2. Fonts
  for (const font of sourceFonts as Font[]) {
    const newId = crypto.randomUUID();
    fontIdMap.set(font.id, newId);

    const { id, rulesetId, createdAt, updatedAt, ...rest } = font;
    await db.fonts.add({
      ...rest,
      id: newId,
      rulesetId: targetRulesetId,
      createdAt: now,
      updatedAt: now,
    } as Font);
    counts.fonts++;
  }

  // 3. Charts (map assetId if present)
  for (const chart of sourceCharts as Chart[]) {
    const newId = crypto.randomUUID();
    chartIdMap.set(chart.id, newId);

    const { id, rulesetId, createdAt, updatedAt, assetId, ...rest } = chart;
    const mappedAssetId = assetId ? (assetIdMap.get(assetId) ?? assetId) : (assetId ?? null);

    await db.charts.add({
      ...rest,
      id: newId,
      rulesetId: targetRulesetId,
      assetId: mappedAssetId,
      createdAt: now,
      updatedAt: now,
    } as Chart);
    counts.charts++;
  }

  // 4. Attributes (map assetId and optionsChartRef -> new chart id when applicable)
  for (const attribute of sourceAttributes as Attribute[]) {
    const newId = crypto.randomUUID();
    attributeIdMap.set(attribute.id, newId);

    const { id, rulesetId, createdAt, updatedAt, assetId, optionsChartRef, ...rest } = attribute;

    const mappedAssetId = assetId ? (assetIdMap.get(assetId) ?? assetId) : (assetId ?? null);
    let mappedOptionsChartRef = optionsChartRef;
    if (optionsChartRef != null) {
      const mappedChartId = chartIdMap.get(String(optionsChartRef));
      if (mappedChartId) {
        mappedOptionsChartRef = mappedChartId as unknown as number;
      }
    }

    await db.attributes.add({
      ...rest,
      id: newId,
      rulesetId: targetRulesetId,
      assetId: mappedAssetId,
      optionsChartRef: mappedOptionsChartRef,
      createdAt: now,
      updatedAt: now,
    } as Attribute);
    counts.attributes++;
  }

  // 5. Actions (map assetId)
  for (const action of sourceActions as Action[]) {
    const newId = crypto.randomUUID();
    actionIdMap.set(action.id, newId);

    const { id, rulesetId, createdAt, updatedAt, assetId, ...rest } = action;
    const mappedAssetId = assetId ? (assetIdMap.get(assetId) ?? assetId) : (assetId ?? null);

    await db.actions.add({
      ...rest,
      id: newId,
      rulesetId: targetRulesetId,
      assetId: mappedAssetId,
      createdAt: now,
      updatedAt: now,
    } as Action);
    counts.actions++;
  }

  // 6. Items (map assetId)
  for (const item of sourceItems as Item[]) {
    const newId = crypto.randomUUID();
    itemIdMap.set(item.id, newId);

    const { id, rulesetId, createdAt, updatedAt, assetId, ...rest } = item;
    const mappedAssetId = assetId ? (assetIdMap.get(assetId) ?? assetId) : (assetId ?? null);

    await db.items.add({
      ...rest,
      id: newId,
      rulesetId: targetRulesetId,
      assetId: mappedAssetId,
      createdAt: now,
      updatedAt: now,
    } as Item);
    counts.items++;
  }

  // 6b. Custom properties (ruleset-scoped; needed before archetype/item custom property links)
  for (const cp of sourceCustomProperties as CustomProperty[]) {
    const newId = crypto.randomUUID();
    customPropertyIdMap.set(cp.id, newId);

    const { id, rulesetId, createdAt, updatedAt, ...rest } = cp;
    await db.customProperties.add({
      ...rest,
      id: newId,
      rulesetId: targetRulesetId,
      createdAt: now,
      updatedAt: now,
    } as CustomProperty);
    counts.customProperties++;
  }

  // 7. Documents (map assetId and pdfAssetId)
  for (const document of sourceDocuments as Document[]) {
    const newId = crypto.randomUUID();
    documentIdMap.set(document.id, newId);

    const { id, rulesetId, worldId, locationId, campaignId, createdAt, updatedAt, assetId, pdfAssetId, ...rest } =
      document;
    const mappedAssetId = assetId ? (assetIdMap.get(assetId) ?? assetId) : (assetId ?? null);
    const mappedPdfAssetId = pdfAssetId
      ? (assetIdMap.get(pdfAssetId) ?? pdfAssetId)
      : (pdfAssetId ?? null);

    await db.documents.add({
      ...rest,
      id: newId,
      rulesetId: targetRulesetId,
      assetId: mappedAssetId,
      pdfAssetId: mappedPdfAssetId,
      createdAt: now,
      updatedAt: now,
    } as Document);
    counts.documents++;
  }

  // 8. Windows
  for (const window of sourceWindows as Window[]) {
    const newId = crypto.randomUUID();
    windowIdMap.set(window.id, newId);

    const { id, rulesetId, createdAt, updatedAt, ...rest } = window;

    await db.windows.add({
      ...rest,
      id: newId,
      rulesetId: targetRulesetId,
      createdAt: now,
      updatedAt: now,
    } as Window);
    counts.windows++;
  }

  // 9. Pre-assign new ids for window components and ruleset scripts so group trees and click remaps stay consistent.
  for (const c of sourceComponents as Component[]) {
    componentIdMap.set(c.id, crypto.randomUUID());
  }
  for (const s of sourceScripts as Script[]) {
    scriptIdMap.set(s.id, crypto.randomUUID());
  }

  // 10. Pages (ruleset templates; builds pageIdMap)
  for (const sourcePage of sourcePages as Page[]) {
    const newPageId = crypto.randomUUID();
    pageIdMap.set(sourcePage.id, newPageId);
    const { id: _pageId, createdAt: _c, updatedAt: _u, ...pageRest } = sourcePage;
    await db.pages.add({
      ...pageRest,
      id: newPageId,
      rulesetId: targetRulesetId,
      createdAt: now,
      updatedAt: now,
    } as Page);
    counts.pages++;
  }

  // 11. Ruleset windows (layout; map pageId and windowId)
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
      createdAt: now,
      updatedAt: now,
    } as RulesetWindow);
    counts.rulesetWindows++;
  }

  // 12. Test characters and archetypes (after pages so pageIdMap is available)
  for (const testCharId of testCharacterIds) {
    const srcChar = await db.characters.get(testCharId);
    if (!srcChar || !srcChar.isTestCharacter) continue;

    const [srcCharAttrs, srcCharPages, srcCharWindows] = await Promise.all([
      db.characterAttributes.where('characterId').equals(testCharId).toArray(),
      db.characterPages.where('characterId').equals(testCharId).toArray(),
      db.characterWindows.where('characterId').equals(testCharId).toArray(),
    ]);
    const srcInvs = await db.inventories.where('characterId').equals(testCharId).toArray();
    const srcInvIds = srcInvs.map((inv) => inv.id);
    const srcInvItems =
      srcInvIds.length > 0
        ? await db.inventoryItems.where('inventoryId').anyOf(srcInvIds).toArray()
        : [];

    const newCharacterId = crypto.randomUUID();
    characterIdMap.set(testCharId, newCharacterId);

    const {
      id: _cid,
      rulesetId: _crid,
      createdAt: _cc,
      updatedAt: _cu,
      inventoryId: invId,
      pinnedSidebarDocuments,
      pinnedSidebarCharts,
      ...restChar
    } = srcChar;
    const mappedPinnedDocs = (pinnedSidebarDocuments || []).map(
      (docId) => documentIdMap.get(docId) ?? docId,
    );
    const mappedPinnedCharts = (pinnedSidebarCharts || []).map(
      (chartId) => chartIdMap.get(chartId) ?? chartId,
    );

    await db.characters.add({
      ...restChar,
      id: newCharacterId,
      rulesetId: targetRulesetId,
      inventoryId: invId,
      pinnedSidebarDocuments: mappedPinnedDocs,
      pinnedSidebarCharts: mappedPinnedCharts,
      createdAt: now,
      updatedAt: now,
    } as Character);
    counts.characters++;

    for (const cp of srcCharPages as CharacterPage[]) {
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
        createdAt: now,
        updatedAt: now,
      } as CharacterPage);
      counts.characterPages++;
    }

    let newDefaultInventoryId: string | null = null;
    for (const inv of srcInvs as Inventory[]) {
      const newInvId = crypto.randomUUID();
      inventoryIdMap.set(inv.id, newInvId);
      const { id: _iid, createdAt: _ic, updatedAt: _iu, characterId: _cid2, ...restInv } = inv;
      await db.inventories.add({
        ...restInv,
        id: newInvId,
        characterId: newCharacterId,
        rulesetId: targetRulesetId,
        createdAt: now,
        updatedAt: now,
      } as Inventory);
      counts.inventories++;
      if (invId && inv.id === invId) newDefaultInventoryId = newInvId;
    }
    if (newDefaultInventoryId) {
      await db.characters.update(newCharacterId, { inventoryId: newDefaultInventoryId });
    }

    for (const invItem of srcInvItems as InventoryItem[]) {
      const newInvItemId = crypto.randomUUID();
      const {
        id: _iiid,
        createdAt: _iic,
        updatedAt: _iiu,
        inventoryId: oldInvId,
        entityId,
        componentId,
        ...restInvItem
      } = invItem;
      const mappedInvId = inventoryIdMap.get(oldInvId);
      if (!mappedInvId) continue;
      const type = invItem.type;
      let mappedEntityId = entityId;
      if (type === 'attribute') mappedEntityId = attributeIdMap.get(entityId) ?? entityId;
      else if (type === 'item') mappedEntityId = itemIdMap.get(entityId) ?? entityId;
      else if (type === 'action') mappedEntityId = actionIdMap.get(entityId) ?? entityId;
      const mappedCompId = componentId ? (componentIdMap.get(componentId) ?? componentId) : componentId;
      await db.inventoryItems.add({
        ...restInvItem,
        id: newInvItemId,
        inventoryId: mappedInvId,
        entityId: mappedEntityId,
        componentId: mappedCompId,
        createdAt: now,
        updatedAt: now,
      } as InventoryItem);
      counts.inventoryItems++;
    }

    for (const ca of srcCharAttrs as CharacterAttribute[]) {
      const newCaId = crypto.randomUUID();
      const {
        id: _caid,
        createdAt: _cac,
        updatedAt: _cau,
        characterId: _caCharId,
        attributeId,
        assetId,
        optionsChartRef,
        ...restCa
      } = ca as CharacterAttribute & { assetId?: string | null; optionsChartRef?: number };
      const mappedAttrId = attributeIdMap.get(attributeId) ?? attributeId;
      const mappedAssetId = assetId ? (assetIdMap.get(assetId) ?? assetId) : (assetId ?? null);
      let mappedOptChartRef = optionsChartRef;
      if (mappedOptChartRef != null) {
        const mc = chartIdMap.get(String(mappedOptChartRef));
        if (mc) mappedOptChartRef = mc as unknown as number;
      }
      await db.characterAttributes.add({
        ...restCa,
        id: newCaId,
        characterId: newCharacterId,
        attributeId: mappedAttrId,
        assetId: mappedAssetId,
        optionsChartRef: mappedOptChartRef,
        createdAt: now,
        updatedAt: now,
      } as CharacterAttribute);
      counts.characterAttributes++;
    }

    for (const cw of srcCharWindows as CharacterWindow[]) {
      const newCwId = crypto.randomUUID();
      const { id: _cwid, createdAt: _cwc, updatedAt: _cwu, characterId: _cwCharId, characterPageId, windowId, ...restCw } = cw;
      const mappedCharPageId = characterPageId
        ? (characterPageIdMap.get(characterPageId) ?? characterPageId)
        : characterPageId;
      const mappedWinId = windowIdMap.get(windowId) ?? windowId;
      await db.characterWindows.add({
        ...restCw,
        id: newCwId,
        characterId: newCharacterId,
        characterPageId: mappedCharPageId,
        windowId: mappedWinId,
        createdAt: now,
        updatedAt: now,
      } as CharacterWindow);
      counts.characterWindows++;
    }
  }

  // Clone archetypes (with new testCharacterId, map variantsChartRef to new chart id)
  for (const arch of sourceArchetypes as Archetype[]) {
    const newArchId = crypto.randomUUID();
    archetypeIdMap.set(arch.id, newArchId);
    const newTestCharId = characterIdMap.get(arch.testCharacterId) ?? arch.testCharacterId;
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
      createdAt: now,
      updatedAt: now,
    } as Archetype);
    counts.archetypes++;
  }

  // 12b. Archetype custom properties (after archetypes)
  const sourceArchetypeCustomProperties = await db.archetypeCustomProperties
    .where('archetypeId')
    .anyOf(sourceArchetypes.map((a) => a.id))
    .toArray();
  for (const acp of sourceArchetypeCustomProperties as ArchetypeCustomProperty[]) {
    const newArchId = archetypeIdMap.get(acp.archetypeId);
    const newCpId = customPropertyIdMap.get(acp.customPropertyId);
    if (!newArchId || !newCpId) continue;
    const newId = crypto.randomUUID();
    const { id, createdAt, updatedAt, ...rest } = acp;
    await db.archetypeCustomProperties.add({
      ...rest,
      id: newId,
      archetypeId: newArchId,
      customPropertyId: newCpId,
      createdAt: now,
      updatedAt: now,
    } as ArchetypeCustomProperty);
    counts.archetypeCustomProperties++;
  }

  // 12c. Item custom properties (after items and custom properties)
  const sourceItemCustomProperties = await db.itemCustomProperties
    .where('itemId')
    .anyOf(sourceItems.map((i) => i.id))
    .toArray();
  for (const icp of sourceItemCustomProperties as ItemCustomProperty[]) {
    const newItemId = itemIdMap.get(icp.itemId);
    const newCpId = customPropertyIdMap.get(icp.customPropertyId);
    if (!newItemId || !newCpId) continue;
    const newId = crypto.randomUUID();
    const { id, createdAt, updatedAt, ...rest } = icp;
    await db.itemCustomProperties.add({
      ...rest,
      id: newId,
      itemId: newItemId,
      customPropertyId: newCpId,
      createdAt: now,
      updatedAt: now,
    } as ItemCustomProperty);
    counts.itemCustomProperties++;
  }

  // 13. Scripts (map entityId based on entityType; ids pre-assigned in step 9 for component click remaps)
  for (const script of sourceScripts as Script[]) {
    const newId = scriptIdMap.get(script.id);
    if (!newId) continue;

    const { id, rulesetId, createdAt, updatedAt, entityId, entityType, ...rest } = script;

    // Remap entityId based on entityType
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
          mappedEntityId = archetypeIdMap.get(entityId) ?? entityId;
          break;
      }
    }

    await db.scripts.add({
      ...rest,
      id: newId,
      rulesetId: targetRulesetId,
      entityId: mappedEntityId,
      entityType,
      createdAt: now,
      updatedAt: now,
    } as Script);
    counts.scripts++;
  }

  const componentRemapMaps: RulesetDuplicateIdMaps = {
    pageIdMap,
    attributeIdMap,
    actionIdMap,
    windowIdMap,
    scriptIdMap,
    assetIdMap,
    itemIdMap,
  };

  // 14. Components (after scripts; remap merged click/script/page ids inside `data` and `states`)
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
    } = component;

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
      attributeId: mappedAttributeId,
      actionId: mappedActionId,
      childWindowId: mappedChildWindowId,
      scriptId: mappedScriptId ?? null,
      parentComponentId: mappedParentId,
      groupId: mappedGroupId,
      assetId: mappedTopAssetId ?? null,
      data: remappedData,
      states: remappedStates ?? null,
      createdAt: now,
      updatedAt: now,
    } as Component);
    counts.components++;
  }

  // 15. Composites and composite variants (map template roots via componentIdMap)
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

  // 16. Clean up the auto-created test character and archetypes for the target ruleset
  if (autoTestCharacterId) {
    const clonedCharIds = new Set(characterIdMap.values());
    if (!clonedCharIds.has(autoTestCharacterId)) {
      const autoInventories = await db.inventories
        .where('characterId')
        .equals(autoTestCharacterId)
        .toArray();
      const autoInventoryIds = autoInventories.map((inv: any) => inv.id);
      if (autoInventoryIds.length > 0) {
        await db.inventoryItems
          .where('inventoryId')
          .anyOf(autoInventoryIds as string[])
          .delete();
      }

      await Promise.all([
        db.characterAttributes.where('characterId').equals(autoTestCharacterId).delete(),
        db.characterPages.where('characterId').equals(autoTestCharacterId).delete(),
        db.characterWindows.where('characterId').equals(autoTestCharacterId).delete(),
        db.inventories.where('characterId').equals(autoTestCharacterId).delete(),
        db.characters.where('id').equals(autoTestCharacterId).delete(),
      ]);
    }

    // Delete auto-created archetype that pointed to the auto test character
    const autoArchetypes = await db.archetypes
      .where('rulesetId')
      .equals(targetRulesetId)
      .filter((a) => a.testCharacterId === autoTestCharacterId)
      .toArray();
    for (const a of autoArchetypes) {
      await db.characterArchetypes.where('archetypeId').equals(a.id).delete();
      await db.archetypes.delete(a.id);
    }
  }

  // 17. Point the target ruleset row at cloned assets (cover + landing CTAs). Assets were remapped to new ids above;
  // createRuleset / import metadata still referenced source ids, so the new ruleset would otherwise miss CTA images.
  const sourceRulesetRow = await db.rulesets.get(sourceRulesetId);
  const targetRulesetRow = await db.rulesets.get(targetRulesetId);
  if (sourceRulesetRow && targetRulesetRow) {
    const mapAssetRef = (id: string | null | undefined): string | null =>
      id ? (assetIdMap.get(id) ?? id) : null;

    const stripped = { ...(targetRulesetRow as Record<string, unknown>) };
    delete stripped.charactersCtaImage;
    delete stripped.campaignsCtaImage;
    delete stripped.image;

    await db.rulesets.put({
      ...(stripped as Ruleset),
      assetId: mapAssetRef(sourceRulesetRow.assetId),
      charactersCtaAssetId: mapAssetRef(sourceRulesetRow.charactersCtaAssetId),
      campaignsCtaAssetId: mapAssetRef(sourceRulesetRow.campaignsCtaAssetId),
      characterCtaTitle: sourceRulesetRow.characterCtaTitle ?? null,
      characterCtaDescription: sourceRulesetRow.characterCtaDescription ?? null,
      campaignsCtaTitle: sourceRulesetRow.campaignsCtaTitle ?? null,
      campaignCtaDescription: sourceRulesetRow.campaignCtaDescription ?? null,
      palette: Array.isArray(sourceRulesetRow.palette) ? sourceRulesetRow.palette : [],
      updatedAt: new Date().toISOString(),
    });
  }

  return counts;
}
