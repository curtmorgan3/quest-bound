import { Button } from '@/components';
import { Upload } from 'lucide-react';
import { useState, type Dispatch, type SetStateAction } from 'react';

interface ChartCreateProps {
  chartData: string[][] | null;
  setChartData: Dispatch<SetStateAction<string[][] | null>>;
}

function parseTSV(tsvString: string): string[][] {
  const lines = tsvString.split('\n');
  const data = lines.map((line) => line.replace(/\r/g, '').split('\t'));
  return data;
}

export const ChartCreate = ({ chartData, setChartData }: ChartCreateProps) => {
  const [loading, setLoading] = useState(false);

  const headers = !chartData ? [] : chartData[0];
  const numRows = !chartData ? 0 : chartData.length - 1;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLoading(true);
      const reader = new FileReader();

      reader.onload = async (event) => {
        if (event.target?.result && typeof event.target.result === 'string') {
          const fileData = parseTSV(event.target.result);
          setChartData(fileData);
        }

        setLoading(false);
        e.target.value = '';
      };
      reader.onerror = function (e) {
        console.error('Error reading file:', e.target?.error);
        setLoading(false);
      };

      reader.readAsText(file);
    }
  };

  return (
    <div className='flex w-full gap-4'>
      <Button
        variant='outline'
        disabled={loading}
        onClick={() => document.getElementById('chart-create-file-upload')?.click()}>
        {!chartData ? 'Upload .tsv File' : 'Replace .tsv File'}
        <Upload />
      </Button>
      <input
        id='chart-create-file-upload'
        className='hidden'
        type='file'
        accept='.tsv'
        onChange={handleFileSelect}
      />

      {!!chartData && (
        <div className='flex flex-col w-full justify-center overflow-x-auto max-w-[380px]'>
          <div className='flex gap-2'>
            <span>Headers: </span>
            {headers.map((header, i) => (
              <span>
                {header}
                {i === headers.length - 1 ? '' : ', '}{' '}
              </span>
            ))}
          </div>
          <span>Plus {numRows} rows of data</span>
        </div>
      )}
    </div>
  );
};
