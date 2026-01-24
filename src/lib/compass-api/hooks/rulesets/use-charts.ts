import { useErrorHandler } from '@/hooks/use-error-handler';
import { db } from '@/stores';
import type { Chart } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useActiveRuleset } from './use-active-ruleset';

export const useCharts = () => {
  const { activeRuleset } = useActiveRuleset();
  const { handleError } = useErrorHandler();

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
    try {
      await db.charts.add({
        ...data,
        id: crypto.randomUUID(),
        rulesetId: activeRuleset.id,
        createdAt: now,
        updatedAt: now,
      } as Chart);
    } catch (e) {
      handleError(e as Error, {
        component: 'useCharts/createChart',
        severity: 'medium',
      });
    }
  };

  const updateChart = async (id: string, data: Partial<Chart>) => {
    const now = new Date().toISOString();
    try {
      await db.charts.update(id, {
        ...data,
        updatedAt: now,
      });
    } catch (e) {
      handleError(e as Error, {
        component: 'useCharts/updateChart',
        severity: 'medium',
      });
    }
  };

  const deleteChart = async (id: string) => {
    try {
      await db.charts.delete(id);
    } catch (e) {
      handleError(e as Error, {
        component: 'useCharts/deleteChart',
        severity: 'medium',
      });
    }
  };

  return { charts: charts ?? [], createChart, updateChart, deleteChart };
};
