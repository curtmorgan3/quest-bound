import { useRulesetPages } from '@/lib/compass-api';
import { useEffect, useState } from 'react';

interface UsePageValuesProps {
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

export const usePageValues = ({
  id = '',
  baseProperties,
  onCreate,
  setTitle,
  setCategory,
  setDescription: _setDescription,
}: UsePageValuesProps) => {
  const { pages, createPage, updatePage } = useRulesetPages();
  const isEditMode = !!id;

  const active = pages.find((p) => p.id === id);

  const [hideFromPlayerView, setHideFromPlayerView] = useState(false);

  const resetAll = () => {
    setHideFromPlayerView(false);
  };

  useEffect(() => {
    if (isEditMode && active) {
      setTitle(active.label);
      setCategory(active.category || '');
      setHideFromPlayerView(active.hideFromPlayerView ?? false);
    } else {
      resetAll();
    }
  }, [active, isEditMode]);

  const savePage = () => {
    if (isEditMode) {
      updatePage(id, {
        label: baseProperties.title,
        category: baseProperties.category || undefined,
        hideFromPlayerView,
      });
    } else {
      createPage({
        label: baseProperties.title,
        category: baseProperties.category || undefined,
        hideFromPlayerView,
      });
    }
    onCreate?.();
  };

  return {
    savePage,
    hideFromPlayerView,
    setHideFromPlayerView,
  };
};
