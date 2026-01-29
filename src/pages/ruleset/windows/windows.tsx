import { Input } from '@/components';
import { useActiveRuleset, useWindows } from '@/lib/compass-api';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PreviewCard } from '../components';

export const WindowSelect = () => {
  const { windows, deleteWindow, updateWindow } = useWindows();
  const { activeRuleset } = useActiveRuleset();
  const navigate = useNavigate();
  const [filterValue, setFilterValue] = useState('');

  const sortedWindows = [...windows].sort((a, b) => a.title.localeCompare(b.title));
  const filteredCharts = sortedWindows.filter(
    (c) =>
      c.title.toLowerCase().includes(filterValue.toLowerCase()) ||
      c.category?.toLowerCase().includes(filterValue.toLowerCase()),
  );

  return (
    <div className='flex flex-col gap-4'>
      <Input
        className='max-w-md'
        data-testid='preview-filter'
        placeholder='Filter by title or category...'
        value={filterValue}
        onChange={(e) => setFilterValue(e.target.value)}
      />
      <div className='flex gap-2 flex-wrap'>
        {filteredCharts.map((c) => (
          <PreviewCard
            {...c}
            key={c.id}
            onDelete={() => deleteWindow(c.id)}
            onOpen={() => navigate(`/rulesets/${activeRuleset?.id}/windows/${c.id}`)}
            onEdit={(title, category) => updateWindow(c.id, { title, category })}
          />
        ))}
      </div>
    </div>
  );
};
