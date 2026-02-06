import { Input } from '@/components';
import { useCharts } from '@/lib/compass-api';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PreviewCard } from '../components';
import { ChartEditor } from './chart-editor';

interface ChartSelectProps {
  onEditDetails?: (id: string) => void;
}

export const ChartSelect = ({ onEditDetails }: ChartSelectProps) => {
  const { charts, deleteChart, updateChart } = useCharts();
  const [searchParams, setSearchParams] = useSearchParams();

  const [filterValue, setFilterValue] = useState('');

  const sortedCharts = [...charts].sort((a, b) => a.title.localeCompare(b.title));
  const filteredCharts = sortedCharts.filter(
    (c) =>
      c.title.toLowerCase().includes(filterValue.toLowerCase()) ||
      c.category?.toLowerCase().includes(filterValue.toLowerCase()),
  );

  const chartId = searchParams.get('chart');

  if (chartId) {
    return <ChartEditor chartId={chartId} />;
  }

  return (
    <div className='flex flex-col gap-4'>
      <Input
        className='max-w-md'
        placeholder='Filter by title or category...'
        value={filterValue}
        onChange={(e) => setFilterValue(e.target.value)}
      />
      <div className='flex gap-2 flex-wrap'>
        {filteredCharts.map((c) => (
          <PreviewCard
            {...c}
            key={c.id}
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
