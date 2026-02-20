import { Button } from '@/components';
import { useWorld } from '@/lib/compass-api';
import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

export const WorldEditorPage = () => {
  const { worldId } = useParams();
  const world = useWorld(worldId);

  return (
    <div className='flex h-full w-full flex-col p-4 gap-4'>
      <div className='flex items-center gap-2'>
        <Button variant='ghost' size='sm' asChild>
          <Link to='/worlds' data-testid='world-editor-back'>
            <ArrowLeft className='h-4 w-4' />
            Back to Worlds
          </Link>
        </Button>
      </div>
      <h1 className='text-4xl font-bold'>World editor</h1>
      {world && <p className='text-muted-foreground'>{world.label}</p>}
    </div>
  );
};
