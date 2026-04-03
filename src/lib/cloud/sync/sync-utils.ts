/**
 * Key mapping: Dexie uses camelCase, Postgres uses snake_case.
 * Strip excluded fields before pushing to remote.
 */

import { isSoftDeleteSyncTable } from '@/lib/data/soft-delete';
import type { DB } from '@/stores/db/hooks/types';
import { getSyncTableConfig } from './sync-tables';

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function toSnakeCaseKeys<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    const key = camelToSnake(k);
    out[key] = v;
  }
  return out;
}

export function toCamelCaseKeys<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    const key = snakeToCamel(k);
    out[key] = v;
  }
  return out;
}

/**
 * Strip excluded fields and remove user_id (server-set). Returns a new object.
 */
export function stripForPush(
  tableName: string,
  record: Record<string, unknown>,
): Record<string, unknown> {
  const config = getSyncTableConfig(tableName);
  const excluded = new Set(config?.excludedFields ?? []);
  excluded.add('user_id');
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(record)) {
    if (excluded.has(k)) continue;
    if (v === undefined) continue;
    out[k] = v;
  }
  return out;
}

/**
 * Prepare a local record for remote upsert: strip excluded fields, then convert keys to snake_case.
 * Coerces known integer columns (e.g. quantity on inventory_items) so we never send invalid types.
 */
export function prepareRecordForRemote(
  tableName: string,
  record: Record<string, unknown>,
): Record<string, unknown> {
  const stripped = stripForPush(tableName, record);
  if (tableName === 'attributes' || tableName === 'characterAttributes') {
    const s = stripped as { optionsChartRef?: unknown; options?: unknown };
    if (s.optionsChartRef != null && s.optionsChartRef !== '') {
      delete s.options;
    }
  }
  if (tableName === 'documents') {
    const d = stripped as { description?: unknown };
    if (d.description == null) {
      d.description = '';
    }
  }
  if (tableName === 'archetypes') {
    const a = stripped as { description?: unknown; variantsChartRef?: unknown };
    if (a.description == null) {
      a.description = '';
    }
    if (a.variantsChartRef != null) {
      const n = Number(a.variantsChartRef);
      a.variantsChartRef = Number.isFinite(n) ? Math.trunc(n) : undefined;
    }
  }
  if (tableName === 'components') {
    const comp = stripped as { states?: unknown };
    if (comp.states == null) {
      comp.states = '[]';
    }
  }
  if (tableName === 'users') {
    const u = stripped as { email?: unknown };
    if (typeof u.email === 'string') {
      const n = u.email.trim().toLowerCase();
      u.email = n.length > 0 ? n : undefined;
    }
  }
  if (tableName === 'characters') {
    const c = stripped as Record<string, unknown> & {
      pinnedSidebarDocuments?: unknown;
      pinnedSidebarCharts?: unknown;
      componentData?: unknown;
    };
    if (c.pinnedSidebarDocuments == null) c.pinnedSidebarDocuments = [];
    if (c.pinnedSidebarCharts == null) c.pinnedSidebarCharts = [];
    if (c.componentData == null) c.componentData = {};
    if (c['pinned_sidebar_documents'] == null) c['pinned_sidebar_documents'] = [];
    if (c['pinned_sidebar_charts'] == null) c['pinned_sidebar_charts'] = [];
    if (c['component_data'] == null) c['component_data'] = {};
  }
  if (tableName === 'characterWindows') {
    const w = stripped as { componentActiveStates?: unknown };
    if (w.componentActiveStates == null) {
      w.componentActiveStates = '{}';
    }
  }
  if (isSoftDeleteSyncTable(tableName)) {
    const s = stripped as { deleted?: unknown };
    s.deleted = s.deleted === true;
  }
  const out = toSnakeCaseKeys(stripped);
  if (tableName === 'inventoryItems' && 'quantity' in out) {
    const n = Number((out as { quantity: unknown }).quantity);
    (out as { quantity: number }).quantity = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 1;
  }
  return out;
}

/**
 * Prepare a remote record for local bulkPut: convert keys to camelCase.
 * Does not add or remove fields beyond key mapping.
 * For `users`, maps Postgres `user_id` to Dexie `cloudUserId` (not `userId`).
 */
