import { toCharacterSelectModalDelegatedRoster } from '@/lib/campaign-play/realtime/build-delegated-character-select-roster';
import {
  getCampaignPlaySender,
  subscribeCampaignPlayEnvelopes,
} from '@/lib/campaign-play/realtime/campaign-play-realtime-dispatcher';
import type {
  CampaignRealtimeDelegatedUiRequestEnvelopeV1,
  CampaignRealtimeEnvelopeV1,
} from '@/lib/campaign-play/realtime/campaign-realtime-envelopes';
import { CAMPAIGN_REALTIME_PROTOCOL_VERSION } from '@/lib/campaign-play/realtime/campaign-realtime-envelopes';
import { resolveCharacterOwnerAuthUserId } from '@/lib/campaign-play/realtime/resolve-character-owner-auth-uid';
import { cloudClient } from '@/lib/cloud/client';
import {
  getCurrentRollHandlerForScripts,
  getCurrentRollSplitHandlerForScripts,
} from '@/lib/compass-logic/worker/current-roll-handler-ref';
import { db } from '@/stores';
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
  const routePath = typeof window !== 'undefined' ? getCampaignPlayDelegatedUiRoutePath() : '';
  return surfaceCharacterIdMatchesEnvelope(routePath, envelopeCharacterId);
}

async function getCurrentCloudUserId(): Promise<string | null> {
  if (!cloudClient) return null;
  const { data: sessionWrap } = await cloudClient.auth.getSession();
  const fromSession = sessionWrap.session?.user?.id?.trim();
  if (fromSession) return fromSession;
  const { data: userWrap } = await cloudClient.auth.getUser();
  return userWrap.user?.id?.trim() ?? null;
}

/**
 * Only the intended player should answer delegated dice (envelopes broadcast to every campaign client).
 * Order: host `responderCloudUserId` (auth uid) → initiator + acting character (Owner rolls) → profile→auth via Dexie.
 */
async function delegatedRollShouldBeHandledByThisClient(
  envelope: CampaignRealtimeDelegatedUiRequestEnvelopeV1,
): Promise<boolean> {
  const body = envelope.body;
  if (body.interactionType !== 'roll' && body.interactionType !== 'roll_split') return false;

  const uid = await getCurrentCloudUserId();
  if (!uid) return false;

  const fromHost = body.responderCloudUserId?.trim();
  if (fromHost) return uid === fromHost;

  const initiator = envelope.initiatorCloudUserId?.trim();
  const actionChar = envelope.actionCharacterId;
  if (initiator && actionChar && initiator === uid && actionChar === envelope.characterId) {
    return true;
  }

  const ch = await db.characters.get(envelope.characterId);
  if (!ch) return false;
  const profileId = typeof ch.userId === 'string' ? ch.userId.trim() : '';
  if (!profileId) return false;
  const ownerAuth = await resolveCharacterOwnerAuthUserId(profileId);
  if (ownerAuth) return ownerAuth === uid;
  return profileId === uid;
}

async function fulfillDelegatedRequest(
  envelope: CampaignRealtimeDelegatedUiRequestEnvelopeV1,
): Promise<void> {
  /** Modal listing uses campaign roster when set; body may omit `campaignId` while the envelope always has it. */
  const effectiveCampaignIdForSelect =
    envelope.body.interactionType === 'select_character' ||
    envelope.body.interactionType === 'select_characters'
      ? (envelope.body.campaignId ?? envelope.campaignId)
      : undefined;
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
        const roll = getCurrentRollHandlerForScripts() ?? defaultScriptDiceRoller;
        const value = await Promise.resolve(roll(body.expression, body.rerollMessage));
        await reply(typeof value === 'number' ? value : Number(value));
        break;
      }
      case 'roll_split': {
        const rollSplit = getCurrentRollSplitHandlerForScripts() ?? defaultScriptDiceRollerSplit;
        const value = await Promise.resolve(rollSplit(body.expression, body.rerollMessage));
        await reply(Array.isArray(value) ? value : []);
        break;
      }
      case 'prompt': {
        const value = await usePromptModalStore.getState().show(body.message, body.choices);
        await reply(value);
        break;
      }
      case 'prompt_multiple': {
        const value = await usePromptModalStore.getState().showMultiple(body.message, body.choices);
        await reply(value);
        break;
      }
      case 'prompt_input': {
        const value = await usePromptModalStore.getState().showInput(body.message);
        await reply(value);
        break;
      }
      case 'select_character': {
        const delegatedSelectRoster =
          body.rosterNpcs !== undefined || body.rosterPcs !== undefined
            ? toCharacterSelectModalDelegatedRoster({
                rosterNpcs: body.rosterNpcs ?? [],
                rosterPcs: body.rosterPcs ?? [],
              })
            : undefined;
        const { characterIds } = await useCharacterSelectModalStore.getState().show({
          mode: 'single',
          title: body.title,
          description: body.description,
          rulesetId: body.rulesetId,
          campaignId: effectiveCampaignIdForSelect,
          delegatedRoster: delegatedSelectRoster,
        });
        await reply(characterIds.length > 0 ? characterIds[0]! : null);
        break;
      }
      case 'select_characters': {
        const delegatedSelectRoster =
          body.rosterNpcs !== undefined || body.rosterPcs !== undefined
            ? toCharacterSelectModalDelegatedRoster({
                rosterNpcs: body.rosterNpcs ?? [],
                rosterPcs: body.rosterPcs ?? [],
              })
            : undefined;
        const { characterIds } = await useCharacterSelectModalStore.getState().show({
          mode: 'multi',
          title: body.title,
          description: body.description,
          rulesetId: body.rulesetId,
          campaignId: effectiveCampaignIdForSelect,
          delegatedRoster: delegatedSelectRoster,
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

  const tryFlushIfSurfaceReady = (): boolean => {
    if (!delegatedUiSurfaceIsActive(characterId)) return false;
    flushDelegatedUiQueueForCharacter(characterId);
    return true;
  };

  /** Surface registration (layout effect) or hash updates may lag one frame behind this enqueue. */
  queueMicrotask(() => {
    if (tryFlushIfSurfaceReady()) return;
    window.setTimeout(() => {
      if (tryFlushIfSurfaceReady()) return;
      const pending = queueByCharacterId.get(characterId);
      if (!pending?.length) return;
      toast.message('This character needs your input — open their sheet to continue.');
    }, 0);
  });
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

function onDelegatedUiRequest(campaignId: string, envelope: CampaignRealtimeEnvelopeV1): void {
  if (envelope.kind !== 'delegated_ui_request') return;
  if (envelope.campaignId !== campaignId) return;

  void (async () => {
    const body = envelope.body;
    if (body.interactionType === 'roll' || body.interactionType === 'roll_split') {
      const forMe = await delegatedRollShouldBeHandledByThisClient(envelope);
      if (!forMe) return;
      /** Dice does not require an open sheet route; waiting on surface caused action timeouts from campaign UI. */
      await fulfillDelegatedRequest(envelope);
      return;
    }

    if (delegatedUiSurfaceIsActive(envelope.characterId)) {
      await fulfillDelegatedRequest(envelope);
    } else {
      enqueueDelegatedRequest(envelope);
    }
  })();
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
