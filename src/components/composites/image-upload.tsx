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

interface ImageUploadProps {
  image?: string | null;
  alt?: string;
  onUpload?: (assetId: string) => void;
  onSetUrl?: (url: string) => void;
  onRemove?: () => void;
  rulesetId?: string;
}

export const ImageUpload = ({
  image,
  onUpload,
  onSetUrl,
  onRemove,
  rulesetId,
  alt = '',
}: ImageUploadProps) => {
  const id = crypto.randomUUID();
  const { createAsset } = useAssets(rulesetId);
  const [loading, setLoading] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLoading(true);
      const assetId = await createAsset(file);
      onUpload?.(assetId);
      setLoading(false);
      setDialogOpen(false);
    }
    e.target.value = '';
  };

  const handleUrlSubmit = () => {
    const url = urlInput.trim();
    if (!url) {
      setUrlError('Please enter a URL');
      return;
    }
    setUrlError(null);
    onSetUrl?.(url);
    setUrlInput('');
    setDialogOpen(false);
  };

  const isImageUrl = (src: string) =>
    src.startsWith('http://') || src.startsWith('https://');

  const handleClick = () => {
    if (loading) return;
    if (onSetUrl) {
      setUrlError(null);
      setUrlInput(image && isImageUrl(image) ? image : '');
      setDialogOpen(true);
    } else {
      triggerFileInput();
    }
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

      {onSetUrl && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className='sm:max-w-md'>
            <DialogHeader>
              <DialogTitle>Add image</DialogTitle>
              <DialogDescription>
                Enter an image URL or select a file from your device.
              </DialogDescription>
            </DialogHeader>
            <div className='flex flex-col gap-4 py-2'>
              <div className='flex flex-col gap-2'>
                <Label htmlFor={`url-input-${id}`}>Image URL</Label>
                <div className='flex gap-2'>
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
                  <Button
                    type='button'
                    variant='secondary'
                    size='icon'
                    onClick={handleUrlSubmit}
                    disabled={loading}>
                    <Save className='size-4' />
                  </Button>
                </div>
                {urlError && <p className='text-destructive text-sm'>{urlError}</p>}
              </div>
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
      )}
    </>
  );
};
