import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type { Character, Campaign } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import JSZip from 'jszip';
import { useState } from 'react';
import {
  ACTION_COLUMNS,
  ATTRIBUTE_COLUMNS,
  ITEM_COLUMNS,
  type ActionWithAssetFilename,
  type ItemWithAssetFilename,
} from './types';
import { buildAssetFilenameMap, convertToTsv } from './utils';
import { exportScripts } from './script-export';

export interface ExportRulesetOptions {
  /** Character IDs to include in the export (in addition to test characters). */
  characterIds?: string[];
  /** Campaign IDs to include in the export. */
  campaignIds?: string[];
}

export const useExportRuleset = (rulesetId: string) => {
  const [isExporting, setIsExporting] = useState(false);
  const { handleError } = useErrorHandler();

  // Fetch all ruleset data
  const ruleset = useLiveQuery(() => db.rulesets.get(rulesetId), [rulesetId]);

  const attributes = useLiveQuery(
    () => (rulesetId ? db.attributes.where('rulesetId').equals(rulesetId).toArray() : []),
    [rulesetId],
  );

  const actions = useLiveQuery(
    () => (rulesetId ? db.actions.where('rulesetId').equals(rulesetId).toArray() : []),
    [rulesetId],
  );

  const items = useLiveQuery(
    () => (rulesetId ? db.items.where('rulesetId').equals(rulesetId).toArray() : []),
    [rulesetId],
  );

  const charts = useLiveQuery(
    () => (rulesetId ? db.charts.where('rulesetId').equals(rulesetId).toArray() : []),
    [rulesetId],
  );

  const windows = useLiveQuery(
    () => (rulesetId ? db.windows.where('rulesetId').equals(rulesetId).toArray() : []),
    [rulesetId],
  );

  const components = useLiveQuery(async () => {
    if (!rulesetId) return [];
    const rulesetWindows = await db.windows.where('rulesetId').equals(rulesetId).toArray();
    const windowIds = rulesetWindows.map((w) => w.id);
    if (windowIds.length === 0) return [];
    return db.components.where('windowId').anyOf(windowIds).toArray();
  }, [rulesetId]);

  const assets = useLiveQuery(
    () => (rulesetId ? db.assets.where('rulesetId').equals(rulesetId).toArray() : []),
    [rulesetId],
  );

  const fonts = useLiveQuery(
    () => (rulesetId ? db.fonts.where('rulesetId').equals(rulesetId).toArray() : []),
    [rulesetId],
  );

  const documents = useLiveQuery(
    () =>
      rulesetId
        ? db.documents
            .where('rulesetId')
            .equals(rulesetId)
            .filter((d) => d.worldId == null && d.campaignId == null)
            .toArray()
        : [],
    [rulesetId],
  );

  const archetypes = useLiveQuery(
    () =>
      rulesetId
        ? db.archetypes.where('rulesetId').equals(rulesetId).sortBy('loadOrder')
        : Promise.resolve([] as import('@/types').Archetype[]),
    [rulesetId],
  );

  const customProperties = useLiveQuery(
    () =>
      rulesetId
        ? db.customProperties.where('rulesetId').equals(rulesetId).toArray()
        : Promise.resolve([] as import('@/types').CustomProperty[]),
    [rulesetId],
  );

  const archetypeCustomProperties = useLiveQuery(
    async () => {
      if (!archetypes || archetypes.length === 0) return [];
      const archetypeIds = archetypes.map((a) => a.id);
      return db.archetypeCustomProperties
        .where('archetypeId')
        .anyOf(archetypeIds)
        .toArray();
    },
    [archetypes],
  );

  const itemCustomProperties = useLiveQuery(
    async () => {
      if (!items || items.length === 0) return [];
      const itemIds = items.map((i) => i.id);
      return db.itemCustomProperties.where('itemId').anyOf(itemIds).toArray();
    },
    [items],
  );

  const testCharacters = useLiveQuery(
    async () => {
      if (!rulesetId || !archetypes || archetypes.length === 0) return [];
      const charIds = archetypes
        .map((a) => a.testCharacterId)
        .filter((id): id is string => !!id);
      if (charIds.length === 0) return [];
      return (await Promise.all(charIds.map((id) => db.characters.get(id)))).filter(
        (c): c is import('@/types').Character => c != null,
      );
    },
    [rulesetId, archetypes],
  );

  const testCharacterIds = testCharacters?.map((c) => c.id) ?? [];

  const characterAttributes = useLiveQuery(
    () =>
      testCharacterIds.length > 0
        ? db.characterAttributes.where('characterId').anyOf(testCharacterIds).toArray()
        : [],
    [testCharacterIds.join(',')],
  );

  const inventories = useLiveQuery(
    () =>
      testCharacterIds.length > 0
        ? db.inventories.where('characterId').anyOf(testCharacterIds).toArray()
        : [],
    [testCharacterIds.join(',')],
  );

  const characterWindows = useLiveQuery(
    () =>
      testCharacterIds.length > 0
        ? db.characterWindows.where('characterId').anyOf(testCharacterIds).toArray()
        : [],
    [testCharacterIds.join(',')],
  );

  const rulesetWindows = useLiveQuery(
    () =>
      rulesetId ? db.rulesetWindows.where('rulesetId').equals(rulesetId).toArray() : [],
    [rulesetId],
  );

  /** Player characters only (non-test, non-NPC) — selectable in export modal. NPCs are auto-included when their campaigns/scenes are selected. */
  const exportableCharacters = useLiveQuery(
    () =>
      rulesetId
        ? db.characters
            .where('rulesetId')
            .equals(rulesetId)
            .filter((c) => !c.isTestCharacter && c.isNpc !== true)
            .toArray()
        : Promise.resolve([] as Character[]),
    [rulesetId],
  );

  /** Campaigns that use this ruleset (for optional export). */
  const campaigns = useLiveQuery(
    () =>
      rulesetId
        ? db.campaigns.where('rulesetId').equals(rulesetId).toArray()
        : Promise.resolve([] as Campaign[]),
    [rulesetId],
  );

  const characterPages = useLiveQuery(
    async () => {
      if (testCharacterIds.length === 0) return [];
      return db.characterPages
        .where('characterId')
        .anyOf(testCharacterIds)
        .toArray();
    },
    [testCharacterIds.join(',')],
  );

  const pages = useLiveQuery(
    () => (rulesetId ? db.pages.where('rulesetId').equals(rulesetId).toArray() : []),
    [rulesetId],
  );

  const inventoryItems = useLiveQuery(async () => {
    if (!inventories || inventories.length === 0) return [];
    const inventoryIds = inventories.map((inv) => inv.id);
    return db.inventoryItems.where('inventoryId').anyOf(inventoryIds).toArray();
  }, [inventories]);

  const isLoading =
    ruleset === undefined ||
    attributes === undefined ||
    actions === undefined ||
    items === undefined ||
    charts === undefined ||
    windows === undefined ||
    components === undefined ||
    assets === undefined ||
    fonts === undefined ||
    documents === undefined ||
    archetypes === undefined ||
    customProperties === undefined ||
    archetypeCustomProperties === undefined ||
    itemCustomProperties === undefined ||
    testCharacters === undefined ||
    characterAttributes === undefined ||
    inventories === undefined ||
    characterWindows === undefined ||
    characterPages === undefined ||
    rulesetWindows === undefined ||
    pages === undefined ||
    inventoryItems === undefined;

  const exportRuleset = async (options?: ExportRulesetOptions): Promise<void> => {
    if (!ruleset || !rulesetId) {
      throw new Error('No ruleset found to export');
    }

    setIsExporting(true);

    try {
      const zip = new JSZip();

      // Resolve characters to export: test characters + optionally selected characters
      const testCharIds = new Set(testCharacters?.map((c) => c.id) ?? []);
      const selectedCharacterIds = options?.characterIds ?? [];
      let exportedCharacters = [...(testCharacters ?? [])];
      let exportedCharacterAttributes = [...(characterAttributes ?? [])];
      let exportedInventories = [...(inventories ?? [])];
      let exportedCharacterWindows = [...(characterWindows ?? [])];
      let exportedCharacterPages = [...(characterPages ?? [])];
      let exportedInventoryItems = [...(inventoryItems ?? [])];

      if (selectedCharacterIds.length > 0) {
        const selectedChars = await Promise.all(
          selectedCharacterIds
            .filter((id) => !testCharIds.has(id))
            .map((id) => db.characters.get(id)),
        );
        const selectedCharacters = selectedChars.filter(
          (c): c is Character => c != null && c.rulesetId === rulesetId,
        );
        if (selectedCharacters.length > 0) {
          const selectedCharIds = selectedCharacters.map((c) => c.id);
          const [selAttrs, selInvs, selCw, selCp, selInvItems] = await Promise.all([
            db.characterAttributes.where('characterId').anyOf(selectedCharIds).toArray(),
            db.inventories.where('characterId').anyOf(selectedCharIds).toArray(),
            db.characterWindows.where('characterId').anyOf(selectedCharIds).toArray(),
            db.characterPages.where('characterId').anyOf(selectedCharIds).toArray(),
            (async () => {
              const invs = await db.inventories
                .where('characterId')
                .anyOf(selectedCharIds)
                .toArray();
              const invIds = invs.map((i) => i.id);
              return invIds.length > 0
                ? db.inventoryItems.where('inventoryId').anyOf(invIds).toArray()
                : [];
            })(),
          ]);
          exportedCharacters = [...exportedCharacters, ...selectedCharacters];
          exportedCharacterAttributes = [...exportedCharacterAttributes, ...selAttrs];
          exportedInventories = [...exportedInventories, ...selInvs];
          exportedCharacterWindows = [...exportedCharacterWindows, ...selCw];
          exportedCharacterPages = [...exportedCharacterPages, ...selCp];
          exportedInventoryItems = [...exportedInventoryItems, ...selInvItems];
        }
      }

      // Resolve campaigns to export
      let exportedCampaigns: import('@/types').Campaign[] = [];
      let exportedCampaignScenes: import('@/types').CampaignScene[] = [];
      let exportedCampaignCharacters: import('@/types').CampaignCharacter[] = [];
      let exportedCampaignEvents: import('@/types').CampaignEvent[] = [];
      let exportedSceneTurnCallbacks: import('@/types').SceneTurnCallback[] = [];
      const campaignIds = options?.campaignIds ?? [];
      if (campaignIds.length > 0) {
        const camps = await db.campaigns.where('id').anyOf(campaignIds).toArray();
        const validCampaigns = camps.filter((c) => c.rulesetId === rulesetId);
        if (validCampaigns.length > 0) {
          exportedCampaigns = validCampaigns;
          const campIds = validCampaigns.map((c) => c.id);
          const scenes = await db.campaignScenes.where('campaignId').anyOf(campIds).toArray();
          exportedCampaignScenes = scenes;
          const sceneIds = scenes.map((s) => s.id);
          const [cc, ce, stc] = await Promise.all([
            db.campaignCharacters.where('campaignId').anyOf(campIds).toArray(),
            db.campaignEvents.where('campaignId').anyOf(campIds).toArray(),
            db.sceneTurnCallbacks
              .where('campaignSceneId')
              .anyOf(sceneIds)
              .toArray(),
          ]);
          exportedCampaignCharacters = cc;
          exportedCampaignEvents = ce;
          exportedSceneTurnCallbacks = stc;

          // Auto-include characters that appear in selected campaigns (e.g. NPCs in scenes)
          const exportedCharIds = new Set(exportedCharacters.map((c) => c.id));
          const campaignCharacterIds = [
            ...new Set(exportedCampaignCharacters.map((cc) => cc.characterId)),
          ].filter((id) => !exportedCharIds.has(id));
          if (campaignCharacterIds.length > 0) {
            const campaignChars = await Promise.all(
              campaignCharacterIds.map((id) => db.characters.get(id)),
            );
            const toAdd = campaignChars.filter(
              (c): c is Character => c != null && c.rulesetId === rulesetId,
            );
            if (toAdd.length > 0) {
              const toAddIds = toAdd.map((c) => c.id);
              const [attrs, invs, cw, cp, invItems] = await Promise.all([
                db.characterAttributes.where('characterId').anyOf(toAddIds).toArray(),
                db.inventories.where('characterId').anyOf(toAddIds).toArray(),
                db.characterWindows.where('characterId').anyOf(toAddIds).toArray(),
                db.characterPages.where('characterId').anyOf(toAddIds).toArray(),
                (async () => {
                  const invList = await db.inventories
                    .where('characterId')
                    .anyOf(toAddIds)
                    .toArray();
                  const ids = invList.map((i) => i.id);
                  return ids.length > 0
                    ? db.inventoryItems.where('inventoryId').anyOf(ids).toArray()
                    : [];
                })(),
              ]);
              exportedCharacters = [...exportedCharacters, ...toAdd];
              exportedCharacterAttributes = [...exportedCharacterAttributes, ...attrs];
              exportedInventories = [...exportedInventories, ...invs];
              exportedCharacterWindows = [...exportedCharacterWindows, ...cw];
              exportedCharacterPages = [...exportedCharacterPages, ...cp];
              exportedInventoryItems = [...exportedInventoryItems, ...invItems];
            }
          }
        }
      }

      // Create application data folder for JSON files
      const appDataFolder = zip.folder('application data');
      if (!appDataFolder) {
        throw new Error('Failed to create application data folder');
      }

      // Export scripts
      const scriptExportResult = await exportScripts(rulesetId);

      // Create metadata file (include CTA asset IDs so they are restored on import)
      const metadata = {
        ruleset: {
          ...ruleset,
          id: ruleset.id,
          charactersCtaAssetId: ruleset.charactersCtaAssetId ?? null,
          campaignsCtaAssetId: ruleset.campaignsCtaAssetId ?? null,
        },
        exportInfo: {
          exportedAt: new Date().toISOString(),
          exportedBy: 'Quest Bound',
          version: '2.0.0',
        },
        counts: {
          attributes: attributes?.length || 0,
          actions: actions?.length || 0,
          items: items?.length || 0,
          charts: charts?.length || 0,
          windows: windows?.length || 0,
          components: components?.length || 0,
          assets: assets?.length || 0,
          fonts: fonts?.length || 0,
          documents: documents?.length || 0,
          archetypes: archetypes?.length || 0,
          customProperties: customProperties?.length || 0,
          archetypeCustomProperties: archetypeCustomProperties?.length || 0,
          itemCustomProperties: itemCustomProperties?.length || 0,
          characterAttributes: exportedCharacterAttributes.length,
          inventories: exportedInventories.length,
          characterWindows: exportedCharacterWindows.length,
          characterPages: exportedCharacterPages.length,
          rulesetWindows: rulesetWindows?.length || 0,
          pages: pages?.length || 0,
          inventoryItems: exportedInventoryItems.length,
          scripts: scriptExportResult.files.length,
          campaigns: exportedCampaigns.length,
          campaignScenes: exportedCampaignScenes.length,
          campaignCharacters: exportedCampaignCharacters.length,
          campaignEvents: exportedCampaignEvents.length,
          sceneTurnCallbacks: exportedSceneTurnCallbacks.length,
        },
        scripts: scriptExportResult.metadata,
      };

      appDataFolder.file('metadata.json', JSON.stringify(metadata, null, 2));

      // Add script files to zip
      for (const scriptFile of scriptExportResult.files) {
        zip.file(scriptFile.path, scriptFile.content);
      }

      // Log any script export warnings
      if (scriptExportResult.warnings.length > 0) {
        console.warn('Script export warnings:', scriptExportResult.warnings);
      }
      if (scriptExportResult.errors.length > 0) {
        console.error('Script export errors:', scriptExportResult.errors);
      }

      // Build asset filename map for resolving assetIds to filenames
      const assetFilenameMap = buildAssetFilenameMap(assets || []);

      // Create individual content files (attributes, actions, items as TSV at root level)
      if (attributes && attributes.length > 0) {
        zip.file('attributes.tsv', convertToTsv(attributes, ATTRIBUTE_COLUMNS));
      }

      if (actions && actions.length > 0) {
        // Add assetFilename to each action
        const actionsWithFilenames: ActionWithAssetFilename[] = actions.map((action) => ({
          ...action,
          assetFilename: action.assetId ? assetFilenameMap[action.assetId] : undefined,
        }));
        zip.file('actions.tsv', convertToTsv(actionsWithFilenames, ACTION_COLUMNS));
      }

      if (items && items.length > 0) {
        // Add assetFilename to each item
        const itemsWithFilenames: ItemWithAssetFilename[] = items.map((item) => ({
          ...item,
          assetFilename: item.assetId ? assetFilenameMap[item.assetId] : undefined,
        }));
        zip.file('items.tsv', convertToTsv(itemsWithFilenames, ITEM_COLUMNS));
      }

      if (archetypes && archetypes.length > 0) {
        appDataFolder.file('archetypes.json', JSON.stringify(archetypes, null, 2));
      }

      if (customProperties && customProperties.length > 0) {
        appDataFolder.file('customProperties.json', JSON.stringify(customProperties, null, 2));
      }

      if (archetypeCustomProperties && archetypeCustomProperties.length > 0) {
        appDataFolder.file(
          'archetypeCustomProperties.json',
          JSON.stringify(archetypeCustomProperties, null, 2),
        );
      }

      if (itemCustomProperties && itemCustomProperties.length > 0) {
        appDataFolder.file(
          'itemCustomProperties.json',
          JSON.stringify(itemCustomProperties, null, 2),
        );
      }

      if (exportedCharacters.length > 0) {
        appDataFolder.file('characters.json', JSON.stringify(exportedCharacters, null, 2));
      }

      if (charts && charts.length > 0) {
        // Store chart metadata without the data property
        const chartsMetadata = charts.map(({ data, ...rest }) => rest);
        appDataFolder.file('charts.json', JSON.stringify(chartsMetadata, null, 2));

        // Store chart data as TSV files in a charts folder at root level
        const chartsFolder = zip.folder('charts');
        if (chartsFolder) {
          charts.forEach((chart) => {
            if (chart.data) {
              try {
                // Parse the JSON data (2D array) and convert to TSV
                const chartData: string[][] = JSON.parse(chart.data);
                const tsvContent = chartData.map((row) => row.join('\t')).join('\n');
                // Use format: {title}_{id}.tsv with id in curly braces for parsing
                const safeTitle = chart.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                chartsFolder.file(`${safeTitle}_{${chart.id}}.tsv`, tsvContent);
              } catch {
                // If parsing fails, store raw data
                const safeTitle = chart.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                chartsFolder.file(`${safeTitle}_{${chart.id}}.tsv`, chart.data);
              }
            }
          });
        }
      }

      if (windows && windows.length > 0) {
        appDataFolder.file('windows.json', JSON.stringify(windows, null, 2));
      }

      if (components && components.length > 0) {
        appDataFolder.file('components.json', JSON.stringify(components, null, 2));
      }

      if (assets && assets.length > 0) {
        // Store asset metadata without the data property (data is stored as files in assets folder)
        const assetsMetadata = assets.map(({ data, ...rest }) => rest);
        appDataFolder.file('assets.json', JSON.stringify(assetsMetadata, null, 2));

        // Bundle assets as individual files in an "assets" folder at root level
        const assetsFolder = zip.folder('assets');
        if (assetsFolder) {
          assets.forEach((asset) => {
            // Only decode when data is a base64 data URL (e.g. data:image/png;base64,...).
            // URL-type assets store a URL string in asset.data; atob() would throw on that.
            const isDataUrl =
              typeof asset.data === 'string' &&
              asset.data.startsWith('data:') &&
              asset.data.includes(';base64,');

            if (!isDataUrl) {
              // Skip binary export for URL/blob assets; metadata is still in assets.json
              return;
            }

            const base64Data = asset.data.split(',')[1];
            if (!base64Data) return;

            const binaryData = atob(base64Data);
            const uint8Array = new Uint8Array(binaryData.length);
            for (let i = 0; i < binaryData.length; i++) {
              uint8Array[i] = binaryData.charCodeAt(i);
            }

            // Use the original filename or generate one based on asset ID and type
            const fileExtension = asset.type.split('/')[1] || 'bin';
            const filename = asset.filename || `asset_${asset.id}.${fileExtension}`;

            // All assets go in root assets folder (filename-only per v44; directory removed)
            const targetFolder = assetsFolder;

            targetFolder.file(filename, uint8Array);
          });
        }
      }

      if (fonts && fonts.length > 0) {
        // Store font metadata without the data property
        const fontsMetadata = fonts.map(({ data, ...rest }) => rest);
        appDataFolder.file('fonts.json', JSON.stringify(fontsMetadata, null, 2));

        // Store font files in a "fonts" folder
        const fontsFolder = zip.folder('fonts');
        if (fontsFolder) {
          fonts.forEach((font) => {
            if (font.data) {
              // Font data is typically a base64 data URL
              const base64Data = font.data.split(',')[1];
              if (base64Data) {
                const binaryData = atob(base64Data);
                const uint8Array = new Uint8Array(binaryData.length);
                for (let i = 0; i < binaryData.length; i++) {
                  uint8Array[i] = binaryData.charCodeAt(i);
                }

                // Use format: {label}_{id}.ttf with id in curly braces for parsing
                const safeLabel = font.label.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                fontsFolder.file(`${safeLabel}_{${font.id}}.ttf`, uint8Array);
              }
            }
          });
        }
      }

      if (documents && documents.length > 0) {
        // Store document metadata (without pdfData to avoid duplication)
        const documentsMetadata = documents.map(({ pdfData, ...rest }) => rest);
        appDataFolder.file('documents.json', JSON.stringify(documentsMetadata, null, 2));

        // Store PDF files in a "documents" folder
        const documentsFolder = zip.folder('documents');
        if (documentsFolder) {
          documents.forEach((doc) => {
            if (doc.pdfData) {
              // Convert Base64 data URL to binary data
              const base64Data = doc.pdfData.split(',')[1]; // Remove data:application/pdf;base64, prefix
              if (base64Data) {
                const binaryData = atob(base64Data);
                const uint8Array = new Uint8Array(binaryData.length);
                for (let i = 0; i < binaryData.length; i++) {
                  uint8Array[i] = binaryData.charCodeAt(i);
                }

                // Use the document title or ID for the filename
                const safeTitle = doc.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const filename = `${safeTitle}_${doc.id}.pdf`;

                documentsFolder.file(filename, uint8Array);
              }
            }
          });
        }
      }

      if (exportedCharacterAttributes.length > 0) {
        appDataFolder.file(
          'characterAttributes.json',
          JSON.stringify(exportedCharacterAttributes, null, 2),
        );
      }

      if (exportedInventories.length > 0) {
        appDataFolder.file('inventories.json', JSON.stringify(exportedInventories, null, 2));
      }

      if (exportedCharacterWindows.length > 0) {
        appDataFolder.file(
          'characterWindows.json',
          JSON.stringify(exportedCharacterWindows, null, 2),
        );
      }

      if (pages && pages.length > 0) {
        appDataFolder.file('pages.json', JSON.stringify(pages, null, 2));
      }
      if (rulesetWindows && rulesetWindows.length > 0) {
        appDataFolder.file('rulesetWindows.json', JSON.stringify(rulesetWindows, null, 2));
      }
      if (exportedCharacterPages.length > 0) {
        appDataFolder.file(
          'characterPages.json',
          JSON.stringify(exportedCharacterPages, null, 2),
        );
      }

      if (exportedInventoryItems.length > 0) {
        appDataFolder.file(
          'inventoryItems.json',
          JSON.stringify(exportedInventoryItems, null, 2),
        );
      }

      if (exportedCampaigns.length > 0) {
        appDataFolder.file('campaigns.json', JSON.stringify(exportedCampaigns, null, 2));
      }
      if (exportedCampaignScenes.length > 0) {
        appDataFolder.file(
          'campaignScenes.json',
          JSON.stringify(exportedCampaignScenes, null, 2),
        );
      }
      if (exportedCampaignCharacters.length > 0) {
        appDataFolder.file(
          'campaignCharacters.json',
          JSON.stringify(exportedCampaignCharacters, null, 2),
        );
      }
      if (exportedCampaignEvents.length > 0) {
        appDataFolder.file(
          'campaignEvents.json',
          JSON.stringify(exportedCampaignEvents, null, 2),
        );
      }
      if (exportedSceneTurnCallbacks.length > 0) {
        appDataFolder.file(
          'sceneTurnCallbacks.json',
          JSON.stringify(exportedSceneTurnCallbacks, null, 2),
        );
      }

      // Create a markdown file named after the ruleset title containing only the description
      const safeRulesetTitle = ruleset.title
        ? ruleset.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()
        : 'ruleset';

      zip.file(`${safeRulesetTitle}.md`, ruleset.description ?? '');

      // Create a README file with instructions
      const readme = `# ${ruleset.title} Export

This zip file contains a complete export of the "${ruleset.title}" ruleset from Quest Bound.

## Contents

### TSV Files (Editable)
- \`attributes.tsv\` - All attributes defined in this ruleset
- \`actions.tsv\` - All actions defined in this ruleset
- \`items.tsv\` - All items defined in this ruleset
- \`charts/\` - Directory containing chart data as TSV files (named as \`{title}_{id}.tsv\`)

### Script Files (Editable)
- \`scripts/\` - Directory containing QBScript files organized by entity type
  - \`scripts/global/\` - Global utility scripts
  - \`scripts/attributes/\` - Scripts associated with attributes
  - \`scripts/actions/\` - Scripts associated with actions
  - \`scripts/items/\` - Scripts associated with items
- Script metadata is stored in \`application data/metadata.json\` under the \`scripts\` array
- Scripts can be edited externally and will be re-imported when the ruleset is imported

### Binary Files
- \`assets/\` - Directory containing all asset files organized by their directory structure
- \`fonts/\` - Directory containing font files (named as \`{label}_{id}.ttf\`)
- \`documents/\` - Directory containing all document PDF files

### Application Data (JSON)
- \`application data/metadata.json\` - Ruleset metadata, export information, and script metadata
- \`application data/charts.json\` - Chart metadata (links to TSV files in charts/)
- \`application data/windows.json\` - All windows defined in this ruleset
- \`application data/components.json\` - All components defined in this ruleset
- \`application data/assets.json\` - All assets metadata
- \`application data/fonts.json\` - All custom fonts
- \`application data/documents.json\` - All document metadata
- \`application data/characters.json\` - Test character data
- \`application data/characterAttributes.json\` - Test character attribute values
- \`application data/inventories.json\` - Test character inventory associations
- \`application data/characterWindows.json\` - Test character window positions
- \`application data/pages.json\` - Ruleset sheet page templates (page definitions with rulesetId)
- \`application data/rulesetWindows.json\` - Ruleset page window layout (pageId, windowId, position)
- \`application data/characterPages.json\` - Test character sheet pages (full page content + pageId template ref)
- \`application data/inventoryItems.json\` - Test character inventory items

## Import Instructions

To import this ruleset back into Quest Bound:

1. Use the Import feature in Quest Bound
2. Select the zip file to import the complete ruleset
3. Follow the import wizard to complete the process

## External Editing

You can edit the following files externally:
- TSV files (attributes, actions, items, charts)
- QBScript files (.qbs files in the scripts/ directory)

When you re-import the ruleset, your changes will be preserved.

## Version Information

- Ruleset Version: ${ruleset.version}
- Exported: ${new Date().toISOString()}
- Quest Bound Version: 2.0.0
- Scripts Exported: ${scriptExportResult.files.length}

For more information about Quest Bound, visit the application documentation.
`;

      zip.file('README.md', readme);

      // Generate the zip file
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      // Create download link
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${ruleset.title
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase()}_${ruleset.version}.zip`;

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      URL.revokeObjectURL(url);
    } catch (error) {
      await handleError(error as Error, {
        component: 'useExportRuleset/exportRuleset',
        severity: 'medium',
      });
      throw error;
    } finally {
      setIsExporting(false);
    }
  };

  return {
    ruleset,
    attributes: attributes || [],
    actions: actions || [],
    items: items || [],
    charts: charts || [],
    windows: windows || [],
    components: components || [],
    isLoading,
    isExporting,
    exportRuleset,
    exportableCharacters: exportableCharacters ?? [],
    campaigns: campaigns ?? [],
  };
};
