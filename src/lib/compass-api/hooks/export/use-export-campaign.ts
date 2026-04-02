import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type {
  Asset,
  Campaign,
  Character,
  CharacterArchetype,
  CharacterAttribute,
  CharacterPage,
  CharacterWindow,
  Document,
  Inventory,
  SceneTurnCallback,
} from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import JSZip from 'jszip';
import { useCallback, useState } from 'react';

const CAMPAIGN_EXPORT_FORMAT_VERSION = '1.0.0';

function collectAssetIdsFromCampaign(campaign: Campaign, ids: Set<string>) {
  if (campaign.assetId) ids.add(campaign.assetId);
}

function collectAssetIdsFromCharacter(character: Character, ids: Set<string>) {
  if (character.assetId) ids.add(character.assetId);
}

function collectAssetIdsFromDocument(doc: Document, ids: Set<string>) {
  if (doc.assetId) ids.add(doc.assetId);
  if (doc.pdfAssetId) ids.add(doc.pdfAssetId);
}

function addBinaryAssetToZip(assetsFolder: JSZip, asset: Asset) {
  const isDataUrl =
    typeof asset.data === 'string' &&
    asset.data.startsWith('data:') &&
    asset.data.includes(';base64,');

  if (!isDataUrl) return;

  const base64Data = asset.data.split(',')[1];
  if (!base64Data) return;

  const binaryData = atob(base64Data);
  const uint8Array = new Uint8Array(binaryData.length);
  for (let i = 0; i < binaryData.length; i++) {
    uint8Array[i] = binaryData.charCodeAt(i);
  }

  const fileExtension = asset.type.split('/')[1] || 'bin';
  const filename = asset.filename || `asset_${asset.id}.${fileExtension}`;
  assetsFolder.file(filename, uint8Array);
}

