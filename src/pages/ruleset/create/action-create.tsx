import { ImageUpload, Input, Label } from '@/components';
import { useAssets } from '@/lib/compass-api';
import { type Dispatch, type SetStateAction } from 'react';

interface ActionCreateProps {
  image: string | null;
  assetId: string | null;
  inventoryWidth: number;
  inventoryHeight: number;
  setImage: Dispatch<SetStateAction<string | null>>;
  setAssetId: Dispatch<SetStateAction<string | null>>;
  setInventoryWidth: Dispatch<SetStateAction<number>>;
  setInventoryHeight: Dispatch<SetStateAction<number>>;
}

export const ActionCreate = ({
  image,
  assetId,
  inventoryHeight,
  inventoryWidth,
  setImage,
  setAssetId,
  setInventoryHeight,
  setInventoryWidth,
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

  const handleSetUrl = (url: string) => {
    setAssetId(null);
    setImage(url);
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
      <div className='flex justify-between'>
        <div className='flex flex-col gap-2 w-[50%]'>
          <Label>Image</Label>
          <ImageUpload
            image={displayImage}
            alt='Attribute image'
            onUpload={handleImageUpload}
            onRemove={handleImageRemove}
            onSetUrl={handleSetUrl}
          />
        </div>
        <div className='flex flex-col gap-2 w-[50%]'>
          <Label className='text-muted-foreground'>Inventory Size (20px units)</Label>
          <div className='flex flex-col gap-2'>
            <div className='flex flex-col gap-4 w-full'>
              <Label>Width</Label>
              <Input
                type='number'
                min={1}
                value={inventoryWidth}
                onChange={(e) => setInventoryWidth(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className='flex flex-col gap-4 w-full'>
              <Label>Height</Label>
              <Input
                type='number'
                min={1}
                value={inventoryHeight}
                onChange={(e) => setInventoryHeight(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
