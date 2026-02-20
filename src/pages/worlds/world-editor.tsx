import { Button } from '@/components';
import { useLocations, useWorld } from '@/lib/compass-api';
import type { Location } from '@/types';
import { ArrowLeft, ChevronRight, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { WorldEditorCanvas } from './world-editor-canvas';
import { WorldEditorLocationPanel } from './world-editor-location-panel';

const DEFAULT_GRID_SIZE = 8;

export function WorldEditor() {
  const { worldId } = useParams<{ worldId: string }>();
  const navigate = useNavigate();
  const world = useWorld(worldId);
  const [parentStack, setParentStack] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

  const currentParent = parentStack.length > 0 ? parentStack[parentStack.length - 1] : null;
  const { locations, createLocation, updateLocation, deleteLocation } = useLocations(
    worldId,
    currentParent?.id ?? null,
  );

  const locationsList = locations ?? [];
  const selectedLocation = selectedLocationId
    ? locationsList.find((loc) => loc.id === selectedLocationId)
    : null;

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
      parentLocationId: currentParent?.id ?? null,
      nodeX: x,
      nodeY: y,
      nodeWidth: 160,
      nodeHeight: 100,
      gridWidth: 1,
      gridHeight: 1,
      tiles: [],
    });
  };

  const handleEnterLocation = (location: Location) => {
    setParentStack((prev) => [...prev, location]);
    setSelectedLocationId(null);
  };

  const handleBack = () => {
    setParentStack((prev) => prev.slice(0, -1));
    setSelectedLocationId(null);
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
      <div className='flex shrink-0 flex-wrap items-center gap-2 border-b bg-background px-4 py-2'>
        <Button variant='ghost' size='sm' asChild>
          <Link to='/worlds' data-testid='world-editor-back'>
            <ArrowLeft className='h-4 w-4' />
            Back to Worlds
          </Link>
        </Button>
        <span className='text-muted-foreground'>|</span>
        <span className='truncate font-semibold'>{world.label}</span>
        {parentStack.map((loc) => (
          <span key={loc.id} className='flex items-center gap-1 text-muted-foreground'>
            <ChevronRight className='h-4 w-4' />
            <span className='truncate font-medium text-foreground'>{loc.label}</span>
          </span>
        ))}
        {parentStack.length > 0 && (
          <Button variant='ghost' size='sm' onClick={handleBack} data-testid='world-editor-back-in'>
            Back
          </Button>
        )}
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
      <div className='flex min-h-0 flex-1'>
        <div className='min-h-0 flex-1' id='world-canvas-wrap'>
          <WorldEditorCanvas
            locations={locationsList}
            parentLocationId={currentParent?.id ?? null}
            onCreateLocation={async (wid, data) => createLocation(wid, data)}
            onUpdateLocation={updateLocation}
            onDeleteLocation={deleteLocation}
            onEnterLocation={handleEnterLocation}
            selectedLocationId={selectedLocationId}
            onSelectLocation={setSelectedLocationId}
            translateExtent={[
              [-2000, -2000],
              [2000, 2000],
            ]}
          />
        </div>
        {selectedLocation && (
          <WorldEditorLocationPanel
            location={selectedLocation}
            onAddGrid={() => {
              updateLocation(selectedLocation.id, {
                gridWidth: DEFAULT_GRID_SIZE,
                gridHeight: DEFAULT_GRID_SIZE,
              });
            }}
            onOpenInLocationEditor={() => {
              if (worldId) navigate(`/worlds/${worldId}/locations/${selectedLocation.id}`);
            }}
            onUpdateLabel={(label) => updateLocation(selectedLocation.id, { label })}
            hasGrid={
              selectedLocation.gridWidth > 1 || selectedLocation.gridHeight > 1
            }
          />
        )}
      </div>
    </div>
  );
}
