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

  const isLoading =
    ruleset === undefined ||
    attributes === undefined ||
    actions === undefined ||
    items === undefined ||
    charts === undefined;

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
          id: ruleset.id,
          title: ruleset.title,
          description: ruleset.description,
          version: ruleset.version,
          createdBy: ruleset.createdBy,
          createdAt: ruleset.createdAt,
          updatedAt: ruleset.updatedAt,
          details: ruleset.details,
          image: ruleset.image,
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

      if (charts && charts.length > 0) {
        zip.file('charts.json', JSON.stringify(charts, null, 2));
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
    isLoading,
    isExporting,
    exportRuleset,
  };
};
