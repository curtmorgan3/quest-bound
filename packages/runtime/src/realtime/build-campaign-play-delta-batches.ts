import type { CampaignRealtimeBulkPutBatchV1 } from '@/lib/campaign-play/realtime/campaign-realtime-envelopes';
import { expandCampaignBatchesForRealtimeLimit } from '@/lib/campaign-play/realtime/build-campaign-action-result-batches';
import { isNotSoftDeleted } from '@/lib/data/soft-delete';
import type { DB } from '@/stores/db/hooks/types';

function rowRecord<T extends object>(row: T): Record<string, unknown> {
  return { ...row } as Record<string, unknown>;
}

function rowUpdatedSinceScriptStart(updatedAt: string, startedAtMs: number): boolean {
  return new Date(updatedAt).getTime() + 500 >= startedAtMs;
}

/**
 * Character IDs to include in `action_result` Dexie deltas so joiners who own other PCs/NPCs
 * receive attribute/inventory updates when a script mutates them (not only the acting character).
 *
 * Combines: acting character, owners of `modifiedAttributeIds`, and roster members whose
 * attributes or inventory rows changed since `startedAtMs` (same window as {@link buildCampaignPlayDeltaBatches}).
 */
export async function resolveCampaignCharacterIdsForActionResultDelta(
  database: DB,
  campaignId: string,
  options: {
    actingCharacterId: string;
    startedAtMs: number;
    modifiedAttributeIds?: string[];
  },
): Promise<string[]> {
  const rosterRows = (await database.campaignCharacters.where('campaignId').equals(campaignId).toArray()).filter(
    isNotSoftDeleted,
  );
  const roster = new Set(rosterRows.map((r) => r.characterId));

  const ids = new Set<string>();
  const acting = options.actingCharacterId.trim();
  if (acting) ids.add(acting);

  for (const attrId of options.modifiedAttributeIds ?? []) {
    const row = await database.characterAttributes.get(attrId);
    if (row && roster.has(row.characterId)) {
      ids.add(row.characterId);
    }
  }

  for (const cid of roster) {
    const attrs = await database.characterAttributes.where('characterId').equals(cid).toArray();
    if (attrs.some((r) => rowUpdatedSinceScriptStart(r.updatedAt, options.startedAtMs))) {
      ids.add(cid);
      continue;
    }
    const inv = await database.inventoryItems.where('characterId').equals(cid).toArray();
    if (inv.some((r) => rowUpdatedSinceScriptStart(r.updatedAt, options.startedAtMs))) {
      ids.add(cid);
    }
  }

  return [...ids];
}

/** Merge batches that share the same Dexie table name (single bulkPut per table). */
export function mergeRealtimeBatchesByTable(
  batches: CampaignRealtimeBulkPutBatchV1[],
): CampaignRealtimeBulkPutBatchV1[] {
  const map = new Map<string, Record<string, unknown>[]>();
  for (const b of batches) {
    const cur = map.get(b.table) ?? [];
    cur.push(...b.rows);
    map.set(b.table, cur);
  }
  return Array.from(map.entries()).map(([table, rows]) => ({ table, rows }));
}

/**
 * Snapshot rows touched on the host since `startedAtMs` for the given characters + matching script logs.
 * Used after action scripts or manual+reactive processing (Phase 2.4–2.5).
 */
export async function buildCampaignPlayDeltaBatches(
  database: DB,
  campaignId: string,
  characterIds: string[],
  startedAtMs: number,
): Promise<CampaignRealtimeBulkPutBatchV1[]> {
  const idSet = new Set(characterIds.filter(Boolean));
  const batches: CampaignRealtimeBulkPutBatchV1[] = [];

  for (const cid of idSet) {
    const attrs = await database.characterAttributes.where('characterId').equals(cid).toArray();
    const attrsChanged = attrs.filter((r) => rowUpdatedSinceScriptStart(r.updatedAt, startedAtMs));
    if (attrsChanged.length > 0) {
      batches.push({
        table: 'characterAttributes',
        rows: attrsChanged.map((r) => rowRecord(r)),
      });
    }

    const inv = await database.inventoryItems.where('characterId').equals(cid).toArray();
    const invChanged = inv.filter((r) => rowUpdatedSinceScriptStart(r.updatedAt, startedAtMs));
    if (invChanged.length > 0) {
      batches.push({
        table: 'inventoryItems',
        rows: invChanged.map((r) => rowRecord(r)),
      });
    }
  }

  const logs = await database.scriptLogs.where('campaignId').equals(campaignId).toArray();
  const logsChanged = logs.filter(
    (r) =>
      rowUpdatedSinceScriptStart(r.updatedAt, startedAtMs) &&
      (r.characterId == null || idSet.has(r.characterId)),
  );
  if (logsChanged.length > 0) {
    batches.push({
      table: 'scriptLogs',
      rows: logsChanged.map((r) => rowRecord(r)),
    });
  }

  return mergeRealtimeBatchesByTable(batches);
}

export function expandMergedCampaignDeltaBatches(
  batches: CampaignRealtimeBulkPutBatchV1[],
): CampaignRealtimeBulkPutBatchV1[] {
  return expandCampaignBatchesForRealtimeLimit(batches);
}
