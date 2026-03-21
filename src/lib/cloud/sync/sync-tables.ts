/**
 * Sync table configuration: maps Dexie tables to remote (Supabase) tables,
 * excluded fields (stripped before push), and hierarchy for sync order.
 * Remote schema uses snake_case; Dexie uses camelCase — mapping in sync-utils.
 */

export interface SyncTableConfig {
  /** Dexie table name (camelCase) */
  tableName: string;
  /** Remote Postgres table name (snake_case) */
  remoteTableName: string;
  /** Fields to strip before pushing (injected at read time or ephemeral) */
  excludedFields: string[];
  /** Table has rulesetId — can be filtered by ruleset for sync */
  hasRulesetId: boolean;
  /** For child tables: parent table name (e.g. characters for characterAttributes) */
  parentTable?: string;
  /** Foreign key field on this table pointing to parent (e.g. characterId) */
  parentKey?: string;
}

/** Excluded per phase-1: image, backgroundImage, mapAsset, charactersCtaImage, campaignsCtaImage (resolved from assetId);
 * selected on Component; variantOptions on Archetype;
 * sprites when resolved asset data — we strip entire sprites for items/archetypes to avoid syncing resolved blobs.
 * Attribute/CharacterAttribute `options` sync when not chart-backed; chart-derived options are omitted in prepareRecordForRemote.
 */
export const SYNC_TABLE_CONFIGS: SyncTableConfig[] = [
  {
    tableName: 'users',
    remoteTableName: 'users',
    excludedFields: ['image', 'emailVerified', 'cloudEnabled'],
    hasRulesetId: false,
  },
  {
    tableName: 'rulesets',
    remoteTableName: 'rulesets',
    excludedFields: ['image', 'charactersCtaImage', 'campaignsCtaImage'],
    hasRulesetId: true,
  },
  {
    tableName: 'attributes',
    remoteTableName: 'attributes',
    excludedFields: ['image'],
    hasRulesetId: true,
  },
  {
    tableName: 'actions',
    remoteTableName: 'actions',
    excludedFields: ['image'],
    hasRulesetId: true,
  },
  {
    tableName: 'items',
    remoteTableName: 'items',
    excludedFields: ['sprites', 'image'],
    hasRulesetId: true,
  },
  {
    tableName: 'charts',
    remoteTableName: 'charts',
    excludedFields: ['image'],
    hasRulesetId: true,
  },
  {
    tableName: 'documents',
    remoteTableName: 'documents',
    excludedFields: ['image', 'pdfData'],
    hasRulesetId: true,
  },
  { tableName: 'assets', remoteTableName: 'assets', excludedFields: [], hasRulesetId: true },
  { tableName: 'fonts', remoteTableName: 'fonts', excludedFields: [], hasRulesetId: true },
  {
    tableName: 'windows',
    remoteTableName: 'windows',
    excludedFields: ['image'],
    hasRulesetId: true,
  },
  {
    tableName: 'components',
    remoteTableName: 'components',
    excludedFields: ['selected'],
    hasRulesetId: true,
  },
  { tableName: 'pages', remoteTableName: 'pages', excludedFields: [], hasRulesetId: true },
  {
    tableName: 'rulesetWindows',
    remoteTableName: 'ruleset_windows',
    excludedFields: ['rulesetPageId'],
    hasRulesetId: true,
  },
  { tableName: 'scripts', remoteTableName: 'scripts', excludedFields: [], hasRulesetId: true },
  { tableName: 'scriptLogs', remoteTableName: 'script_logs', excludedFields: [], hasRulesetId: true },
  {
    tableName: 'dependencyGraphNodes',
    remoteTableName: 'dependency_graph_nodes',
    excludedFields: [],
    hasRulesetId: true,
  },
  {
    tableName: 'archetypes',
    remoteTableName: 'archetypes',
    excludedFields: ['variantOptions', 'sprites', 'image', 'mapHeight', 'mapWidth'],
    hasRulesetId: true,
  },
  {
    tableName: 'customProperties',
    remoteTableName: 'custom_properties',
    excludedFields: [],
    hasRulesetId: true,
  },
  { tableName: 'diceRolls', remoteTableName: 'dice_rolls', excludedFields: [], hasRulesetId: true },
  {
    tableName: 'characters',
    remoteTableName: 'characters',
    excludedFields: ['image', 'archetypeIds'],
    hasRulesetId: true,
  },
  {
    tableName: 'characterAttributes',
    remoteTableName: 'character_attributes',
    excludedFields: ['image'],
    hasRulesetId: true,
    parentTable: 'characters',
    parentKey: 'characterId',
  },
  {
    tableName: 'characterPages',
    remoteTableName: 'character_pages',
    excludedFields: [],
    hasRulesetId: true,
    parentTable: 'characters',
    parentKey: 'characterId',
  },
  {
    tableName: 'characterWindows',
    remoteTableName: 'character_windows',
    excludedFields: [],
    hasRulesetId: false,
    parentTable: 'characters',
    parentKey: 'characterId',
  },
  {
    tableName: 'inventories',
    remoteTableName: 'inventories',
    excludedFields: ['entities', 'items'],
    hasRulesetId: true,
    parentTable: 'characters',
    parentKey: 'characterId',
  },
  {
    tableName: 'inventoryItems',
    remoteTableName: 'inventory_items',
    excludedFields: ['items'],
    hasRulesetId: false,
    parentTable: 'inventories',
    parentKey: 'inventoryId',
  },
  {
    tableName: 'characterArchetypes',
    remoteTableName: 'character_archetypes',
    excludedFields: [],
    hasRulesetId: false,
    parentTable: 'characters',
    parentKey: 'characterId',
  },
  {
    tableName: 'campaigns',
    remoteTableName: 'campaigns',
    excludedFields: [],
    hasRulesetId: true,
  },
  {
    tableName: 'campaignCharacters',
    remoteTableName: 'campaign_characters',
    excludedFields: [],
    hasRulesetId: false,
    parentTable: 'campaigns',
    parentKey: 'campaignId',
  },
  {
    tableName: 'campaignScenes',
    remoteTableName: 'campaign_scenes',
    excludedFields: [],
    hasRulesetId: false,
    parentTable: 'campaigns',
    parentKey: 'campaignId',
  },
  {
    tableName: 'campaignEvents',
    remoteTableName: 'campaign_events',
    excludedFields: [],
    hasRulesetId: false,
    parentTable: 'campaigns',
    parentKey: 'campaignId',
  },
  {
    tableName: 'sceneTurnCallbacks',
    remoteTableName: 'scene_turn_callbacks',
    excludedFields: [],
    hasRulesetId: true,
    parentTable: 'campaignScenes',
    parentKey: 'campaignSceneId',
  },
  {
    tableName: 'archetypeCustomProperties',
    remoteTableName: 'archetype_custom_properties',
    excludedFields: [],
    hasRulesetId: false,
    parentTable: 'archetypes',
    parentKey: 'archetypeId',
  },
  {
    tableName: 'itemCustomProperties',
    remoteTableName: 'item_custom_properties',
    excludedFields: [],
    hasRulesetId: false,
    parentTable: 'items',
    parentKey: 'itemId',
  },
];

