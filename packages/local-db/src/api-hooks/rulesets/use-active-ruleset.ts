import { useCampaign } from '../campaigns/use-campaign';
import { db } from '../../db';
import { useArchetypeStore } from '@/stores/archetype-store';
import type { Archetype } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

export const useActiveRuleset = () => {
  const { rulesetId: rulesetIdFromParams, characterId, campaignId } = useParams();
  const [searchParams] = useSearchParams();
  const rulesetIdFromQuery = searchParams.get('rulesetId');
  const rulesetId = rulesetIdFromParams ?? rulesetIdFromQuery;
  const getSelectedArchetype = useArchetypeStore((s) => s.getSelectedArchetype);
  const campaign = useCampaign(campaignId);

  const lastEditedRulesetId = localStorage.getItem('qb.lastEditedRulesetId');

  const _rulesets = useLiveQuery(() => db.rulesets.toArray(), []);
  // Local users: all rulesets in DB. Synced users: scoped by cloud (sync layer).
  const rulesets = _rulesets ?? [];
  const characters = useLiveQuery(() => db.characters.toArray(), [characterId, rulesets]);

  const character = useMemo(() => characters?.find((c) => c.id === characterId), [characters]);

  const rulesetIdToUse =
    rulesetId && rulesetId !== 'undefined'
      ? rulesetId
      : (campaign?.rulesetId ?? (character ? character.rulesetId : lastEditedRulesetId));

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

  const testCharacter = useMemo(
    () =>
      effectiveArchetype?.testCharacterId
        ? characters?.find((c) => c.id === effectiveArchetype.testCharacterId)
        : null,
    [characters, effectiveArchetype?.testCharacterId],
  );

  return {
    activeRuleset,
    testCharacter,
    isRulesetsLoading: _rulesets === undefined,
  };
};
