import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useImport, type ImportResult } from '@/lib/compass-api';
import { AlertCircle, CheckCircle, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

interface ImportProps {
  type: 'attributes' | 'items' | 'actions';
  onImportComplete?: (result: ImportResult) => void;
}

export const Import = ({ type, onImportComplete }: ImportProps) => {
  const { importData, isLoading } = useImport(type);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset previous result
    setResult(null);

    const importResult = await importData(file);
    setResult(importResult);

    if (onImportComplete) {
      onImportComplete(importResult);
    }

    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className='space-y-3 flex flex-row gap-4'>
      <div className='space-y-2'>
        <div className='flex items-center gap-2'>
          <Input
            ref={fileInputRef}
            id={`import-${type}`}
            type='file'
            accept='.json'
            onChange={handleFileSelect}
            className='hidden'
          />
          <Button
            variant='outline'
            size='sm'
            onClick={handleButtonClick}
            disabled={isLoading}
            className='gap-2'>
            {isLoading ? (
              <Upload className='h-4 w-4 animate-pulse' />
            ) : (
              <Upload className='h-4 w-4' />
            )}
          </Button>
        </div>
      </div>

      {result && (
        <div
          className={`p-3 rounded-md border ${
            result.success
              ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
              : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
          }`}>
          <div className='flex items-start gap-2'>
            {result.success ? (
              <CheckCircle className='h-4 w-4 text-green-600 dark:text-green-400 mt-0.5' />
            ) : (
              <AlertCircle className='h-4 w-4 text-red-600 dark:text-red-400 mt-0.5' />
            )}
            <div className='space-y-1'>
              <p
                className={`text-sm font-medium ${
                  result.success
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-red-800 dark:text-red-200'
                }`}>
                {result.message}
              </p>
              {result.errors.length > 0 && (
                <div className='space-y-1'>
                  <p className='text-xs font-medium text-red-700 dark:text-red-300'>Errors:</p>
                  <ul className='text-xs text-red-600 dark:text-red-400 space-y-0.5'>
                    {result.errors.slice(0, 5).map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                    {result.errors.length > 5 && (
                      <li>• ... and {result.errors.length - 5} more errors</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