const TABLE_CONFIG_BY_NAME = new Map(SYNC_TABLE_CONFIGS.map((c) => [c.tableName, c]));
const TABLE_CONFIG_BY_REMOTE = new Map(
  SYNC_TABLE_CONFIGS.map((c) => [c.remoteTableName, c]),
);

export function getSyncTableConfig(tableName: string): SyncTableConfig | undefined {
  return TABLE_CONFIG_BY_NAME.get(tableName);
}

export function getSyncTableConfigByRemote(remoteTableName: string): SyncTableConfig | undefined {
  return TABLE_CONFIG_BY_REMOTE.get(remoteTableName);
}

/** Tables that have rulesetId and can be queried directly by ruleset for sync. */
export const RULESET_SCOPED_TABLES = SYNC_TABLE_CONFIGS.filter((c) => c.hasRulesetId).map(
  (c) => c.tableName,
);

/** Order for sync: user profile, then ruleset and children, then characters + children, then campaigns + children. */
export const SYNC_TABLE_ORDER: string[] = [
  'users',
  'rulesets',
  'attributes',
  'actions',
  'items',
  'charts',
  'documents',
  'assets',
  'fonts',
  'windows',
  'components',
  'pages',
  'rulesetWindows',
  'scripts',
  'scriptLogs',
  'dependencyGraphNodes',
  'archetypes',
  'customProperties',
  'diceRolls',
  'characters',
  'characterAttributes',
  'characterPages',
  'characterWindows',
  'inventories',
  'inventoryItems',
  'characterArchetypes',
  'campaigns',
  'campaignCharacters',
  'campaignScenes',
  'campaignEvents',
  'sceneTurnCallbacks',
  'archetypeCustomProperties',
  'itemCustomProperties',
];
