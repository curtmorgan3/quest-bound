import type { DBCore, Middleware } from 'dexie';
import { notifyOtherTabs } from './cross-tab-db';

/**
 * After any table mutate (add/put/delete), broadcast to other tabs so they can
 * refresh their live queries. This tab's Dexie already sees the write; other
 * tabs need the signal to re-run queries.
 */
export const crossTabNotifyMiddleware: Middleware<DBCore> = {
  stack: 'dbcore',
  name: 'CrossTabNotify',
  create(downlevelDatabase) {
    return {
      ...downlevelDatabase,
      table(tableName) {
        const downlevelTable = downlevelDatabase.table(tableName);
        return {
          ...downlevelTable,
          mutate(req) {
            return downlevelTable.mutate(req).then((res) => {
              notifyOtherTabs(tableName);
              return res;
            });
          },
        };
      },
    };
  },
};
