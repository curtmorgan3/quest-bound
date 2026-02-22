import { useScripts } from '@/lib/compass-api';
import { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { groupScriptsByCategory, nameFromParams, typeFromParams } from './utils';

export const useScriptFilters = () => {
  const { campaignId } = useParams<{
    campaignId?: string;
  }>();

  const [searchParams, setSearchParams] = useSearchParams();
  const { scripts } = useScripts(campaignId);
  const selectedType = typeFromParams(searchParams);
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

  const filteredScripts = useMemo(() => {
    let result = scripts;
    if (selectedType !== 'all') {
      result = result.filter((s) => s.entityType === selectedType);
    }
    const query = nameFilter.trim().toLowerCase();
    if (query) {
      result = result.filter((s) => (s.name ?? '').toLowerCase().includes(query));
    }
    return result;
  }, [scripts, selectedType, nameFilter]);

  const scriptsByCategory = useMemo(
    () => groupScriptsByCategory(filteredScripts),
    [filteredScripts],
  );

  return {
    scriptsByCategory,
    setNameFilter,
    setSelectedType,
    filteredScripts,
    nameFilter,
  };
};
