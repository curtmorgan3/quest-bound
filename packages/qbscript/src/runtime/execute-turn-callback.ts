import { persistScriptLogs } from '@/lib/compass-logic/script-logs';
import type { DB } from '@/stores/db/hooks/types';
import type {
  Attribute,
  Chart,
  Item,
  PromptFn,
  PromptInputFn,
  PromptMultipleFn,
  RollFn,
  RollSplitFn,
  SceneTurnCallback,
  SelectCharacterFn,
  SelectCharactersFn,
  ScriptError,
} from '@quest-bound/types';
import { Evaluator } from '../interpreter/evaluator';
import { Lexer } from '../interpreter/lexer';
import { Parser } from '../interpreter/parser';
import { CampaignSceneAccessor } from './accessors/campaign-scene-accessor';
import type { CharacterAccessor } from './accessors/character-accessor';
import type { OwnerAccessor } from './accessors/owner-accessor';
import { RulesetAccessor } from './accessors/ruleset-accessor';
import type { ScriptGameLogEntry } from './script-game-log';

type AnyCharacterAccessor = CharacterAccessor | OwnerAccessor;

const TURN_CALLBACK_CONTEXT = 'turn_callback';

export interface TurnCallbackResult {
  announceMessages: string[];
  logMessages: any[][];
  gameLogTimeline?: ScriptGameLogEntry[];
}

/**
 * Execute a single turn callback's block in the stored context (Owner, Scene, Ruleset).
 * Runs the block in a child scope so variable assignments cannot overwrite Scene/Owner/Ruleset.
 * Re-injects any character variables captured at registration time (capturedCharacterIds) so
 * that loop variables like `targ` are available inside the deferred block.
 * Persists script log() output and reports errors to scriptErrors using stored scriptId and rulesetId.
 * Catches errors and does not throw. Returns announce/log messages so the caller can merge them into the script result.
 */
export async function executeTurnCallback(
  db: DB,
  callback: SceneTurnCallback,
  sceneAccessor: CampaignSceneAccessor,
  getCharacterAccessorById: (characterId: string) => Promise<AnyCharacterAccessor | null>,
  rulesetId: string,
  roll?: RollFn,
  rollSplit?: RollSplitFn,
  prompt?: PromptFn,
  promptMultiple?: PromptMultipleFn,
  promptInput?: PromptInputFn,
  selectCharacter?: SelectCharacterFn,
  selectCharacters?: SelectCharactersFn,
  campaignId?: string | null,
): Promise<TurnCallbackResult> {
  let evaluator: Evaluator | null = null;
  try {
    const attributes = (await db.attributes
      .where('rulesetId')
      .equals(rulesetId)
      .toArray()) as Attribute[];
    const charts = (await db.charts.where('rulesetId').equals(rulesetId).toArray()) as Chart[];
    const items = (await db.items.where('rulesetId').equals(rulesetId).toArray()) as Item[];

    const attributesCache = new Map(attributes.map((a) => [a.id, a]));
    const chartsCache = new Map(charts.map((c) => [c.id, c]));
    const itemsCache = new Map(items.map((i) => [i.id, i]));

    const ruleset = new RulesetAccessor(rulesetId, attributesCache, chartsCache, itemsCache);

    const owner = callback.ownerId ? await getCharacterAccessorById(callback.ownerId) : null;

    const selectCharacterHost = selectCharacter
      ? async (title?: string, description?: string): Promise<any | null> => {
          const rawId = await selectCharacter(title, description);
          if (!rawId) return null;
          return getCharacterAccessorById(String(rawId));
        }
      : undefined;

    const selectCharactersHost = selectCharacters
      ? async (title?: string, description?: string): Promise<any[]> => {
          const rawIds = await selectCharacters(title, description);
          const results: AnyCharacterAccessor[] = [];
          for (const rawId of rawIds ?? []) {
            const accessor = await getCharacterAccessorById(String(rawId));
            if (accessor) results.push(accessor);
          }
          return results;
        }
      : undefined;

    evaluator = new Evaluator({
      roll,
      rollSplit,
      prompt,
      promptMultiple,
      promptInput,
      selectCharacter: selectCharacterHost,
      selectCharacters: selectCharactersHost,
      enableScriptGameLogRolls: roll != null,
    });
    evaluator.globalEnv.define('Scene', sceneAccessor);
    evaluator.globalEnv.define('Ruleset', ruleset);
    evaluator.globalEnv.define('__scriptId', callback.scriptId);
    if (owner) {
      evaluator.globalEnv.define('Owner', owner);
    }

    // Re-inject primitive values captured from the outer script scope at registration time.
    // These are injected first so character accessors (below) take precedence on name collision.
    if (callback.capturedValues) {
      for (const [varName, value] of Object.entries(callback.capturedValues)) {
        evaluator.globalEnv.define(varName, value);
      }
    }

    // Re-inject character variables captured from the outer script scope at registration time.
    // This makes loop variables like `targ` available inside the deferred block.
    if (callback.capturedCharacterIds) {
      for (const [varName, characterId] of Object.entries(callback.capturedCharacterIds)) {
        const accessor = await getCharacterAccessorById(characterId);
        if (accessor) {
          evaluator.globalEnv.define(varName, accessor);
        }
      }
    }

    const tokens = new Lexer(callback.blockSource).tokenize();
    const program = new Parser(tokens).parse();
    await evaluator.runBlockInNewScope(program.statements);

    const announceMessages = evaluator.getAnnounceMessages();
    const logMessages = evaluator.getLogMessages();
    const gameLogTimeline = evaluator.getScriptGameLog();

    // Dispatch announce messages so UI toasts fire when running in main thread (e.g. tests)
    if (typeof window !== 'undefined') {
      for (const message of announceMessages) {
        window.dispatchEvent(new CustomEvent('qbscript:announce', { detail: { message } }));
      }
    }

    if (logMessages.length > 0 || gameLogTimeline.length > 0) {
      await persistScriptLogs(db, {
        rulesetId: callback.rulesetId,
        scriptId: callback.scriptId,
        characterId: callback.ownerId,
        gameLogTimeline,
        logMessages,
        context: TURN_CALLBACK_CONTEXT,
        campaignId: campaignId ?? null,
      });
    }

    return { announceMessages, logMessages, gameLogTimeline };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? (err.stack ?? null) : null;
    console.warn('[executeTurnCallback]', callback.scriptId, callback.rulesetId, err);

    // Persist any log() messages that were emitted before the error so they are not lost.
    const partialLogMessages = evaluator?.getLogMessages() ?? [];
    const partialTimeline = evaluator?.getScriptGameLog() ?? [];
    if (partialLogMessages.length > 0 || partialTimeline.length > 0) {
      try {
        await persistScriptLogs(db, {
          rulesetId: callback.rulesetId,
          scriptId: callback.scriptId,
          characterId: callback.ownerId,
          gameLogTimeline: partialTimeline,
          logMessages: partialLogMessages,
          context: TURN_CALLBACK_CONTEXT,
          campaignId: campaignId ?? null,
        });
      } catch (logPersistErr) {
        console.warn('[executeTurnCallback] Failed to persist partial log messages', logPersistErr);
      }
    }

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
    return {
      announceMessages: evaluator?.getAnnounceMessages() ?? [],
      logMessages: partialLogMessages,
      gameLogTimeline: partialTimeline,
    };
  }
}
