import { useWindows } from '@/lib/compass-api';
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
  const [hideFromPlayerView, setHideFromPlayerView] = useState(false);
  const isEditMode = !!id;

  const active = windows.find((a) => a.id === id);

  const resetAll = () => {
    setHideFromPlayerView(false);
  };

  useEffect(() => {
    if (isEditMode && active) {
      setTitle(active.title);
      setCategory(active.category || '');
      setDescription(active.description || '');
      setHideFromPlayerView(active.hideFromPlayerView ?? false);
    } else {
      resetAll();
    }
  }, [active]);

  const saveWindow = () => {
    const data = {
      ...baseProperties,
      hideFromPlayerView,
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
    hideFromPlayerView,
    setHideFromPlayerView,
  };
};
