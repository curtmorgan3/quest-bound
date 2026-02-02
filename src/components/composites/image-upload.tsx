import { useAssets } from '@/lib/compass-api';
import { Trash } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../ui/button';

interface ImageUploadProps {
  image?: string | null;
  alt?: string;
  onUpload?: (assetId: string) => void;
  onRemove?: () => void;
  rulesetId?: string;
}

export const ImageUpload = ({
  image,
  onUpload,
  onRemove,
  rulesetId,
  alt = '',
}: ImageUploadProps) => {
  const id = crypto.randomUUID();
  const { createAsset } = useAssets(rulesetId);
  const [loading, setLoading] = useState(false);
  const [hovering, setHovering] = useState(false);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLoading(true);
      const assetId = await createAsset(file);
      onUpload?.(assetId);
      setLoading(false);
    }
    // Reset input value so the same file can be selected again
    e.target.value = '';
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
            onClick={() => document.getElementById(`image-upload-${id}`)?.click()}
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
          onClick={() => document.getElementById(`image-upload-${id}`)?.click()}>
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
    </>
  );
};
