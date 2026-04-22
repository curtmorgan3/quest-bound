import { Button, ImageUpload, Input, Label } from '@/components';
import { useAssets } from '@/lib/compass-api';
import { FileText, Trash, Upload } from 'lucide-react';
import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from 'react';

interface DocumentCreateProps {
  image: string | null;
  assetId: string | null;
  pdfAssetId: string | null;
  pdfData: string | null;
  setImage: Dispatch<SetStateAction<string | null>>;
  setAssetId: Dispatch<SetStateAction<string | null>>;
  setPdfAssetId: Dispatch<SetStateAction<string | null>>;
  setPdfData: Dispatch<SetStateAction<string | null>>;
  order: number;
  setOrder: Dispatch<SetStateAction<number>>;
  rulesetId?: string;
}

export const DocumentCreate = ({
  image,
  assetId,
  pdfAssetId,
  pdfData,
  setImage,
  setAssetId,
  setPdfAssetId,
  setPdfData,
  order,
  setOrder,
  rulesetId,
}: DocumentCreateProps) => {
  const { assets, createAsset, deleteAsset } = useAssets(rulesetId);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [pdfFilename, setPdfFilename] = useState<string | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [orderDraft, setOrderDraft] = useState(() => String(order));

  useEffect(() => {
    setOrderDraft(String(order));
  }, [order]);

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

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setUploadingPdf(true);
      setPdfFilename(file.name);
      try {
        const assetId = await createAsset(file);
        setPdfAssetId(assetId);
        setPdfData(null);
      } catch (err) {
        console.error('Failed to upload PDF as asset', err);
      } finally {
        setUploadingPdf(false);
      }
    }
    e.target.value = '';
  };

  const handlePdfRemove = async () => {
    if (pdfAssetId) {
      await deleteAsset(pdfAssetId);
    }
    setPdfAssetId(null);
    setPdfData(null);
    setPdfFilename(null);
  };

  const displayImage = image || getImageFromAssetId(assetId);
  const hasPdf = !!pdfData || !!pdfAssetId;

  return (
    <div className='flex flex-col gap-6'>
      <div className='grid max-w-xs gap-2'>
        <Label htmlFor='document-order'>Order</Label>
        <Input
          id='document-order'
          type='number'
          inputMode='numeric'
          value={orderDraft}
          onChange={(e) => {
            const t = e.target.value;
            setOrderDraft(t);
            if (t === '' || t === '-') return;
            const v = Number.parseInt(t, 10);
            if (Number.isFinite(v)) setOrder(v);
          }}
          onBlur={() => {
            const v = Number.parseInt(orderDraft, 10);
            if (Number.isFinite(v)) {
              setOrder(v);
              setOrderDraft(String(v));
            } else {
              setOrder(0);
              setOrderDraft('0');
            }
          }}
          aria-describedby='document-order-hint'
        />
        <p id='document-order-hint' className='text-xs text-muted-foreground'>
          Lower numbers appear first in the documents list and character sidebar.
        </p>
      </div>
      <div className='flex flex-row gap-6'>
        <div className='flex flex-col gap-2'>
          <Label>Cover Image</Label>
          <ImageUpload
            image={displayImage}
            alt='Document cover image'
            onUpload={handleImageUpload}
            onRemove={handleImageRemove}
            rulesetId={rulesetId}
          />
        </div>

        <div className='flex flex-col gap-2 flex-1'>
          <Label>PDF Document</Label>
          {hasPdf ? (
            <div className='flex items-center gap-2 p-4 bg-muted rounded-lg'>
              <FileText className='h-8 w-8 text-primary' />
              <div className='flex-1'>
                <p className='text-sm font-medium'>{pdfFilename || 'PDF Document'}</p>
                <p className='text-xs text-muted-foreground'>PDF uploaded</p>
              </div>
              <Button variant='ghost' size='sm' onClick={handlePdfRemove}>
                <Trash className='h-4 w-4 text-destructive' />
              </Button>
            </div>
          ) : (
            <div
              className='w-full h-[124px] bg-muted flex flex-col items-center justify-center rounded-lg cursor-pointer hover:bg-muted/80 transition-colors'
              onClick={() => pdfInputRef.current?.click()}>
              {uploadingPdf ? (
                <span className='text-sm'>Uploading...</span>
              ) : (
                <>
                  <Upload className='h-8 w-8 mb-2 text-muted-foreground' />
                  <span className='text-sm text-muted-foreground'>Upload PDF</span>
                </>
              )}
            </div>
          )}
          <input
            ref={pdfInputRef}
            className='hidden'
            type='file'
            accept='application/pdf'
            onChange={handlePdfUpload}
          />
        </div>
      </div>
    </div>
  );
};
