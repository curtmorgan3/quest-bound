import { useActions } from '@/lib/compass-api';
import { useEffect } from 'react';

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

  useEffect(() => {
    if (isEditMode && activeAction) {
      setTitle(activeAction.title);
      setDescription(activeAction.description);
      setCategory(activeAction.category || '');
    }
  }, [activeAction]);

  const saveAction = () => {
    const data = {
      ...baseProperties,
    };

    if (isEditMode) {
      updateAction(id, data);
    } else {
      createAction(data);
    }

    onCreate?.();
  };

  return {
    saveAction,
  };
};