export const useExportCampaign = (campaignId: string) => {
  const [isExporting, setIsExporting] = useState(false);
  const { handleError } = useErrorHandler();

  const campaign = useLiveQuery(
    () => (campaignId ? db.campaigns.get(campaignId) : undefined),
    [campaignId],
  );

  const isLoading = campaign === undefined;

  const exportCampaign = useCallback(async (): Promise<void> => {
    const c = await db.campaigns.get(campaignId);
    if (!c) {
      throw new Error('No campaign found to export');
    }

    setIsExporting(true);

    try {
      const rulesetId = c.rulesetId;

      const [scenes, campaignCharacters, documents, allScripts] = await Promise.all([
        db.campaignScenes.where('campaignId').equals(campaignId).toArray(),
        db.campaignCharacters.where('campaignId').equals(campaignId).toArray(),
        db.documents.filter((d) => d.campaignId === campaignId).toArray(),
        db.scripts.where('rulesetId').equals(rulesetId).toArray(),
      ]);

      const campaignScripts = allScripts.filter((s) => s.campaignId === campaignId);
      const sceneIds = scenes.map((s) => s.id);

      const [campaignEvents, sceneTurnCallbacks, scriptLogs] = await Promise.all([
        db.campaignEvents.where('campaignId').equals(campaignId).toArray(),
        sceneIds.length > 0
          ? db.sceneTurnCallbacks.where('campaignSceneId').anyOf(sceneIds).toArray()
          : Promise.resolve([] as SceneTurnCallback[]),
        db.scriptLogs.filter((log) => log.campaignId === campaignId).toArray(),
      ]);

      const rosterCharacterIds = [...new Set(campaignCharacters.map((cc) => cc.characterId))];
      const characters: Character[] = [];
      for (const charId of rosterCharacterIds) {
        const ch = await db.characters.get(charId);
        if (ch && ch.rulesetId === rulesetId) {
          characters.push(ch);
        }
      }

      const charIds = characters.map((x) => x.id);
      const [
        characterArchetypes,
        characterAttributes,
        inventories,
        characterWindows,
        characterPages,
      ] = await Promise.all([
        charIds.length > 0
          ? db.characterArchetypes.where('characterId').anyOf(charIds).toArray()
          : Promise.resolve([] as CharacterArchetype[]),
        charIds.length > 0
          ? db.characterAttributes.where('characterId').anyOf(charIds).toArray()
          : Promise.resolve([] as CharacterAttribute[]),
        charIds.length > 0
          ? db.inventories.where('characterId').anyOf(charIds).toArray()
          : Promise.resolve([] as Inventory[]),
        charIds.length > 0
          ? db.characterWindows.where('characterId').anyOf(charIds).toArray()
          : Promise.resolve([] as CharacterWindow[]),
        charIds.length > 0
          ? db.characterPages.where('characterId').anyOf(charIds).toArray()
          : Promise.resolve([] as CharacterPage[]),
      ]);

      const inventoryIds = inventories.map((inv) => inv.id);
      const inventoryItems =
        inventoryIds.length > 0
          ? await db.inventoryItems.where('inventoryId').anyOf(inventoryIds).toArray()
          : [];

      const assetIdSet = new Set<string>();
      collectAssetIdsFromCampaign(c, assetIdSet);
      for (const ch of characters) collectAssetIdsFromCharacter(ch, assetIdSet);
      for (const doc of documents) collectAssetIdsFromDocument(doc, assetIdSet);

      const assetIds = [...assetIdSet];
      const assets =
        assetIds.length > 0
          ? (await db.assets.bulkGet(assetIds)).filter(
              (a): a is Asset => a != null && a.rulesetId === rulesetId,
            )
          : [];

      const zip = new JSZip();
      const appData = zip.folder('application data');
      if (!appData) {
        throw new Error('Failed to create application data folder');
      }

      const metadata = {
        exportKind: 'quest-bound-campaign' as const,
        formatVersion: CAMPAIGN_EXPORT_FORMAT_VERSION,
        rulesetId,
        campaign: { id: c.id, label: c.label },
        exportInfo: {
          exportedAt: new Date().toISOString(),
          exportedBy: 'Quest Bound',
        },
        counts: {
          campaignScenes: scenes.length,
          campaignCharacters: campaignCharacters.length,
          campaignEvents: campaignEvents.length,
          sceneTurnCallbacks: sceneTurnCallbacks.length,
          characters: characters.length,
          characterArchetypes: characterArchetypes.length,
          characterAttributes: characterAttributes.length,
          inventories: inventories.length,
          inventoryItems: inventoryItems.length,
          characterWindows: characterWindows.length,
          characterPages: characterPages.length,
          documents: documents.length,
          scripts: campaignScripts.length,
          scriptLogs: scriptLogs.length,
          assets: assets.length,
        },
      };

      appData.file('metadata.json', JSON.stringify(metadata, null, 2));
      appData.file('campaign.json', JSON.stringify(c, null, 2));
      appData.file('campaignScenes.json', JSON.stringify(scenes, null, 2));
      appData.file('campaignCharacters.json', JSON.stringify(campaignCharacters, null, 2));
      appData.file('campaignEvents.json', JSON.stringify(campaignEvents, null, 2));
      appData.file('sceneTurnCallbacks.json', JSON.stringify(sceneTurnCallbacks, null, 2));

      if (characters.length > 0) {
        appData.file('characters.json', JSON.stringify(characters, null, 2));
      }
      if (characterArchetypes.length > 0) {
        appData.file('characterArchetypes.json', JSON.stringify(characterArchetypes, null, 2));
      }
      if (characterAttributes.length > 0) {
        appData.file('characterAttributes.json', JSON.stringify(characterAttributes, null, 2));
      }
      if (inventories.length > 0) {
        appData.file('inventories.json', JSON.stringify(inventories, null, 2));
      }
      if (inventoryItems.length > 0) {
        appData.file('inventoryItems.json', JSON.stringify(inventoryItems, null, 2));
      }
      if (characterWindows.length > 0) {
        appData.file('characterWindows.json', JSON.stringify(characterWindows, null, 2));
      }
      if (characterPages.length > 0) {
        appData.file('characterPages.json', JSON.stringify(characterPages, null, 2));
      }

      if (campaignScripts.length > 0) {
        appData.file('scripts.json', JSON.stringify(campaignScripts, null, 2));
      }
      if (scriptLogs.length > 0) {
        appData.file('scriptLogs.json', JSON.stringify(scriptLogs, null, 2));
      }

      if (documents.length > 0) {
        const documentsMetadata = documents.map(({ pdfData, ...rest }) => rest);
        appData.file('documents.json', JSON.stringify(documentsMetadata, null, 2));

        const documentsFolder = zip.folder('documents');
        if (documentsFolder) {
          for (const doc of documents) {
            if (doc.pdfData) {
              const base64Data = doc.pdfData.split(',')[1];
              if (base64Data) {
                const binaryData = atob(base64Data);
                const uint8Array = new Uint8Array(binaryData.length);
                for (let i = 0; i < binaryData.length; i++) {
                  uint8Array[i] = binaryData.charCodeAt(i);
                }
                const safeTitle = doc.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                documentsFolder.file(`${safeTitle}_${doc.id}.pdf`, uint8Array);
              }
            }
          }
        }
      }

      if (assets.length > 0) {
        const assetsMetadata = assets.map(({ data, ...rest }) => {
          const isUrl =
            typeof data === 'string' && (data.startsWith('http://') || data.startsWith('https://'));
          return isUrl ? { ...rest, data } : rest;
        });
        appData.file('assets.json', JSON.stringify(assetsMetadata, null, 2));

        const assetsFolder = zip.folder('assets');
        if (assetsFolder) {
          for (const asset of assets) {
            addBinaryAssetToZip(assetsFolder, asset);
          }
        }
      }

      const safeLabel = (c.label ?? 'campaign').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const readme = `# Campaign export: ${c.label ?? c.id}

This zip contains **campaign-only** data from Quest Bound (not a full ruleset).

## Contents

- \`application data/metadata.json\` — format marker, \`rulesetId\`, and record counts
- \`application data/campaign.json\` — campaign record
- \`application data/campaignScenes.json\`, \`campaignCharacters.json\`, \`campaignEvents.json\`, \`sceneTurnCallbacks.json\`
- \`application data/characters.json\` and related character sheet data (roster only)
- \`application data/documents.json\` + \`documents/\` — campaign documents (PDFs)
- \`application data/scripts.json\` — scripts scoped to this campaign
- \`application data/scriptLogs.json\` — script logs for this campaign (if any)
- \`application data/assets.json\` + \`assets/\` — binary assets referenced by the export

Restore into the **same ruleset** (\`rulesetId\` in metadata) so character and script references remain valid.

Exported: ${new Date().toISOString()}
`;

      zip.file('README.md', readme);

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${safeLabel}_${c.id.slice(0, 8)}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      await handleError(error as Error, {
        component: 'useExportCampaign/exportCampaign',
        severity: 'medium',
      });
      throw error;
    } finally {
      setIsExporting(false);
    }
  }, [campaignId, handleError]);

  return {
    campaign: campaign ?? null,
    isLoading,
    isExporting,
    exportCampaign,
  };
};
