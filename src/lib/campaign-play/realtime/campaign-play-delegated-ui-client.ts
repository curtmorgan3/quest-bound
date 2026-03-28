import {
  getCampaignPlaySender,
  subscribeCampaignPlayEnvelopes,
} from '@/lib/campaign-play/realtime/campaign-play-realtime-dispatcher';
import type {
  CampaignRealtimeDelegatedUiRequestEnvelopeV1,
  CampaignRealtimeEnvelopeV1,
} from '@/lib/campaign-play/realtime/campaign-realtime-envelopes';
import { CAMPAIGN_REALTIME_PROTOCOL_VERSION } from '@/lib/campaign-play/realtime/campaign-realtime-envelopes';
import { getCurrentRollHandlerForScripts, getCurrentRollSplitHandlerForScripts } from '@/lib/compass-logic/worker/current-roll-handler-ref';
import { useCharacterSelectModalStore } from '@/stores/character-select-modal-store';
import { usePromptModalStore } from '@/stores/prompt-modal-store';
import { defaultScriptDiceRoller, defaultScriptDiceRollerSplit } from '@/utils/dice-utils';
import { toast } from 'sonner';

const queueByCharacterId = new Map<string, CampaignRealtimeDelegatedUiRequestEnvelopeV1[]>();

/** Character ids with a mounted `CharacterPage` (full route or campaign overlay sheet). */
const activeCharacterSheetIds = new Set<string>();

let unsub: (() => void) | null = null;
let activeCampaignId: string | null = null;

export function parseCharacterIdFromAppPathname(pathname: string): string | null {
  const m = pathname.match(/^\/characters\/([^/]+)/);
  return m?.[1] ?? null;
}

/**
 * Path segment the app router matches against (e.g. `/characters/:id`).
 * With {@link HashRouter}, the active route is in `location.hash` (`#/characters/...`);
 * `window.location.pathname` is often just `/`, so delegated UI must read the hash.
 */
export function getCampaignPlayDelegatedUiRoutePath(): string {
  if (typeof window === 'undefined') return '';
  const { hash, pathname } = window.location;
  if (hash.startsWith('#/')) {
    return hash.slice(1).split('?')[0] ?? '';
  }
  if (hash.startsWith('#') && hash.length > 1) {
    const rest = hash.slice(1).split('?')[0] ?? '';
    return rest.startsWith('/') ? rest : `/${rest}`;
  }
  return pathname.split('?')[0] ?? pathname;
}

function surfaceCharacterIdMatchesEnvelope(routePath: string, characterId: string): boolean {
  return parseCharacterIdFromAppPathname(routePath) === characterId;
}

/**
 * Call from `CharacterPage` when it mounts for a real character sheet (route or overlay).
 * Returns cleanup to run on unmount.
 */
export function registerCampaignPlayDelegatedCharacterSurface(characterId: string): () => void {
  activeCharacterSheetIds.add(characterId);
  return () => {
    activeCharacterSheetIds.delete(characterId);
  };
}

function delegatedUiSurfaceIsActive(envelopeCharacterId: string): boolean {
  if (activeCharacterSheetIds.has(envelopeCharacterId)) return true;
  const routePath =
    typeof window !== 'undefined' ? getCampaignPlayDelegatedUiRoutePath() : '';
  return surfaceCharacterIdMatchesEnvelope(routePath, envelopeCharacterId);
}

