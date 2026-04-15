import { useErrorHandler } from '@/hooks';
import { db } from '../../db';
import type {
  Character,
  CharacterAttribute,
  CharacterPage,
  CharacterWindow,
  Inventory,
  InventoryItem,
} from '@/types';
import JSZip from 'jszip';
import { useState } from 'react';

export interface ImportCharacterResult {
  success: boolean;
  message: string;
  importedCharacter?: Character;
  importedCounts: {
    characterAttributes: number;
    inventories: number;
    inventoryItems: number;
    characterPages: number;
    characterWindows: number;
  };
  errors: string[];
  rulesetMissing: boolean;
}

export const useImportCharacter = () => {
  const [isImporting, setIsImporting] = useState(false);
  const { handleError } = useErrorHandler();

  const importCharacter = async (file: File): Promise<ImportCharacterResult> => {
    setIsImporting(true);

    try {
      const zip = await JSZip.loadAsync(file);

      // Detect root folder (character exports use "<character>_<ruleset>_<version>/...")
      // Find a metadata.json anywhere and derive a prefix from its path.
      let basePath = '';
      let metadataFile: JSZip.JSZipObject | null = null;

      const allFiles = Object.values(zip.files);
      for (const f of allFiles) {
        if (f.name.endsWith('metadata.json')) {
          metadataFile = f;
          const idx = f.name.lastIndexOf('/');
          basePath = idx >= 0 ? f.name.slice(0, idx + 1) : '';
          break;
        }
      }

      if (!metadataFile) {
        return {
          success: false,
          message: 'Invalid zip file: metadata.json not found in character export folder.',
          importedCounts: {
            characterAttributes: 0,
            inventories: 0,
            inventoryItems: 0,
            characterPages: 0,
            characterWindows: 0,
          },
          errors: ['metadata.json file is required for character import.'],
          rulesetMissing: false,
        };
      }

      const getFile = (relativePath: string) =>
        zip.file(`${basePath}${relativePath}`) ?? null;

      const metadataText = await metadataFile.async('text');
      const metadata = JSON.parse(metadataText) as {
        character: { id: string; rulesetId: string; name?: string };
      };

      const rulesetMissing = !(await db.rulesets.get(metadata.character.rulesetId));

      const now = new Date().toISOString();
      const importedCounts = {
        characterAttributes: 0,
        inventories: 0,
        inventoryItems: 0,
        characterPages: 0,
        characterWindows: 0,
      };
      const errors: string[] = [];

      // Character
      const characterFile = getFile('character.json');
      if (!characterFile) {
        return {
          success: false,
          message: 'character.json not found in export.',
          importedCounts,
          errors: ['character.json is required for character import.'],
          rulesetMissing,
        };
      }

      const characterText = await characterFile.async('text');
      const exportedCharacter = JSON.parse(characterText) as Character;

      const originalInventoryId = (exportedCharacter as { inventoryId?: string }).inventoryId;

      const characterId = crypto.randomUUID();

      const newCharacter: Character = {
        ...exportedCharacter,
        id: characterId,
        createdAt: now,
        updatedAt: now,
      };

      await db.characters.add(newCharacter);

      // Character attributes
      const characterAttributesFile = getFile('characterAttributes.json');
      if (characterAttributesFile) {
        try {
          const characterAttributesText = await characterAttributesFile.async('text');
          const exportedCharacterAttributes = JSON.parse(
            characterAttributesText,
          ) as CharacterAttribute[];

          for (const attr of exportedCharacterAttributes) {
            const newAttr: CharacterAttribute = {
              ...attr,
              id: crypto.randomUUID(),
              characterId,
              createdAt: now,
              updatedAt: now,
            };
            await db.characterAttributes.add(newAttr);
            importedCounts.characterAttributes++;
          }
        } catch (error) {
          errors.push(
            `Failed to import characterAttributes: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          );
        }
      }

      // Inventories
      const inventoriesFile = getFile('inventories.json');
      const inventoryIdMap = new Map<string, string>();
      if (inventoriesFile) {
        try {
          const inventoriesText = await inventoriesFile.async('text');
          const exportedInventories = JSON.parse(inventoriesText) as Inventory[];

          for (const inv of exportedInventories) {
            const newInventoryId = crypto.randomUUID();
            inventoryIdMap.set(inv.id, newInventoryId);

            const newInventory: Inventory = {
              ...inv,
              id: newInventoryId,
              characterId,
              createdAt: now,
              updatedAt: now,
            };

            await db.inventories.add(newInventory);
            importedCounts.inventories++;
          }
        } catch (error) {
          errors.push(
            `Failed to import inventories: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          );
        }
      }

      // Inventory items
      const inventoryItemsFile = getFile('inventoryItems.json');
      if (inventoryItemsFile) {
        try {
          const inventoryItemsText = await inventoryItemsFile.async('text');
          const exportedInventoryItems = JSON.parse(
            inventoryItemsText,
          ) as InventoryItem[];

          for (const item of exportedInventoryItems) {
            const mappedInventoryId =
              inventoryIdMap.get(item.inventoryId) ?? item.inventoryId;

            const newItem: InventoryItem = {
              ...item,
              id: crypto.randomUUID(),
              inventoryId: mappedInventoryId,
              createdAt: now,
              updatedAt: now,
            };

            await db.inventoryItems.add(newItem);
            importedCounts.inventoryItems++;
          }
        } catch (error) {
          errors.push(
            `Failed to import inventoryItems: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          );
        }
      }

      // Character pages
      const characterPagesFile = getFile('characterPages.json');
      const characterPageIdMap = new Map<string, string>();
      if (characterPagesFile) {
        try {
          const characterPagesText = await characterPagesFile.async('text');
          const exportedCharacterPages = JSON.parse(
            characterPagesText,
          ) as CharacterPage[];

          for (const cp of exportedCharacterPages) {
            const newCharacterPageId = crypto.randomUUID();
            characterPageIdMap.set(cp.id, newCharacterPageId);

            const newCharacterPage: CharacterPage = {
              ...cp,
              id: newCharacterPageId,
              characterId,
              createdAt: now,
              updatedAt: now,
            };

            await db.characterPages.add(newCharacterPage);
            importedCounts.characterPages++;
          }
        } catch (error) {
          errors.push(
            `Failed to import characterPages: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          );
        }
      }

      // Character windows
      const characterWindowsFile = getFile('characterWindows.json');
      if (characterWindowsFile) {
        try {
          const characterWindowsText = await characterWindowsFile.async('text');
          const exportedCharacterWindows = JSON.parse(
            characterWindowsText,
          ) as CharacterWindow[];

          for (const cw of exportedCharacterWindows) {
            const mappedCharacterPageId =
              cw.characterPageId &&
              (characterPageIdMap.get(cw.characterPageId) ?? cw.characterPageId);

            const newCharacterWindow: CharacterWindow = {
              ...cw,
              id: crypto.randomUUID(),
              characterId,
              characterPageId: mappedCharacterPageId,
              createdAt: now,
              updatedAt: now,
            };

            await db.characterWindows.add(newCharacterWindow);
            importedCounts.characterWindows++;
          }
        } catch (error) {
          errors.push(
            `Failed to import characterWindows: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          );
        }
      }

      const success = errors.length === 0;

      // If the exported character had a primary inventory, point the new character at the
      // corresponding imported inventory (falling back to the first imported inventory).
      let primaryInventoryId: string | undefined;
      if (originalInventoryId) {
        primaryInventoryId = inventoryIdMap.get(originalInventoryId) ?? undefined;
      }
      if (!primaryInventoryId && inventoryIdMap.size > 0) {
        primaryInventoryId = Array.from(inventoryIdMap.values())[0];
      }
      if (primaryInventoryId) {
        await db.characters.update(characterId, { inventoryId: primaryInventoryId });
        (newCharacter as { inventoryId?: string }).inventoryId = primaryInventoryId;
      }

      return {
        success,
        message: success
          ? `Successfully imported character "${newCharacter.name}".`
          : `Imported character "${newCharacter.name}" with ${errors.length} error(s).`,
        importedCharacter: newCharacter,
        importedCounts,
        errors,
        rulesetMissing,
      };
    } catch (error) {
      await handleError(error as Error, {
        component: 'useImportCharacter/importCharacter',
        severity: 'medium',
      });

      return {
        success: false,
        message: `Character import failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        importedCounts: {
          characterAttributes: 0,
          inventories: 0,
          inventoryItems: 0,
          characterPages: 0,
          characterWindows: 0,
        },
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        rulesetMissing: false,
      };
    } finally {
      setIsImporting(false);
    }
  };

  return {
    importCharacter,
    isImporting,
  };
};

