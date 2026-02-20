import { Button } from '@/components';
import { useLocation, useWorld } from '@/lib/compass-api';
import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

export function LocationEditorPlaceholder() {
  const { worldId, locationId } = useParams<{ worldId: string; locationId: string }>();
  const world = useWorld(worldId);
  const location = useLocation(locationId);

  return (
    <div className='flex h-full w-full flex-col p-4 gap-4'>
      <div className='flex items-center gap-2'>
        <Button variant='ghost' size='sm' asChild>
          <Link
            to={worldId ? `/worlds/${worldId}` : '/worlds'}
            data-testid='location-editor-back'
          >
            <ArrowLeft className='h-4 w-4' />
            Back to World
          </Link>
        </Button>
      </div>
      <h1 className='text-4xl font-bold'>Location editor</h1>
      {location && <p className='text-muted-foreground'>{location.label}</p>}
      {world && <p className='text-sm text-muted-foreground'>World: {world.label}</p>}
    </div>
  );
}
