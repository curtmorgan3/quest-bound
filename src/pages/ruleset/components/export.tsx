import { Button } from '@/components/ui/button';
import { useExport } from '@/lib/compass-api';
import { Download } from 'lucide-react';

interface ExportProps {
  type: 'attributes' | 'items' | 'actions';
}

export const Export = ({ type }: ExportProps) => {
  const { exportData, isLoading } = useExport(type);

  const handleExport = () => {
    const data = exportData();

    if (!data) {
      console.warn(`No ${type} data to export`);
      return;
    }

    // Create and download JSON file
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${type}-export-${new Date().toISOString().split('T')[0]}.json`;
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
      Export {type.charAt(0).toUpperCase() + type.slice(1)}
    </Button>
  );
};
