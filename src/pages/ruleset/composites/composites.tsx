import {
  Button,
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '@/components';
import { useComposites } from '@/lib/compass-api';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CompositeEditor } from './composite-editor';

export const CompositeSelect = () => {
  const { composites, deleteComposite } = useComposites();
  const [searchParams, setSearchParams] = useSearchParams();

  const [filterValue, setFilterValue] = useState('');

  const sortedComposites = [...composites].sort((a, b) => a.title.localeCompare(b.title));
  const filteredCharts = sortedComposites.filter(
    (c) =>
      c.title.toLowerCase().includes(filterValue.toLowerCase()) ||
      c.category?.toLowerCase().includes(filterValue.toLowerCase()),
  );

  const compositeId = searchParams.get('composite');

  if (compositeId) {
    return <CompositeEditor compositeId={compositeId} />;
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
              <Button
                variant='ghost'
                onClick={() => deleteComposite(c.id)}
                className='text-red-500'>
                Delete
              </Button>
              <CardAction>
                <Button variant='link' onClick={() => setSearchParams({ composite: c.id })}>
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