export function prepareRemoteForLocal(
  record: Record<string, unknown>,
  tableName?: string,
): Record<string, unknown> {
  if (tableName === 'users') {
    const rest = { ...record };
    delete rest.cloud_enabled;
    const out = toCamelCaseKeys(rest);
    const authUid =
      typeof record.user_id === 'string'
        ? record.user_id
        : typeof out.userId === 'string'
          ? out.userId
          : undefined;
    delete out.userId;
    if (authUid != null) out.cloudUserId = authUid;
    return out;
  }
  return toCamelCaseKeys(record);
}

/**
 * Resolve rulesetId for an entity being deleted, so we can record it in sync_deletes.
 * Used by delete hooks to scope pending deletes by ruleset.
 */
export async function getRulesetIdForDelete(
  db: DB,
  tableName: string,
  entityId: string,
  entity?: Record<string, unknown> | null,
): Promise<string | null> {
  const config = getSyncTableConfig(tableName);
  if (!config) return null;
  if (config.hasRulesetId && entity?.rulesetId) return entity.rulesetId as string;
  type DbTable = { get: (id: string) => Promise<{ rulesetId?: string; campaignId?: string; characterId?: string } | undefined> };
  const tables = db as unknown as Record<string, DbTable>;
  if (config.parentTable === 'characters' && (entity?.characterId || entity?.character_id)) {
    const id = (entity.characterId ?? entity.character_id) as string;
    const char = await tables.characters?.get(id);
    return char?.rulesetId ?? null;
  }
  if (config.parentTable === 'campaigns' && (entity?.campaignId || entity?.campaign_id)) {
    const id = (entity.campaignId ?? entity.campaign_id) as string;
    const camp = await tables.campaigns?.get(id);
    return camp?.rulesetId ?? null;
  }
  if (config.parentTable === 'campaignScenes' && (entity?.campaignSceneId ?? entity?.campaign_scene_id)) {
    const id = (entity.campaignSceneId ?? entity.campaign_scene_id) as string;
    const scene = await tables.campaignScenes?.get(id);
    if (!scene?.campaignId) return null;
    const camp = await tables.campaigns?.get(scene.campaignId);
    return camp?.rulesetId ?? null;
  }
  if (config.parentTable === 'archetypes' && (entity?.archetypeId ?? entity?.archetype_id)) {
    const id = (entity.archetypeId ?? entity.archetype_id) as string;
    const arch = await tables.archetypes?.get(id);
    return arch?.rulesetId ?? null;
  }
  if (config.parentTable === 'items' && (entity?.itemId ?? entity?.item_id)) {
    const id = (entity.itemId ?? entity.item_id) as string;
    const item = await tables.items?.get(id);
    return item?.rulesetId ?? null;
  }
  if (config.parentTable === 'inventories' && (entity?.inventoryId ?? entity?.inventory_id)) {
    const id = (entity.inventoryId ?? entity.inventory_id) as string;
    const inv = await tables.inventories?.get(id);
    if (!inv?.characterId) return null;
    const char = await tables.characters?.get(inv.characterId);
    return char?.rulesetId ?? null;
  }
  if (config.parentTable === 'composites' && (entity?.compositeId ?? entity?.composite_id)) {
    const id = (entity.compositeId ?? entity.composite_id) as string;
    const comp = await tables.composites?.get(id);
    return comp?.rulesetId ?? null;
  }
  return null;
}

/**
 * Turn sync failures (including Supabase PostgREST plain-object errors) into readable text.
 * Avoids `[object Object]` when `err` is not an `Error` instance.
 */
export function formatSyncError(err: unknown): string {
  if (err == null) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (err instanceof Error) {
    const m = err.message?.trim();
    if (m) return m;
    try {
      return JSON.stringify(
        { name: err.name, message: err.message, stack: err.stack },
        null,
        2,
      );
    } catch {
      return err.name || 'Error';
    }
  }
  if (typeof err === 'object') {
    const o = err as Record<string, unknown>;
    const msg = typeof o.message === 'string' ? o.message.trim() : '';
    const code = typeof o.code === 'string' ? o.code : '';
    const details = typeof o.details === 'string' ? o.details : '';
    const hint = typeof o.hint === 'string' ? o.hint : '';
    const lines: string[] = [];
    if (msg) lines.push(msg);
    if (code) lines.push(`code: ${code}`);
    if (details) lines.push(`details: ${details}`);
    if (hint) lines.push(`hint: ${hint}`);
    if (lines.length > 0) return lines.join('\n');
    try {
      return JSON.stringify(err, null, 2);
    } catch {
      return Object.prototype.toString.call(err);
    }
  }
  return String(err);
}
