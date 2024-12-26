import { Attribute, Character, Chart } from '@/libs/compass-api';
import { buildContextualItems } from '@/libs/compass-api/utils/build-items';
import { LogicalValue } from '@/libs/compass-planes';
import { debugLog } from '@/libs/compass-web-utils';
import { useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useEvaluateLogic } from './evaluation';
import { autoGenerateItemPropertyAttributes, buildContextualAttributes } from './helpers';
import { applyAttributeValuesToLogic, applySideEffects } from './hooks/apply-side-effects';
import { useAnnouncement } from './hooks/use-announcement';
import { useUpdateCharacterAttribute } from './hooks/use-update-character-attribute';
import { useUpdateCharacterItems } from './hooks/use-update-character-items';
import { useOverrideContent } from './use-override-content';

const { log, warn } = debugLog('use-subscribe-attribute-changes');

export const useAttributeState = (
  characterId?: string,
  attributesOverride?: Attribute[],
  chartsOverride?: Chart[],
  streamedCharacter?: Character,
) => {
  const { rulesetId } = useParams();
  const { announce } = useAnnouncement();

  const characterCacheOnly = window.location.pathname.includes('sheet-template');

  const {
    character,
    rulesetAttributes: _rulesetAttributes,
    rulesetItems,
    characterAttributeData,
    characterItemData,
    charts: _charts,
  } = useOverrideContent({
    characterId,
    characterCacheOnly,
    attributesOverride,
    chartsOverride,
    streamedCharacter,
  });

  const itemPropertyAttributes = autoGenerateItemPropertyAttributes(
    characterItemData,
    rulesetItems,
    rulesetId ?? '',
  );

  const rulesetAttributes = [..._rulesetAttributes, ...itemPropertyAttributes];

  const _contextualAttributes = buildContextualAttributes(
    characterAttributeData,
    rulesetAttributes,
  ).map((contextualAttr) => ({
    ...contextualAttr,
    autoGenerated: itemPropertyAttributes.some((attr) => attr.id === contextualAttr.id),
  }));

  const _contextualItems = buildContextualItems(rulesetItems);

  const { evaluateLogic } = useEvaluateLogic({
    charts: _charts,
    attributes: _contextualAttributes,
    items: _contextualItems,
    useTestValues: false,
  });

  const attributeValueMap = useRef(new Map<string, LogicalValue | null | undefined>());
  for (const attribute of _contextualAttributes) {
    attributeValueMap.current.set(attribute.id, attribute.value);
  }

  const attributeNameMap = new Map<string, string>();
  for (const attr of _contextualAttributes) {
    attributeNameMap.set(attr.id, attr.name.toLowerCase());
  }

  const getAttribute = (id?: string | null) => {
    return _contextualAttributes.find((attribute) => attribute.id === id);
  };

  const getItem = (id?: string | null) => {
    return _contextualItems.find((item) => item.id === id);
  };

  const { addItem, removeItem, updateItem, updateItemsPositions } = useUpdateCharacterItems({
    attributes: _contextualAttributes,
    items: characterItemData,
    rulesetItems,
    charts: _charts,
    characterId: character?.id,
    cacheOnly: characterCacheOnly,
  });

  const { updateCharacterAttribute } = useUpdateCharacterAttribute({
    characterCacheOnly,
    _contextualAttributes,
    _characterId: characterId,
    _charts,
    items: _contextualItems,
    updateItem,
    characterItems: characterItemData,
    attributeValueMap: attributeValueMap.current,
    logicEnabled: !streamedCharacter,
    disableLogic: () => {},
  });

  const triggerAction = (attributeId: string) => {
    const attribute = getAttribute(attributeId);
    if (!attribute) {
      warn('Action not found');
      return;
    }

    const { logic } = attribute;

    applySideEffects({
      attributeName: attribute?.name ?? '',
      characterId,
      attributes: _contextualAttributes,
      logic: applyAttributeValuesToLogic(logic, attributeValueMap.current, _contextualAttributes),
      data: _contextualAttributes,
      items: characterItemData,
      evaluateLogic,
      attributeValueMap: attributeValueMap.current,
      updateCharacterAttribute,
      updateItem,
      addNotification: (message: LogicalValue, announcementId?: string) => {
        announce({
          message,
          announcementId,
        });
      },
    });
  };

  const triggerItemAbility = (itemInstanceId: string, abilityOperationId: string) => {
    // Make sure the item is the only type of its instance in the provided data for this calculation
    const itemData = characterItemData.filter((item) => item.instanceId === itemInstanceId);
    if (!itemData.length) return;

    const item = getItem(itemData[0].id);
    if (!item) {
      warn('Item not found');
      return;
    }

    const { logic } = item;

    const mapWithAbilityTrigger = new Map(attributeValueMap.current);
    mapWithAbilityTrigger.set(abilityOperationId, 'true');

    applySideEffects({
      attributeName: item?.name ?? '',
      characterId,
      attributes: _contextualAttributes,
      logic: applyAttributeValuesToLogic(logic, mapWithAbilityTrigger, _contextualAttributes),
      data: _contextualAttributes,
      items: itemData,
      evaluateLogic,
      attributeValueMap: mapWithAbilityTrigger,
      updateCharacterAttribute,
      updateItem,
      addNotification: (message: LogicalValue, announcementId?: string) => {
        announce({
          message,
          announcementId,
        });
      },
    });
  };

  return {
    attributes: _contextualAttributes,
    rulesetItems: _contextualItems,
    items: characterItemData,
    updateCharacterAttribute,
    getAttribute,
    getItem,
    addItem,
    removeItem,
    updateItem,
    updateItemsPositions,
    triggerAction,
    triggerItemAbility,
    loading: false,
    streamedCharacter,
  };
};