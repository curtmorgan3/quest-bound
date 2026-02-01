import { Button } from '@/components/ui/button';
import { useExport } from '@/lib/compass-api';
import { Download } from 'lucide-react';

interface ExportProps {
  type: 'attributes' | 'items' | 'actions';
}

export const Export = ({ type }: ExportProps) => {
  const { exportData, isLoading } = useExport(type);

  const handleExport = () => {
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
      disabled={isLoading}
      className='gap-2'>
      <Download className='h-4 w-4' />
    </Button>
  );
};
