const common = '++id, createdAt, updatedAt';

/** Original schema at v41 (before Page/rulesetId and CharacterPage embedding). */
export const dbSchemaV41 = {
  users: `${common}, username, assetId, image, preferences`,
  assets: `${common}, rulesetId, [directory+filename], data, type, moduleId`,
  rulesets: `${common}, version, createdBy, title, description, details, assetId, image, palette, isModule, modules`,
  fonts: `${common}, rulesetId, label, data, moduleId`,
  attributes: `${common}, rulesetId, title, description, category, type, options, defaultValue, optionsChartRef, optionsChartColumnHeader, min, max, scriptId, moduleId`,
  actions: `${common}, rulesetId, title, description, category, scriptId, moduleId`,
  items: `${common}, rulesetId, title, description, category, weight, defaultQuantity, stackSize, isContainer, isStorable, isEquippable, isConsumable, inventoryWidth, inventoryHeight, scriptId, moduleId, sprites`,
  charts: `${common}, rulesetId, title, description, category, data, assetId, image, moduleId`,
  documents: `${common}, rulesetId, worldId, campaignId, title, description, category, assetId, image, pdfAssetId, pdfData, markdownData, moduleId`,
  windows: `${common}, rulesetId, title, category, hideFromPlayerView, moduleId`,
  pages: `${common}, label, category, hideFromPlayerView, moduleId`,
  components: `${common}, rulesetId, windowId, type, x, y, z, height, width, rotation, selected, assetId, groupId, attributeId, actionId, data, style`,
  characters: `${common}, rulesetId, userId, assetId, image, moduleId`,
  archetypes: `${common}, rulesetId, name, description, assetId, image, scriptId, testCharacterId, isDefault, loadOrder, variantsChartRef, variantsChartColumnHeader, moduleId, sprites, [rulesetId+name]`,
  customProperties: `${common}, rulesetId, label, type, category, defaultValue, &[rulesetId+label]`,
  archetypeCustomProperties: `${common}, archetypeId, customPropertyId, defaultValue, [archetypeId], &[archetypeId+customPropertyId]`,
  itemCustomProperties: `${common}, itemId, customPropertyId, defaultValue, [itemId], &[itemId+customPropertyId]`,
  inventories: `${common}, rulesetId, characterId, title, category, type`,
  inventoryItems: `${common}, characterId, inventoryId, entityId, quantity`,
  rulesetPages: `${common}, rulesetId, pageId, [rulesetId+pageId]`,
  characterPages: `${common}, characterId, pageId, [characterId+pageId]`,
  characterWindows: `${common}, characterId, characterPageId, windowId, title, x, y, isCollapsed, moduleId`,
  rulesetWindows: `${common}, rulesetId, rulesetPageId, windowId, title, x, y, isCollapsed, moduleId`,
  characterAttributes: `${common}, characterId, attributeId, &[characterId+attributeId], scriptDisabled`,
  characterArchetypes: `${common}, characterId, archetypeId, loadOrder, &[characterId+archetypeId]`,
  diceRolls: `${common}, rulesetId, userId, value, label, moduleId`,
  scripts: `${common}, rulesetId, name, entityType, entityId, isGlobal, enabled, category, moduleId, [entityId+entityType], [rulesetId+entityType]`,
  scriptErrors: `${common}, rulesetId, scriptId, characterId, timestamp`,
  scriptLogs: `${common}, rulesetId, scriptId, characterId, timestamp, [entityId+entityType]`,
  dependencyGraphNodes: `${common}, rulesetId, scriptId, entityType, entityId`,
  worlds: `${common}, label, rulesetId, assetId, backgroundAssetId, backgroundOpacity, backgroundSize, backgroundPosition`,
  tilemaps: `${common}, label, worldId, assetId, tileHeight, tileWidth`,
  tiles: `${common}, tilemapId, tileX, tileY`,
  locations: `${common}, label, worldId, nodeX, nodeY, nodeWidth, nodeHeight, parentLocationId, gridWidth, gridHeight, tiles, hasMap, tileRenderSize, labelVisible, backgroundColor, opacity, sides, backgroundAssetId, backgroundSize, backgroundPosition, mapAssetId, [worldId+parentLocationId]`,
  campaigns: `${common}, label, rulesetId, worldId, [rulesetId], [worldId]`,
  campaignCharacters: `${common}, characterId, campaignId, currentLocationId, currentTileId, [campaignId], [characterId], [campaignId+characterId]`,
  campaignItems: `${common}, itemId, campaignId, currentLocationId, currentTileId, [campaignId]`,
  campaignEvents: `${common}, label, campaignId, scriptId, category, [campaignId]`,
  campaignEventLocations: `${common}, campaignEventId, locationId, tileId, [campaignEventId], [locationId]`,
};

