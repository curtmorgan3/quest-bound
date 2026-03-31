import { filterNotSoftDeleted, softDeletePatch } from '@/lib/data/soft-delete';
import { useErrorHandler, useNotifications } from '@/hooks';
import {
  isCampaignPlayClientRelayForCampaign,
  isCampaignPlayHostBroadcastForCampaign,
} from '@/lib/campaign-play/campaign-play-action-relay';
import { broadcastHostCharacterDataAfterHostReactives } from '@/lib/campaign-play/realtime/campaign-play-host-character-broadcast';
import { sendCampaignPlayManualCharacterUpdate } from '@/lib/campaign-play/realtime/campaign-play-manual-broadcast';
import { getQBScriptClient } from '@/lib/compass-logic/worker';
import { db } from '@/stores';
import type { CharacterAttribute } from '@/types';
import { mergeAttributeCustomPropertyValuesForSchemaJson } from '@/utils/attribute-custom-property-values';
import { seedCharacterAttributeFromRulesetAttribute } from '@/utils/character-attribute-from-ruleset-attribute';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useMemo, useRef } from 'react';

/** When set on the character sheet during campaign play, manual attribute writes are relayed to the host (Phase 2.5). */
export interface CharacterSheetCampaignPlayContext {
  campaignId: string;
  campaignSceneId?: string;
}

const EMPTY_CHARACTER_ATTRIBUTES: CharacterAttribute[] = [];

/**
 * Stable empty result when no characterId — avoids new [] each render during loading.
 */
function emptyAttributesOr(
  rows: CharacterAttribute[] | undefined,
): CharacterAttribute[] {
  return rows ?? EMPTY_CHARACTER_ATTRIBUTES;
}

