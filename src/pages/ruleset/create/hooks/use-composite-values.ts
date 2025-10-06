import { useComposites } from '@/lib/compass-api';
import { useEffect } from 'react';

interface UseActionValueProps {
  id?: string;
  baseProperties: {
    title: string;
    category: string;
  };
  onCreate?: () => void;
  setTitle: (title: string) => void;
  setCategory: (category: string) => void;
}

export const useCompositeValues = ({
  id = '',
  baseProperties,
  onCreate,
  setTitle,
  setCategory,
}: UseActionValueProps) => {
  const { composites, createComposite, updateComposite } = useComposites();
  const isEditMode = !!id;

  const activeComposite = composites.find((a) => a.id === id);

  useEffect(() => {
    if (isEditMode && activeComposite) {
      setTitle(activeComposite.title);
      setCategory(activeComposite.category || '');
    }
  }, [activeComposite]);

  const saveComposite = () => {
    const data = {
      ...baseProperties,
    };

    if (isEditMode) {
      updateComposite(id, data);
    } else {
      createComposite(data);
    }

    onCreate?.();
  };

  return {
    saveComposite,
  };
};
