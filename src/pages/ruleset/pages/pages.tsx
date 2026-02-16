import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components';
import { useRulesetPages } from '@/lib/compass-api';
import { useMemo, useState } from 'react';
import { PreviewCard } from '../components';

interface PageSelectProps {
  onEditDetails?: (id: string) => void;
}

const ALL_CATEGORIES = 'all';

export const PageSelect = ({ onEditDetails }: PageSelectProps) => {
  const { pages, updatePage, removePageFromRuleset } = useRulesetPages();
  const [filterValue, setFilterValue] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of pages) {
      if (p.category?.trim()) set.add(p.category.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [pages]);

  const sortedPages = [...pages].sort((a, b) => a.label.localeCompare(b.label));
  const filteredPages = sortedPages
    .filter((p) => {
      const matchesText = p.label.toLowerCase().includes(filterValue.toLowerCase());
      const matchesCategory =
        categoryFilter === ALL_CATEGORIES || p.category?.trim() === categoryFilter;
      return matchesText && matchesCategory;
    })
    .sort((a, b) => a.label.localeCompare(b.label));

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
          onChange={(e) => setFilterValue(e.target.value)}
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
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
            onDelete={() => handleDelete(p.id)}
            onOpen={() => {}}
            openDisabled
            onEdit={(label, category) => updatePage(p.id, { label, category })}
            onEditDetails={onEditDetails ? () => onEditDetails(p.id) : undefined}
          />
        ))}
      </div>
    </div>
  );
};
