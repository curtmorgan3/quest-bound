import type Dexie from 'dexie';
import type { DBCore, Middleware } from 'dexie';

const ASSOCIATED_TABLES = [
  'attributes',
  'actions',
  'items',
  'charts',
  'documents',
  'pages',
  'windows',
  'rulesetWindows',
  'components',
  'composites',
  'compositeVariants',
  'archetypes',
  'characters',
  'assets',
  'fonts',
  'diceRolls',
  'customProperties',
  'campaigns',
  'scripts',
  'scriptErrors',
  'scriptLogs',
  'dependencyGraphNodes',
];

export function createRulesetCascadeDeleteMiddleware(getDb: () => Dexie): Middleware<DBCore> {
  return {
    stack: 'dbcore',
    name: 'RulesetCascadeDelete',
    create(downlevelDatabase) {
      return {
        ...downlevelDatabase,
        table(tableName) {
          const downlevelTable = downlevelDatabase.table(tableName);

          if (tableName !== 'rulesets') {
            return downlevelTable;
          }

          return {
            ...downlevelTable,
            mutate(req) {
              if (req.type !== 'delete') {
                return downlevelTable.mutate(req);
              }

              const rulesetIds = req.keys as string[];

              return downlevelTable.mutate(req).then((res) => {
                // Schedule cascade deletes outside the current transaction scope.
                // setTimeout breaks out of Dexie's PSD zone so each table delete
                // creates its own properly-scoped transaction.
                setTimeout(async () => {
                  try {
                    const db = getDb();
                    for (const rulesetId of rulesetIds) {
                      await Promise.all(
                        ASSOCIATED_TABLES.map((name) =>
                          db.table(name).where('rulesetId').equals(rulesetId).delete(),
                        ),
                      );
                    }
                  } catch (error) {
                    console.error('Failed to cascade-delete ruleset entities:', error);
                  }
                }, 0);
                return res;
              });
            },
          };
        },
      };
    },
  };
}
