import { useActions } from '@/lib/compass-api';
import type { Action, EntityCustomPropertyDef } from '@/types';
import { useEffect, useState } from 'react';
import { parseEntityCustomPropertiesJson } from '@/utils/parse-entity-custom-properties-json';

interface UseActionValueProps {
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

export const useActionValues = ({
  id = '',
  baseProperties,
  onCreate,
  setTitle,
  setDescription,
  setCategory,
}: UseActionValueProps) => {
  const { actions, createAction, updateAction } = useActions();
  const isEditMode = !!id;

  const activeAction = actions.find((a) => a.id === id);

  const [image, setImage] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [inventoryWidth, setInventoryWidth] = useState(2);
  const [inventoryHeight, setInventoryHeight] = useState(2);
  const [entityCustomProperties, setEntityCustomProperties] = useState<EntityCustomPropertyDef[]>(
    [],
  );

  useEffect(() => {
    if (isEditMode && activeAction) {
      setTitle(activeAction.title);
      setDescription(activeAction.description);
      setCategory(activeAction.category || '');
      setImage(activeAction.image ?? null);
      setAssetId(activeAction.assetId ?? null);
      setInventoryHeight(activeAction.inventoryHeight ?? 2);
      setInventoryWidth(activeAction.inventoryWidth ?? 2);
      setEntityCustomProperties(parseEntityCustomPropertiesJson(activeAction.customProperties));
    } else {
      resetAll();
    }
  }, [activeAction]);

  const resetAll = () => {
    setImage(null);
    setAssetId(null);
    setInventoryWidth(2);
    setInventoryHeight(2);
    setEntityCustomProperties([]);
  };

  const actionProperties: Partial<Action> = {
    image,
    assetId,
    inventoryHeight,
    inventoryWidth,
    ...(entityCustomProperties.length > 0
      ? { customProperties: JSON.stringify(entityCustomProperties) }
      : isEditMode
        ? { customProperties: null }
        : {}),
  };

  const saveAction = () => {
    const data = {
      ...baseProperties,
      ...actionProperties,
    };

    if (isEditMode) {
      updateAction(id, data);
    } else {
      createAction(data);
      resetAll();
    }

    onCreate?.();
  };

  return {
    saveAction,
    image,
    assetId,
    inventoryHeight,
    inventoryWidth,
    setImage,
    setAssetId,
    setInventoryWidth,
    setInventoryHeight,
    entityCustomProperties,
    setEntityCustomProperties,
  };
};
