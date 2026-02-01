import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type { Action, Attribute, Item } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import JSZip from 'jszip';
import { useState } from 'react';

// Define the columns to export for each type (matching use-export.ts)
const ATTRIBUTE_COLUMNS: (keyof Attribute)[] = [
  'id',
  'title',
  'description',
  'category',
  'type',
  'options',
  'defaultValue',
  'optionsChartRef',
  'optionsChartColumnHeader',
  'min',
  'max',
];

const ITEM_COLUMNS: (keyof Item)[] = [
  'id',
  'title',
  'description',
  'category',
  'weight',
  'defaultQuantity',
  'stackSize',
  'isContainer',
  'isStorable',
  'isEquippable',
  'isConsumable',
  'inventoryWidth',
  'inventoryHeight',
];

const ACTION_COLUMNS: (keyof Action)[] = ['id', 'title', 'description', 'category'];

/**
 * Escapes a value for TSV format.
 */
function escapeTsvValue(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }

  if (Array.isArray(value)) {
    return value.map((v) => String(v)).join('|');
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  const str = String(value);
  return str.replace(/\t/g, '    ').replace(/\n/g, '\\n').replace(/\r/g, '');
}

/**
 * Converts an array of objects to TSV format
 */
function convertToTsv<T extends Record<string, unknown>>(data: T[], columns: (keyof T)[]): string {
  const header = columns.join('\t');
  const rows = data.map((item) => columns.map((col) => escapeTsvValue(item[col])).join('\t'));
  return [header, ...rows].join('\n');
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
    () => (rulesetId ? db.documents.where('rulesetId').equals(rulesetId).toArray() : []),
    [rulesetId],
  );

  const characters = useLiveQuery(
    () => (rulesetId ? db.characters.where('rulesetId').equals(rulesetId).toArray() : []),
    [rulesetId],
  );

  const testCharacter = characters?.find((c) => c.isTestCharacter);

  const characterAttributes = useLiveQuery(
    () =>
      testCharacter
        ? db.characterAttributes.where('characterId').equals(testCharacter.id).toArray()
        : [],
    [testCharacter?.id],
  );

  const inventories = useLiveQuery(
    () =>
      testCharacter ? db.inventories.where('characterId').equals(testCharacter.id).toArray() : [],
    [testCharacter?.id],
  );

  const characterWindows = useLiveQuery(
    () =>
      testCharacter
        ? db.characterWindows.where('characterId').equals(testCharacter.id).toArray()
        : [],
    [testCharacter?.id],
  );

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
    testCharacter === undefined ||
    characterAttributes === undefined ||
    inventories === undefined ||
    characterWindows === undefined;

  const exportRuleset = async (): Promise<void> => {
    if (!ruleset || !rulesetId) {
      throw new Error('No ruleset found to export');
    }

    setIsExporting(true);

    try {
      const zip = new JSZip();

      // Create application data folder for JSON files
      const appDataFolder = zip.folder('application data');
      if (!appDataFolder) {
        throw new Error('Failed to create application data folder');
      }

      // Create metadata file
      const metadata = {
        ruleset: {
          ...ruleset,
          id: ruleset.id,
        },
        exportInfo: {
          exportedAt: new Date().toISOString(),
          exportedBy: 'Quest Bound',
          version: '1.0.0',
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
          characterAttributes: characterAttributes?.length || 0,
          inventories: inventories?.length || 0,
          characterWindows: characterWindows?.length || 0,
        },
      };

      appDataFolder.file('metadata.json', JSON.stringify(metadata, null, 2));

      // Create individual content files (attributes, actions, items as TSV at root level)
      if (attributes && attributes.length > 0) {
        zip.file('attributes.tsv', convertToTsv(attributes, ATTRIBUTE_COLUMNS));
      }

      if (actions && actions.length > 0) {
        zip.file('actions.tsv', convertToTsv(actions, ACTION_COLUMNS));
      }

      if (items && items.length > 0) {
        zip.file('items.tsv', convertToTsv(items, ITEM_COLUMNS));
      }

      if (testCharacter) {
        appDataFolder.file('characters.json', JSON.stringify([testCharacter], null, 2));
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
        appDataFolder.file('assets.json', JSON.stringify(assets, null, 2));

        // Also bundle assets as individual files in an "assets" folder at root level
        const assetsFolder = zip.folder('assets');
        if (assetsFolder) {
          assets.forEach((asset) => {
            // Convert Base64 data URL to binary data
            const base64Data = asset.data.split(',')[1]; // Remove data:image/...;base64, prefix
            const binaryData = atob(base64Data);
            const uint8Array = new Uint8Array(binaryData.length);
            for (let i = 0; i < binaryData.length; i++) {
              uint8Array[i] = binaryData.charCodeAt(i);
            }

            // Use the original filename or generate one based on asset ID and type
            const fileExtension = asset.type.split('/')[1] || 'bin';
            const filename = asset.filename || `asset_${asset.id}.${fileExtension}`;

            // Determine the target folder based on asset.directory
            let targetFolder = assetsFolder;
            if (asset.directory) {
              // Create nested folder structure based on directory property
              // Handle both single-level and multi-level directory paths
              const directoryPath = asset.directory.replace(/^\/+|\/+$/g, ''); // Remove leading/trailing slashes
              if (directoryPath) {
                const pathSegments = directoryPath
                  .split('/')
                  .filter((segment) => segment.length > 0);
                let currentFolder = assetsFolder;

                // Create nested folders for each path segment
                for (const segment of pathSegments) {
                  const existingFolder = currentFolder.folder(segment);
                  if (existingFolder) {
                    currentFolder = existingFolder;
                  } else {
                    // If folder creation fails, fall back to root assets folder
                    currentFolder = assetsFolder;
                    break;
                  }
                }
                targetFolder = currentFolder;
              }
            }

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

      if (characterAttributes && characterAttributes.length > 0) {
        appDataFolder.file('characterAttributes.json', JSON.stringify(characterAttributes, null, 2));
      }

      if (inventories && inventories.length > 0) {
        appDataFolder.file('inventories.json', JSON.stringify(inventories, null, 2));
      }

      if (characterWindows && characterWindows.length > 0) {
        appDataFolder.file('characterWindows.json', JSON.stringify(characterWindows, null, 2));
      }

      // Create a README file with instructions
      const readme = `# ${ruleset.title} Export

This zip file contains a complete export of the "${ruleset.title}" ruleset from Quest Bound.

## Contents

### TSV Files (Editable)
- \`attributes.tsv\` - All attributes defined in this ruleset
- \`actions.tsv\` - All actions defined in this ruleset
- \`items.tsv\` - All items defined in this ruleset
- \`charts/\` - Directory containing chart data as TSV files (named as \`{title}_{id}.tsv\`)

### Binary Files
- \`assets/\` - Directory containing all asset files organized by their directory structure
- \`fonts/\` - Directory containing font files (named as \`{label}_{id}.ttf\`)
- \`documents/\` - Directory containing all document PDF files

### Application Data (JSON)
- \`application data/metadata.json\` - Ruleset metadata and export information
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

## Import Instructions

To import this ruleset back into Quest Bound:

1. Use the Import feature in Quest Bound
2. Select the zip file to import the complete ruleset
3. Follow the import wizard to complete the process

## Version Information

- Ruleset Version: ${ruleset.version}
- Exported: ${new Date().toISOString()}
- Quest Bound Version: 1.0.0

For more information about Quest Bound, visit the application documentation.
`;

      zip.file('README.md', readme);

      // Generate the zip file
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      // Create download link
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${ruleset.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export_${new Date().toISOString().split('T')[0]}.zip`;

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
  };
};