export const dbSchema = {
  users: `${common}, username, assetId, image, preferences`,
  assets: `${common}, rulesetId, [directory+filename], data, type, moduleId`,
  rulesets: `${common}, version, createdBy, title, description, details, assetId, image, palette, isModule, modules`,
  fonts: `${common}, rulesetId, label, data, moduleId`,
  attributes: `${common}, rulesetId, title, description, category, type, options, defaultValue, optionsChartRef, optionsChartColumnHeader, min, max, scriptId, moduleId`,
  actions: `${common}, rulesetId, title, description, category, scriptId, moduleId`,
  items: `${common}, rulesetId, title, description, category, weight, defaultQuantity, stackSize, isContainer, isStorable, isEquippable, isConsumable, inventoryWidth, inventoryHeight, scriptId, moduleId, sprites`,
  charts: `${common}, rulesetId, title, description, category, data, assetId, image, moduleId`,
  documents: `${common}, rulesetId, worldId, campaignId, title, description, category, assetId, image, pdfAssetId, pdfData, markdownData, moduleId`,
  windows: `${common}, rulesetId, title, category, hideFromPlayerView, moduleId`,
  pages: `${common}, rulesetId, label, category, hideFromPlayerView, moduleId`,
  components: `${common}, rulesetId, windowId, type, x, y, z, height, width, rotation, selected, assetId, assetUrl, groupId, attributeId, actionId, data, style`,
  characters: `${common}, rulesetId, userId, assetId, image, moduleId`,
  archetypes: `${common}, rulesetId, name, description, assetId, image, scriptId, testCharacterId, isDefault, loadOrder, variantsChartRef, variantsChartColumnHeader, moduleId, sprites, [rulesetId+name]`,
  customProperties: `${common}, rulesetId, label, type, category, defaultValue, &[rulesetId+label]`,
  archetypeCustomProperties: `${common}, archetypeId, customPropertyId, defaultValue, [archetypeId], &[archetypeId+customPropertyId]`,
  itemCustomProperties: `${common}, itemId, customPropertyId, defaultValue, [itemId], &[itemId+customPropertyId]`,
  inventories: `${common}, rulesetId, characterId, title, category, type`,
  inventoryItems: `${common}, characterId, inventoryId, entityId, quantity`,
  characterPages: `${common}, characterId, pageId, rulesetId, label, category, assetId, assetUrl, backgroundOpacity, backgroundColor, image, hideFromPlayerView, [characterId+pageId]`,
  characterWindows: `${common}, characterId, characterPageId, windowId, title, x, y, isCollapsed, moduleId`,
  rulesetWindows: `${common}, rulesetId, pageId, windowId, title, x, y, isCollapsed, moduleId`,
  characterAttributes: `${common}, characterId, attributeId, &[characterId+attributeId], scriptDisabled`,
  characterArchetypes: `${common}, characterId, archetypeId, loadOrder, &[characterId+archetypeId]`,
  diceRolls: `${common}, rulesetId, userId, value, label, moduleId`,
  scripts: `${common}, rulesetId, name, entityType, entityId, isGlobal, enabled, category, moduleId, [entityId+entityType], [rulesetId+entityType]`,
  scriptErrors: `${common}, rulesetId, scriptId, characterId, timestamp`,
  scriptLogs: `${common}, rulesetId, scriptId, characterId, timestamp, [entityId+entityType]`,
  dependencyGraphNodes: `${common}, rulesetId, scriptId, entityType, entityId`,
  worlds: `${common}, label, rulesetId, assetId, backgroundAssetId, backgroundOpacity, backgroundSize, backgroundPosition`,
  tilemaps: `${common}, label, worldId, assetId, tileHeight, tileWidth`,
  tiles: `${common}, tilemapId, tileX, tileY`,
  locations: `${common}, label, worldId, nodeX, nodeY, nodeWidth, nodeHeight, parentLocationId, gridWidth, gridHeight, tiles, hasMap, tileRenderSize, labelVisible, backgroundColor, opacity, sides, backgroundAssetId, backgroundSize, backgroundPosition, mapAssetId, [worldId+parentLocationId]`,
  campaigns: `${common}, label, rulesetId, worldId, [rulesetId], [worldId]`,
  campaignCharacters: `${common}, characterId, campaignId, currentLocationId, currentTileId, [campaignId], [characterId], [campaignId+characterId]`,
  campaignItems: `${common}, itemId, campaignId, currentLocationId, currentTileId, [campaignId]`,
  campaignEvents: `${common}, label, campaignId, scriptId, category, [campaignId]`,
  campaignEventLocations: `${common}, campaignEventId, locationId, tileId, [campaignEventId], [locationId]`,
};

/** Schema for v42 migration only: keeps rulesetPages, rulesetWindows has both rulesetPageId and pageId. */
export const dbSchemaV42 = {
  ...dbSchema,
  rulesetPages: `${common}, rulesetId, pageId, [rulesetId+pageId]`,
  rulesetWindows: `${common}, rulesetId, rulesetPageId, pageId, windowId, title, x, y, isCollapsed, moduleId`,
};

