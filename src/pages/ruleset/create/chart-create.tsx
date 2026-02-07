import { Button, ImageUpload, Label } from '@/components';
import { useAssets } from '@/lib/compass-api';
import { Upload } from 'lucide-react';
import { useState, type Dispatch, type SetStateAction } from 'react';

interface ChartCreateProps {
  chartData: string[][] | null;
  image: string | null;
  assetId: string | null;
  setChartData: Dispatch<SetStateAction<string[][] | null>>;
  setImage: Dispatch<SetStateAction<string | null>>;
  setAssetId: Dispatch<SetStateAction<string | null>>;
}

function parseTSV(tsvString: string): string[][] {
  const lines = tsvString.split('\n');
  const data = lines.map((line) => line.replace(/\r/g, '').split('\t'));
  return data;
}

export const ChartCreate = ({
  chartData,
  image,
  assetId,
  setChartData,
  setImage,
  setAssetId,
}: ChartCreateProps) => {
  const { assets, deleteAsset } = useAssets();
  const [loading, setLoading] = useState(false);

  const getImageFromAssetId = (id: string | null) => {
    if (!id) return null;
    const asset = assets.find((a) => a.id === id);
    return asset?.data ?? null;
  };

  const handleImageUpload = (uploadedAssetId: string) => {
    setAssetId(uploadedAssetId);
    const imageData = getImageFromAssetId(uploadedAssetId);
    if (imageData) {
      setImage(imageData);
    }
  };

  const handleImageRemove = async () => {
    if (assetId) {
      await deleteAsset(assetId);
    }
    setAssetId(null);
    setImage(null);
  };

  const handleSetUrl = (url: string) => {
    setAssetId(null);
    setImage(url);
  };

  const headers = !chartData ? [] : chartData[0];
  const numRows = !chartData ? 0 : chartData.length - 1;
  const displayImage = image || getImageFromAssetId(assetId);

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
    <div className='flex flex-col gap-6'>
      <div className='flex flex-col gap-2'>
        <Label>Image</Label>
        <ImageUpload
          image={displayImage}
          alt='Chart image'
          onUpload={handleImageUpload}
          onRemove={handleImageRemove}
          onSetUrl={handleSetUrl}
        />
      </div>
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
                <span key={i}>
                  {header}
                  {i === headers.length - 1 ? '' : ', '}{' '}
                </span>
              ))}
            </div>
            <span>Plus {numRows} rows of data</span>
          </div>
        )}
      </div>
    </div>
  );
};
