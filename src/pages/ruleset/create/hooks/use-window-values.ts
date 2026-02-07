import { useWindows } from '@/lib/compass-api';
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
  setDescription: (description: string) => void;
}

export const useWindowValues = ({
  id = '',
  baseProperties,
  onCreate,
  setTitle,
  setCategory,
  setDescription,
}: UseActionValueProps) => {
  const { windows, createWindow, updateWindow } = useWindows();
  const isEditMode = !!id;

  const active = windows.find((a) => a.id === id);

  useEffect(() => {
    if (isEditMode && active) {
      setTitle(active.title);
      setCategory(active.category || '');
      setDescription(active.description || '');
    }
  }, [active]);

  const saveWindow = () => {
    const data = {
      ...baseProperties,
    };

    if (isEditMode) {
      updateWindow(id, data);
    } else {
      createWindow(data);
    }

    onCreate?.();
  };

  return {
    saveWindow,
  };
};