async function fulfillDelegatedRequest(
  envelope: CampaignRealtimeDelegatedUiRequestEnvelopeV1,
): Promise<void> {
  const send = getCampaignPlaySender(envelope.campaignId);
  if (!send) return;

  const reply = async (result: unknown, error?: { code: string; message: string }) => {
    await send({
      v: CAMPAIGN_REALTIME_PROTOCOL_VERSION,
      kind: 'delegated_ui_response',
      campaignId: envelope.campaignId,
      executionRequestId: envelope.executionRequestId,
      interactionId: envelope.interactionId,
      responseToken: envelope.responseToken,
      ...(error ? { error } : { result }),
    } satisfies CampaignRealtimeEnvelopeV1);
  };

  try {
    const { body } = envelope;
    switch (body.interactionType) {
      case 'roll': {
        const roll =
          getCurrentRollHandlerForScripts() ?? defaultScriptDiceRoller;
        const value = await Promise.resolve(
          roll(body.expression, body.rerollMessage),
        );
        await reply(typeof value === 'number' ? value : Number(value));
        break;
      }
      case 'roll_split': {
        const rollSplit =
          getCurrentRollSplitHandlerForScripts() ?? defaultScriptDiceRollerSplit;
        const value = await Promise.resolve(
          rollSplit(body.expression, body.rerollMessage),
        );
        await reply(Array.isArray(value) ? value : []);
        break;
      }
      case 'prompt': {
        const value = await usePromptModalStore.getState().show(body.message, body.choices);
        await reply(value);
        break;
      }
      case 'prompt_multiple': {
        const value = await usePromptModalStore
          .getState()
          .showMultiple(body.message, body.choices);
        await reply(value);
        break;
      }
      case 'prompt_input': {
        const value = await usePromptModalStore.getState().showInput(body.message);
        await reply(value);
        break;
      }
      case 'select_character': {
        const { characterIds } = await useCharacterSelectModalStore.getState().show({
          mode: 'single',
          title: body.title,
          description: body.description,
          rulesetId: body.rulesetId,
          campaignId: body.campaignId,
        });
        await reply(characterIds.length > 0 ? characterIds[0]! : null);
        break;
      }
      case 'select_characters': {
        const { characterIds } = await useCharacterSelectModalStore.getState().show({
          mode: 'multi',
          title: body.title,
          description: body.description,
          rulesetId: body.rulesetId,
          campaignId: body.campaignId,
        });
        await reply(characterIds);
        break;
      }
      default:
        await reply(null, { code: 'unsupported', message: 'Unknown delegated UI type' });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await reply(null, { code: 'delegated_ui_failed', message });
  }
}

function enqueueDelegatedRequest(envelope: CampaignRealtimeDelegatedUiRequestEnvelopeV1): void {
  const { characterId } = envelope;
  const list = queueByCharacterId.get(characterId) ?? [];
  list.push(envelope);
  queueByCharacterId.set(characterId, list);
  toast.message('This character needs your input — open their sheet to continue.');
}

export function flushDelegatedUiQueueForCharacter(characterId: string): void {
  const list = queueByCharacterId.get(characterId);
  if (!list?.length) return;
  queueByCharacterId.delete(characterId);
  void (async () => {
    for (const item of list) {
      try {
        await fulfillDelegatedRequest(item);
      } catch (e) {
        console.error('[CampaignPlayDelegatedUiClient] flush item failed', e);
      }
    }
  })();
}

function onDelegatedUiRequest(
  campaignId: string,
  envelope: CampaignRealtimeEnvelopeV1,
): void {
  if (envelope.kind !== 'delegated_ui_request') return;
  if (envelope.campaignId !== campaignId) return;

  if (delegatedUiSurfaceIsActive(envelope.characterId)) {
    void fulfillDelegatedRequest(envelope);
  } else {
    enqueueDelegatedRequest(envelope);
  }
}

export function startCampaignPlayDelegatedUiClient(campaignId: string): void {
  if (unsub && activeCampaignId === campaignId) return;
  stopCampaignPlayDelegatedUiClient();
  activeCampaignId = campaignId;
  unsub = subscribeCampaignPlayEnvelopes(campaignId, (env) =>
    onDelegatedUiRequest(campaignId, env),
  );
}

export function stopCampaignPlayDelegatedUiClient(): void {
  unsub?.();
  unsub = null;
  activeCampaignId = null;
  queueByCharacterId.clear();
}
