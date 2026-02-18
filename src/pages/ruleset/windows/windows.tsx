import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components';
import { useActiveRuleset, useWindows } from '@/lib/compass-api';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PreviewCard } from '../components';

interface WindowSelectProps {
  onEditDetails?: (id: string) => void;
}

const ALL_CATEGORIES = 'all';

export const WindowSelect = ({ onEditDetails }: WindowSelectProps) => {
  const { windows, deleteWindow, updateWindow } = useWindows();
  const { activeRuleset } = useActiveRuleset();
  const navigate = useNavigate();
  const [filterValue, setFilterValue] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const w of windows) {
      if (w.category?.trim()) set.add(w.category.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [windows]);

  const sortedWindows = [...windows].sort((a, b) => a.title.localeCompare(b.title));
  const filteredWindows = sortedWindows
    .filter((c) => {
      const matchesText = c.title.toLowerCase().includes(filterValue.toLowerCase());
      const matchesCategory =
        categoryFilter === ALL_CATEGORIES || c.category?.trim() === categoryFilter;
      return matchesText && matchesCategory;
    })
    .sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-wrap items-center gap-2'>
        <Input
          className='max-w-md'
          data-testid='preview-filter'
          placeholder='Filter by title'
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
        {filteredWindows.map((c) => (
          <PreviewCard
            {...c}
            key={c.id}
            type='windows'
            onDelete={() => deleteWindow(c.id)}
            onOpen={() => navigate(`/rulesets/${activeRuleset?.id}/windows/${c.id}`)}
            onEdit={(title, category) => updateWindow(c.id, { title, category })}
            onEditDetails={onEditDetails ? () => onEditDetails(c.id) : undefined}
          />
        ))}
      </div>
    </div>
  );
};
