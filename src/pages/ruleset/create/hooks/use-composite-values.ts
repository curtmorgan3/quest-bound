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
}

export const useWindowValues = ({
  id = '',
  baseProperties,
  onCreate,
  setTitle,
  setCategory,
}: UseActionValueProps) => {
  const { windows, createWindow, updateWindow } = useWindows();
  const isEditMode = !!id;

  const active = windows.find((a) => a.id === id);

  useEffect(() => {
    if (isEditMode && active) {
      setTitle(active.title);
      setCategory(active.category || '');
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
