import type { DB } from '@/stores/db/hooks/types';
import type {
  Attribute,
  Chart,
  Item,
  RollFn,
  SceneTurnCallback,
  ScriptError,
} from '@/types';
import { persistScriptLogs } from '@/lib/compass-logic/script-logs';
import type { CharacterAccessor } from './accessors/character-accessor';
import type { OwnerAccessor } from './accessors/owner-accessor';
import { CampaignSceneAccessor } from './accessors/campaign-scene-accessor';
import { RulesetAccessor } from './accessors/ruleset-accessor';
import { Evaluator } from '../interpreter/evaluator';
import { Lexer } from '../interpreter/lexer';
import { Parser } from '../interpreter/parser';

type AnyCharacterAccessor = CharacterAccessor | OwnerAccessor;

const TURN_CALLBACK_CONTEXT = 'turn_callback';

/**
 * Execute a single turn callback's block in the stored context (Owner, Scene, Ruleset).
 * Persists script log() output and reports errors to scriptErrors using stored scriptId and rulesetId.
 * Catches errors and does not throw.
 */
export async function executeTurnCallback(
  db: DB,
  callback: SceneTurnCallback,
  sceneAccessor: CampaignSceneAccessor,
  getCharacterAccessorById: (characterId: string) => Promise<AnyCharacterAccessor | null>,
  rulesetId: string,
  roll?: RollFn,
  campaignId?: string | null,
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

    // Dispatch announce messages so UI toasts fire (same event as worker script execution)
    const announceMessages = evaluator.getAnnounceMessages();
    if (typeof window !== 'undefined') {
      for (const message of announceMessages) {
        window.dispatchEvent(
          new CustomEvent('qbscript:announce', { detail: { message } }),
        );
      }
    }

    const logMessages = evaluator.getLogMessages();
    if (logMessages.length > 0) {
      await persistScriptLogs(db, {
        rulesetId: callback.rulesetId,
        scriptId: callback.scriptId,
        characterId: callback.ownerId,
        logMessages,
        context: TURN_CALLBACK_CONTEXT,
        campaignId: campaignId ?? null,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack ?? null : null;
    console.warn('[executeTurnCallback]', callback.scriptId, callback.rulesetId, err);
    const now = new Date().toISOString();
    const scriptError: ScriptError = {
      id: crypto.randomUUID(),
      rulesetId: callback.rulesetId,
      scriptId: callback.scriptId,
      characterId: callback.ownerId,
      errorMessage: message,
      lineNumber: null,
      stackTrace: stack,
      context: TURN_CALLBACK_CONTEXT,
      timestamp: Date.now(),
      createdAt: now,
      updatedAt: now,
    };
    try {
      await db.scriptErrors.add(scriptError);
    } catch (persistErr) {
      console.warn('[executeTurnCallback] Failed to persist script error', persistErr);
    }
  }
}
