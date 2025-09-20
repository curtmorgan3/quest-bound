import { db } from '@/stores';
import type { Chart } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRulesets } from './use-rulesets';

export const useCharts = () => {
  const { activeRuleset } = useRulesets();

  const charts = useLiveQuery(
    () =>
      db.charts
        .where('rulesetId')
        .equals(activeRuleset?.id ?? 0)
        .toArray(),
    [activeRuleset],
  );

  const createChart = async (data: Partial<Chart>) => {
    if (!activeRuleset) return;
    const now = new Date().toISOString();
    await db.charts.add({
      ...data,
      id: crypto.randomUUID(),
      rulesetId: activeRuleset.id,
      createdAt: now,
      updatedAt: now,
    } as Chart);
  };

  const updateChart = async (id: string, data: Partial<Chart>) => {
    const now = new Date().toISOString();
    await db.charts.update(id, {
      ...data,
      updatedAt: now,
    });
  };

  const deleteChart = async (id: string) => {
    await db.charts.delete(id);
  };

  return { charts: charts ?? [], createChart, updateChart, deleteChart };
};
