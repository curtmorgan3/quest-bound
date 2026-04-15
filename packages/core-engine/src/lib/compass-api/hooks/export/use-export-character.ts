import { useErrorHandler } from '@/hooks';
import { db, useExternalRulesetGrantStore } from '@/stores';
import { useLiveQuery } from 'dexie-react-hooks';
import JSZip from 'jszip';
import { useState } from 'react';

export const useExportCharacter = (characterId: string) => {
  const [isExporting, setIsExporting] = useState(false);
  const { handleError } = useErrorHandler();

  const character = useLiveQuery(
    () => (characterId ? db.characters.get(characterId) : undefined),
    [characterId],
  );

  const characterAttributes = useLiveQuery(
    () =>
      characterId
        ? db.characterAttributes.where('characterId').equals(characterId).toArray()
        : [],
    [characterId],
  );

  const inventories = useLiveQuery(
    () =>
      characterId
        ? db.inventories.where('characterId').equals(characterId).toArray()
        : [],
    [characterId],
  );

  const inventoryItems = useLiveQuery(
    async () => {
      if (!inventories || inventories.length === 0) return [];
      const inventoryIds = inventories.map((inv) => inv.id);
      return db.inventoryItems.where('inventoryId').anyOf(inventoryIds).toArray();
    },
    [inventories],
  );

  const characterPages = useLiveQuery(
    () =>
      characterId
        ? db.characterPages.where('characterId').equals(characterId).toArray()
        : [],
    [characterId],
  );

  const characterWindows = useLiveQuery(
    () =>
      characterId
        ? db.characterWindows.where('characterId').equals(characterId).toArray()
        : [],
    [characterId],
  );

  const isLoading =
    character === undefined ||
    characterAttributes === undefined ||
    inventories === undefined ||
    inventoryItems === undefined ||
    characterPages === undefined ||
    characterWindows === undefined;

  const exportCharacter = async (): Promise<void> => {
    if (!character || !characterId) {
      throw new Error('No character found to export');
    }
    if (
      character.rulesetId &&
      useExternalRulesetGrantStore.getState().permissionByRulesetId[character.rulesetId] ===
        'read_only'
    ) {
      throw new Error('Export is not available for read-only playtest access.');
    }

    const ruleset = character.rulesetId
      ? await db.rulesets.get(character.rulesetId)
      : undefined;

    const baseNameRaw = `${(character as { name?: string }).name ?? 'character'}_${
      ruleset?.title ?? 'ruleset'
    }_${ruleset?.version ?? '1.0.0'}`;

    const baseName = baseNameRaw.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    setIsExporting(true);

    try {
      const zip = new JSZip();

      const appDataFolder = zip.folder(baseName);
      if (!appDataFolder) {
        throw new Error('Failed to create application data folder');
      }

      appDataFolder.file('character.json', JSON.stringify(character, null, 2));

      if (characterAttributes && characterAttributes.length > 0) {
        appDataFolder.file(
          'characterAttributes.json',
          JSON.stringify(characterAttributes, null, 2),
        );
      }

      if (inventories && inventories.length > 0) {
        appDataFolder.file('inventories.json', JSON.stringify(inventories, null, 2));
      }

      if (inventoryItems && inventoryItems.length > 0) {
        appDataFolder.file('inventoryItems.json', JSON.stringify(inventoryItems, null, 2));
      }

      if (characterPages && characterPages.length > 0) {
        appDataFolder.file('characterPages.json', JSON.stringify(characterPages, null, 2));
      }

      if (characterWindows && characterWindows.length > 0) {
        appDataFolder.file(
          'characterWindows.json',
          JSON.stringify(characterWindows, null, 2),
        );
      }

      const metadata = {
        character: {
          id: character.id,
          rulesetId: character.rulesetId,
          name: (character as { name?: string }).name,
        },
        exportInfo: {
          exportedAt: new Date().toISOString(),
          exportedBy: 'Quest Bound',
          version: '1.0.0',
        },
        counts: {
          characterAttributes: characterAttributes?.length ?? 0,
          inventories: inventories?.length ?? 0,
          inventoryItems: inventoryItems?.length ?? 0,
          characterPages: characterPages?.length ?? 0,
          characterWindows: characterWindows?.length ?? 0,
        },
      };

      appDataFolder.file('metadata.json', JSON.stringify(metadata, null, 2));

      const zipBlob = await zip.generateAsync({ type: 'blob' });

      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');

      link.href = url;
      link.download = `${baseName}.zip`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (error) {
      await handleError(error as Error, {
        component: 'useExportCharacter/exportCharacter',
        severity: 'medium',
      });
      throw error;
    } finally {
      setIsExporting(false);
    }
  };

  return {
    character,
    characterAttributes: characterAttributes || [],
    inventories: inventories || [],
    inventoryItems: inventoryItems || [],
    characterPages: characterPages || [],
    characterWindows: characterWindows || [],
    isLoading,
    isExporting,
    exportCharacter,
  };
};

