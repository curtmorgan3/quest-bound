import { memoizedCharts } from '../chart-options-middleware';
import type { DB } from './types';

export function registerChartDbHooks(db: DB) {
  // Keep chart cache in sync when charts are modified
  db.charts.hook('creating', (_primKey, obj) => {
    try {
      memoizedCharts[obj.id] = JSON.parse(obj.data);
    } catch {
      // Invalid JSON, skip
    }
  });

  db.charts.hook('updating', (modifications, primKey) => {
    if ((modifications as any).data !== undefined) {
      try {
        memoizedCharts[primKey as string] = JSON.parse((modifications as any).data);
      } catch {
        delete memoizedCharts[primKey as string];
      }
    }
  });

  db.charts.hook('deleting', (primKey) => {
    delete memoizedCharts[primKey as string];
  });
}
