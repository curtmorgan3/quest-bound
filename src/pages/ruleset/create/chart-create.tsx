import { Button, ImageUpload, Label } from '@/components';
import { useAssets } from '@/lib/compass-api';
import { FileText, Trash, Upload } from 'lucide-react';
import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from 'react';

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
  const tsvInputRef = useRef<HTMLInputElement>(null);
  const [uploadingTsv, setUploadingTsv] = useState(false);
  const [tsvFilename, setTsvFilename] = useState<string | null>(null);

  // Clear filename when chart data is cleared (e.g. after successful create)
  useEffect(() => {
    if (!chartData) setTsvFilename(null);
  }, [chartData]);

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
      setUploadingTsv(true);
      setTsvFilename(file.name);
      const reader = new FileReader();

      reader.onload = (event) => {
        if (event.target?.result && typeof event.target.result === 'string') {
          const fileData = parseTSV(event.target.result);
          setChartData(fileData);
        }
        setUploadingTsv(false);
        e.target.value = '';
      };
      reader.onerror = () => {
        console.error('Error reading file');
        setUploadingTsv(false);
      };
      reader.readAsText(file);
    }
  };

  const handleTsvRemove = () => {
    setChartData(null);
    setTsvFilename(null);
  };

  const hasTsv = !!chartData;

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-row gap-6'>
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

        <div className='flex flex-col gap-2 flex-1'>
          <Label>TSV Data</Label>
          {hasTsv ? (
            <div className='flex items-center gap-2 p-4 bg-muted rounded-lg'>
              <FileText className='h-8 w-8 text-primary' />
              <div className='flex-1 min-w-0'>
                <p className='text-sm font-medium truncate'>{tsvFilename || 'TSV File'}</p>
                <p className='text-xs text-muted-foreground'>
                  {headers.length} columns, {numRows} rows
                </p>
              </div>
              <Button variant='ghost' size='sm' onClick={handleTsvRemove}>
                <Trash className='h-4 w-4 text-destructive' />
              </Button>
            </div>
          ) : (
            <div
              className='w-full h-[124px] bg-muted flex flex-col items-center justify-center rounded-lg cursor-pointer hover:bg-muted/80 transition-colors'
              onClick={() => tsvInputRef.current?.click()}>
              {uploadingTsv ? (
                <span className='text-sm'>Uploading...</span>
              ) : (
                <>
                  <Upload className='h-8 w-8 mb-2 text-muted-foreground' />
                  <span className='text-sm text-muted-foreground'>Upload .tsv file</span>
                </>
              )}
            </div>
          )}
          <input
            ref={tsvInputRef}
            className='hidden'
            type='file'
            accept='.tsv'
            onChange={handleFileSelect}
          />
        </div>
      </div>
    </div>
  );
};
