import {
  useAssets,
  useLocation,
  useLocations,
  useWorld,
  useWorlds,
} from '@/lib/compass-api';
import type { Location } from '@/types';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { WorldEditorCanvas } from './world-editor-canvas';
import { WorldEditorLocationPanel } from './world-editor-location-panel';
import { WorldEditorTopBar } from './world-editor-top-bar';

export function WorldEditor() {
  const { worldId, locationId: urlLocationId } = useParams<{
    worldId: string;
    locationId?: string;
  }>();
  const navigate = useNavigate();
  const world = useWorld(worldId);
  const urlLocation = useLocation(urlLocationId);
  const { updateWorld } = useWorlds();
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);

  const { assets } = useAssets(null);
  const getAssetData = (assetId: string) =>
    assets?.find((a) => a.id === assetId)?.data ?? null;

  const parentStack = useMemo(() => {
    if (urlLocationId && urlLocation) return [urlLocation];
    return [];
  }, [urlLocationId, urlLocation]);

  const currentParent = parentStack.length > 0 ? parentStack[parentStack.length - 1] : null;
  const { locations, createLocation, updateLocation, deleteLocation } = useLocations(
    worldId,
    currentParent?.id ?? null,
  );

  const locationsList = locations ?? [];
  const selectedLocationIdsFiltered = useMemo(
    () => selectedLocationIds.filter((id) => locationsList.some((loc) => loc.id === id)),
    [selectedLocationIds, locationsList],
  );
  const singleSelectedLocation =
    selectedLocationIdsFiltered.length === 1
      ? locationsList.find((loc) => loc.id === selectedLocationIdsFiltered[0])
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
    setSelectedLocationIds([]);
    if (worldId) navigate(`/worlds/${worldId}/locations/${location.id}`);
  };

  const handleBack = () => {
    setSelectedLocationIds([]);
    if (!worldId) return;
    if (currentParent?.parentLocationId) {
      navigate(`/worlds/${worldId}/locations/${currentParent.parentLocationId}`);
    } else {
      navigate(`/worlds/${worldId}`);
    }
  };

  const handleAddParentToCurrent = async () => {
    if (!worldId) return;
    if (currentParent) {
      const newId = await createLocation(worldId, {
        label: 'New Parent',
        parentLocationId: currentParent.parentLocationId ?? null,
        nodeX: currentParent.nodeX - 60,
        nodeY: currentParent.nodeY - 60,
        nodeWidth: 160,
        nodeHeight: 100,
        gridWidth: 1,
        gridHeight: 1,
        tiles: [],
      });
      if (newId) {
        await updateLocation(currentParent.id, { parentLocationId: newId });
        setSelectedLocationIds([]);
        navigate(`/worlds/${worldId}/locations/${newId}`);
      }
    } else {
      const newId = await createLocation(worldId, {
        label: 'New Parent',
        parentLocationId: null,
        nodeX: 200,
        nodeY: 200,
        nodeWidth: 160,
        nodeHeight: 100,
        gridWidth: 1,
        gridHeight: 1,
        tiles: [],
      });
      if (newId) {
        for (const loc of locationsList) {
          await updateLocation(loc.id, { parentLocationId: newId });
        }
        setSelectedLocationIds([]);
        navigate(`/worlds/${worldId}/locations/${newId}`);
      }
    }
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
        onAddParentToCurrent={handleAddParentToCurrent}
      />
      <div className='flex min-h-0 flex-1'>
        <div className='min-h-0 flex-1' id='world-canvas-wrap'>
          <WorldEditorCanvas
            locations={locationsList}
            parentLocationId={currentParent?.id ?? null}
            onCreateLocation={async (wid, data) => createLocation(wid, data)}
            onUpdateLocation={updateLocation}
            onDeleteLocation={deleteLocation}
            onEnterLocation={handleEnterLocation}
            selectedLocationIds={selectedLocationIdsFiltered}
            onSelectLocations={setSelectedLocationIds}
            translateExtent={[
              [-2000, -2000],
              [2000, 2000],
            ]}
          />
        </div>
        {singleSelectedLocation && (
          <WorldEditorLocationPanel
            key={singleSelectedLocation.id}
            location={singleSelectedLocation}
            siblingLocations={locationsList.filter((loc) => loc.id !== singleSelectedLocation.id)}
            rulesetId={null}
            getAssetData={getAssetData}
            onAddGrid={() => {
              updateLocation(singleSelectedLocation.id, {
                hasMap: true,
              });
            }}
            onRemoveGrid={() =>
              updateLocation(singleSelectedLocation.id, {
                hasMap: false,
              })
            }
            onOpenInLocationEditor={() => {
              if (worldId)
                navigate(`/worlds/${worldId}/locations/${singleSelectedLocation.id}/edit`);
            }}
            onUpdateLocation={(data) => updateLocation(singleSelectedLocation.id, data)}
            onMoveAsChildOf={(siblingId) => {
              updateLocation(singleSelectedLocation.id, { parentLocationId: siblingId });
              setSelectedLocationIds([]);
            }}
            onMoveAsSiblingOfParent={
              currentParent
                ? () => {
                    updateLocation(singleSelectedLocation.id, {
                      parentLocationId: currentParent.parentLocationId ?? null,
                    });
                    setSelectedLocationIds([]);
                  }
                : undefined
            }
            hasMap={singleSelectedLocation.hasMap ?? false}
          />
        )}
      </div>
    </div>
  );
}
