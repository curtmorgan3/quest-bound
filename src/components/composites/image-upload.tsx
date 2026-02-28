import { useAssets } from '@/lib/compass-api';
import { ImagePlus, Save, Trash } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

/**
 * Resizes an image file to fit within maxWidth×maxHeight using the same scaling
 * logic as loadTilemapAssetDimensions (integer scale divisor, aspect ratio preserved).
 * Returns a new File with the same name and type, or the original file if no resize needed.
 */
async function resizeImageFile(file: File, maxWidth: number, maxHeight: number): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const scaleDivisor = Math.max(1, Math.ceil(w / maxWidth), Math.ceil(h / maxHeight));
      if (scaleDivisor <= 1) {
        resolve(file);
        return;
      }
      const scaledW = Math.round(w / scaleDivisor);
      const scaledH = Math.round(h / scaleDivisor);
      const canvas = document.createElement('canvas');
      canvas.width = scaledW;
      canvas.height = scaledH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h, 0, 0, scaledW, scaledH);
      const mime = file.type || 'image/png';
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas toBlob failed'));
            return;
          }
          resolve(new File([blob], file.name, { type: blob.type }));
        },
        mime,
        0.92,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for resize'));
    };
    img.src = url;
  });
}

interface ImageUploadProps {
  image?: string | null;
  alt?: string;
  onUpload?: (assetId: string) => void;
  onRemove?: () => void;
  rulesetId?: string | null;
  worldId?: string | null;
  /** When set with maxHeight, image is resized to fit within these dimensions before upload. */
  maxWidth?: number;
  /** When set with maxWidth, image is resized to fit within these dimensions before upload. */
  maxHeight?: number;
}

export const ImageUpload = ({
  image,
  onUpload,
  onRemove,
  rulesetId,
  worldId,
  alt = '',
  maxWidth,
  maxHeight,
}: ImageUploadProps) => {
  const id = crypto.randomUUID();
  const { createAsset, createUrlAsset } = useAssets(rulesetId, worldId);
  const [loading, setLoading] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlNameInput, setUrlNameInput] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLoading(true);
      try {
        const fileToUpload =
          maxWidth != null && maxHeight != null
            ? await resizeImageFile(file, maxWidth, maxHeight)
            : file;
        const assetId = await createAsset(fileToUpload);
        onUpload?.(assetId);
        setDialogOpen(false);
      } finally {
        setLoading(false);
      }
    }
    e.target.value = '';
  };

  const handleUrlSubmit = async () => {
    const url = urlInput.trim();
    const name = urlNameInput.trim();
    if (!url) {
      setUrlError('Please enter a URL');
      return;
    }
    if (!name) {
      setUrlError('Please enter a name for the image');
      return;
    }
    setUrlError(null);
    setLoading(true);
    try {
      const assetId = await createUrlAsset(url, {
        filename: name,
        rulesetId: rulesetId ?? null,
        worldId: worldId ?? null,
      });
      onUpload?.(assetId);
      setUrlInput('');
      setUrlNameInput('');
      setDialogOpen(false);
    } catch (e) {
      setUrlError(e instanceof Error ? e.message : 'Failed to add image');
    } finally {
      setLoading(false);
    }
  };

  const isImageUrl = (src: string) => src.startsWith('http://') || src.startsWith('https://');

  const handleClick = () => {
    if (loading) return;
    setUrlError(null);
    setUrlInput(image && isImageUrl(image) ? image : '');
    setUrlNameInput('');
    setDialogOpen(true);
  };

  const triggerFileInput = () => {
    document.getElementById(`image-upload-${id}`)?.click();
  };

  return (
    <>
      {image ? (
        <div
          className='flex gap-2 w-[124px] h-[124px]'
          onPointerEnter={() => setHovering(true)}
          onPointerLeave={() => setHovering(false)}>
          <img
            className='w-[124px] h-[124px] object-cover rounded-lg cursor-pointer'
            src={image}
            alt={alt}
            onClick={handleClick}
          />
          {hovering && (
            <Button
              style={{ position: 'absolute' }}
              variant='ghost'
              disabled={loading}
              onClick={onRemove}>
              <Trash color='#9C3A28' />
            </Button>
          )}
        </div>
      ) : (
        <div
          className='w-[124px] h-[124px] bg-muted flex items-center justify-center rounded-lg text-3xl cursor-pointer'
          onClick={handleClick}>
          <span className='text-sm'>{loading ? 'Loading' : 'Upload Image'}</span>
        </div>
      )}

      <input
        id={`image-upload-${id}`}
        className='hidden'
        type='file'
        accept='image/*'
        onChange={handleImageChange}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Add image</DialogTitle>
            <DialogDescription>
              Enter an image URL or select a file from your device. Names must be unique within the
              ruleset.
            </DialogDescription>
          </DialogHeader>
          <div className='flex flex-col gap-4 py-2'>
            <div className='flex flex-col gap-2'>
              <Label htmlFor={`url-name-${id}`}>
                Name <span className='text-destructive'>*</span>
              </Label>
              <Input
                id={`url-name-${id}`}
                type='text'
                placeholder='e.g. cover.png'
                value={urlNameInput}
                onChange={(e) => {
                  setUrlNameInput(e.target.value);
                  setUrlError(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
              />
            </div>
            <div className='flex gap-2 items-end'>
              <div className='flex flex-col gap-2 flex-1'>
                <Label htmlFor={`url-input-${id}`}>Image URL</Label>
                <Input
                  id={`url-input-${id}`}
                  type='url'
                  placeholder='https://example.com/image.png'
                  value={urlInput}
                  onChange={(e) => {
                    setUrlInput(e.target.value);
                    setUrlError(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                />
              </div>
              <Button
                type='button'
                className='w-[50px]'
                variant='ghost'
                onClick={handleUrlSubmit}
                disabled={loading}>
                <Save className='size-4 mr-2' />
              </Button>
            </div>
            {urlError && <p className='text-destructive text-sm'>{urlError}</p>}

            <div className='relative'>
              <div className='absolute inset-0 flex items-center'>
                <span className='w-full border-t' />
              </div>
              <div className='relative flex justify-center text-muted-foreground text-xs uppercase'>
                or
              </div>
            </div>
            <Button
              type='button'
              variant='outline'
              onClick={triggerFileInput}
              disabled={loading}
              className='w-full'>
              <ImagePlus className='size-4 mr-2' />
              Select file
            </Button>
          </div>
          <DialogFooter />
        </DialogContent>
      </Dialog>
    </>
  );
};
