import type { Archetype } from '@/types';
import { db, useArchetypeStore, useCurrentUser } from '@/stores';
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

export const useActiveRuleset = () => {
  const { currentUser } = useCurrentUser();
  const { rulesetId, characterId } = useParams();
  const getSelectedArchetype = useArchetypeStore((s) => s.getSelectedArchetype);

  const lastEditedRulesetId = localStorage.getItem('qb.lastEditedRulesetId');

  const _rulesets = useLiveQuery(() => db.rulesets.toArray(), []);
  const rulesets = _rulesets?.filter((r) => currentUser?.rulesets?.includes(r.id)) || [];
  const characters = useLiveQuery(() => db.characters.toArray(), [characterId]);

  const character = useMemo(() => characters?.find((c) => c.id === characterId), [characters]);

  const rulesetIdToUse =
    rulesetId && rulesetId !== 'undefined'
      ? rulesetId
      : character
        ? character.rulesetId
        : lastEditedRulesetId;

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
  };
};
