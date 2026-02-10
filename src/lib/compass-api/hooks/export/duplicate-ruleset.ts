import { db } from '@/stores';
import type {
  Action,
  Asset,
  Attribute,
  Character,
  CharacterAttribute,
  CharacterPage,
  CharacterWindow,
  Chart,
  Component,
  Document,
  Font,
  Inventory,
  InventoryItem,
  Item,
  Window,
} from '@/types';

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
  assets: number;
  fonts: number;
  documents: number;
  characters: number;
  characterAttributes: number;
  inventories: number;
  characterWindows: number;
}

/**
 * Duplicate a ruleset and its associated entities into an already-created target ruleset.
 *
 * This function:
 * - Clones ruleset-level entities (assets, fonts, charts, attributes, actions, items, documents, windows, components)
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
  ] = await Promise.all([
    db.attributes.where('rulesetId').equals(sourceRulesetId).toArray(),
    db.actions.where('rulesetId').equals(sourceRulesetId).toArray(),
    db.items.where('rulesetId').equals(sourceRulesetId).toArray(),
    db.charts.where('rulesetId').equals(sourceRulesetId).toArray(),
    db.documents.where('rulesetId').equals(sourceRulesetId).toArray(),
    db.windows.where('rulesetId').equals(sourceRulesetId).toArray(),
    db.assets.where('rulesetId').equals(sourceRulesetId).toArray(),
    db.fonts.where('rulesetId').equals(sourceRulesetId).toArray(),
  ]);

  const windowIds = sourceWindows.map((w) => w.id);
  const sourceComponents =
    windowIds.length > 0
      ? await db.components
          .where('windowId')
          .anyOf(windowIds as string[])
          .toArray()
      : [];

  // Identify source test character (only clone the test character, not player characters)
  const sourceCharacters = await db.characters.where('rulesetId').equals(sourceRulesetId).toArray();
  const sourceTestCharacter = sourceCharacters.find((c: Character) => c.isTestCharacter);

  // Identify the auto-created test character for the target ruleset so we can remove it later
  const targetCharacters = await db.characters.where('rulesetId').equals(targetRulesetId).toArray();
  const autoTestCharacter = targetCharacters.find((c: Character) => c.isTestCharacter);
  const autoTestCharacterId = autoTestCharacter?.id;

  // Character-related entities (only for the source test character)
  let sourceCharacterAttributes: CharacterAttribute[] = [];
  let sourceCharacterPages: CharacterPage[] = [];
  let sourceCharacterWindows: CharacterWindow[] = [];
  let sourceInventories: Inventory[] = [];
  let sourceInventoryItems: InventoryItem[] = [];

  if (sourceTestCharacter) {
    [sourceCharacterAttributes, sourceCharacterPages, sourceCharacterWindows] = await Promise.all([
      db.characterAttributes.where('characterId').equals(sourceTestCharacter.id).toArray(),
      db.characterPages.where('characterId').equals(sourceTestCharacter.id).toArray(),
      db.characterWindows.where('characterId').equals(sourceTestCharacter.id).toArray(),
    ]);

    sourceInventories = await db.inventories
      .where('characterId')
      .equals(sourceTestCharacter.id)
      .toArray();

    const sourceInventoryIds = sourceInventories.map((inv: any) => inv.id);
    sourceInventoryItems =
      sourceInventoryIds.length > 0
        ? await db.inventoryItems
            .where('inventoryId')
            .anyOf(sourceInventoryIds as string[])
            .toArray()
        : [];
  }

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
  const characterIdMap = new Map<string, string>();
  const characterPageIdMap = new Map<string, string>();
  const inventoryIdMap = new Map<string, string>();

  const counts: RulesetDuplicationCounts = {
    attributes: 0,
    actions: 0,
    items: 0,
    charts: 0,
    windows: 0,
    components: 0,
    assets: 0,
    fonts: 0,
    documents: 0,
    characters: 0,
    characterAttributes: 0,
    inventories: 0,
    characterWindows: 0,
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

  // 7. Documents (map assetId and pdfAssetId)
  for (const document of sourceDocuments as Document[]) {
    const newId = crypto.randomUUID();
    documentIdMap.set(document.id, newId);

    const { id, rulesetId, createdAt, updatedAt, assetId, pdfAssetId, ...rest } = document;
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

  // 9. Components (map windowId, attributeId, actionId, childWindowId, assetId)
  for (const component of sourceComponents as Component[]) {
    const newId = crypto.randomUUID();
    componentIdMap.set(component.id, newId);

    const {
      id,
      rulesetId,
      createdAt,
      updatedAt,
      windowId,
      attributeId,
      actionId,
      childWindowId,
      ...rest
    } = component;

    const mappedWindowId = windowIdMap.get(windowId) ?? windowId;
    const mappedAttributeId = attributeId
      ? (attributeIdMap.get(attributeId) ?? attributeId)
      : attributeId;
    const mappedActionId = actionId ? (actionIdMap.get(actionId) ?? actionId) : actionId;
    const mappedChildWindowId = childWindowId
      ? (windowIdMap.get(childWindowId) ?? childWindowId)
      : childWindowId;

    await db.components.add({
      ...rest,
      id: newId,
      rulesetId: targetRulesetId,
      windowId: mappedWindowId,
      attributeId: mappedAttributeId,
      actionId: mappedActionId,
      childWindowId: mappedChildWindowId,
      createdAt: now,
      updatedAt: now,
    } as Component);
    counts.components++;
  }

  // 10. Test character and related entities
  if (sourceTestCharacter) {
    const newCharacterId = crypto.randomUUID();
    characterIdMap.set(sourceTestCharacter.id, newCharacterId);

    // Clone character (rulesetId, pinned documents/charts need remapping)
    const {
      id,
      rulesetId,
      createdAt,
      updatedAt,
      inventoryId,
      pinnedSidebarDocuments,
      pinnedSidebarCharts,
      ...restCharacter
    } = sourceTestCharacter;

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
      inventoryId: inventoryId, // temporary, will be updated after inventories are cloned
      pinnedSidebarDocuments: mappedPinnedDocs,
      pinnedSidebarCharts: mappedPinnedCharts,
      createdAt: now,
      updatedAt: now,
    } as Character);
    counts.characters++;

    // Character pages
    for (const page of sourceCharacterPages as CharacterPage[]) {
      const newPageId = crypto.randomUUID();
      characterPageIdMap.set(page.id, newPageId);

      const { id, createdAt, updatedAt, characterId, ...rest } = page;
      await db.characterPages.add({
        ...rest,
        id: newPageId,
        characterId: newCharacterId,
        createdAt: now,
        updatedAt: now,
      } as CharacterPage);
    }

    // Inventories for the test character
    let newDefaultInventoryId: string | null = null;
    for (const inv of sourceInventories as any[]) {
      const newInvId = crypto.randomUUID();
      inventoryIdMap.set(inv.id, newInvId);

      const { id, createdAt, updatedAt, characterId, rulesetId: _invRulesetId, ...rest } = inv;
      const newInventory: any = {
        ...rest,
        id: newInvId,
        characterId: newCharacterId,
        rulesetId: targetRulesetId,
        createdAt: now,
        updatedAt: now,
      };

      await db.inventories.add(newInventory as Inventory);
      counts.inventories++;

      if (inventoryId && inv.id === inventoryId) {
        newDefaultInventoryId = newInvId;
      }
    }

    // Update character.inventoryId to point at the cloned inventory
    if (newDefaultInventoryId) {
      await db.characters.update(newCharacterId, { inventoryId: newDefaultInventoryId });
    }

    // Inventory items (map inventoryId, entityId, componentId)
    for (const invItem of sourceInventoryItems as any[]) {
      const newInvItemId = crypto.randomUUID();

      const {
        id,
        createdAt,
        updatedAt,
        inventoryId: oldInventoryId,
        entityId,
        componentId,
        ...rest
      } = invItem as InventoryItem & { [key: string]: any };

      const mappedInventoryId = inventoryIdMap.get(oldInventoryId);
      if (!mappedInventoryId) continue; // Shouldn't happen, but guard just in case

      let mappedEntityId = entityId;
      const type = (invItem as InventoryItem).type;
      if (type === 'attribute') {
        mappedEntityId = attributeIdMap.get(entityId) ?? entityId;
      } else if (type === 'item') {
        mappedEntityId = itemIdMap.get(entityId) ?? entityId;
      } else if (type === 'action') {
        mappedEntityId = actionIdMap.get(entityId) ?? entityId;
      }

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
    }

    // Character attributes
    for (const ca of sourceCharacterAttributes as CharacterAttribute[]) {
      const {
        id,
        createdAt,
        updatedAt,
        characterId,
        attributeId,
        assetId,
        optionsChartRef,
        ...rest
      } = ca as any;

      const newCaId = crypto.randomUUID();
      const mappedAttributeId = attributeIdMap.get(attributeId) ?? attributeId;
      const mappedAssetId = assetId ? (assetIdMap.get(assetId) ?? assetId) : (assetId ?? null);

      let mappedOptionsChartRef = optionsChartRef;
      if (optionsChartRef != null) {
        const mappedChartId = chartIdMap.get(String(optionsChartRef));
        if (mappedChartId) {
          mappedOptionsChartRef = mappedChartId as unknown as number;
        }
      }

      await db.characterAttributes.add({
        ...rest,
        id: newCaId,
        characterId: newCharacterId,
        attributeId: mappedAttributeId,
        assetId: mappedAssetId,
        optionsChartRef: mappedOptionsChartRef,
        createdAt: now,
        updatedAt: now,
      } as any);
      counts.characterAttributes++;
    }

    // Character windows
    for (const cw of sourceCharacterWindows as CharacterWindow[]) {
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
        createdAt: now,
        updatedAt: now,
      } as CharacterWindow);
      counts.characterWindows++;
    }
  }

  // 11. Clean up the auto-created test character for the target ruleset (if different from cloned one)
  if (
    autoTestCharacterId &&
    (!sourceTestCharacter || autoTestCharacterId !== characterIdMap.get(sourceTestCharacter.id))
  ) {
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

  return counts;
}
