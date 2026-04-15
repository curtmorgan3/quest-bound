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
import type { CustomEventListenerRecord } from './custom-event-registry';

type AnyCharacterAccessor = CharacterAccessor | OwnerAccessor;

const CUSTOM_EVENT_CONTEXT = 'custom_event';

export interface CustomEventListenerResult {
  announceMessages: string[];
  logMessages: any[][];
  gameLogTimeline?: ScriptGameLogEntry[];
}

/**
 * Run one `on(...)` block with `payload` injected. Mirrors executeTurnCallback; Scene may be null.
 */
export async function executeCustomEventListener(
  db: DB,
  callback: CustomEventListenerRecord,
  payload: unknown,
  sceneAccessor: CampaignSceneAccessor | null,
  getCharacterAccessorById: (characterId: string) => Promise<AnyCharacterAccessor | null>,
  roll?: RollFn,
  rollSplit?: RollSplitFn,
  prompt?: PromptFn,
  promptMultiple?: PromptMultipleFn,
  promptInput?: PromptInputFn,
  selectCharacter?: SelectCharacterFn,
  selectCharacters?: SelectCharactersFn,
  campaignId?: string | null,
  customEventEmit?: (eventName: string, payload: unknown) => Promise<void>,
): Promise<CustomEventListenerResult> {
  let evaluator: Evaluator | null = null;
  try {
    const attributes = (await db.attributes
      .where('rulesetId')
      .equals(callback.rulesetId)
      .toArray()) as Attribute[];
    const charts = (await db.charts.where('rulesetId').equals(callback.rulesetId).toArray()) as Chart[];
    const items = (await db.items.where('rulesetId').equals(callback.rulesetId).toArray()) as Item[];

    const attributesCache = new Map(attributes.map((a) => [a.id, a]));
    const chartsCache = new Map(charts.map((c) => [c.id, c]));
    const itemsCache = new Map(items.map((i) => [i.id, i]));

    const ruleset = new RulesetAccessor(callback.rulesetId, attributesCache, chartsCache, itemsCache);

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
      customEventEmit,
      enableScriptGameLogRolls: roll != null,
    });
    evaluator.globalEnv.define('Scene', sceneAccessor);
    evaluator.globalEnv.define('Ruleset', ruleset);
    evaluator.globalEnv.define('__scriptId', callback.scriptId);
    evaluator.globalEnv.define('__rulesetId', callback.rulesetId);
    evaluator.globalEnv.define('payload', payload);
    if (owner) {
      evaluator.globalEnv.define('Owner', owner);
    }

    if (callback.capturedValues) {
      for (const [varName, value] of Object.entries(callback.capturedValues)) {
        evaluator.globalEnv.define(varName, value);
      }
    }

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
        context: CUSTOM_EVENT_CONTEXT,
        campaignId: campaignId ?? null,
      });
    }

    return { announceMessages, logMessages, gameLogTimeline };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? (err.stack ?? null) : null;
    console.warn('[executeCustomEventListener]', callback.scriptId, callback.rulesetId, err);

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
          context: CUSTOM_EVENT_CONTEXT,
          campaignId: campaignId ?? null,
        });
      } catch (logPersistErr) {
        console.warn('[executeCustomEventListener] Failed to persist partial log messages', logPersistErr);
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
      context: CUSTOM_EVENT_CONTEXT,
      timestamp: Date.now(),
      createdAt: now,
      updatedAt: now,
    };
    try {
      await db.scriptErrors.add(scriptError);
    } catch (persistErr) {
      console.warn('[executeCustomEventListener] Failed to persist script error', persistErr);
    }
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(
          new CustomEvent('qbscript:scriptError', {
            detail: {
              message,
              rulesetId: callback.rulesetId,
              scriptId: callback.scriptId,
            },
          }),
        );
      } catch (e) {
        console.warn('[executeCustomEventListener] Failed to dispatch qbscript:scriptError', e);
      }
    }
    return {
      announceMessages: evaluator?.getAnnounceMessages() ?? [],
      logMessages: partialLogMessages,
      gameLogTimeline: partialTimeline,
    };
  }
}
