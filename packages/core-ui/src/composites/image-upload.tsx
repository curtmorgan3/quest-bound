import { useAssets } from '@/lib/compass-api';
import { AssetLookup } from '../api-components';
import { ArrowLeft, ImagePlus, Trash } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { RulesetColorPicker, type RulesetColorPickerValue } from './ruleset-color-picker';

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
  /** When provided, renders this instead of the default image/placeholder. Receives openDialog to open the upload dialog. */
  trigger?: (props: { openDialog: () => void }) => React.ReactNode;
  /** When true, hide the asset lookup (choose existing asset) in the dialog. Default false. */
  hideSelectAsset?: boolean;
  height?: number;
  width?: number;
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
  trigger,
  hideSelectAsset = false,
  height = 124,
  width = 124,
}: ImageUploadProps) => {
  const id = crypto.randomUUID();
  const { createAsset, createUrlAsset } = useAssets(rulesetId, worldId);
  const [loading, setLoading] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlNameInput, setUrlNameInput] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [iconQuery, setIconQuery] = useState('');
  const [iconResults, setIconResults] = useState<string[]>([]);
  const [iconSearching, setIconSearching] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [iconColor, setIconColor] = useState('#888888');

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

  useEffect(() => {
    const query = iconQuery.trim();
    if (!query) {
      setIconResults([]);
      return;
    }
    setIconSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=60`,
        );
        const data = await res.json();
        setIconResults(data.icons ?? []);
      } catch {
        setIconResults([]);
      } finally {
        setIconSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [iconQuery]);

  const handleIconColorChange = (value: RulesetColorPickerValue) => {
    if (typeof value === 'string') return;
    const hex =
      '#' +
      [value.r, value.g, value.b]
        .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
        .join('');
    setIconColor(hex);
  };

  const handleIconSave = async () => {
    if (!selectedIcon) return;
    const [prefix, name] = selectedIcon.split(':');
    const iconUrl = `https://api.iconify.design/${prefix}/${name}.svg?color=${encodeURIComponent(iconColor)}`;
    setLoading(true);
    try {
      const assetId = await createUrlAsset(iconUrl, {
        filename: selectedIcon,
        rulesetId: rulesetId ?? null,
        worldId: worldId ?? null,
      });
      onUpload?.(assetId);
      setSelectedIcon(null);
      setIconColor('#888888');
      setIconQuery('');
      setIconResults([]);
      setDialogOpen(false);
    } catch (e) {
      setUrlError(e instanceof Error ? e.message : 'Failed to add icon');
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
    setIconQuery('');
    setIconResults([]);
    setSelectedIcon(null);
    setIconColor('#888888');
    setDialogOpen(true);
  };

  const triggerFileInput = () => {
    document.getElementById(`image-upload-${id}`)?.click();
  };

  const showChooseTab = !hideSelectAsset && rulesetId != null && rulesetId !== '';
  const defaultTab = showChooseTab ? 'choose' : 'upload';

  const currentImagePreview = image ? (
    <div className='flex items-center gap-3 p-2 rounded-lg bg-muted'>
      <img src={image} alt={alt} className='h-14 w-14 rounded-md object-cover flex-shrink-0' />
      {onRemove && (
        <Button
          type='button'
          variant='ghost'
          size='icon'
          onClick={onRemove}
          disabled={loading}>
          <Trash className='size-4' color='#9C3A28' />
        </Button>
      )}
    </div>
  ) : null;

  return (
    <>
      {trigger ? (
        trigger({ openDialog: handleClick })
      ) : image ? (
        <div
          className='relative flex gap-2'
          style={{ height, width }}
          onPointerEnter={() => setHovering(true)}
          onPointerLeave={() => setHovering(false)}>
          <img
            className='object-cover rounded-lg cursor-pointer'
            style={{ height, width }}
            src={image}
            alt={alt}
            onClick={handleClick}
          />
          {hovering && (
            <Button
              type='button'
              className='absolute right-0 top-0'
              variant='ghost'
              disabled={loading}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onRemove?.();
              }}>
              <Trash color='#9C3A28' />
            </Button>
          )}
        </div>
      ) : (
        <div
          className='bg-muted flex items-center justify-center rounded-lg cursor-pointer'
          style={{ height, width }}
          onClick={handleClick}>
          <span className='text-xs text-muted-foreground'>
            {loading ? 'Loading' : 'Upload Image'}
          </span>
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
            <DialogTitle>Image</DialogTitle>
            <DialogDescription>Choose how to add an image.</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue={defaultTab}>
            <TabsList className={`grid w-full ${showChooseTab ? 'grid-cols-4' : 'grid-cols-3'}`}>
              {showChooseTab && <TabsTrigger value='choose'>Choose</TabsTrigger>}
              <TabsTrigger value='upload'>Upload</TabsTrigger>
              <TabsTrigger value='url'>URL</TabsTrigger>
              <TabsTrigger value='icon'>Icon</TabsTrigger>
            </TabsList>

            {showChooseTab && (
              <TabsContent value='choose' className='flex flex-col gap-4'>
                {currentImagePreview}
                <AssetLookup
                  rulesetId={rulesetId!}
                  placeholder='Search existing assets...'
                  label='Existing asset'
                  onSelect={(asset) => {
                    onUpload?.(asset.id);
                    setDialogOpen(false);
                  }}
                />
              </TabsContent>
            )}

            <TabsContent value='upload' className='flex flex-col gap-4'>
              {currentImagePreview}
              <Button
                type='button'
                variant='outline'
                onClick={triggerFileInput}
                disabled={loading}
                className='w-full'>
                <ImagePlus className='size-4 mr-2' />
                {loading ? 'Uploading...' : 'Select file'}
              </Button>
            </TabsContent>

            <TabsContent value='url' className='flex flex-col gap-4'>
              {currentImagePreview}
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
              <div className='flex flex-col gap-2'>
                <Label htmlFor={`url-input-${id}`}>Image URL</Label>
                <Input
                  id={`url-input-${id}`}
                  type='url'
                  placeholder='https://example.com/image.png'
                  value={urlInput}
                  onChange={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setUrlInput(e.target.value);
                    setUrlError(null);
                  }}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') handleUrlSubmit();
                  }}
                />
              </div>
              {urlError && <p className='text-destructive text-sm'>{urlError}</p>}
              <Button
                type='button'
                onClick={handleUrlSubmit}
                disabled={loading || !urlInput.trim() || !urlNameInput.trim()}
                className='w-full'>
                Save
              </Button>
            </TabsContent>

            <TabsContent value='icon' className='flex flex-col gap-4'>
              {currentImagePreview}
              {selectedIcon ? (
                <div className='flex flex-col gap-4'>
                  <div className='flex items-center gap-3'>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      onClick={() => setSelectedIcon(null)}>
                      <ArrowLeft className='size-4' />
                    </Button>
                    <img
                      src={`https://api.iconify.design/${selectedIcon.split(':')[0]}/${selectedIcon.split(':')[1]}.svg?color=${encodeURIComponent(iconColor)}&width=48&height=48`}
                      alt={selectedIcon}
                      className='w-12 h-12'
                    />
                    <span className='text-sm text-muted-foreground truncate'>{selectedIcon}</span>
                  </div>
                  <div className='flex items-center gap-3'>
                    <span className='text-sm'>Color</span>
                    <RulesetColorPicker
                      color={iconColor}
                      onUpdate={handleIconColorChange}
                      label='Icon color'
                      disableAlpha
                    />
                  </div>
                  {urlError && <p className='text-destructive text-sm'>{urlError}</p>}
                  <Button
                    type='button'
                    onClick={handleIconSave}
                    disabled={loading}
                    className='w-full'>
                    {loading ? 'Saving...' : 'Save icon'}
                  </Button>
                </div>
              ) : (
                <div className='flex flex-col gap-2'>
                  <Input
                    type='text'
                    placeholder='Search icons (e.g. sword, shield, dragon)'
                    value={iconQuery}
                    onChange={(e) => setIconQuery(e.target.value)}
                  />
                  {iconSearching && (
                    <p className='text-xs text-muted-foreground'>Searching...</p>
                  )}
                  {iconResults.length > 0 && (
                    <ScrollArea className='h-48 rounded border'>
                      <div className='grid grid-cols-8 gap-1 p-2'>
                        {iconResults.map((iconId) => {
                          const [prefix, name] = iconId.split(':');
                          const src = `https://api.iconify.design/${prefix}/${name}.svg?color=%23888888`;
                          return (
                            <button
                              key={iconId}
                              type='button'
                              title={iconId}
                              disabled={loading}
                              className='p-1 rounded hover:bg-accent flex items-center justify-center'
                              onClick={() => setSelectedIcon(iconId)}>
                              <img src={src} alt={iconId} className='w-6 h-6' />
                            </button>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
};
