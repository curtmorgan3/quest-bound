import { Module, Ruleset } from '@/types';

interface Props {
  content: Array<Ruleset | Module>;
  searchFilter: string;
}

export const useFilterContent = ({ content, searchFilter }: Props) => {
  const sortedByDate = content.sort((a, b) => {
    return parseInt(a.createdAt) - parseInt(b.createdAt);
  });

  const filteredBySearch = sortedByDate.filter((ruleset) => {
    if (searchFilter === '') {
      return true;
    }
    return ruleset.title.toLowerCase().includes(searchFilter.toLowerCase());
  });

  return filteredBySearch;
};
