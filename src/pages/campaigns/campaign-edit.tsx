import type { LocationViewerOverlayNode } from '@/components/locations/location-viewer';
import { LocationViewer, getTopTileDataAt } from '@/components/locations/location-viewer';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WorldViewer } from '@/components/worlds/world-viewer';
import {
  useArchetypes,
  useAssets,
  useCampaign,
  useCampaignCharacters,
  useCampaignEventLocations,
  useCampaignEventLocationsByLocation,
  useCampaignEvents,
  useCampaignItems,
  useLocation,
  useLocations,
  useWorld,
} from '@/lib/compass-api';
import { useCharacter } from '@/lib/compass-api/hooks/characters/use-character';
import { db } from '@/stores';
import type { CampaignEventType, Item } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowUp, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const CAMPAIGN_EVENT_TYPES: { value: CampaignEventType; label: string }[] = [
  { value: 'on_enter', label: 'On Enter' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'on_activate', label: 'On Activate' },
];

export function CampaignEdit() {
  const { campaignId, locationId: locationIdParam } = useParams<{
    campaignId: string;
    locationId?: string;
  }>();
  const navigate = useNavigate();
  const campaign = useCampaign(campaignId);
  const world = useWorld(campaign?.worldId);
  const selectedLocationId = locationIdParam ?? null;
  const { locations: rootLocations } = useLocations(campaign?.worldId, null);
  const currentLocation = useLocation(selectedLocationId ?? undefined);
  const { locations: childLocations } = useLocations(campaign?.worldId, selectedLocationId);
  const { assets } = useAssets(null);
  const { createCharacter } = useCharacter();
  const { campaignCharacters, createCampaignCharacter, updateCampaignCharacter } =
    useCampaignCharacters(campaignId);
  const { campaignItems, createCampaignItem, deleteCampaignItem } = useCampaignItems(campaignId);
  const { createCampaignEvent, deleteCampaignEvent } = useCampaignEvents(campaignId);
  const { createCampaignEventLocation, deleteCampaignEventLocation } =
    useCampaignEventLocations(undefined);
  const eventLocationsWithEvent = useCampaignEventLocationsByLocation(
    selectedLocationId ?? undefined,
  );
  const { archetypes } = useArchetypes(campaign?.rulesetId);
  const itemsForRuleset = useLiveQuery(async (): Promise<Item[]> => {
    if (!campaign?.rulesetId) return [];
    return db.items.where('rulesetId').equals(campaign.rulesetId).toArray();
  }, [campaign?.rulesetId]);
  const items: Item[] = itemsForRuleset ?? [];

  const [tileMenu, setTileMenu] = useState<{
    x: number;
    y: number;
    clientX: number;
    clientY: number;
  } | null>(null);
  const [addCharacterOpen, setAddCharacterOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [addEventName, setAddEventName] = useState('');
  const [addEventType, setAddEventType] = useState<CampaignEventType>('on_activate');
  const [pendingTile, setPendingTile] = useState<{
    locationId: string;
    tileId: string;
    x: number;
    y: number;
  } | null>(null);
  const [selectedArchetypeId, setSelectedArchetypeId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  console.log(currentLocation);

  const getAssetData = useCallback(
    (assetId: string) => assets?.find((a) => a.id === assetId)?.data ?? null,
    [assets],
  );

  const locationsList = selectedLocationId ? childLocations : rootLocations;

  const handleAdvanceToLocation = useCallback(
    (locationId: string) => {
      if (!campaignId) return;
      navigate(`/campaigns/${campaignId}/locations/${locationId}/edit`);
    },
    [campaignId, navigate],
  );

  const handleOpenMap = useCallback(
    (locationId: string) => {
      if (!campaignId) return;
      navigate(`/campaigns/${campaignId}/locations/${locationId}/edit`);
    },
    [campaignId, navigate],
  );

  const handleBack = useCallback(() => {
    if (!campaignId) return;
    if (currentLocation?.parentLocationId) {
      navigate(`/campaigns/${campaignId}/locations/${currentLocation.parentLocationId}/edit`);
    } else {
      navigate(`/campaigns/${campaignId}/edit`);
    }
  }, [campaignId, currentLocation?.parentLocationId, navigate]);

  const openTileMenuAt = useCallback(
    (x: number, y: number, clientX: number, clientY: number) => {
      if (!currentLocation?.tiles) return;
      const top = getTopTileDataAt(currentLocation.tiles, x, y);
      if (!top) return;
      setPendingTile({
        locationId: currentLocation.id,
        tileId: top.id,
        x,
        y,
      });
      setTileMenu({ x, y, clientX, clientY });
    },
    [currentLocation],
  );

  const charactersAtLocation = useMemo(
    () =>
      campaignCharacters.filter(
        (cc) => cc.currentLocationId === selectedLocationId && cc.currentTileId,
      ),
    [campaignCharacters, selectedLocationId],
  );
  const itemsAtLocation = useMemo(
    () =>
      campaignItems.filter((ci) => ci.currentLocationId === selectedLocationId && ci.currentTileId),
    [campaignItems, selectedLocationId],
  );
  const charactersResolved = useLiveQuery(async () => {
    if (charactersAtLocation.length === 0) return [];
    const chars = await db.characters.bulkGet(charactersAtLocation.map((cc) => cc.characterId));
    return charactersAtLocation.map((cc) => ({
      campaignCharacter: cc,
      character: chars.find((c) => c?.id === cc.characterId) ?? null,
    }));
  }, [charactersAtLocation.map((c) => c.id).join(',')]);
  const itemsResolved = useLiveQuery(async () => {
    if (itemsAtLocation.length === 0) return [];
    const itemRecs = await db.items.bulkGet(itemsAtLocation.map((ci) => ci.itemId));
    return itemsAtLocation.map((ci) => ({
      campaignItem: ci,
      item: itemRecs.find((i) => i?.id === ci.itemId) ?? null,
    }));
  }, [itemsAtLocation.map((i) => i.id).join(',')]);

  const overlayNodes = useMemo((): LocationViewerOverlayNode[] => {
    const nodes: LocationViewerOverlayNode[] = [];
    (charactersResolved ?? []).forEach(({ campaignCharacter, character }) => {
      if (!campaignCharacter.currentTileId) return;
      let imageUrl: string | null = null;
      if (character?.sprites?.[0]) {
        imageUrl = getAssetData(character.sprites[0]) ?? null;
      }
      if (!imageUrl && character?.image) imageUrl = character.image;
      nodes.push({
        id: `char-${campaignCharacter.id}`,
        tileId: campaignCharacter.currentTileId,
        type: 'character',
        imageUrl,
        label: character?.name ?? 'Character',
      });
    });
    (itemsResolved ?? []).forEach(({ campaignItem, item }) => {
      if (!campaignItem.currentTileId) return;
      let imageUrl: string | null = null;
      if (item?.assetId) imageUrl = getAssetData(item.assetId) ?? null;
      if (!imageUrl && item?.image) imageUrl = item.image;
      nodes.push({
        id: `item-${campaignItem.id}`,
        tileId: campaignItem.currentTileId,
        type: 'item',
        imageUrl,
        label: item?.title ?? 'Item',
      });
    });
    return nodes;
  }, [charactersResolved, itemsResolved, getAssetData]);

  const tileMenuTileId = useMemo(() => {
    if (!tileMenu || !currentLocation?.tiles) return null;
    const top = getTopTileDataAt(currentLocation.tiles, tileMenu.x, tileMenu.y);
    return top?.id ?? null;
  }, [tileMenu, currentLocation?.tiles]);

  const entityAtTile = useMemo(() => {
    if (!selectedLocationId || !tileMenuTileId) return null;
    const cc = campaignCharacters.find(
      (c) => c.currentLocationId === selectedLocationId && c.currentTileId === tileMenuTileId,
    );
    const ci = campaignItems.find(
      (c) => c.currentLocationId === selectedLocationId && c.currentTileId === tileMenuTileId,
    );
    const ev = eventLocationsWithEvent.find(
      (e) => e.locationId === selectedLocationId && e.tileId === tileMenuTileId,
    );
    return { character: cc, item: ci, event: ev };
  }, [
    selectedLocationId,
    tileMenuTileId,
    campaignCharacters,
    campaignItems,
    eventLocationsWithEvent,
  ]);

  const eventTileIds = useMemo(
    () => eventLocationsWithEvent.filter((el) => el.tileId).map((el) => el.tileId as string),
    [eventLocationsWithEvent],
  );

  const handleAddCharacter = useCallback(async () => {
    if (!campaignId || !pendingTile || !selectedArchetypeId || !campaign?.rulesetId) return;
    const newCharId = await createCharacter({
      rulesetId: campaign.rulesetId,
      archetypeIds: [selectedArchetypeId],
    });
    if (newCharId) {
      await createCampaignCharacter(campaignId, newCharId, {
        currentLocationId: pendingTile.locationId,
        currentTileId: pendingTile.tileId,
      });
    }
    setAddCharacterOpen(false);
    setPendingTile(null);
    setSelectedArchetypeId(null);
    setTileMenu(null);
  }, [
    campaignId,
    campaign?.rulesetId,
    pendingTile,
    selectedArchetypeId,
    createCharacter,
    createCampaignCharacter,
  ]);

  const handleAddItem = useCallback(async () => {
    if (!campaignId || !pendingTile || !selectedItemId) return;
    await createCampaignItem(campaignId, {
      itemId: selectedItemId,
      currentLocationId: pendingTile.locationId,
      currentTileId: pendingTile.tileId,
    });
    setAddItemOpen(false);
    setPendingTile(null);
    setSelectedItemId(null);
    setTileMenu(null);
  }, [campaignId, pendingTile, selectedItemId, createCampaignItem]);

  const handleAddEvent = useCallback(async () => {
    if (!campaignId || !pendingTile || !addEventName.trim()) return;
    const eventId = await createCampaignEvent(campaignId, {
      label: addEventName.trim(),
      type: addEventType,
    });
    if (eventId) {
      await createCampaignEventLocation(eventId, pendingTile.locationId, pendingTile.tileId);
    }
    setAddEventOpen(false);
    setAddEventName('');
    setAddEventType('on_activate');
    setPendingTile(null);
    setTileMenu(null);
  }, [
    campaignId,
    pendingTile,
    addEventName,
    addEventType,
    createCampaignEvent,
    createCampaignEventLocation,
  ]);

  const openAddCharacter = useCallback(() => {
    if (currentLocation?.tiles && tileMenu) {
      const top = getTopTileDataAt(currentLocation.tiles, tileMenu.x, tileMenu.y);
      if (top)
        setPendingTile({
          locationId: currentLocation.id,
          tileId: top.id,
          x: tileMenu.x,
          y: tileMenu.y,
        });
    }
    setTileMenu(null);
    setAddCharacterOpen(true);
  }, [currentLocation, tileMenu]);

  const openAddItem = useCallback(() => {
    if (currentLocation?.tiles && tileMenu) {
      const top = getTopTileDataAt(currentLocation.tiles, tileMenu.x, tileMenu.y);
      if (top)
        setPendingTile({
          locationId: currentLocation.id,
          tileId: top.id,
          x: tileMenu.x,
          y: tileMenu.y,
        });
    }
    setTileMenu(null);
    setAddItemOpen(true);
  }, [currentLocation, tileMenu]);

  const handleRemoveCharacter = useCallback(async () => {
    if (!entityAtTile?.character) return;
    await updateCampaignCharacter(entityAtTile.character.id, {
      currentLocationId: null,
      currentTileId: null,
    });
    setTileMenu(null);
  }, [entityAtTile?.character, updateCampaignCharacter]);

  const handleRemoveItem = useCallback(async () => {
    if (!entityAtTile?.item) return;
    await deleteCampaignItem(entityAtTile.item.id);
    setTileMenu(null);
  }, [entityAtTile?.item, deleteCampaignItem]);

  const handleRemoveEvent = useCallback(async () => {
    if (!entityAtTile?.event) return;
    await deleteCampaignEventLocation(entityAtTile.event.id);
    await deleteCampaignEvent(entityAtTile.event.campaignEventId);
    setTileMenu(null);
  }, [entityAtTile?.event, deleteCampaignEventLocation, deleteCampaignEvent]);

  const openAddEvent = useCallback(() => {
    if (currentLocation?.tiles && tileMenu) {
      const top = getTopTileDataAt(currentLocation.tiles, tileMenu.x, tileMenu.y);
      if (top)
        setPendingTile({
          locationId: currentLocation.id,
          tileId: top.id,
          x: tileMenu.x,
          y: tileMenu.y,
        });
    }
    setTileMenu(null);
    setAddEventOpen(true);
  }, [currentLocation, tileMenu]);

  if (campaignId && campaign === undefined) {
    return (
      <div className='flex h-full w-full items-center justify-center p-4'>
        <p className='text-muted-foreground'>Loading…</p>
      </div>
    );
  }
  if (!campaign || !world) {
    return (
      <div className='flex h-full w-full flex-col items-center justify-center gap-4 p-4'>
        <p className='text-muted-foreground'>Campaign or world not found</p>
        <Button variant='outline' onClick={() => navigate('/campaigns')}>
          Back to campaigns
        </Button>
      </div>
    );
  }

  const showMap = selectedLocationId && currentLocation?.hasMap;
  const archetypesForSelect = archetypes;

  return (
    <div className='flex h-full w-full flex-col'>
      <div className='flex shrink-0 flex-wrap items-center gap-2 border-b bg-background px-4 py-2'>
        <button
          type='button'
          className='text-muted-foreground hover:text-foreground'
          onClick={() => navigate(`/campaigns/${campaignId}`)}>
          Campaign
        </button>
        <ChevronRight className='h-4 w-4 text-muted-foreground' />
        <span className='font-medium text-foreground'>{world.label}</span>
        {currentLocation && (
          <>
            <ChevronRight className='h-4 w-4 text-muted-foreground' />
            <span className='font-medium text-foreground'>{currentLocation.label}</span>
          </>
        )}
        {(selectedLocationId || currentLocation?.parentLocationId) && (
          <Button
            variant='ghost'
            size='sm'
            onClick={handleBack}
            data-testid='campaign-edit-back'
            className='clickable'>
            <ArrowUp className='h-4 w-4' />
          </Button>
        )}
      </div>
      <div className='min-h-0 flex-1 p-4'>
        {!showMap && (
          <div className='h-full min-h-[400px]'>
            <WorldViewer
              locations={locationsList}
              onAdvanceToLocation={handleAdvanceToLocation}
              onOpenMap={handleOpenMap}
              translateExtent={[
                [-2000, -2000],
                [2000, 2000],
              ]}
            />
          </div>
        )}
        {showMap && selectedLocationId && (
          <div className='h-full flex justify-center items-center'>
            <LocationViewer
              locationId={selectedLocationId}
              worldId={campaign.worldId}
              getAssetData={getAssetData}
              onSelectCell={(x, y, e) => {
                const top = currentLocation?.tiles
                  ? getTopTileDataAt(currentLocation.tiles, x, y)
                  : null;
                if (top) openTileMenuAt(x, y, e?.clientX ?? 0, e?.clientY ?? 0);
              }}
              tileRenderSize={currentLocation?.tileRenderSize}
              overlayNodes={overlayNodes}
              eventTileIds={eventTileIds}
            />
          </div>
        )}
      </div>

      {tileMenu && currentLocation?.tiles && (
        <>
          <div
            className='fixed inset-0 z-10'
            role='button'
            tabIndex={-1}
            onClick={() => setTileMenu(null)}
            onContextMenu={(e) => e.preventDefault()}
            aria-hidden
          />
          <div
            className='fixed z-20 rounded-md border bg-popover px-1 py-1 shadow-md'
            style={{
              left: tileMenu.clientX || 0,
              top: tileMenu.clientY || 0,
            }}>
            <button
              type='button'
              className='flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent'
              onClick={openAddCharacter}>
              <Plus className='mr-2 h-4 w-4' />
              Add Character
            </button>
            <button
              type='button'
              className='flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent'
              onClick={openAddItem}>
              <Plus className='mr-2 h-4 w-4' />
              Add Item
            </button>
            <button
              type='button'
              className='flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent'
              onClick={openAddEvent}>
              <Plus className='mr-2 h-4 w-4' />
              Add Event
            </button>
            {entityAtTile?.character && (
              <button
                type='button'
                className='flex w-full items-center rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-accent'
                onClick={handleRemoveCharacter}>
                <Trash2 className='mr-2 h-4 w-4' />
                Remove character
              </button>
            )}
            {entityAtTile?.item && (
              <button
                type='button'
                className='flex w-full items-center rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-accent'
                onClick={handleRemoveItem}>
                <Trash2 className='mr-2 h-4 w-4' />
                Remove item
              </button>
            )}
            {entityAtTile?.event && (
              <button
                type='button'
                className='flex w-full items-center rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-accent'
                onClick={handleRemoveEvent}>
                <Trash2 className='mr-2 h-4 w-4' />
                Remove event
              </button>
            )}
          </div>
        </>
      )}

      <Dialog open={addCharacterOpen} onOpenChange={setAddCharacterOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Character</DialogTitle>
          </DialogHeader>
          <div className='space-y-2'>
            <Label>Archetype</Label>
            <Select value={selectedArchetypeId ?? ''} onValueChange={setSelectedArchetypeId}>
              <SelectTrigger>
                <SelectValue placeholder='Select archetype' />
              </SelectTrigger>
              <SelectContent>
                {archetypesForSelect.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setAddCharacterOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCharacter} disabled={!selectedArchetypeId}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Item</DialogTitle>
          </DialogHeader>
          <div className='space-y-2'>
            <Label>Item</Label>
            <Select value={selectedItemId ?? ''} onValueChange={setSelectedItemId}>
              <SelectTrigger>
                <SelectValue placeholder='Select item' />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setAddItemOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddItem} disabled={!selectedItemId}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addEventOpen} onOpenChange={setAddEventOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Event</DialogTitle>
          </DialogHeader>
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label>Name</Label>
              <input
                type='text'
                className='flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm'
                value={addEventName}
                onChange={(e) => setAddEventName(e.target.value)}
                placeholder='Event name'
              />
            </div>
            <div className='space-y-2'>
              <Label>Type</Label>
              <Select
                value={addEventType}
                onValueChange={(v) => setAddEventType(v as CampaignEventType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAMPAIGN_EVENT_TYPES.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setAddEventOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddEvent} disabled={!addEventName.trim()}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
