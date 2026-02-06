import { Button } from '@/components';
import { useCharacter, useCharts } from '@/lib/compass-api';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChartEditor } from '../ruleset/charts/chart-editor';

export const CharacterChartViewer = () => {
  const { characterId, chartId } = useParams<{ characterId: string; chartId: string }>();
  const { character } = useCharacter(characterId);
  const { charts } = useCharts(character?.rulesetId);
  const navigate = useNavigate();

  const chart = chartId ? charts.find((c) => c.id === chartId) : undefined;

  if (!characterId || !chartId) {
    return null;
  }

  if (!character) {
    return null;
  }

  if (!chart) {
    return (
      <div className='flex flex-col items-center justify-center h-full gap-4'>
        <p className='text-muted-foreground'>Chart not found</p>
        <Button variant='outline' onClick={() => navigate(`/characters/${characterId}`)}>
          <ArrowLeft className='h-4 w-4 mr-2' />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className='flex flex-col h-[calc(100vh-2rem)]'>
      <div className='flex items-center gap-4 p-4 border-b shrink-0'>
        <Button variant='ghost' size='sm' onClick={() => navigate(`/characters/${characterId}`)}>
          <ArrowLeft className='h-4 w-4' />
        </Button>
        <h1 className='text-xl font-semibold truncate'>{chart.title}</h1>
      </div>
      <div className='flex-1 min-h-0 p-4'>
        <ChartEditor
          chartId={chartId}
          readOnly
          rulesetId={character.rulesetId}
        />
      </div>
    </div>
  );
};
