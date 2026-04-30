import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components';
import { useActiveRuleset, useRulesetPages } from '@/lib/compass-api';
import { useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRulesetFiltersStore } from '@/stores/ruleset-filters-store';
import type { Page } from '@/types';
import { PreviewCard } from '../components';
import { useListFilterParams } from '../utils/list-filter-query-params';

interface PageSelectProps {
  onEditDetails?: (id: string) => void;
}

const ALL_CATEGORIES = 'all';

function compareRulesetPagesByOrderThenLabel(a: Page, b: Page): number {
  const oa =
    typeof a.order === 'number' && Number.isFinite(a.order) ? a.order : Number.POSITIVE_INFINITY;
  const ob =
    typeof b.order === 'number' && Number.isFinite(b.order) ? b.order : Number.POSITIVE_INFINITY;
  if (oa !== ob) return oa - ob;
  return a.label.localeCompare(b.label);
}

export const PageSelect = ({ onEditDetails }: PageSelectProps) => {
  const { pages, updatePage, removePageFromRuleset } = useRulesetPages();
  const { activeRuleset } = useActiveRuleset();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { title: filterValue, category: categoryFilter, setTitle: setFilterValue, setCategory: setCategoryFilter } =
    useListFilterParams();
  const setListFilters = useRulesetFiltersStore((s) => s.setListFilters);

  const rulesetId = activeRuleset?.id;

  useEffect(() => {
    if (!rulesetId) return;
    setListFilters(rulesetId, 'pages', {
      title: searchParams.get('title') ?? undefined,
      category: searchParams.get('category') ?? undefined,
    });
  }, [rulesetId, searchParams, setListFilters]);

  const handleTitleChange = (value: string) => {
    setFilterValue(value);
    if (rulesetId) setListFilters(rulesetId, 'pages', { title: value || null });
  };

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
    if (rulesetId) setListFilters(rulesetId, 'pages', { category: value === ALL_CATEGORIES ? null : value });
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of pages) {
      if (p.category?.trim()) set.add(p.category.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [pages]);

  const sortedPages = [...pages].sort(compareRulesetPagesByOrderThenLabel);
  const filteredPages = sortedPages.filter((p) => {
      const matchesText = p.label.toLowerCase().includes(filterValue.toLowerCase());
      const matchesCategory =
        categoryFilter === ALL_CATEGORIES || p.category?.trim() === categoryFilter;
      return matchesText && matchesCategory;
    });

  const handleDelete = (id: string) => {
    removePageFromRuleset(id);
  };

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-wrap items-center gap-2'>
        <Input
          className='max-w-md'
          data-testid='preview-filter'
          placeholder='Filter by label'
          value={filterValue}
          onChange={(e) => handleTitleChange(e.target.value)}
        />
        <Select value={categoryFilter} onValueChange={handleCategoryChange}>
          <SelectTrigger className='w-[180px]' data-testid='category-filter'>
            <SelectValue placeholder='Category' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className='flex gap-2 flex-wrap'>
        {filteredPages.map((p) => (
          <PreviewCard
            key={p.id}
            id={p.id}
            title={p.label}
            type='pages'
            category={p.category ?? undefined}
            image={p.image ?? undefined}
            titleClassName={p.moduleId ? 'text-module-origin' : undefined}
            existingCategories={categories}
            hideFromPlayerView={p.hideFromPlayerView}
            onDelete={() => handleDelete(p.id)}
            onOpen={() => navigate(`/rulesets/${activeRuleset?.id}/pages/${p.id}`)}
            onEdit={(label, category) => updatePage(p.id, { label, category })}
            onEditDetails={onEditDetails ? () => onEditDetails(p.id) : undefined}
          />
        ))}
      </div>
    </div>
  );
};
