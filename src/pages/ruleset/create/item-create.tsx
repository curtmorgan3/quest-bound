import { ImageUpload, Input, Label } from '@/components';
import { ActionLookup, useActions, useAssets } from '@/lib/compass-api';
import { Drumstick, Shirt, X } from 'lucide-react';
import { type Dispatch, type SetStateAction } from 'react';
import { useParams } from 'react-router-dom';

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
  mapWidth: number | undefined;
  mapHeight: number | undefined;
  sprites: string[];
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
  setMapWidth: Dispatch<SetStateAction<number | undefined>>;
  setMapHeight: Dispatch<SetStateAction<number | undefined>>;
  setSprites: Dispatch<SetStateAction<string[]>>;
  setImage: Dispatch<SetStateAction<string | null>>;
  setAssetId: Dispatch<SetStateAction<string | null>>;
  actionIds: string[];
  setActionIds: Dispatch<SetStateAction<string[]>>;
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
  actionIds,
  setActionIds,
}: ItemCreateProps) => {
  const { rulesetId } = useParams();
  const { assets, deleteAsset } = useAssets();
  const { actions } = useActions();

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
            rulesetId={rulesetId}
          />
        </div>
        <div className='flex flex-col gap-4 justify-center items-center w-[100%]'>
          <Label className='text-muted-foreground'>Properties</Label>
          <div className='flex flex-row gap-4 flex-1 items-start w-[100%] justify-between'>
            <div className='flex flex-col items-start h-full gap-4 w-[100px]'>
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

            <div className='flex flex-col gap-2 justify-end w-[120px]'>
              <div className='flex flex-col gap-1 w-[80px]'>
                <Label>Weight</Label>
                <Input
                  type='number'
                  value={weight}
                  className='w-[80px]'
                  onChange={(e) => setWeight(parseFloat(e.target.value))}
                />
              </div>
              <div className='flex flex-col gap-1 w-[120px]'>
                <Label>Default Quantity</Label>
                <Input
                  type='number'
                  className='w-[80px]'
                  value={defaultQuantity}
                  onChange={(e) => setDefaultQuantity(parseFloat(e.target.value))}
                />
              </div>
              <div className='flex flex-col gap-1 w-[80px]'>
                <Label>Stack Size</Label>
                <Input
                  type='number'
                  className='w-[80px]'
                  value={stackSize}
                  onChange={(e) => setStackSize(parseFloat(e.target.value))}
                />
              </div>
            </div>

            <div className='flex flex-col gap-2 w-[120px]'>
              <div className='flex flex-col gap-1 w-full'>
                <Label>Inventory Width (20px units)</Label>
                <Input
                  type='number'
                  className='w-[80px]'
                  min={1}
                  value={inventoryWidth}
                  onChange={(e) => setInventoryWidth(parseInt(e.target.value) || 1)}
                />
              </div>
              <div className='flex flex-col gap-1 w-full'>
                <Label>Inventory Height (20px units)</Label>
                <Input
                  type='number'
                  className='w-[80px]'
                  min={1}
                  value={inventoryHeight}
                  onChange={(e) => setInventoryHeight(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className='flex flex-col gap-2'>
        <ActionLookup
          label='Assocaited actions'
          placeholder='Add action...'
          excludeIds={actionIds}
          onSelect={(action) =>
            setActionIds((prev) => (prev.includes(action.id) ? prev : [...prev, action.id]))
          }
          data-testid='item-create-action-lookup'
        />

        {actionIds.length > 0 && (
          <ul className='flex flex-col gap-1 mb-2'>
            {actionIds.map((id) => {
              const action = actions.find((a) => a.id === id);
              return (
                <li
                  key={id}
                  className='flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-sm'>
                  <span>{action?.title ?? id}</span>
                  <button
                    type='button'
                    onClick={() => setActionIds((prev) => prev.filter((x) => x !== id))}
                    className='text-muted-foreground hover:text-foreground p-0.5 rounded'>
                    <X size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
