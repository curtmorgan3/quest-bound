import { ImageUpload, Label } from '@/components';
import { useAssets } from '@/lib/compass-api';
import { type Dispatch, type SetStateAction } from 'react';

interface ActionCreateProps {
  image: string | null;
  assetId: string | null;
  setImage: Dispatch<SetStateAction<string | null>>;
  setAssetId: Dispatch<SetStateAction<string | null>>;
}

export const ActionCreate = ({
  image,
  assetId,
  setImage,
  setAssetId,
}: ActionCreateProps) => {
  const { assets, deleteAsset } = useAssets();

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

  const displayImage = image || getImageFromAssetId(assetId);

  return (
    <div className='flex flex-col gap-2'>
      <Label>Image</Label>
      <ImageUpload
        image={displayImage}
        alt='Action image'
        onUpload={handleImageUpload}
        onRemove={handleImageRemove}
      />
    </div>
  );
};
