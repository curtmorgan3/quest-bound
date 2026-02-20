import { useAssets, useLocations, useWorld, useWorlds } from '@/lib/compass-api';
import type { Location } from '@/types';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { WorldEditorBackgroundDialog } from './world-editor-background-dialog';
import { WorldEditorCanvas } from './world-editor-canvas';
import { WorldEditorLocationPanel } from './world-editor-location-panel';
import { WorldEditorTopBar } from './world-editor-top-bar';

const DEFAULT_GRID_SIZE = 8;

export function WorldEditor() {
  const { worldId } = useParams<{ worldId: string }>();
  const navigate = useNavigate();
  const world = useWorld(worldId);
  const { updateWorld } = useWorlds();
  const [parentStack, setParentStack] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [backgroundDialogOpen, setBackgroundDialogOpen] = useState(false);

  const { assets } = useAssets(world?.rulesetId ?? null);
  const getAssetData = (assetId: string) =>
    assets?.find((a) => a.id === assetId)?.data ?? null;

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
      <WorldEditorTopBar
        worldLabel={world.label}
        onUpdateWorldLabel={(label) => worldId && updateWorld(worldId, { label })}
        parentStack={parentStack}
        onBack={handleBack}
        onAddLocation={() => handleAddLocationAt(200, 200)}
        onEditBackground={() => setBackgroundDialogOpen(true)}
      />
      <WorldEditorBackgroundDialog
        open={backgroundDialogOpen}
        onOpenChange={setBackgroundDialogOpen}
        isWorldLevel={parentStack.length === 0}
        world={world}
        currentLocation={currentParent}
        worldId={worldId}
        rulesetId={world.rulesetId}
        getAssetData={getAssetData}
        onUpdateWorld={updateWorld}
        onUpdateLocation={updateLocation}
      />
      <div className='flex min-h-0 flex-1'>
        <div className='min-h-0 flex-1' id='world-canvas-wrap'>
          <WorldEditorCanvas
            locations={locationsList}
            parentLocationId={currentParent?.id ?? null}
            world={parentStack.length === 0 ? world : null}
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
            onRemoveGrid={() =>
              updateLocation(selectedLocation.id, { gridWidth: 1, gridHeight: 1 })
            }
            onOpenInLocationEditor={() => {
              if (worldId) navigate(`/worlds/${worldId}/locations/${selectedLocation.id}`);
            }}
            onUpdateLocation={(data) => updateLocation(selectedLocation.id, data)}
            hasGrid={
              selectedLocation.gridWidth > 1 || selectedLocation.gridHeight > 1
            }
          />
        )}
      </div>
    </div>
  );
}
