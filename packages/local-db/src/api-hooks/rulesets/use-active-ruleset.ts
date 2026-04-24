import { useCampaign } from '../campaigns/use-campaign';
import { db } from '../../db';
import { useArchetypeStore } from '@/stores/archetype-store';
import type { Archetype } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

/**
 * Read `rulesetId` from the query-string without subscribing to every search-param change.
 * The value is captured on first render and updated only when the route key changes
 * (i.e. an actual route transition, not just a `?pageId=` swap).
 */
function useRulesetIdFromQuery(routeKey: string | undefined): string | null {
  const ref = useRef<string | null>(null);
  const prevKeyRef = useRef(routeKey);
  if (ref.current === null || prevKeyRef.current !== routeKey) {
    ref.current = new URLSearchParams(window.location.search).get('rulesetId');
    prevKeyRef.current = routeKey;
  }
  return ref.current;
}

/**
 * Resolves a character's `rulesetId` without subscribing to every field change on the
 * character row.  `rulesetId` never changes for a given character, so we fetch once when
 * `characterId` changes and cache the result.  This avoids triggering re-renders of every
 * `useActiveRuleset` consumer when unrelated character fields (e.g. `lastViewedPageId`)
 * are written.
 */
function useCharacterRulesetId(characterId: string | undefined): string | undefined {
  const [rulesetId, setRulesetId] = useState<string | undefined>(undefined);
  const prevCharIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!characterId) {
      setRulesetId(undefined);
      prevCharIdRef.current = undefined;
      return;
    }
    if (characterId === prevCharIdRef.current) return;
    prevCharIdRef.current = characterId;
    db.characters.get(characterId).then((c) => {
      setRulesetId(c?.rulesetId);
    });
  }, [characterId]);

  return rulesetId;
}

export const useActiveRuleset = () => {
  const { rulesetId: rulesetIdFromParams, characterId, campaignId } = useParams();
  const rulesetIdFromQuery = useRulesetIdFromQuery(rulesetIdFromParams ?? campaignId ?? characterId);
  const rulesetId = rulesetIdFromParams ?? rulesetIdFromQuery;
  const getSelectedArchetype = useArchetypeStore((s) => s.getSelectedArchetype);
  const campaign = useCampaign(campaignId);

  const lastEditedRulesetId = localStorage.getItem('qb.lastEditedRulesetId');

  const _rulesets = useLiveQuery(() => db.rulesets.toArray(), []);
  const rulesets = _rulesets ?? [];

  const characterRulesetId = useCharacterRulesetId(characterId);

  const rulesetIdToUse =
    rulesetId && rulesetId !== 'undefined'
      ? rulesetId
      : (campaign?.rulesetId ?? (characterRulesetId ? characterRulesetId : lastEditedRulesetId));

  const activeRuleset = rulesetIdToUse ? rulesets?.find((r) => r.id === rulesetIdToUse) : null;

  const archetypes: Archetype[] =
    useLiveQuery(
      () =>
        activeRuleset?.id
          ? db.archetypes.where('rulesetId').equals(activeRuleset.id).sortBy('loadOrder')
          : Promise.resolve([] as Archetype[]),
      [activeRuleset?.id],
    ) ?? [];

  const effectiveArchetype = useMemo(() => {
    if (!archetypes.length) return null;
    const selectedId = activeRuleset?.id ? getSelectedArchetype(activeRuleset.id) : null;
    const selected = selectedId ? archetypes.find((a) => a.id === selectedId) : null;
    return selected ?? archetypes.find((a) => a.isDefault) ?? archetypes[0];
  }, [archetypes, activeRuleset?.id, getSelectedArchetype]);

  const testCharacter = useLiveQuery(
    async () => {
      if (!effectiveArchetype?.testCharacterId) return null;
      return (await db.characters.get(effectiveArchetype.testCharacterId)) ?? null;
    },
    [effectiveArchetype?.testCharacterId],
  );

  return {
    activeRuleset,
    testCharacter: testCharacter ?? null,
    isRulesetsLoading: _rulesets === undefined,
  };
};
