import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components';
import { useCharts } from '@/lib/compass-api';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PreviewCard } from '../components';
import { ChartEditor } from './chart-editor';

interface ChartSelectProps {
  onEditDetails?: (id: string) => void;
}

const ALL_CATEGORIES = 'all';

export const ChartSelect = ({ onEditDetails }: ChartSelectProps) => {
  const { charts, deleteChart, updateChart } = useCharts();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filterValue, setFilterValue] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const c of charts) {
      if (c.category?.trim()) set.add(c.category.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [charts]);

  const sortedCharts = [...charts].sort((a, b) => a.title.localeCompare(b.title));
  const filteredCharts = sortedCharts.filter((c) => {
    const matchesText = c.title.toLowerCase().includes(filterValue.toLowerCase());
    const matchesCategory =
      categoryFilter === ALL_CATEGORIES || c.category?.trim() === categoryFilter;
    return matchesText && matchesCategory;
  });

  const chartId = searchParams.get('chart');

  if (chartId) {
    return <ChartEditor chartId={chartId} />;
  }

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-wrap items-center gap-2'>
        <Input
          className='max-w-md'
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
        {filteredCharts.map((c) => (
          <PreviewCard
            {...c}
            key={c.id}
            type='charts'
            titleClassName={c.moduleId ? 'text-module-origin' : undefined}
            onDelete={() => deleteChart(c.id)}
            onOpen={() => setSearchParams({ chart: c.id })}
            onEdit={(title, category) => updateChart(c.id, { title, category })}
            onEditDetails={onEditDetails ? () => onEditDetails(c.id) : undefined}
          />
        ))}
      </div>
    </div>
  );
};
