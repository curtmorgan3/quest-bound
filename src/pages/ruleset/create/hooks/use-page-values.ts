import { useRulesetPages } from '@/lib/compass-api';
import { useEffect } from 'react';

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

  useEffect(() => {
    if (isEditMode && active) {
      setTitle(active.label);
      setCategory(active.category || '');
    }
  }, [active, isEditMode]);

  const savePage = () => {
    if (isEditMode) {
      updatePage(id, { label: baseProperties.title, category: baseProperties.category || undefined });
    } else {
      createPage({ label: baseProperties.title, category: baseProperties.category || undefined });
    }
    onCreate?.();
  };

  return {
    savePage,
  };
};