export const useCharacterAttributes = (
  characterId?: string,
  campaignPlay?: CharacterSheetCampaignPlayContext,
) => {
  const { handleError } = useErrorHandler();
  const { addNotification } = useNotifications();

  const handleErrorRef = useRef(handleError);
  const addNotificationRef = useRef(addNotification);
  handleErrorRef.current = handleError;
  addNotificationRef.current = addNotification;

  const broadcastAttributeRows = useCallback(
    (rows: CharacterAttribute[]) => {
      if (!campaignPlay || rows.length === 0) return;
      const batches = [
        {
          table: 'characterAttributes' as const,
          rows: rows.map((r) => ({ ...r } as Record<string, unknown>)),
        },
      ];
      if (isCampaignPlayClientRelayForCampaign(campaignPlay.campaignId)) {
        void sendCampaignPlayManualCharacterUpdate({
          campaignId: campaignPlay.campaignId,
          campaignSceneId: campaignPlay.campaignSceneId,
          batches,
        }).catch((err) => console.warn('[useCharacterAttributes] campaign manual broadcast failed', err));
        return;
      }
      if (isCampaignPlayHostBroadcastForCampaign(campaignPlay.campaignId)) {
        void broadcastHostCharacterDataAfterHostReactives({
          campaignId: campaignPlay.campaignId,
          campaignSceneId: campaignPlay.campaignSceneId,
          batches,
        }).catch((err) =>
          console.warn('[useCharacterAttributes] campaign host broadcast failed', err),
        );
      }
    },
    [campaignPlay],
  );

  const characterAttributes = useLiveQuery(
    async () => {
      if (!characterId) return EMPTY_CHARACTER_ATTRIBUTES;
      const rows = await db.characterAttributes.where('characterId').equals(characterId).toArray();
      return filterNotSoftDeleted(rows);
    },
    [characterId],
  );

  const createCharacterAttribute = useCallback(
    async (data: Omit<CharacterAttribute, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!characterId) return;
      const character = await db.characters.get(characterId);
      if (!character) return;
      const now = new Date().toISOString();
      const newId = crypto.randomUUID();
      try {
        await db.characterAttributes.add({
          ...data,
          id: newId,
          characterId: character.id,
          createdAt: now,
          updatedAt: now,
        } as CharacterAttribute);
        const row = await db.characterAttributes.get(newId);
        if (row) broadcastAttributeRows([row]);
      } catch (e) {
        handleErrorRef.current(e as Error, {
          component: 'useCharacterAttributes/createCharacterAttribute',
          severity: 'medium',
        });
      }
    },
    [characterId, broadcastAttributeRows],
  );

  const updateCharacterAttribute = useCallback(
    async (id: string, data: Partial<CharacterAttribute>) => {
      const now = new Date().toISOString();

      const newMin = data.min;
      const newMax = data.max;
      const newDefaultValue = data.defaultValue;

      if (newMin !== undefined && newMax !== undefined && newMin > newMax) {
        console.warn('Min cannot be greater than Max. Adjusting Max to match Min.');
        data.max = newMin;
      }

      if (newDefaultValue !== undefined) {
        if (newMin !== undefined && typeof newDefaultValue === 'number' && newDefaultValue < newMin) {
          console.warn('Default value is less than Min. Adjusting Default value to match Min.');
          data.defaultValue = newMin;
        } else if (
          newMax !== undefined &&
          typeof newDefaultValue === 'number' &&
          newDefaultValue > newMax
        ) {
          console.warn('Default value is greater than Max. Adjusting Default value to match Max.');
          data.max = newDefaultValue;
        }
      }

      try {
        await db.characterAttributes.update(id, {
          ...data,
          updatedAt: now,
        });
        const row = await db.characterAttributes.get(id);
        if (row) broadcastAttributeRows([row]);
      } catch (e) {
        handleErrorRef.current(e as Error, {
          component: 'useCharacterAttributes/updateCharacterAttribute',
          severity: 'medium',
        });
      }
    },
    [broadcastAttributeRows],
  );

  const deleteCharacterAttribute = useCallback(
    async (id: string) => {
      try {
        await db.characterAttributes.update(id, softDeletePatch());
        const row = await db.characterAttributes.get(id);
        if (row) broadcastAttributeRows([row]);
      } catch (e) {
        handleErrorRef.current(e as Error, {
          component: 'useCharacterAttributes/deleteCharacterAttribute',
          severity: 'medium',
        });
      }
    },
    [broadcastAttributeRows],
  );

  const syncWithRuleset = useCallback(
    async (options?: { ignoreLastSyncedAt?: boolean }): Promise<number> => {
      if (!characterId) return 0;
      const character = await db.characters.get(characterId);
      if (!character?.rulesetId) return 0;

      try {
        const lastSyncedAt = options?.ignoreLastSyncedAt ? null : (character.lastSyncedAt ?? null);

        const rulesetAttributes = lastSyncedAt
          ? await db.attributes
              .where({ rulesetId: character.rulesetId })
              .filter((attr) => attr.updatedAt > lastSyncedAt || attr.createdAt > lastSyncedAt)
              .toArray()
          : await db.attributes.where({ rulesetId: character.rulesetId }).toArray();

        const existingCharacterAttributes = await db.characterAttributes
          .where('characterId')
          .equals(character.id)
          .toArray();
        const existingByAttributeId = new Map(
          existingCharacterAttributes.map((ca) => [ca.attributeId, ca]),
        );

        const now = new Date().toISOString();
        const toAdd: CharacterAttribute[] = [];
        const toUpdate: { id: string; data: Partial<CharacterAttribute> }[] = [];

        for (const attr of rulesetAttributes) {
          const existing = existingByAttributeId.get(attr.id);

          if (!existing) {
            toAdd.push(
              seedCharacterAttributeFromRulesetAttribute(attr, character.id, now),
            );
          } else {
            toUpdate.push({
              id: existing.id,
              data: {
                title: attr.title,
                defaultValue: attr.defaultValue,
                type: attr.type,
                description: attr.description,
                min: attr.min,
                max: attr.max,
                options: attr.options,
                optionsChartRef: attr.optionsChartRef,
                optionsChartColumnHeader: attr.optionsChartColumnHeader,
                category: attr.category,
                allowMultiSelect: attr.allowMultiSelect,
                scriptId: attr.scriptId,
                customProperties: attr.customProperties,
                attributeCustomPropertyValues: mergeAttributeCustomPropertyValuesForSchemaJson(
                  existing.attributeCustomPropertyValues,
                  attr.customProperties,
                ),
                updatedAt: now,
              },
            });
          }
        }

        if (toAdd.length > 0) {
          await db.characterAttributes.bulkAdd(toAdd);
        }

        for (const { id, data } of toUpdate) {
          await db.characterAttributes.update(id, data);
        }

        const count = toAdd.length + toUpdate.length;

        if (count > 0) {
          try {
            const client = getQBScriptClient();
            await client.runInitialAttributeSync(character.id, character.rulesetId);
          } catch (error) {
            const err = error as Error & { scriptName?: string };
            const scriptInfo = err.scriptName ? ` [script: ${err.scriptName}.qbs]` : '';
            console.warn(
              'Reactive script execution during syncWithRuleset failed' + scriptInfo + ':',
              error,
            );
            const message = err.scriptName
              ? `Failure in script ${err.scriptName}.qbs | ${error}`
              : `Attribute sync failed | ${error}`;
            addNotificationRef.current(message, {
              type: 'error',
            });
          }
        }

        await db.characters.update(character.id, { lastSyncedAt: now });

        return count;
      } catch (e) {
        handleErrorRef.current(e as Error, {
          component: 'useCharacterAttributes/syncWithRuleset',
          severity: 'medium',
        });
        return 0;
      }
    },
    [characterId],
  );

  return useMemo(
    () => ({
      characterAttributes: emptyAttributesOr(characterAttributes),
      createCharacterAttribute,
      updateCharacterAttribute,
      deleteCharacterAttribute,
      syncWithRuleset,
    }),
    [
      characterAttributes,
      createCharacterAttribute,
      updateCharacterAttribute,
      deleteCharacterAttribute,
      syncWithRuleset,
    ],
  );
};
