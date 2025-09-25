import { Input, Label } from '@/components';
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
  setIsContainer: Dispatch<SetStateAction<boolean>>;
  setIsStorable: Dispatch<SetStateAction<boolean>>;
  setIsEquippable: Dispatch<SetStateAction<boolean>>;
  setIsConsumable: Dispatch<SetStateAction<boolean>>;
  setWeight: Dispatch<SetStateAction<number>>;
  setStackSize: Dispatch<SetStateAction<number>>;
  setDefaultQuantity: Dispatch<SetStateAction<number>>;
}

export const ItemCreate = ({
  isContainer,
  isStorable,
  isEquippable,
  isConsumable,
  weight,
  stackSize,
  defaultQuantity,
  setIsContainer,
  setIsStorable,
  setIsEquippable,
  setIsConsumable,
  setWeight,
  setStackSize,
  setDefaultQuantity,
}: ItemCreateProps) => {
  return (
    <div className='flex flex-col gap-6'>
      <div className='w-full flex flex-row justify-between'>
        <div
          className='flex flex-col gap-2 items-center cursor-pointer'
          data-testid='item-create-container'
          onClick={() => setIsContainer((prev) => !prev)}>
          <PackageOpen className={isContainer ? 'text-primary' : ''} />
          <Label htmlFor='is-container'>Container</Label>
        </div>
        <div
          className='flex flex-col gap-2 items-center cursor-pointer'
          data-testid='item-create-storable'
          onClick={() => setIsStorable((prev) => !prev)}>
          <Boxes className={isStorable ? 'text-primary' : ''} />
          <Label htmlFor='is-storable'>Storable</Label>
        </div>
        <div
          data-testid='item-create-equippable'
          className='flex flex-col gap-2 items-center cursor-pointer'
          onClick={() => setIsEquippable((prev) => !prev)}>
          <Shirt className={isEquippable ? 'text-primary' : ''} />
          <Label htmlFor='is-equippable'>Equippable</Label>
        </div>
        <div
          data-testid='item-create-consumable'
          className='flex flex-col gap-2 items-center cursor-pointer'
          onClick={() => setIsConsumable((prev) => !prev)}>
          <Drumstick className={isConsumable ? 'text-primary' : ''} />
          <Label htmlFor='is-consumable'>Consumable</Label>
        </div>
      </div>

      <div className='flex gap-4'>
        <div className='flex flex-col gap-4 w-full'>
          <Label>Weight</Label>
          <Input
            type='number'
            value={weight}
            onChange={(e) => setWeight(parseFloat(e.target.value))}
          />
        </div>
        <div className='flex flex-col gap-4 w-full'>
          <Label>Default Quantity</Label>
          <Input
            type='number'
            value={defaultQuantity}
            onChange={(e) => setDefaultQuantity(parseFloat(e.target.value))}
          />
        </div>
        <div className='flex flex-col gap-4 w-full'>
          <Label>Stack Size</Label>
          <Input
            type='number'
            value={stackSize}
            onChange={(e) => setStackSize(parseFloat(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
};
