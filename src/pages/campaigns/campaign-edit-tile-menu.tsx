import type { CampaignCharacter, CampaignItem } from '@/types';
import type { CampaignEventType } from '@/types';
import type { EventLocationWithEvent } from '@/lib/compass-api/hooks/campaigns/use-campaign-event-locations-by-location';
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
import {
  ArchetypeLookup,
  ItemLookup,
} from '@/lib/compass-api';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

const CAMPAIGN_EVENT_TYPES: { value: CampaignEventType; label: string }[] = [
  { value: 'on_enter', label: 'On Enter' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'on_activate', label: 'On Activate' },
];

export interface TileMenuTile {
  locationId: string;
  tileId: string;
}

export interface TileMenuEntity {
  character?: CampaignCharacter;
  item?: CampaignItem;
  event?: EventLocationWithEvent;
}

export interface CampaignEditTileMenuProps {
  /** Position in viewport (e.g. from click event). */
  position: { clientX: number; clientY: number };
  /** The tile that was clicked (for add operations). */
  tile: TileMenuTile;
  /** Entity at the clicked tile, if any (for Remove options). */
  entityAtTile: TileMenuEntity | null;
  /** Ruleset ID for archetype lookup in Add Character dialog. */
  rulesetId: string | undefined;
  onClose: () => void;
  onCreateCharacter: (tile: TileMenuTile, archetypeId: string) => Promise<void>;
  onCreateItem: (tile: TileMenuTile, itemId: string) => Promise<void>;
  onCreateEvent: (tile: TileMenuTile, label: string, type: CampaignEventType) => Promise<void>;
  onRemoveCharacter: () => void;
  onRemoveItem: () => void;
  onRemoveEvent: () => void;
  /** Called with event location id when user chooses to move the event (menu closes; parent handles next cell click). */
  onMoveEvent?: (eventLocationId: string) => void;
}

export function CampaignEditTileMenu({
  position,
  tile,
  entityAtTile,
  rulesetId,
  onClose,
  onCreateCharacter,
  onCreateItem,
  onCreateEvent,
  onRemoveCharacter,
  onRemoveItem,
  onRemoveEvent,
  onMoveEvent,
}: CampaignEditTileMenuProps) {
  const [addCharacterOpen, setAddCharacterOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [addEventName, setAddEventName] = useState('');
  const [addEventType, setAddEventType] = useState<CampaignEventType>('on_activate');
  const [selectedArchetypeId, setSelectedArchetypeId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleBackdropClick = () => {
    if (addCharacterOpen || addItemOpen || addEventOpen) return;
    onClose();
  };

  const openAddCharacter = () => {
    setAddCharacterOpen(true);
  };
  const openAddItem = () => {
    setAddItemOpen(true);
  };
  const openAddEvent = () => {
    setAddEventOpen(true);
  };

  const handleAddCharacterSubmit = async () => {
    if (!selectedArchetypeId) return;
    setSubmitting(true);
    try {
      await onCreateCharacter(tile, selectedArchetypeId);
      setAddCharacterOpen(false);
      setSelectedArchetypeId(null);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddItemSubmit = async () => {
    if (!selectedItemId) return;
    setSubmitting(true);
    try {
      await onCreateItem(tile, selectedItemId);
      setAddItemOpen(false);
      setSelectedItemId(null);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddEventSubmit = async () => {
    if (!addEventName.trim()) return;
    setSubmitting(true);
    try {
      await onCreateEvent(tile, addEventName.trim(), addEventType);
      setAddEventOpen(false);
      setAddEventName('');
      setAddEventType('on_activate');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const closeCharacterDialog = () => {
    setAddCharacterOpen(false);
    setSelectedArchetypeId(null);
    onClose();
  };
  const closeItemDialog = () => {
    setAddItemOpen(false);
    setSelectedItemId(null);
    onClose();
  };
  const closeEventDialog = () => {
    setAddEventOpen(false);
    setAddEventName('');
    setAddEventType('on_activate');
    onClose();
  };

  const showMenu = !addCharacterOpen && !addItemOpen && !addEventOpen;

  return (
    <>
      <div
        className='fixed inset-0 z-10'
        role='button'
        tabIndex={-1}
        onClick={handleBackdropClick}
        onContextMenu={(e) => e.preventDefault()}
        aria-hidden
      />
      {showMenu && (
        <div
          className='fixed z-20 rounded-md border bg-popover px-1 py-1 shadow-md'
          style={{
            left: position.clientX,
            top: position.clientY,
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
              onClick={onRemoveCharacter}>
              <Trash2 className='mr-2 h-4 w-4' />
              Remove character
            </button>
          )}
          {entityAtTile?.item && (
            <button
              type='button'
              className='flex w-full items-center rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-accent'
              onClick={onRemoveItem}>
              <Trash2 className='mr-2 h-4 w-4' />
              Remove item
            </button>
          )}
          {entityAtTile?.event && (
            <>
              {onMoveEvent && (
                <button
                  type='button'
                  className='flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent'
                  onClick={() => {
                    onMoveEvent?.(entityAtTile.event!.id);
                    onClose();
                  }}>
                  Move event
                </button>
              )}
              <button
                type='button'
                className='flex w-full items-center rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-accent'
                onClick={onRemoveEvent}>
                <Trash2 className='mr-2 h-4 w-4' />
                Remove event
              </button>
            </>
          )}
        </div>
      )}

      <Dialog open={addCharacterOpen} onOpenChange={(open) => !open && closeCharacterDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Character</DialogTitle>
          </DialogHeader>
          <div className='space-y-2'>
            <ArchetypeLookup
              allowDefault
              rulesetId={rulesetId}
              value={selectedArchetypeId}
              onSelect={(archetype) => setSelectedArchetypeId(archetype.id)}
              onDelete={() => setSelectedArchetypeId(null)}
              placeholder='Search archetypes...'
              label='Archetype'
            />
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={closeCharacterDialog}>
              Cancel
            </Button>
            <Button onClick={handleAddCharacterSubmit} disabled={!selectedArchetypeId || submitting}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addItemOpen} onOpenChange={(open) => !open && closeItemDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Item</DialogTitle>
          </DialogHeader>
          <div className='space-y-2'>
            <ItemLookup
              value={selectedItemId}
              onSelect={(item) => setSelectedItemId(item.id)}
              onDelete={() => setSelectedItemId(null)}
              placeholder='Search items...'
              label='Item'
            />
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={closeItemDialog}>
              Cancel
            </Button>
            <Button onClick={handleAddItemSubmit} disabled={!selectedItemId || submitting}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addEventOpen} onOpenChange={(open) => !open && closeEventDialog()}>
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
            <Button variant='outline' onClick={closeEventDialog}>
              Cancel
            </Button>
            <Button onClick={handleAddEventSubmit} disabled={!addEventName.trim() || submitting}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
