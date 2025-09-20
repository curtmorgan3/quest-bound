import { Button, Card, CardAction, CardDescription, CardHeader, CardTitle } from '@/components';
import { useCharts } from '@/lib/compass-api';
import { useSearchParams } from 'react-router-dom';
import { ChartEditor } from './chart-editor';

export const ChartSelect = () => {
  const { charts, deleteChart } = useCharts();
  const [searchParams, setSearchParams] = useSearchParams();

  const chartId = searchParams.get('chart');

  if (chartId) {
    return <ChartEditor chartId={chartId} />;
  }

  return (
    <div className='flex gap-2 flex-wrap'>
      {charts.map((c) => (
        <Card key={c.id} className='p-4 w-[300px] h-[240px] flex flex-col justify-between'>
          <CardHeader>
            <CardTitle className='text-lg'>{c.title}</CardTitle>
          </CardHeader>
          <CardDescription className='grow-1 max-h-[200px] overflow-y-auto'>
            <div className='flex flex-col gap-2'>
              <p>{c.category}</p>
              <p>{c.description}</p>
            </div>
          </CardDescription>
          <div className='flex gap-2 mt-2 bg-secondary rounded-md p-2 justify-between items-center'>
            <Button variant='ghost' onClick={() => deleteChart(c.id)} className='text-red-500'>
              Delete
            </Button>
            <CardAction>
              <Button variant='link' onClick={() => setSearchParams({ chart: c.id })}>
                Open
              </Button>
            </CardAction>
          </div>
        </Card>
      ))}
    </div>
  );
};
