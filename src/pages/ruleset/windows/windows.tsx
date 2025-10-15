import {
  Button,
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '@/components';
import { useRulesets, useWindows } from '@/lib/compass-api';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const WindowSelect = () => {
  const { windows, deleteWindow } = useWindows();
  const { activeRuleset } = useRulesets();
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
        placeholder='Filter by title or category...'
        value={filterValue}
        onChange={(e) => setFilterValue(e.target.value)}
      />
      <div className='flex gap-2 flex-wrap'>
        {filteredCharts.map((c) => (
          <Card key={c.id} className='p-4 w-[300px] h-[240px] flex flex-col justify-between'>
            <CardHeader>
              <CardTitle className='text-lg'>{c.title}</CardTitle>
            </CardHeader>
            <CardDescription className='grow-1 max-h-[200px] overflow-y-auto'>
              <div className='flex flex-col gap-2'>
                <p>{c.category}</p>
              </div>
            </CardDescription>
            <div className='flex gap-2 mt-2 bg-secondary rounded-md p-2 justify-between items-center'>
              <Button variant='ghost' onClick={() => deleteWindow(c.id)} className='text-red-500'>
                Delete
              </Button>
              <CardAction>
                <Button
                  variant='link'
                  onClick={() => navigate(`/rulesets/${activeRuleset?.id}/windows/${c.id}`)}>
                  Open
                </Button>
              </CardAction>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
