import { db, useCurrentUser } from '@/stores';
import { useLiveQuery } from 'dexie-react-hooks';
import { useParams } from 'react-router-dom';

export const useActiveRuleset = () => {
  const { currentUser } = useCurrentUser();
  const { rulesetId, characterId } = useParams();

  const lastEditedRulesetId = localStorage.getItem('qb.lastEditedRulesetId');

  const _rulesets = useLiveQuery(() => db.rulesets.toArray(), []);
  const rulesets = _rulesets?.filter((r) => currentUser?.rulesets?.includes(r.id)) || [];
  const characters = useLiveQuery(
    () =>
      db.characters
        .where('userId')
        .equals(characterId ?? 0)
        .toArray(),
    [characterId],
  );

  const character = characters?.find((c) => c.id === characterId);

  const rulesetIdToUse =
    rulesetId && rulesetId !== 'undefined'
      ? rulesetId
      : character
        ? character.rulesetId
        : lastEditedRulesetId;

  const activeRuleset = rulesetIdToUse ? rulesets?.find((r) => r.id === rulesetIdToUse) : null;

  return {
    activeRuleset,
  };
};
