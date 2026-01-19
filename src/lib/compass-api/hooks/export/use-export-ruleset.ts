import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import { useLiveQuery } from 'dexie-react-hooks';
import JSZip from 'jszip';
import { useState } from 'react';

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

  const characters = useLiveQuery(
    () => (rulesetId ? db.characters.where('rulesetId').equals(rulesetId).toArray() : []),
    [rulesetId],
  );

  const testCharacter = characters?.find((c) => c.isTestCharacter);

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
    testCharacter === undefined;

  const exportRuleset = async (): Promise<void> => {
    if (!ruleset || !rulesetId) {
      throw new Error('No ruleset found to export');
    }

    setIsExporting(true);

    try {
      const zip = new JSZip();

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
        },
      };

      zip.file('metadata.json', JSON.stringify(metadata, null, 2));

      // Create individual content files
      if (attributes && attributes.length > 0) {
        zip.file('attributes.json', JSON.stringify(attributes, null, 2));
      }

      if (actions && actions.length > 0) {
        zip.file('actions.json', JSON.stringify(actions, null, 2));
      }

      if (items && items.length > 0) {
        zip.file('items.json', JSON.stringify(items, null, 2));
      }

      if (testCharacter) {
        zip.file('characters.json', JSON.stringify([testCharacter], null, 2));
      }

      if (charts && charts.length > 0) {
        zip.file('charts.json', JSON.stringify(charts, null, 2));
      }

      if (windows && windows.length > 0) {
        zip.file('windows.json', JSON.stringify(windows, null, 2));
      }

      if (components && components.length > 0) {
        zip.file('components.json', JSON.stringify(components, null, 2));
      }

      if (assets && assets.length > 0) {
        zip.file('assets.json', JSON.stringify(assets, null, 2));

        // Also bundle assets as individual files in an "assets" folder
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
        zip.file('fonts.json', JSON.stringify(fonts, null, 2));
      }

      // Create a README file with instructions
      const readme = `# ${ruleset.title} Export

This zip file contains a complete export of the "${ruleset.title}" ruleset from Quest Bound.

## Contents

- \`metadata.json\` - Ruleset metadata and export information
- \`attributes.json\` - All attributes defined in this ruleset
- \`actions.json\` - All actions defined in this ruleset  
- \`items.json\` - All items defined in this ruleset
- \`charts.json\` - All charts defined in this ruleset
- \`windows.json\` - All windows defined in this ruleset
- \`components.json\` - All components defined in this ruleset
- \`assets.json\` - All assets metadata defined in this ruleset
- \`assets/\` - Directory containing all asset files organized by their directory structure
- \`fonts.json\` - All custom fonts defined in this ruleset

## Import Instructions

To import this ruleset back into Quest Bound:

1. Use the Import feature in Quest Bound
2. Select the appropriate JSON files for the content you want to import
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
