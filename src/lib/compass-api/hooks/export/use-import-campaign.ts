import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type {
  Asset,
  Campaign,
  CampaignCharacter,
  CampaignEvent,
  CampaignScene,
  Character,
  CharacterArchetype,
  CharacterAttribute,
  CharacterPage,
  CharacterWindow,
  Document,
  Inventory,
  InventoryItem,
  SceneTurnCallback,
  Script,
  ScriptLog,
} from '@/types';
import JSZip from 'jszip';
import { useState } from 'react';

const METADATA_PATH = 'application data/metadata.json';

const URL_PATTERN = /^https?:\/\//i;

function isUrl(s: string): boolean {
  return URL_PATTERN.test(s);
}

async function bulkAddInChunks<T>(
  table: { bulkAdd(items: readonly T[] | T[], ...args: unknown[]): Promise<unknown> },
  items: T[],
  chunkSize: number = 1000,
): Promise<void> {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    await table.bulkAdd(chunk);
    if (i + chunkSize < items.length) {
      await new Promise<void>((r) => setTimeout(r, 0));
    }
  }
}

function filenameFromUrlForImport(url: string): string {
  try {
    const u = new URL(url);
    const seg = u.pathname.split('/').filter(Boolean).pop();
    if (seg) return seg;
  } catch {
    // ignore
  }
  return crypto.randomUUID();
}

async function createUrlAssetForImport(url: string, rulesetId: string): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.assets.add({
    id,
    data: url,
    type: 'url',
    filename: filenameFromUrlForImport(url),
    createdAt: now,
    updatedAt: now,
    rulesetId,
  });
  return id;
}

async function getOrCreateUrlAssetId(
  url: string,
  rulesetId: string,
  urlToAssetIdMap: Record<string, string>,
): Promise<string | null> {
  if (!url?.trim()) return null;
  const trimmed = url.trim();
  const existing = urlToAssetIdMap[trimmed];
  if (existing) return existing;
  const id = await createUrlAssetForImport(trimmed, rulesetId);
  urlToAssetIdMap[trimmed] = id;
  return id;
}

function mapOptionalId(
  map: Map<string, string>,
  id: string | null | undefined,
): string | null | undefined {
  if (id == null) return id;
  return map.get(id) ?? id;
}

export interface ImportCampaignResult {
  success: boolean;
  message: string;
  importedCampaign?: Campaign;
  rulesetMissing: boolean;
  wrongRuleset: boolean;
  importedCounts: {
    assets: number;
    characters: number;
    characterArchetypes: number;
    characterAttributes: number;
    inventories: number;
    inventoryItems: number;
    characterPages: number;
    characterWindows: number;
    campaigns: number;
    campaignScenes: number;
    campaignCharacters: number;
    campaignEvents: number;
    sceneTurnCallbacks: number;
    documents: number;
    scripts: number;
    scriptLogs: number;
  };
  errors: string[];
}

export interface ImportCampaignOptions {
  /** When set, the zip must declare this ruleset id or import is rejected. */
  expectedRulesetId?: string | null;
}

