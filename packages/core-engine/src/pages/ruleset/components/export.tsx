import { Button } from '@/components/ui/button';
import { useActiveRuleset, useExport } from '@/lib/compass-api';
import { useExternalRulesetGrantStore } from '@/stores';
import { ArrowDownToLine } from 'lucide-react';

interface ExportProps {
  type: 'attributes' | 'items' | 'actions';
}

export const Export = ({ type }: ExportProps) => {
  const { activeRuleset } = useActiveRuleset();
  const readOnlyPlaytest = useExternalRulesetGrantStore((s) =>
    activeRuleset?.id ? s.permissionByRulesetId[activeRuleset.id] === 'read_only' : false,
  );
  const { exportData, isLoading } = useExport(type);

  const handleExport = () => {
    if (readOnlyPlaytest) return;
    const tsvData = exportData();

    if (!tsvData) {
      console.warn(`No ${type} data to export`);
      return;
    }

    // Create and download TSV file
    const blob = new Blob([tsvData], { type: 'text/tab-separated-values' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${type}-export-${new Date().toISOString().split('T')[0]}.tsv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Button
      variant='outline'
      size='sm'
      onClick={handleExport}
      disabled={isLoading || readOnlyPlaytest}
      className='gap-2'>
      <ArrowDownToLine className='h-4 w-4' />
    </Button>
  );
};
