/**
 * User-facing names for Dexie sync tables (singular/plural) and formatting for sync toasts.
 */

import { SYNC_TABLE_ORDER } from '@/lib/cloud/sync/sync-tables';

type LabelPair = { one: string; many: string };

/** Lowercase phrases after the number in sync summaries (e.g. "3 components"). */
const SYNC_ENTITY_LABELS: Record<string, LabelPair> = {
  users: { one: 'profile', many: 'profiles' },
  rulesets: { one: 'ruleset', many: 'rulesets' },
  attributes: { one: 'attribute', many: 'attributes' },
  actions: { one: 'action', many: 'actions' },
  items: { one: 'item', many: 'items' },
  charts: { one: 'chart', many: 'charts' },
  documents: { one: 'document', many: 'documents' },
  assets: { one: 'asset', many: 'assets' },
  fonts: { one: 'font', many: 'fonts' },
  windows: { one: 'window', many: 'windows' },
  components: { one: 'component', many: 'components' },
  pages: { one: 'page', many: 'pages' },
  rulesetWindows: { one: 'ruleset window', many: 'ruleset windows' },
  scripts: { one: 'script', many: 'scripts' },
  scriptLogs: { one: 'script log', many: 'script logs' },
  dependencyGraphNodes: { one: 'dependency node', many: 'dependency nodes' },
  archetypes: { one: 'archetype', many: 'archetypes' },
  customProperties: { one: 'custom property', many: 'custom properties' },
  diceRolls: { one: 'dice roll', many: 'dice rolls' },
  characters: { one: 'character', many: 'characters' },
  characterAttributes: { one: 'character attribute', many: 'character attributes' },
  characterPages: { one: 'character page', many: 'character pages' },
  characterWindows: { one: 'character window', many: 'character windows' },
  inventories: { one: 'inventory', many: 'inventories' },
  inventoryItems: { one: 'inventory item', many: 'inventory items' },
  characterArchetypes: { one: 'character archetype', many: 'character archetypes' },
  campaigns: { one: 'campaign', many: 'campaigns' },
  campaignCharacters: { one: 'campaign character', many: 'campaign characters' },
  campaignScenes: { one: 'campaign scene', many: 'campaign scenes' },
  campaignEvents: { one: 'campaign event', many: 'campaign events' },
  sceneTurnCallbacks: { one: 'scene callback', many: 'scene callbacks' },
  archetypeCustomProperties: { one: 'archetype property', many: 'archetype properties' },
  itemCustomProperties: { one: 'item property', many: 'item properties' },
};

function tableOrderIndex(tableName: string): number {
  const i = SYNC_TABLE_ORDER.indexOf(tableName);
  return i === -1 ? 1000 : i;
}

function labelPairForTable(tableName: string): LabelPair {
  const known = SYNC_ENTITY_LABELS[tableName];
  if (known) return known;
  const words = tableName.replace(/([A-Z])/g, ' $1').trim().toLowerCase();
  return { one: words, many: `${words}s` };
}

/** Singular entity label for one row (e.g. sync review pull list). */
export function getSyncEntityTypeLabelOne(tableName: string): string {
  return labelPairForTable(tableName).one;
}

/** Plural entity label (e.g. "3 components"). */
export function getSyncEntityTypeLabelMany(tableName: string): string {
  return labelPairForTable(tableName).many;
}

export function addSyncEntityCount(
  map: Record<string, number>,
  tableName: string,
  delta: number,
): void {
  if (delta <= 0) return;
  map[tableName] = (map[tableName] ?? 0) + delta;
}

export function sumSyncEntityCounts(counts: Record<string, number> | undefined): number {
  if (!counts) return 0;
  return Object.values(counts).reduce((a, b) => a + b, 0);
}

/** Dexie tables omitted from cloud sync review / success panel breakdowns (rows still sync). */
export const CLOUD_SYNC_UI_HIDDEN_ENTITY_TABLES: ReadonlySet<string> = new Set([
  'characterAttributes',
  'inventoryItems',
  'characterArchetypes',
]);

export function filterSyncEntityCountsForUi(counts: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = { ...counts };
  for (const key of CLOUD_SYNC_UI_HIDDEN_ENTITY_TABLES) {
    delete out[key];
  }
  return out;
}

export interface SyncEntityLine {
  tableName: string;
  count: number;
  /** e.g. "3 components" */
  phrase: string;
}

/** One line per entity type, sync table order (for expandable sync UI). */
export function getOrderedSyncEntityLines(counts: Record<string, number>): SyncEntityLine[] {
  const entries = Object.entries(counts).filter(([, n]) => n > 0);
  entries.sort((a, b) => tableOrderIndex(a[0]) - tableOrderIndex(b[0]));
  return entries.map(([table, n]) => {
    const { one, many } = labelPairForTable(table);
    return {
      tableName: table,
      count: n,
      phrase: `${n} ${n === 1 ? one : many}`,
    };
  });
}

/** "3 components, 2 attributes" — sorted by sync table order. */
export function formatEntityCountsForSyncSummary(counts: Record<string, number>): string {
  return getOrderedSyncEntityLines(counts)
    .map((l) => l.phrase)
    .join(', ');
}