/** Schema for v44: assets filename-only (no directory), [rulesetId+filename]; characterPages/components without assetUrl. */
export const dbSchemaV44 = {
  ...dbSchema,
  assets: `${common}, rulesetId, filename, data, type, moduleId, [rulesetId+filename]`,
  characterPages: `${common}, characterId, pageId, rulesetId, label, category, assetId, backgroundOpacity, backgroundColor, image, hideFromPlayerView, [characterId+pageId]`,
  components: `${common}, rulesetId, windowId, type, x, y, z, height, width, rotation, selected, assetId, groupId, attributeId, actionId, data, style`,
};

/** Schema for v45: assets have category. */
export const dbSchemaV45 = {
  ...dbSchemaV44,
  assets: `${common}, rulesetId, filename, data, type, category, moduleId, [rulesetId+filename]`,
};

/** Schema for v46: items, actions, attributes have assetId index (for asset reference lookups). */
export const dbSchemaV46 = {
  ...dbSchemaV45,
  items: `${common}, rulesetId, title, description, category, weight, defaultQuantity, stackSize, isContainer, isStorable, isEquippable, isConsumable, inventoryWidth, inventoryHeight, scriptId, moduleId, sprites, assetId`,
  actions: `${common}, rulesetId, title, description, category, scriptId, moduleId, assetId`,
  attributes: `${common}, rulesetId, title, description, category, type, options, defaultValue, optionsChartRef, optionsChartColumnHeader, min, max, scriptId, moduleId, assetId`,
};

/** Schema for v47: items have actionIds; inventoryItems have actionIds. */
export const dbSchemaV47 = {
  ...dbSchemaV46,
  items: `${common}, rulesetId, title, description, category, weight, defaultQuantity, stackSize, isContainer, isStorable, isEquippable, isConsumable, inventoryWidth, inventoryHeight, scriptId, moduleId, sprites, assetId, actionIds`,
  inventoryItems: `${common}, characterId, inventoryId, entityId, quantity, actionIds`,
};

/** Schema for v48: CampaignScene, CampaignEventScene; campaignCharacters get campaignSceneId; campaignItems get sceneId. */
export const dbSchemaV48 = {
  ...dbSchemaV47,
  campaignScenes: `${common}, campaignId, name, category, [campaignId]`,
  campaignEventScenes: `${common}, campaignEventId, campaignSceneId, [campaignEventId], [campaignSceneId]`,
  campaignCharacters: `${common}, characterId, campaignId, campaignSceneId, currentLocationId, currentTileId, mapHeight, mapWidth, active, [campaignId], [characterId], [campaignId+characterId], [campaignSceneId]`,
  campaignItems: `${common}, itemId, campaignId, sceneId, currentLocationId, currentTileId, mapHeight, mapWidth, [campaignId], [sceneId]`,
};

/** Schema for v49: documents get optional campaignSceneId. */
export const dbSchemaV49 = {
  ...dbSchemaV48,
  documents: `${common}, rulesetId, worldId, campaignId, campaignSceneId, title, description, category, assetId, image, pdfAssetId, pdfData, markdownData, moduleId, [campaignSceneId]`,
};

/** Schema for v50: scriptLogs get campaignId for campaign-scoped logs. */
export const dbSchemaV50 = {
  ...dbSchemaV49,
  scriptLogs: `${common}, rulesetId, campaignId, scriptId, characterId, timestamp, [entityId+entityType], [campaignId]`,
};

/** Schema for v51: remove worlds, locations, tilemaps, tiles, campaignEventLocations. */
const {
  worlds: _w,
  tilemaps: _tm,
  tiles: _t,
  locations: _l,
  campaignEventLocations: _cel,
  ...dbSchemaV50WithoutWorldTables
} = dbSchemaV50 as typeof dbSchemaV50 & {
  worlds?: string;
  tilemaps?: string;
  tiles?: string;
  locations?: string;
  campaignEventLocations?: string;
};
export const dbSchemaV51 = {
  ...dbSchemaV50WithoutWorldTables,
  documents: `${common}, rulesetId, campaignId, campaignSceneId, title, description, category, assetId, image, pdfAssetId, pdfData, markdownData, moduleId, [campaignSceneId]`,
  campaigns: `${common}, label, rulesetId, [rulesetId]`,
  campaignCharacters: `${common}, characterId, campaignId, campaignSceneId, mapHeight, mapWidth, active, [campaignId], [characterId], [campaignId+characterId], [campaignSceneId]`,
  campaignItems: `${common}, itemId, campaignId, sceneId, mapHeight, mapWidth, [campaignId], [sceneId]`,
};

// Increment on every schema change
export const dbSchemaVersion = 51;
