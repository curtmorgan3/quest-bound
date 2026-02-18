import { useErrorHandler } from '@/hooks/use-error-handler';
import { db, useCurrentUser } from '@/stores';
import type { DiceRoll } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useActiveRuleset } from '../rulesets/use-active-ruleset';

export const useDiceRolls = () => {
  const { activeRuleset } = useActiveRuleset();
  const { currentUser } = useCurrentUser();
  const { handleError } = useErrorHandler();

  const diceRolls = useLiveQuery(
    () =>
      db.diceRolls
        .where('rulesetId')
        .equals(activeRuleset?.id ?? 0)
        .and((roll) => roll.userId === currentUser?.id)
        .toArray(),
    [activeRuleset, currentUser],
  );

  const createDiceRoll = async (data: Partial<DiceRoll>) => {
    if (!activeRuleset || !currentUser) return;
    const now = new Date().toISOString();
    try {
      await db.diceRolls.add({
        ...data,
        id: crypto.randomUUID(),
        rulesetId: activeRuleset.id,
        userId: currentUser.id,
        createdAt: now,
        updatedAt: now,
      } as DiceRoll);
    } catch (e) {
      handleError(e as Error, {
        component: 'useDiceRolls/createDiceRoll',
        severity: 'medium',
      });
    }
  };

  const updateDiceRoll = async (id: string, data: Partial<DiceRoll>) => {
    const now = new Date().toISOString();
    try {
      await db.diceRolls.update(id, {
        ...data,
        updatedAt: now,
      });
    } catch (e) {
      handleError(e as Error, {
        component: 'useDiceRolls/updateDiceRoll',
        severity: 'medium',
      });
    }
  };

  const deleteDiceRoll = async (id: string) => {
    try {
      await db.diceRolls.delete(id);
    } catch (e) {
      handleError(e as Error, {
        component: 'useDiceRolls/deleteDiceRoll',
        severity: 'medium',
      });
    }
  };

  return { diceRolls: diceRolls ?? [], createDiceRoll, updateDiceRoll, deleteDiceRoll };
};