export const useImportCampaign = () => {
  const [isImporting, setIsImporting] = useState(false);
  const { handleError } = useErrorHandler();

  const importCampaign = async (
    file: File,
    options?: ImportCampaignOptions,
  ): Promise<ImportCampaignResult> => {
    setIsImporting(true);

    const emptyCounts: ImportCampaignResult['importedCounts'] = {
      assets: 0,
      characters: 0,
      characterArchetypes: 0,
      characterAttributes: 0,
      inventories: 0,
      inventoryItems: 0,
      characterPages: 0,
      characterWindows: 0,
      campaigns: 0,
      campaignScenes: 0,
      campaignCharacters: 0,
      campaignEvents: 0,
      sceneTurnCallbacks: 0,
      documents: 0,
      scripts: 0,
      scriptLogs: 0,
    };

    try {
      const zipContent = await JSZip.loadAsync(file);

      let pathPrefix = '';
      let metadataFile = zipContent.file(METADATA_PATH);
      if (!metadataFile) {
        const key = Object.keys(zipContent.files).find((p) => p.endsWith(METADATA_PATH));
        if (key) {
          pathPrefix = key.slice(0, -METADATA_PATH.length);
          metadataFile = zipContent.file(key) ?? null;
        }
      }

      const getZipFile = (path: string) =>
        zipContent.file(path) ?? (pathPrefix ? zipContent.file(pathPrefix + path) : null);

      if (!metadataFile) {
        return {
          success: false,
          message:
            'Invalid zip: application data/metadata.json not found. Zip the export so "application data" is at the root of the archive.',
          rulesetMissing: false,
          wrongRuleset: false,
          importedCounts: emptyCounts,
          errors: ['metadata.json missing'],
        };
      }

      const metadataRaw = JSON.parse(await metadataFile.async('text')) as {
        exportKind?: string;
        rulesetId?: string;
        campaign?: { id?: string; label?: string };
      };

      if (metadataRaw.exportKind !== 'quest-bound-campaign') {
        return {
          success: false,
          message:
            'This zip is not a Quest Bound campaign export. Use a .zip file exported from campaign settings.',
          rulesetMissing: false,
          wrongRuleset: false,
          importedCounts: emptyCounts,
          errors: ['exportKind is not quest-bound-campaign'],
        };
      }

      const rulesetId = metadataRaw.rulesetId;
      if (!rulesetId) {
        return {
          success: false,
          message: 'Invalid campaign export: missing rulesetId in metadata.',
          rulesetMissing: false,
          wrongRuleset: false,
          importedCounts: emptyCounts,
          errors: ['rulesetId missing'],
        };
      }

      const expected = options?.expectedRulesetId;
      if (expected && expected !== rulesetId) {
        return {
          success: false,
          message:
            'This campaign belongs to a different ruleset. Open that ruleset’s Campaigns page and import there.',
          rulesetMissing: false,
          wrongRuleset: true,
          importedCounts: emptyCounts,
          errors: ['ruleset mismatch'],
        };
      }

      const rulesetExists = !!(await db.rulesets.get(rulesetId));
      if (!rulesetExists) {
        return {
          success: false,
          message:
            'The ruleset for this campaign is not in your library. Import the ruleset first, then import the campaign.',
          rulesetMissing: true,
          wrongRuleset: false,
          importedCounts: emptyCounts,
          errors: ['ruleset not found'],
        };
      }

      const campaignFile = getZipFile('application data/campaign.json');
      if (!campaignFile) {
        return {
          success: false,
          message: 'Invalid campaign export: application data/campaign.json not found.',
          rulesetMissing: false,
          wrongRuleset: false,
          importedCounts: emptyCounts,
          errors: ['campaign.json missing'],
        };
      }

      const now = new Date().toISOString();
      const errors: string[] = [];
      const importedCounts = { ...emptyCounts };
      const urlToAssetIdMap: Record<string, string> = {};

      const assetIdMap = new Map<string, string>();
      const characterIdMap = new Map<string, string>();
      const inventoryIdMap = new Map<string, string>();
      const characterPageIdMap = new Map<string, string>();
      const campaignSceneIdMap = new Map<string, string>();
      const documentIdMap = new Map<string, string>();
      const scriptIdMap = new Map<string, string>();

      // --- Assets (new ids, remap references) ---
      const assetsFile = getZipFile('application data/assets.json');
      if (assetsFile) {
        try {
          const assetsMetadata: (Omit<Asset, 'data'> & { data?: string })[] = JSON.parse(
            await assetsFile.async('text'),
          );

          const assetsPrefix = pathPrefix + 'assets/';
          const assetDataMap: Record<string, string> = {};
          const assetFiles = Object.entries(zipContent.files).filter(
            ([path]) => path.startsWith(assetsPrefix) && !path.endsWith('/'),
          );
          for (const [path, zf] of assetFiles) {
            const relativePath = path.replace(assetsPrefix, '');
            assetDataMap[relativePath] = await zf.async('base64');
          }

          const toAdd: Asset[] = [];
          for (const meta of assetsMetadata) {
            const newId = crypto.randomUUID();
            assetIdMap.set(meta.id, newId);

            const urlFromJson = meta.data;
            let data: string;
            if (typeof urlFromJson === 'string' && isUrl(urlFromJson)) {
              data = urlFromJson;
            } else {
              let assetPath = meta.filename ?? '';
              if (meta.directory) {
                const directoryPath = meta.directory.replace(/^\/+|\/+$/g, '');
                if (directoryPath) {
                  assetPath = `${directoryPath}/${meta.filename}`;
                }
              }
              const base64Data = assetDataMap[assetPath];
              data = base64Data ? `data:${meta.type};base64,${base64Data}` : '';
            }

            toAdd.push({
              ...meta,
              id: newId,
              data,
              rulesetId,
              createdAt: now,
              updatedAt: now,
            });
          }
          if (toAdd.length > 0) {
            await bulkAddInChunks(db.assets, toAdd, 100);
            importedCounts.assets = toAdd.length;
          }
        } catch (e) {
          errors.push(`assets: ${e instanceof Error ? e.message : 'unknown error'}`);
        }
      }

      const remapAssetId = (id: string | null | undefined) => {
        if (id == null) return id;
        return assetIdMap.get(id) ?? id;
      };

      // --- Characters + sheet data ---
      const charactersJson = getZipFile('application data/characters.json');
      const exportedCharacters: Character[] = charactersJson
        ? JSON.parse(await charactersJson.async('text'))
        : [];

      for (const ch of exportedCharacters) {
        if (ch.rulesetId !== rulesetId) continue;
        characterIdMap.set(ch.id, crypto.randomUUID());
      }

      for (const ch of exportedCharacters) {
        if (ch.rulesetId !== rulesetId) continue;
        const newCharacterId = characterIdMap.get(ch.id);
        if (!newCharacterId) continue;

        const newCharacter: Character = {
          ...ch,
          id: newCharacterId,
          rulesetId,
          assetId: remapAssetId(ch.assetId) ?? null,
          createdAt: now,
          updatedAt: now,
        };

        if (newCharacter.image && isUrl(newCharacter.image) && !newCharacter.assetId) {
          const aid = await getOrCreateUrlAssetId(newCharacter.image, rulesetId, urlToAssetIdMap);
          if (aid) {
            newCharacter.assetId = aid;
            newCharacter.image = undefined;
          }
        }

        await db.characters.add(newCharacter);
        importedCounts.characters++;
      }

      const charArcFile = getZipFile('application data/characterArchetypes.json');
      if (charArcFile) {
        try {
          const rows = JSON.parse(await charArcFile.async('text')) as CharacterArchetype[];
          const toAdd: CharacterArchetype[] = [];
          for (const row of rows) {
            const newCharId = characterIdMap.get(row.characterId);
            if (!newCharId) continue;
            toAdd.push({
              ...row,
              id: crypto.randomUUID(),
              characterId: newCharId,
              createdAt: now,
              updatedAt: now,
            });
          }
          if (toAdd.length > 0) {
            await bulkAddInChunks(db.characterArchetypes, toAdd);
            importedCounts.characterArchetypes = toAdd.length;
          }
        } catch (e) {
          errors.push(`characterArchetypes: ${e instanceof Error ? e.message : 'unknown error'}`);
        }
      }

      const charAttrFile = getZipFile('application data/characterAttributes.json');
      if (charAttrFile) {
        try {
          const rows = JSON.parse(await charAttrFile.async('text')) as CharacterAttribute[];
          const toAdd: CharacterAttribute[] = [];
          for (const row of rows) {
            const newCharId = characterIdMap.get(row.characterId);
            if (!newCharId) continue;
            toAdd.push({
              ...row,
              id: crypto.randomUUID(),
              characterId: newCharId,
              createdAt: now,
              updatedAt: now,
            });
          }
          if (toAdd.length > 0) {
            await bulkAddInChunks(db.characterAttributes, toAdd);
            importedCounts.characterAttributes = toAdd.length;
          }
        } catch (e) {
          errors.push(`characterAttributes: ${e instanceof Error ? e.message : 'unknown error'}`);
        }
      }

      const invFile = getZipFile('application data/inventories.json');
      if (invFile) {
        try {
          const rows = JSON.parse(await invFile.async('text')) as Inventory[];
          const toAdd: Inventory[] = [];
          for (const inv of rows) {
            const newCharId = characterIdMap.get(inv.characterId ?? '');
            if (!newCharId) continue;
            const newInvId = inventoryIdMap.get(inv.id) ?? crypto.randomUUID();
            inventoryIdMap.set(inv.id, newInvId);
            toAdd.push({
              ...inv,
              id: newInvId,
              characterId: newCharId,
              createdAt: now,
              updatedAt: now,
            });
          }
          if (toAdd.length > 0) {
            await bulkAddInChunks(db.inventories, toAdd);
            importedCounts.inventories = toAdd.length;
          }
        } catch (e) {
          errors.push(`inventories: ${e instanceof Error ? e.message : 'unknown error'}`);
        }
      }

      const invItemsFile = getZipFile('application data/inventoryItems.json');
      if (invItemsFile) {
        try {
          const rows = JSON.parse(await invItemsFile.async('text')) as InventoryItem[];
          const toAdd: InventoryItem[] = [];
          for (const item of rows) {
            const mappedInventoryId = inventoryIdMap.get(item.inventoryId);
            if (mappedInventoryId === undefined) continue;
            toAdd.push({
              ...item,
              id: crypto.randomUUID(),
              inventoryId: mappedInventoryId,
              createdAt: now,
              updatedAt: now,
            });
          }
          if (toAdd.length > 0) {
            await bulkAddInChunks(db.inventoryItems, toAdd);
            importedCounts.inventoryItems = toAdd.length;
          }
        } catch (e) {
          errors.push(`inventoryItems: ${e instanceof Error ? e.message : 'unknown error'}`);
        }
      }

      const charPagesFile = getZipFile('application data/characterPages.json');
      if (charPagesFile) {
        try {
          const rows = JSON.parse(await charPagesFile.async('text')) as CharacterPage[];
          const toAdd: CharacterPage[] = [];
          for (const cp of rows) {
            const newCharId = characterIdMap.get(cp.characterId);
            if (!newCharId) continue;
            const newPageId = crypto.randomUUID();
            characterPageIdMap.set(cp.id, newPageId);
            toAdd.push({
              ...cp,
              id: newPageId,
              characterId: newCharId,
              createdAt: now,
              updatedAt: now,
            });
          }
          if (toAdd.length > 0) {
            await bulkAddInChunks(db.characterPages, toAdd);
            importedCounts.characterPages = toAdd.length;
          }
        } catch (e) {
          errors.push(`characterPages: ${e instanceof Error ? e.message : 'unknown error'}`);
        }
      }

      const charWinFile = getZipFile('application data/characterWindows.json');
      if (charWinFile) {
        try {
          const rows = JSON.parse(await charWinFile.async('text')) as CharacterWindow[];
          const toAdd: CharacterWindow[] = [];
          for (const cw of rows) {
            const newCharId = characterIdMap.get(cw.characterId);
            if (!newCharId) continue;
            const mappedCharacterPageId =
              cw.characterPageId != null
                ? (characterPageIdMap.get(cw.characterPageId) ?? cw.characterPageId)
                : cw.characterPageId;
            toAdd.push({
              ...cw,
              id: crypto.randomUUID(),
              characterId: newCharId,
              characterPageId: mappedCharacterPageId,
              createdAt: now,
              updatedAt: now,
            });
          }
          if (toAdd.length > 0) {
            await bulkAddInChunks(db.characterWindows, toAdd);
            importedCounts.characterWindows = toAdd.length;
          }
        } catch (e) {
          errors.push(`characterWindows: ${e instanceof Error ? e.message : 'unknown error'}`);
        }
      }

      // Point each imported character at its primary inventory
      for (const ch of exportedCharacters) {
        if (ch.rulesetId !== rulesetId) continue;
        const newCharacterId = characterIdMap.get(ch.id);
        if (!newCharacterId) continue;
        let primaryInventoryId: string | undefined =
          ch.inventoryId != null ? inventoryIdMap.get(ch.inventoryId) : undefined;
        if (!primaryInventoryId && inventoryIdMap.size > 0) {
          const invsForChar = await db.inventories
            .where('characterId')
            .equals(newCharacterId)
            .toArray();
          primaryInventoryId = invsForChar[0]?.id;
        }
        if (primaryInventoryId) {
          await db.characters.update(newCharacterId, { inventoryId: primaryInventoryId });
        }
      }

      // --- Campaign + scenes ---
      const exportedCampaign = JSON.parse(await campaignFile.async('text')) as Campaign;
      const oldCampaignId = exportedCampaign.id;
      const newCampaignId = crypto.randomUUID();

      const newCampaign: Campaign = {
        ...exportedCampaign,
        id: newCampaignId,
        rulesetId,
        assetId: remapAssetId(exportedCampaign.assetId) ?? null,
        createdAt: now,
        updatedAt: now,
      };

      if (newCampaign.image && isUrl(newCampaign.image) && !newCampaign.assetId) {
        const aid = await getOrCreateUrlAssetId(newCampaign.image, rulesetId, urlToAssetIdMap);
        if (aid) {
          newCampaign.assetId = aid;
          newCampaign.image = undefined;
        }
      }

      const scenesFile = getZipFile('application data/campaignScenes.json');
      const exportedScenes: CampaignScene[] = scenesFile
        ? JSON.parse(await scenesFile.async('text'))
        : [];

      for (const scene of exportedScenes) {
        if (scene.campaignId === oldCampaignId) {
          campaignSceneIdMap.set(scene.id, crypto.randomUUID());
        }
      }

      const newScenes: CampaignScene[] = [];
      for (const scene of exportedScenes) {
        if (scene.campaignId !== oldCampaignId) continue;
        const newSceneId = campaignSceneIdMap.get(scene.id);
        if (!newSceneId) continue;
        newScenes.push({
          ...scene,
          id: newSceneId,
          campaignId: newCampaignId,
          createdAt: now,
          updatedAt: now,
        });
      }

      await db.campaigns.add(newCampaign);
      importedCounts.campaigns = 1;

      if (newScenes.length > 0) {
        await bulkAddInChunks(db.campaignScenes, newScenes);
        importedCounts.campaignScenes = newScenes.length;
      }

      const remapDocIdsInList = (ids: string[] | undefined): string[] | undefined => {
        if (!ids) return ids;
        return ids.map((id) => documentIdMap.get(id) ?? id);
      };

      const ccFile = getZipFile('application data/campaignCharacters.json');
      if (ccFile) {
        try {
          const rows = JSON.parse(await ccFile.async('text')) as CampaignCharacter[];
          const toAdd: CampaignCharacter[] = [];
          for (const cc of rows) {
            if (cc.campaignId !== oldCampaignId) continue;
            const newCharId = characterIdMap.get(cc.characterId);
            if (!newCharId) continue;
            const newSceneId = cc.campaignSceneId
              ? campaignSceneIdMap.get(cc.campaignSceneId)
              : undefined;
            toAdd.push({
              ...cc,
              id: crypto.randomUUID(),
              campaignId: newCampaignId,
              campaignSceneId: newSceneId ?? cc.campaignSceneId,
              createdAt: now,
              updatedAt: now,
              characterId: newCharId,
            });
          }
          if (toAdd.length > 0) {
            await bulkAddInChunks(db.campaignCharacters, toAdd);
            importedCounts.campaignCharacters = toAdd.length;
          }
        } catch (e) {
          errors.push(`campaignCharacters: ${e instanceof Error ? e.message : 'unknown error'}`);
        }
      }

      const scriptsFile = getZipFile('application data/scripts.json');
      if (scriptsFile) {
        try {
          const rows = JSON.parse(await scriptsFile.async('text')) as Script[];
          const toAdd: Script[] = [];
          for (const s of rows) {
            if (s.campaignId !== oldCampaignId) continue;
            const newScriptId = crypto.randomUUID();
            scriptIdMap.set(s.id, newScriptId);
            toAdd.push({
              ...s,
              id: newScriptId,
              rulesetId,
              campaignId: newCampaignId,
              createdAt: now,
              updatedAt: now,
            });
          }
          if (toAdd.length > 0) {
            await bulkAddInChunks(db.scripts, toAdd);
            importedCounts.scripts = toAdd.length;
          }
        } catch (e) {
          errors.push(`scripts: ${e instanceof Error ? e.message : 'unknown error'}`);
        }
      }

      const ceFile = getZipFile('application data/campaignEvents.json');
      if (ceFile) {
        try {
          const rows = JSON.parse(await ceFile.async('text')) as CampaignEvent[];
          const toAdd: CampaignEvent[] = [];
          for (const ev of rows) {
            if (ev.campaignId !== oldCampaignId) continue;
            const newSceneId = campaignSceneIdMap.get(ev.sceneId);
            if (!newSceneId) continue;
            const scriptId =
              ev.scriptId != null ? (scriptIdMap.get(ev.scriptId) ?? ev.scriptId) : ev.scriptId;
            toAdd.push({
              ...ev,
              id: crypto.randomUUID(),
              campaignId: newCampaignId,
              sceneId: newSceneId,
              scriptId,
              createdAt: now,
              updatedAt: now,
            });
          }
          if (toAdd.length > 0) {
            await bulkAddInChunks(db.campaignEvents, toAdd);
            importedCounts.campaignEvents = toAdd.length;
          }
        } catch (e) {
          errors.push(`campaignEvents: ${e instanceof Error ? e.message : 'unknown error'}`);
        }
      }

      const stcFile = getZipFile('application data/sceneTurnCallbacks.json');
      if (stcFile) {
        try {
          const rows = JSON.parse(await stcFile.async('text')) as SceneTurnCallback[];
          const toAdd: SceneTurnCallback[] = [];
          for (const stc of rows) {
            const newSceneId = campaignSceneIdMap.get(stc.campaignSceneId);
            if (!newSceneId) continue;
            const ownerId =
              stc.ownerId != null ? (characterIdMap.get(stc.ownerId) ?? stc.ownerId) : stc.ownerId;
            const targetCharacterId =
              stc.targetCharacterId != null
                ? (characterIdMap.get(stc.targetCharacterId) ?? stc.targetCharacterId)
                : stc.targetCharacterId;
            let capturedCharacterIds = stc.capturedCharacterIds;
            if (capturedCharacterIds) {
              capturedCharacterIds = Object.fromEntries(
                Object.entries(capturedCharacterIds).map(([k, v]) => [
                  k,
                  typeof v === 'string' ? (characterIdMap.get(v) ?? v) : v,
                ]),
              );
            }
            toAdd.push({
              ...stc,
              id: crypto.randomUUID(),
              campaignSceneId: newSceneId,
              rulesetId,
              ownerId,
              targetCharacterId,
              capturedCharacterIds,
              createdAt: now,
              updatedAt: now,
            });
          }
          if (toAdd.length > 0) {
            await bulkAddInChunks(db.sceneTurnCallbacks, toAdd);
            importedCounts.sceneTurnCallbacks = toAdd.length;
          }
        } catch (e) {
          errors.push(`sceneTurnCallbacks: ${e instanceof Error ? e.message : 'unknown error'}`);
        }
      }

      // --- Documents ---
      const documentsFile = getZipFile('application data/documents.json');
      if (documentsFile) {
        try {
          const documents: Document[] = JSON.parse(await documentsFile.async('text'));
          const documentsPrefix = pathPrefix + 'documents/';
          const pdfFiles: Record<string, string> = {};
          const pdfFileEntries = Object.entries(zipContent.files).filter(
            ([path]) => path.startsWith(documentsPrefix) && path.endsWith('.pdf'),
          );
          for (const [path, zf] of pdfFileEntries) {
            const filename = path.replace(documentsPrefix, '');
            const idMatch = filename.match(/_([^_]+)\.pdf$/);
            if (idMatch) {
              const docId = idMatch[1];
              const pdfData = await zf.async('base64');
              pdfFiles[docId] = `data:application/pdf;base64,${pdfData}`;
            }
          }

          const toAdd: Document[] = [];
          for (const document of documents) {
            if (document.campaignId !== oldCampaignId) continue;
            const newDocId = crypto.randomUUID();
            documentIdMap.set(document.id, newDocId);

            const newDocument: Document = {
              ...document,
              id: newDocId,
              rulesetId,
              campaignId: newCampaignId,
              campaignSceneId: mapOptionalId(campaignSceneIdMap, document.campaignSceneId) ?? null,
              worldId: undefined,
              locationId: undefined,
              assetId: remapAssetId(document.assetId) ?? null,
              pdfAssetId: remapAssetId(document.pdfAssetId) ?? null,
              pdfData: pdfFiles[document.id] ?? null,
              createdAt: now,
              updatedAt: now,
            };

            if (newDocument.image && isUrl(newDocument.image) && !newDocument.assetId) {
              const id = await getOrCreateUrlAssetId(newDocument.image, rulesetId, urlToAssetIdMap);
              if (id) {
                newDocument.assetId = id;
                newDocument.image = undefined;
              }
            }

            toAdd.push(newDocument);
          }
          if (toAdd.length > 0) {
            await bulkAddInChunks(db.documents, toAdd, 100);
            importedCounts.documents = toAdd.length;
          }
        } catch (e) {
          errors.push(`documents: ${e instanceof Error ? e.message : 'unknown error'}`);
        }
      }

      const pinnedDocs = remapDocIdsInList(newCampaign.pinnedSidebarDocuments);
      if (pinnedDocs) {
        await db.campaigns.update(newCampaignId, { pinnedSidebarDocuments: pinnedDocs });
        newCampaign.pinnedSidebarDocuments = pinnedDocs;
      }

      // --- Script logs ---
      const logsFile = getZipFile('application data/scriptLogs.json');
      if (logsFile) {
        try {
          const rows = JSON.parse(await logsFile.async('text')) as ScriptLog[];
          const toAdd: ScriptLog[] = [];
          for (const log of rows) {
            if (log.campaignId !== oldCampaignId) continue;
            const scriptId = scriptIdMap.get(log.scriptId) ?? log.scriptId;
            const characterId =
              log.characterId != null
                ? (characterIdMap.get(log.characterId) ?? log.characterId)
                : log.characterId;
            toAdd.push({
              ...log,
              id: crypto.randomUUID(),
              rulesetId,
              campaignId: newCampaignId,
              scriptId,
              characterId,
              createdAt: now,
              updatedAt: now,
            });
          }
          if (toAdd.length > 0) {
            await bulkAddInChunks(db.scriptLogs, toAdd);
            importedCounts.scriptLogs = toAdd.length;
          }
        } catch (e) {
          errors.push(`scriptLogs: ${e instanceof Error ? e.message : 'unknown error'}`);
        }
      }

      const success = errors.length === 0;
      const label = newCampaign.label ?? 'Campaign';

      return {
        success,
        message: success
          ? `Successfully imported campaign "${label}".`
          : `Imported campaign "${label}" with ${errors.length} error(s).`,
        importedCampaign: newCampaign,
        rulesetMissing: false,
        wrongRuleset: false,
        importedCounts,
        errors,
      };
    } catch (error) {
      await handleError(error as Error, {
        component: 'useImportCampaign/importCampaign',
        severity: 'medium',
      });

      return {
        success: false,
        message: `Campaign import failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        rulesetMissing: false,
        wrongRuleset: false,
        importedCounts: emptyCounts,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    } finally {
      setIsImporting(false);
    }
  };

  return {
    importCampaign,
    isImporting,
  };
};
