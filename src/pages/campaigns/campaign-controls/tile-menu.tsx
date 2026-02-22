import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArchetypeLookup, type EventLocationWithEvent } from '@/lib/compass-api';
import { useCampaignContext } from '@/stores';
import type { Archetype, CampaignEventType, ITileMenu, TileMenuPayload } from '@/types';
import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';

interface TileMenuProps {
  onTileMenuRequest: (payload: TileMenuPayload | null) => void;
  tileMenu?: ITileMenu;
  lastClickedTileId?: string | null;
  /** When the clicked tile has an event, pass it so the menu can show "Remove Event". */
  eventAtClickedTile?: EventLocationWithEvent | null;
}

type MenuOption = {
  label: string;
  action: 'move' | 'createCharacter' | 'createEvent' | 'removeEvent';
};

const selectedCharacterOptions: MenuOption[] = [{ label: 'Move', action: 'move' }];
const emptyTileOptionsBase: MenuOption[] = [
  { label: 'Create Character', action: 'createCharacter' },
  { label: 'Create Event', action: 'createEvent' },
];
const emptyTileOptionsWithEvent: MenuOption[] = [
  { label: 'Create Character', action: 'createCharacter' },
  { label: 'Remove Event', action: 'removeEvent' },
];

const EVENT_TYPE_OPTIONS: { value: CampaignEventType; label: string }[] = [
  { value: 'on_enter', label: 'On Enter' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'on_activate', label: 'On Activate' },
];

export function TileMenu({
  onTileMenuRequest,
  tileMenu,
  lastClickedTileId,
  eventAtClickedTile,
}: TileMenuProps) {
  const {
    viewingLocationId,
    selectedCharacters,
    moveSelectedCharactersTo,
    rulesetId,
    handleCreateCampaignCharacter,
    handleCreateCampaignEvent,
    handleRemoveCampaignEvent,
    currentLocation,
  } = useCampaignContext();

  const [showArchetypeLookup, setShowArchetypeLookup] = useState(false);
  const [showCreateEventDialog, setShowCreateEventDialog] = useState(false);
  const [pendingEventTile, setPendingEventTile] = useState<{
    locationId: string;
    tileId: string;
  } | null>(null);
  const [eventName, setEventName] = useState('');
  const [eventType, setEventType] = useState<CampaignEventType>('on_enter');

  const handleMoveCharacter = useCallback(() => {
    if (!tileMenu) return;
    if (viewingLocationId && selectedCharacters.length > 0) {
      moveSelectedCharactersTo(viewingLocationId, tileMenu.tileId);
    }
    onTileMenuRequest(null);
  }, [tileMenu, viewingLocationId, selectedCharacters.length, moveSelectedCharactersTo]);

  const handleCreateCharacterClick = useCallback(() => {
    setShowArchetypeLookup(true);
  }, []);

  const handleArchetypeSelect = useCallback(
    (archetype: Archetype) => {
      handleCreateCampaignCharacter(archetype.id, lastClickedTileId ?? undefined);
      setShowArchetypeLookup(false);
      onTileMenuRequest(null);
    },
    [lastClickedTileId],
  );

  const handleCreateEventClick = useCallback(() => {
    if (!tileMenu || !viewingLocationId) return;
    setPendingEventTile({ locationId: viewingLocationId, tileId: tileMenu.tileId });
    setEventName('');
    setEventType('on_enter');
    setShowCreateEventDialog(true);
    onTileMenuRequest(null);
  }, [tileMenu, viewingLocationId]);

  const handleCreateEventSave = useCallback(async () => {
    if (!pendingEventTile || !eventName.trim()) return;
    await handleCreateCampaignEvent(pendingEventTile, eventName.trim(), eventType);
    setShowCreateEventDialog(false);
    setPendingEventTile(null);
    setEventName('');
  }, [pendingEventTile, eventName, eventType, handleCreateCampaignEvent]);

  const handleCreateEventDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setShowCreateEventDialog(false);
      setPendingEventTile(null);
      setEventName('');
      setEventType('on_enter');
    }
  }, []);

  const handleRemoveEventClick = useCallback(async () => {
    if (!eventAtClickedTile) return;
    await handleRemoveCampaignEvent(eventAtClickedTile.event.id);
    onTileMenuRequest(null);
  }, [eventAtClickedTile, handleRemoveCampaignEvent]);

  const emptyTileOptions =
    eventAtClickedTile != null ? emptyTileOptionsWithEvent : emptyTileOptionsBase;
  const options = selectedCharacters.length > 0 ? selectedCharacterOptions : emptyTileOptions;

  const handleOptionClick = useCallback(
    (action: MenuOption['action']) => {
      if (action === 'move') handleMoveCharacter();
      else if (action === 'createCharacter') handleCreateCharacterClick();
      else if (action === 'createEvent') handleCreateEventClick();
      else if (action === 'removeEvent') handleRemoveEventClick();
    },
    [handleMoveCharacter, handleCreateCharacterClick, handleCreateEventClick, handleRemoveEventClick],
  );

  const closeMenu = useCallback(() => {
    onTileMenuRequest(null);
    setShowArchetypeLookup(false);
  }, []);

  const clickedTile = tileMenu
    ? (currentLocation?.tiles ?? []).find((t) => t.id === tileMenu.tileId)
    : undefined;
  const isNotPassable = clickedTile ? !clickedTile.isPassable : false;

  const menuContent =
    tileMenu &&
    createPortal(
      <>
        <div className='fixed inset-0 z-[100]' onClick={closeMenu} aria-hidden />
        {showArchetypeLookup ? (
          <div
            className='fixed z-[101] rounded-md border bg-popover p-3 shadow-md'
            style={{ left: tileMenu.clientX, top: tileMenu.clientY }}>
            <ArchetypeLookup
              rulesetId={rulesetId}
              label='Choose archetype'
              placeholder='Search archetypes...'
              onSelect={handleArchetypeSelect}
              allowDefault
            />
          </div>
        ) : (
          <div
            className='fixed z-[101] rounded-md border bg-popover px-2 py-1 shadow-md'
            style={{ left: tileMenu.clientX, top: tileMenu.clientY }}>
            {isNotPassable ? (
              <p className='px-2 py-1.5 text-sm text-muted-foreground border-b'>
                This tile is impassable.
              </p>
            ) : (
              options.map((opt) => (
                <button
                  key={opt.action}
                  type='button'
                  className='block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent'
                  onClick={() => {
                    handleOptionClick(opt.action);
                  }}>
                  {opt.label}
                </button>
              ))
            )}
          </div>
        )}
      </>,
      document.body,
    );

  return (
    <>
      {menuContent}
      <Dialog open={showCreateEventDialog} onOpenChange={handleCreateEventDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Event</DialogTitle>
          </DialogHeader>
          <div className='grid gap-4 py-2'>
            <div className='grid gap-2'>
              <Label htmlFor='event-name'>Event name</Label>
              <Input
                id='event-name'
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder='Enter event name'
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateEventSave();
                }}
              />
            </div>
            <div className='grid gap-2'>
              <Label>Event type</Label>
              <Select value={eventType} onValueChange={(v) => setEventType(v as CampaignEventType)}>
                <SelectTrigger className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setShowCreateEventDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateEventSave} disabled={!eventName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
