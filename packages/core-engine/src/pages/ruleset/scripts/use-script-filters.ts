import { useScripts } from '@/lib/compass-api';
import { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  ALL_CATEGORIES,
  groupScriptsByCategory,
  nameFromParams,
  typeFromParams,
  categoryFromParams,
} from './utils';

export const useScriptFilters = () => {
  const { campaignId } = useParams<{
    campaignId?: string;
  }>();

  const [searchParams, setSearchParams] = useSearchParams();
  const { scripts } = useScripts(campaignId);
  const selectedType = typeFromParams(searchParams);
  const categoryFilter = categoryFromParams(searchParams);

  const setSelectedType = (value: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === 'all') {
          next.delete('type');
        } else {
          next.set('type', value);
        }
        return next;
      },
      { replace: true },
    );
  };

  const setCategoryFilter = (value: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === ALL_CATEGORIES) {
          next.delete('category');
        } else {
          next.set('category', value);
        }
        return next;
      },
      { replace: true },
    );
  };

  const nameFilter = nameFromParams(searchParams);

  const setNameFilter = (value: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value.trim() === '') {
          next.delete('q');
        } else {
          next.set('q', value);
        }
        return next;
      },
      { replace: true },
    );
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const s of scripts) {
      const cat = s.category?.trim();
      if (cat) set.add(cat);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [scripts]);

  const filteredScripts = useMemo(() => {
    // Hide hidden scripts from the main scripts index; they are internal.
    let result = scripts.filter((s) => s.hidden !== true);
    if (selectedType !== 'all') {
      result = result.filter((s) => s.entityType === selectedType);
    }
    if (categoryFilter !== ALL_CATEGORIES) {
      result = result.filter((s) => (s.category?.trim() ?? '') === categoryFilter);
    }
    const query = nameFilter.trim().toLowerCase();
    if (query) {
      result = result.filter((s) => (s.name ?? '').toLowerCase().includes(query));
    }
    return result;
  }, [scripts, selectedType, categoryFilter, nameFilter]);

  const scriptsByCategory = useMemo(
    () => groupScriptsByCategory(filteredScripts),
    [filteredScripts],
  );

  return {
    scriptsByCategory,
    setNameFilter,
    setSelectedType,
    setCategoryFilter,
    filteredScripts,
    nameFilter,
    categoryFilter,
    categories,
  };
};
