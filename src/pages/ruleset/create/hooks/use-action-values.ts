import { useActions } from '@/lib/compass-api';
import type { Action } from '@/types';
import { useEffect, useState } from 'react';

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

  useEffect(() => {
    if (isEditMode && activeAction) {
      setTitle(activeAction.title);
      setDescription(activeAction.description);
      setCategory(activeAction.category || '');
      setImage(activeAction.image ?? null);
      setAssetId(activeAction.assetId ?? null);
    } else {
      resetAll();
    }
  }, [activeAction]);

  const resetAll = () => {
    setImage(null);
    setAssetId(null);
  };

  const actionProperties: Partial<Action> = {
    image,
    assetId,
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
    setImage,
    setAssetId,
  };
};
