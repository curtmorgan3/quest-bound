import type { DB } from '@/stores/db/hooks/types';
import type {
  Attribute,
  Chart,
  Item,
  RollFn,
  SceneTurnCallback,
} from '@/types';
import type { CharacterAccessor } from './accessors/character-accessor';
import type { OwnerAccessor } from './accessors/owner-accessor';
import { CampaignSceneAccessor } from './accessors/campaign-scene-accessor';
import { RulesetAccessor } from './accessors/ruleset-accessor';
import { Evaluator } from '../interpreter/evaluator';
import { Lexer } from '../interpreter/lexer';
import { Parser } from '../interpreter/parser';

type AnyCharacterAccessor = CharacterAccessor | OwnerAccessor;

/**
 * Execute a single turn callback's block in the stored context (Owner, Scene, Ruleset).
 * Catches errors and logs them; does not throw.
 */
export async function executeTurnCallback(
  db: DB,
  callback: SceneTurnCallback,
  sceneAccessor: CampaignSceneAccessor,
  getCharacterAccessorById: (characterId: string) => Promise<AnyCharacterAccessor | null>,
  rulesetId: string,
  roll?: RollFn,
): Promise<void> {
  try {
    const attributes = (await db.attributes.where('rulesetId').equals(rulesetId).toArray()) as Attribute[];
    const charts = (await db.charts.where('rulesetId').equals(rulesetId).toArray()) as Chart[];
    const items = (await db.items.where('rulesetId').equals(rulesetId).toArray()) as Item[];

    const attributesCache = new Map(attributes.map((a) => [a.id, a]));
    const chartsCache = new Map(charts.map((c) => [c.id, c]));
    const itemsCache = new Map(items.map((i) => [i.id, i]));

    const ruleset = new RulesetAccessor(rulesetId, attributesCache, chartsCache, itemsCache);

    const owner = callback.ownerId
      ? await getCharacterAccessorById(callback.ownerId)
      : null;

    const evaluator = new Evaluator({ roll });
    evaluator.globalEnv.define('Scene', sceneAccessor);
    evaluator.globalEnv.define('Ruleset', ruleset);
    if (owner) {
      evaluator.globalEnv.define('Owner', owner);
    }

    const tokens = new Lexer(callback.blockSource).tokenize();
    const program = new Parser(tokens).parse();
    await evaluator.runBlock(program.statements);
  } catch (err) {
    console.warn('[executeTurnCallback]', callback.scriptId, err);
  }
}
