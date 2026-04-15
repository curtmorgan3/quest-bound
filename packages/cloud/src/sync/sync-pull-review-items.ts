/**
 * Build per-row pull preview for the cloud sync review dialog (types, names, timestamps).
 */

import type { StagedPullPayload } from '@/lib/cloud/sync/sync-pull';
import {
  CLOUD_SYNC_UI_HIDDEN_ENTITY_TABLES,
  getSyncEntityTypeLabelOne,
} from '@/lib/cloud/sync/sync-entity-labels';
import { SYNC_TABLE_ORDER } from '@/lib/cloud/sync/sync-tables';

const DISPLAY_NAME_KEYS = ['title', 'name', 'label', 'filename', 'username', 'email'] as const;

/** Human-readable name fields only (no id / "Unnamed") — omit in UI when null. */
export function pickOptionalRowDisplayName(row: Record<string, unknown>): string | null {
  for (const key of DISPLAY_NAME_KEYS) {
    const v = row[key];
    if (typeof v === 'string') {
      const t = v.trim();
      if (t.length > 0) return t;
    }
  }
  return null;
}

export function formatIsoForReview(iso: string | null | undefined): string {
  if (typeof iso !== 'string' || iso.length === 0) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export type PullReviewListItem =
  | {
      kind: 'upsert';
      key: string;
      tableName: string;
      typeLabel: string;
      displayName: string | null;
      timestampIso: string | null;
    }
  | {
      kind: 'delete';
      key: string;
      tableName: string;
      typeLabel: string;
      entityId: string;
      timestampIso: string | null;
    }
  | {
      kind: 'componentWindowGroup';
      key: string;
      /** Empty when components have no windowId */
      windowId: string;
      windowTitleFromPayload: string | null;
      componentCount: number;
      timestampIso: string | null;
    };

export function countHiddenPullUpserts(payload: StagedPullPayload): number {
  let n = 0;
  for (const tableName of CLOUD_SYNC_UI_HIDDEN_ENTITY_TABLES) {
    const rows = payload.upsertsByTable[tableName];
    if (rows?.length) n += rows.length;
  }
  return n;
}

export function countHiddenPullDeletes(payload: StagedPullPayload): number {
  return payload.deletes.filter((d) => CLOUD_SYNC_UI_HIDDEN_ENTITY_TABLES.has(d.tableName)).length;
}

function rowUpdatedAtIso(row: Record<string, unknown>): string | null {
  if (typeof row.updatedAt === 'string') return row.updatedAt;
  if (typeof row.updated_at === 'string') return row.updated_at;
  return null;
}

function maxUpdatedAtIso(rows: Record<string, unknown>[]): string | null {
  let best: string | null = null;
  for (const r of rows) {
    const ts = rowUpdatedAtIso(r);
    if (ts && (!best || ts > best)) best = ts;
  }
  return best;
}

/** Titles from windows included in the same staged pull (remote updates). */
function windowTitlesFromPayload(payload: StagedPullPayload): Map<string, string> {
  const m = new Map<string, string>();
  const winRows = payload.upsertsByTable['windows'];
  if (!winRows?.length) return m;
  for (const row of winRows) {
    const r = row as Record<string, unknown>;
    const id = typeof r.id === 'string' ? r.id : '';
    const title = typeof r.title === 'string' ? r.title.trim() : '';
    if (id && title) m.set(id, title);
  }
  return m;
}

function buildComponentWindowGroupItems(payload: StagedPullPayload): PullReviewListItem[] {
  const compRows = payload.upsertsByTable['components'];
  if (!compRows?.length) return [];
  const byWindow = new Map<string, Record<string, unknown>[]>();
  for (const row of compRows) {
    const r = row as Record<string, unknown>;
    const wid = typeof r.windowId === 'string' && r.windowId.length > 0 ? r.windowId : '';
    const key = wid || '__unassigned__';
    const list = byWindow.get(key);
    if (list) list.push(r);
    else byWindow.set(key, [r]);
  }
  const titles = windowTitlesFromPayload(payload);
  const out: PullReviewListItem[] = [];
  for (const [wkey, rows] of byWindow) {
    const unassigned = wkey === '__unassigned__';
    const windowId = unassigned ? '' : wkey;
    const title = !unassigned ? (titles.get(wkey) ?? null) : null;
    out.push({
      kind: 'componentWindowGroup',
      key: `cw:${wkey}`,
      windowId,
      windowTitleFromPayload: title,
      componentCount: rows.length,
      timestampIso: maxUpdatedAtIso(rows),
    });
  }
  return out;
}

export function buildPullReviewListItems(payload: StagedPullPayload): PullReviewListItem[] {
  const items: PullReviewListItem[] = [];
  for (const tableName of SYNC_TABLE_ORDER) {
    if (CLOUD_SYNC_UI_HIDDEN_ENTITY_TABLES.has(tableName)) continue;
    if (tableName === 'components') continue;
    const rows = payload.upsertsByTable[tableName];
    if (!rows?.length) continue;
    const typeLabel = getSyncEntityTypeLabelOne(tableName);
    for (const row of rows) {
      const r = row as Record<string, unknown>;
      const id = typeof r.id === 'string' ? r.id : '';
      items.push({
        kind: 'upsert',
        key: `u:${tableName}:${id}`,
        tableName,
        typeLabel,
        displayName: pickOptionalRowDisplayName(r),
        timestampIso: rowUpdatedAtIso(r),
      });
    }
  }

  items.push(...buildComponentWindowGroupItems(payload));
  for (const d of payload.deletes) {
    if (CLOUD_SYNC_UI_HIDDEN_ENTITY_TABLES.has(d.tableName)) continue;
    items.push({
      kind: 'delete',
      key: `d:${d.tableName}:${d.entityId}`,
      tableName: d.tableName,
      typeLabel: getSyncEntityTypeLabelOne(d.tableName),
      entityId: d.entityId,
      timestampIso: d.deletedAt ?? null,
    });
  }
  items.sort((a, b) => {
    const ta = a.timestampIso ?? '';
    const tb = b.timestampIso ?? '';
    if (ta !== tb) return tb.localeCompare(ta);
    return a.key.localeCompare(b.key);
  });
  return items;
}
