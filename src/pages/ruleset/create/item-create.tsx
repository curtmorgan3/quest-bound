import { ImageUpload, Input, Label } from '@/components';
import { useAssets } from '@/lib/compass-api';
import { Boxes, Drumstick, PackageOpen, Shirt } from 'lucide-react';
import { type Dispatch, type SetStateAction } from 'react';

interface ItemCreateProps {
  isContainer: boolean;
  isStorable: boolean;
  isEquippable: boolean;
  isConsumable: boolean;
  weight: number;
  stackSize: number;
  defaultQuantity: number;
  inventoryWidth: number;
  inventoryHeight: number;
  image: string | null;
  assetId: string | null;
  setIsContainer: Dispatch<SetStateAction<boolean>>;
  setIsStorable: Dispatch<SetStateAction<boolean>>;
  setIsEquippable: Dispatch<SetStateAction<boolean>>;
  setIsConsumable: Dispatch<SetStateAction<boolean>>;
  setWeight: Dispatch<SetStateAction<number>>;
  setStackSize: Dispatch<SetStateAction<number>>;
  setDefaultQuantity: Dispatch<SetStateAction<number>>;
  setInventoryWidth: Dispatch<SetStateAction<number>>;
  setInventoryHeight: Dispatch<SetStateAction<number>>;
  setImage: Dispatch<SetStateAction<string | null>>;
  setAssetId: Dispatch<SetStateAction<string | null>>;
}

export const ItemCreate = ({
  isContainer,
  isStorable,
  isEquippable,
  isConsumable,
  weight,
  stackSize,
  defaultQuantity,
  inventoryWidth,
  inventoryHeight,
  image,
  assetId,
  setIsContainer,
  setIsStorable,
  setIsEquippable,
  setIsConsumable,
  setWeight,
  setStackSize,
  setDefaultQuantity,
  setInventoryWidth,
  setInventoryHeight,
  setImage,
  setAssetId,
}: ItemCreateProps) => {
  const { assets, deleteAsset } = useAssets();

  const getImageFromAssetId = (id: string | null) => {
    if (!id) return null;
    const asset = assets.find((a) => a.id === id);
    return asset?.data ?? null;
  };

  const handleImageUpload = (uploadedAssetId: string) => {
    setAssetId(uploadedAssetId);
    // Get the image data from the newly uploaded asset
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

  // Use the image from props (edit mode) or look it up from assets (create mode)
  const displayImage = image || getImageFromAssetId(assetId);

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-row gap-6'>
        <div className='flex flex-col gap-2'>
          <Label>Image</Label>
          <ImageUpload
            image={displayImage}
            alt='Item image'
            onUpload={handleImageUpload}
            onRemove={handleImageRemove}
            onSetUrl={handleSetUrl}
          />
        </div>
        <div className='flex flex-col gap-4 flex-1 items-center'>
          <Label className='text-muted-foreground'>Properties</Label>
          <div className='w-full flex flex-row justify-between'>
            <div
              className='flex flex-col gap-2 items-center cursor-pointer'
              data-testid='item-create-container'
              onClick={() => setIsContainer((prev) => !prev)}>
              <Label htmlFor='is-container'>Container</Label>
              <PackageOpen className={isContainer ? 'text-primary' : ''} />
            </div>
            <div
              className='flex flex-col gap-2 items-center cursor-pointer'
              data-testid='item-create-storable'
              onClick={() => setIsStorable((prev) => !prev)}>
              <Label htmlFor='is-storable'>Storable</Label>
              <Boxes className={isStorable ? 'text-primary' : ''} />
            </div>
            <div
              data-testid='item-create-equippable'
              className='flex flex-col gap-2 items-center cursor-pointer'
              onClick={() => setIsEquippable((prev) => !prev)}>
              <Label htmlFor='is-equippable'>Equippable</Label>
              <Shirt className={isEquippable ? 'text-primary' : ''} />
            </div>
            <div
              role='button'
              data-testid='item-create-consumable'
              className='flex flex-col gap-2 items-center cursor-pointer'
              onClick={() => setIsConsumable((prev) => !prev)}>
              <Label htmlFor='is-consumable'>Consumable</Label>
              <Drumstick className={isConsumable ? 'text-primary' : ''} />
            </div>
          </div>
          <div className='flex gap-4'>
            <div className='flex flex-col gap-4 w-[80px]'>
              <Label>Weight</Label>
              <Input
                type='number'
                value={weight}
                className='w-[80px]'
                onChange={(e) => setWeight(parseFloat(e.target.value))}
              />
            </div>
            <div className='flex flex-col gap-4 w-[120px]'>
              <Label>Default Quantity</Label>
              <Input
                type='number'
                className='w-[120px]'
                value={defaultQuantity}
                onChange={(e) => setDefaultQuantity(parseFloat(e.target.value))}
              />
            </div>
            <div className='flex flex-col gap-4 w-[80px]'>
              <Label>Stack Size</Label>
              <Input
                type='number'
                className='w-[80px]'
                value={stackSize}
                onChange={(e) => setStackSize(parseFloat(e.target.value))}
              />
            </div>
          </div>
        </div>
      </div>

      <div className='flex flex-col gap-2'>
        <Label className='text-muted-foreground'>Inventory Size (20px units)</Label>
        <div className='flex gap-4'>
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
  );
};
