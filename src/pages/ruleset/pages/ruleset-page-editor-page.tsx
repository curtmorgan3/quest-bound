import { useCharacter, useCharacterAttributes, useRulesets } from '@/lib/compass-api';
import { RulesetPageEditor } from '@/lib/compass-planes';
import { CharacterProvider, type InventoryPanelConfig } from '@/stores';
import type { CharacterAttribute } from '@/types';
import { useState } from 'react';
import { useParams } from 'react-router-dom';

export const RulesetPageEditorPage = () => {
  const { rulesetId, pageId } = useParams<{ rulesetId: string; pageId: string }>();
  const { testCharacter } = useRulesets();
  const characterId = testCharacter?.id;

  const { character, updateCharacter } = useCharacter(characterId);
  const { characterAttributes, updateCharacterAttribute } = useCharacterAttributes(character?.id);
  const [inventoryPanelConfig, setInventoryPanelConfig] = useState<InventoryPanelConfig>({});

  if (!rulesetId || !pageId || !character) return null;

  const handleUpdateCharacterAttribute = (id: string, update: Partial<CharacterAttribute>) => {
    updateCharacterAttribute(id, update);
  };

  const getCharacterAttribute = (attributeId: string) => {
    return characterAttributes.find((attr) => attr.attributeId === attributeId) ?? null;
  };

  const handleCharacterComponentDataUpdate = (id: string, value: string | boolean | number) => {
    if (!character) return;
    updateCharacter(character.id, {
      componentData: {
        ...character.componentData,
        [id]: value,
      },
    });
  };

  return (
    <CharacterProvider
      value={{
        character,
        characterAttributes,
        getCharacterAttribute,
        updateCharacterAttribute: handleUpdateCharacterAttribute,
        updateCharacterComponentData: handleCharacterComponentDataUpdate,
        inventoryPanelConfig,
        setInventoryPanelConfig,
        inventoryItems: [],
        addInventoryItem: () => {},
        updateInventoryItem: () => {},
        removeInventoryItem: () => {},
        fireAction: () => {},
        consumeItem: () => {},
        activateItem: () => {},
      }}>
      <div className='flex flex-col' style={{ overflow: 'hidden' }}>
        <RulesetPageEditor pageId={pageId} />
      </div>
    </CharacterProvider>
  );
};

