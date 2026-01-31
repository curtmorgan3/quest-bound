import { useItems } from '@/lib/compass-api';
import type { Item } from '@/types';
import { useEffect, useState } from 'react';

interface UseItemValueProps {
  id?: string;
  baseProperties: {
    title: string;
    description: string;
    category: string;
  };
  onCreate?: () => void;
  setTitle: (title: string) => void;
  setDescription: (description: string) => void;
  setCategory: (category: string) => void;
}

export const useItemValues = ({
  id = '',
  baseProperties,
  onCreate,
  setTitle,
  setDescription,
  setCategory,
}: UseItemValueProps) => {
  const { items, createItem, updateItem } = useItems();
  const isEditMode = !!id;

  const activeItem = items.find((a) => a.id === id);

  useEffect(() => {
    if (isEditMode && activeItem) {
      setTitle(activeItem.title);
      setDescription(activeItem.description);
      setCategory(activeItem.category || '');

      setIsContainer(activeItem.isContainer);
      setIsStorable(activeItem.isStorable);
      setIsEquippable(activeItem.isEquippable);
      setIsConsumable(activeItem.isConsumable);
      setWeight(activeItem.weight);
      setStackSize(activeItem.stackSize);
      setDefaultQuantity(activeItem.defaultQuantity);
      setInventoryWidth(activeItem.inventoryWidth);
      setInventoryHeight(activeItem.inventoryHeight);
    } else {
      resetAll();
    }
  }, [activeItem]);

  const [isContainer, setIsContainer] = useState(false);
  const [isStorable, setIsStorable] = useState(false);
  const [isEquippable, setIsEquippable] = useState(false);
  const [isConsumable, setIsConsumable] = useState(false);
  const [weight, setWeight] = useState(0);
  const [stackSize, setStackSize] = useState(0);
  const [defaultQuantity, setDefaultQuantity] = useState(1);
  const [inventoryWidth, setInventoryWidth] = useState(1);
  const [inventoryHeight, setInventoryHeight] = useState(1);

  const resetAll = () => {
    setWeight(0);
    setStackSize(0);
    setDefaultQuantity(1);
    setInventoryWidth(1);
    setInventoryHeight(1);
  };

  const itemProperties: Partial<Item> = {
    isContainer,
    isStorable,
    isEquippable,
    isConsumable,
    weight,
    stackSize,
    defaultQuantity,
    inventoryWidth,
    inventoryHeight,
  };

  const saveItem = () => {
    const data = {
      ...baseProperties,
      ...itemProperties,
    };

    if (isEditMode) {
      updateItem(id, data);
    } else {
      createItem(data);
      resetAll();
    }

    onCreate?.();
  };

  return {
    saveItem,
    isContainer,
    isStorable,
    isEquippable,
    isConsumable,
    weight,
    stackSize,
    defaultQuantity,
    inventoryWidth,
    inventoryHeight,
    setIsContainer,
    setIsStorable,
    setIsEquippable,
    setIsConsumable,
    setWeight,
    setStackSize,
    setDefaultQuantity,
    setInventoryWidth,
    setInventoryHeight,
  };
};
