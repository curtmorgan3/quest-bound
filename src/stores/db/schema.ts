const common = '++id, createdAt, updatedAt';

export const dbSchema = {
  users: `${common}, username, assetId, image, preferences`,
  assets: `${common}, rulesetId, [directory+filename], data, type`,
  rulesets: `${common}, version, createdBy, title, description, details, assetId, image`,
  fonts: `${common}, rulesetId, label, data`,
  attributes: `${common}, rulesetId, title, description, category, type, options, defaultValue, optionsChartRef, optionsChartColumnHeader, min, max, scriptId`,
  actions: `${common}, rulesetId, title, description, category, scriptId`,
  items: `${common}, rulesetId, title, description, category, weight, defaultQuantity, stackSize, isContainer, isStorable, isEquippable, isConsumable, inventoryWidth, inventoryHeight, scriptId`,
  charts: `${common}, rulesetId, title, description, category, data, assetId, image`,
  documents: `${common}, rulesetId, title, description, category, assetId, image, pdfAssetId, pdfData`,
  windows: `${common}, rulesetId, title, category`,
  components: `${common}, rulesetId, windowId, type, x, y, z, height, width, rotation, selected, assetId, assetUrl, groupId, attributeId, actionId, data, style`,
  characters: `${common}, rulesetId, userId, assetId, image`,
  inventories: `${common}, rulesetId, characterId, title, category, type`,
  inventoryItems: `${common}, characterId, inventoryId, entityId, quantity`,
  characterPages: `${common}, characterId, label`,
  characterWindows: `${common}, characterId, characterPageId, windowId, title, x, y, isCollapsed`,
  characterAttributes: `${common}, characterId, attributeId, &[characterId+attributeId], scriptDisabled`,
  diceRolls: `${common}, rulesetId, userId, value, label`,
  scripts: `${common}, rulesetId, name, entityType, entityId, isGlobal, enabled, [entityId+entityType]`,
  scriptErrors: `${common}, rulesetId, scriptId, characterId, timestamp`,
  scriptLogs: `${common}, rulesetId, scriptId, characterId, timestamp, [entityId+entityType]`,
  dependencyGraphNodes: `${common}, rulesetId, scriptId, entityType, entityId`,
};

// Increment on every schema change
export const dbSchemaVersion = 21;
