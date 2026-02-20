import { Button } from '@/components';
import { useLocations, useWorld } from '@/lib/compass-api';
import { ArrowLeft, Plus } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { WorldEditorCanvas } from './world-editor-canvas';

export function WorldEditor() {
  const { worldId } = useParams<{ worldId: string }>();
  const world = useWorld(worldId);
  const { locations, createLocation, updateLocation, deleteLocation } = useLocations(worldId);

  useEffect(() => {
    if (worldId && world === undefined) {
      return;
    }
    if (worldId && world === null) {
      window.location.href = '#/worlds';
      return;
    }
  }, [worldId, world]);

  const handleAddLocationAt = async (x: number, y: number) => {
    if (!worldId) return;
    return createLocation(worldId, {
      label: 'New Location',
      nodeX: x,
      nodeY: y,
      nodeWidth: 160,
      nodeHeight: 100,
      gridWidth: 1,
      gridHeight: 1,
      tiles: [],
    });
  };

  if (world === undefined) {
    return (
      <div className='flex h-full w-full items-center justify-center p-4'>
        <p className='text-muted-foreground'>Loading…</p>
      </div>
    );
  }

  if (!world) {
    return null;
  }

  return (
    <div className='flex h-full w-full flex-col'>
      <div className='flex shrink-0 items-center gap-2 border-b bg-background px-4 py-2'>
        <Button variant='ghost' size='sm' asChild>
          <Link to='/worlds' data-testid='world-editor-back'>
            <ArrowLeft className='h-4 w-4' />
            Back to Worlds
          </Link>
        </Button>
        <span className='text-muted-foreground'>|</span>
        <h1 className='truncate text-lg font-semibold'>{world.label}</h1>
        <Button
          variant='outline'
          size='sm'
          className='ml-auto gap-1'
          data-testid='world-editor-add-location'
          onClick={() => handleAddLocationAt(200, 200)}>
          <Plus className='h-4 w-4' />
          Add location
        </Button>
      </div>
      <div className='min-h-0 flex-1' id='world-canvas-wrap'>
        <WorldEditorCanvas
          locations={locations ?? []}
          onCreateLocation={async (wid, data) => createLocation(wid, data)}
          onUpdateLocation={updateLocation}
          onDeleteLocation={deleteLocation}
          translateExtent={[
            [-2000, -2000],
            [2000, 2000],
          ]}
        />
      </div>
    </div>
  );
}
