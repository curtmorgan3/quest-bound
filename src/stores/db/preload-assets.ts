import type { Campaign, Character, Ruleset } from '@/types';
import { db } from './db';
import { memoizedAssets } from './memoization-cache';

/**
 * Loads the given asset IDs from the assets table into the memoization cache
 * so that asset-injector-middleware can inject them synchronously on subsequent reads.
 * Skips IDs already cached. Runs in a separate transaction (fire-and-forget).
 */
export async function preloadAssetIds(ids: string[]): Promise<void> {
  const toLoad = ids.filter((id) => id && memoizedAssets[id] === undefined);
  if (toLoad.length === 0) return;

  const rows = await db.assets.bulkGet(toLoad);
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row?.id != null && row?.data != null) {
      memoizedAssets[row.id] = row.data as string;
    }
  }
}

/** Collects asset IDs from a ruleset (cover + landing CTA images). */
export function getRulesetAssetIds(r: Ruleset | null | undefined): string[] {
  if (!r) return [];
  const ids: string[] = [];
  if (r.assetId) ids.push(r.assetId);
  if (r.charactersCtaAssetId) ids.push(r.charactersCtaAssetId);
  if (r.campaignsCtaAssetId) ids.push(r.campaignsCtaAssetId);
  return ids;
}

/** Collects asset IDs from multiple rulesets. */
export function getRulesetsAssetIds(rulesets: (Ruleset | null | undefined)[]): string[] {
  const set = new Set<string>();
  for (const r of rulesets) {
    for (const id of getRulesetAssetIds(r)) set.add(id);
  }
  return Array.from(set);
}

/** Collects asset ID from a character. */
export function getCharacterAssetIds(c: Character | null | undefined): string[] {
  return c?.assetId ? [c.assetId] : [];
}

/** Collects asset IDs from multiple characters. */
export function getCharactersAssetIds(characters: (Character | null | undefined)[]): string[] {
  const ids: string[] = [];
  for (const c of characters) {
    if (c?.assetId) ids.push(c.assetId);
  }
  return ids;
}

/** Collects asset ID from a campaign. */
export function getCampaignAssetIds(c: Campaign | null | undefined): string[] {
  return c?.assetId ? [c.assetId] : [];
}

/** Collects asset IDs from multiple campaigns. */
export function getCampaignsAssetIds(campaigns: (Campaign | null | undefined)[]): string[] {
  const ids: string[] = [];
  for (const c of campaigns) {
    if (c?.assetId) ids.push(c.assetId);
  }
  return ids;
}
