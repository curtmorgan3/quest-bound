import { registerActionDbHooks } from './action-hooks';
import { registerAssetDbHooks } from './asset-hooks';
import { registerAttributeDbHooks } from './attribute-hooks';
import { registerCharacterDbHooks } from './character-hooks';
import { registerChartDbHooks } from './chart-hooks';
import { registerComponentDbHooks } from './component-hooks';
import { registerDocumentDbHooks } from './document-hooks';
import { registerItemDbHooks } from './item-hooks';
import { registerInventoryDbHooks } from './inventory-hooks';
import { registerRulesetDbHooks } from './ruleset-hooks';
import type { DB } from './types';

export function registerDbHooks(db: DB) {
  registerRulesetDbHooks(db);
  registerChartDbHooks(db);
  registerAttributeDbHooks(db);
  registerCharacterDbHooks(db);
  registerItemDbHooks(db);
  registerInventoryDbHooks(db);
  registerActionDbHooks(db);
  registerDocumentDbHooks(db);
  registerAssetDbHooks(db);
  registerComponentDbHooks(db);
}
