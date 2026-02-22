import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
} from '@/components';
import { CategoryField } from '@/components/composites/category-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCampaignEvents } from '@/lib/compass-api';
import type { CampaignEvent } from '@/types';
import { Pencil, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

export function CampaignEvents() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const { campaignEvents, createCampaignEvent, updateCampaignEvent, deleteCampaignEvent } =
    useCampaignEvents(campaignId);

  const [createOpen, setCreateOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newCategory, setNewCategory] = useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CampaignEvent | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editCategory, setEditCategory] = useState<string | null>(null);

  const existingCategories = useMemo(() => {
    const categories = new Set<string>();
    for (const event of campaignEvents) {
      const cat = event.category?.trim();
      if (cat) categories.add(cat);
    }
    return Array.from(categories).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' }),
    );
  }, [campaignEvents]);

  const categoryFilterOptions = useMemo(() => {
    const options = existingCategories.map((cat) => ({ value: cat, label: cat }));
    return [{ value: '__all__', label: 'All categories' }, ...options];
  }, [existingCategories]);

  const filteredEvents = useMemo(() => {
    if (!categoryFilter || categoryFilter === '__all__') return campaignEvents;
    return campaignEvents.filter((event) => (event.category?.trim() ?? '') === categoryFilter);
  }, [campaignEvents, categoryFilter]);

  const handleCreateOpenChange = (open: boolean) => {
    setCreateOpen(open);
    if (!open) {
      setNewLabel('');
      setNewCategory(null);
    }
  };

  const handleCreate = async () => {
    if (!campaignId || !newLabel.trim()) return;
    await createCampaignEvent(campaignId, {
      label: newLabel.trim(),
      category: newCategory ?? undefined,
    });
    setNewLabel('');
    setNewCategory(null);
    setCreateOpen(false);
  };

  const openEdit = (event: CampaignEvent) => {
    setEditingEvent(event);
    setEditLabel(event.label);
    setEditCategory(event.category ?? null);
    setEditOpen(true);
  };

  const handleEditOpenChange = (open: boolean) => {
    setEditOpen(open);
    if (!open) {
      setEditingEvent(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingEvent || !editLabel.trim()) return;
    await updateCampaignEvent(editingEvent.id, {
      label: editLabel.trim(),
      category: editCategory ?? undefined,
    });
    setEditOpen(false);
    setEditingEvent(null);
  };

  return (
    <div className='flex flex-col gap-4 p-4'>
      <h1 className='text-2xl'>Campaign Events</h1>
      <div className='flex flex-wrap items-center gap-4'>
        <Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
          <DialogTrigger asChild>
            <Button className='w-[180px]' data-testid='events-new-button'>
              <Plus className='h-4 w-4' />
              New Event
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Event</DialogTitle>
            </DialogHeader>
            <div className='grid gap-4 py-4'>
              <div className='grid gap-2'>
                <Label htmlFor='event-label'>Label</Label>
                <Input
                  id='event-label'
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder='e.g. Treasure found'
                />
              </div>
              <CategoryField
                value={newCategory}
                onChange={setNewCategory}
                existingCategories={existingCategories}
                label='Category'
              />
            </div>
            <DialogFooter>
              <Button variant='outline' onClick={() => handleCreateOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!newLabel.trim()}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className='flex items-center gap-2'>
          <Label htmlFor='events-category-filter' className='text-sm'>
            Category
          </Label>
          <Select
            value={categoryFilter ?? '__all__'}
            onValueChange={(v) => setCategoryFilter(v === '__all__' ? null : v)}>
            <SelectTrigger id='events-category-filter' className='w-[180px]'>
              <SelectValue placeholder='All categories' />
            </SelectTrigger>
            <SelectContent>
              {categoryFilterOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className='flex flex-col gap-2' data-testid='events-list'>
        {filteredEvents.map((event) => (
          <div
            key={event.id}
            className='flex items-center justify-between rounded-md border bg-card px-4 py-3'>
            <div className='flex flex-col gap-0.5'>
              <span className='font-medium'>{event.label}</span>
              {event.category && (
                <span className='text-xs text-muted-foreground'>{event.category}</span>
              )}
            </div>
            <div className='flex items-center gap-1'>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => openEdit(event)}
                aria-label={`Edit ${event.label}`}
                data-testid={`event-edit-${event.id}`}>
                <Pencil className='h-4 w-4' />
              </Button>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => deleteCampaignEvent(event.id)}
                className='text-destructive hover:text-destructive'>
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      {filteredEvents.length === 0 && (
        <p className='py-8 text-muted-foreground'>
          {campaignEvents.length === 0
            ? 'No events yet. Create one to place on the map.'
            : 'No events in this category.'}
        </p>
      )}

      <Dialog open={editOpen} onOpenChange={handleEditOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='grid gap-2'>
              <Label htmlFor='edit-event-label'>Label</Label>
              <Input
                id='edit-event-label'
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                placeholder='e.g. Treasure found'
              />
            </div>
            <CategoryField
              value={editCategory}
              onChange={setEditCategory}
              existingCategories={existingCategories}
              label='Category'
            />
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => handleEditOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={!editLabel.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
