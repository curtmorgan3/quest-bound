import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
} from '@/components';
import { PageWrapper } from '@/components/composites';
import { CategoryField } from '@/components/composites/category-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCampaignEvents } from '@/lib/compass-api';
import { colorPrimary } from '@/palette';
import type {
  CampaignEvent,
  CampaignEventParameterDefinition,
  CampaignEventParamType,
} from '@/types';
import { FileCode, FilePlus, Pencil, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

export function CampaignEvents() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const { campaignEvents, createCampaignEvent, updateCampaignEvent, deleteCampaignEvent } =
    useCampaignEvents(campaignId);

  const [createOpen, setCreateOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newCategory, setNewCategory] = useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [nameFilter, setNameFilter] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CampaignEvent | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editCategory, setEditCategory] = useState<string | null>(null);
  const [editParameters, setEditParameters] = useState<CampaignEventParameterDefinition[]>([]);

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
    let events = campaignEvents;

    if (categoryFilter && categoryFilter !== '__all__') {
      events = events.filter((event) => (event.category?.trim() ?? '') === categoryFilter);
    }

    if (nameFilter.trim()) {
      const query = nameFilter.trim().toLowerCase();
      events = events.filter((event) => event.label.toLowerCase().includes(query));
    }

    return events;
  }, [campaignEvents, categoryFilter, nameFilter]);

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
    setEditParameters(event.parameters ?? []);
    setEditOpen(true);
  };

  const handleEditOpenChange = (open: boolean) => {
    setEditOpen(open);
    if (!open) {
      setEditingEvent(null);
      setEditParameters([]);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingEvent || !editLabel.trim()) return;
    const cleanedParams = editParameters
      .map((p) => ({ ...p, name: p.name.trim() }))
      .filter((p) => p.name.length > 0);

    await updateCampaignEvent(editingEvent.id, {
      label: editLabel.trim(),
      category: editCategory ?? undefined,
      parameters: cleanedParams.length > 0 ? cleanedParams : undefined,
    });
    setEditOpen(false);
    setEditingEvent(null);
  };

  const handleAddParameter = () => {
    setEditParameters((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: '',
        type: 'string' satisfies CampaignEventParamType,
      },
    ]);
  };

  const handleUpdateParameter = (
    id: string,
    updates: Partial<Pick<CampaignEventParameterDefinition, 'name' | 'type' | 'defaultValue'>>,
  ) => {
    setEditParameters((prev) =>
      prev.map((param) => (param.id === id ? { ...param, ...updates } : param)),
    );
  };

  const handleRemoveParameter = (id: string) => {
    setEditParameters((prev) => prev.filter((param) => param.id !== id));
  };

  return (
    <PageWrapper
      title='Campaign Events'
      headerActions={
        <Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
          <DialogTrigger asChild>
            <Button size='sm' className='gap-1' data-testid='events-new-button'>
              <Plus className='h-4 w-4' />
              Create Event
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Event</DialogTitle>
              <DialogDescription>New Event</DialogDescription>
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
      }
      filterRow={
        <div className='flex items-center gap-2 px-4 py-2'>
          <Input
            id='events-name-filter'
            placeholder='Filter by name'
            className='w-[220px]'
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            data-testid='events-name-filter-input'
          />
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
      }>
      <div className='flex flex-col gap-2' data-testid='events-list'>
        {filteredEvents.map((event) => (
          <div
            key={event.id}
            className='flex items-center justify-between rounded-md border bg-card px-4 py-3'>
            <div className='flex gap-4 items-center'>
              <div className='flex flex-col gap-0.5'>
                <span className='font-medium'>{event.label}</span>
                {event.category && (
                  <span className='text-xs text-muted-foreground'>{event.category}</span>
                )}
              </div>
              {campaignId &&
                (event.scriptId ? (
                  <Link to={`/campaigns/${campaignId}/scripts/${event.scriptId}`}>
                    <FileCode
                      className='h-4 w-4 text-neutral-400 clickable'
                      style={{ color: colorPrimary }}
                    />
                  </Link>
                ) : (
                  <Link
                    to={`/campaigns/${campaignId}/scripts/new?type=campaignEvent&entityId=${event.id}&entityName=${event.label ?? ''}`}>
                    <FilePlus className='h-4 w-4 text-neutral-400 clickable' />
                  </Link>
                ))}
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
        <p className='py-8 text-muted-foreground text-sm'>
          {campaignEvents.length === 0
            ? 'No events'
            : categoryFilter || nameFilter.trim()
              ? 'No events match filters'
              : 'No events'}
        </p>
      )}

      <Dialog open={editOpen} onOpenChange={handleEditOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription>Edit Event</DialogDescription>
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
            <div className='grid gap-2'>
              <div className='flex items-center justify-between'>
                <Label>Parameters</Label>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={handleAddParameter}
                  className='h-7 px-2 text-xs'>
                  Add parameter
                </Button>
              </div>
              {editParameters.length === 0 ? (
                <p className='text-xs text-muted-foreground'>
                  No parameters. Add parameters to pass values when this event runs in a scene.
                </p>
              ) : (
                <div className='flex flex-col gap-2'>
                  {editParameters.map((param) => (
                    <div key={param.id} className='flex gap-2'>
                      <Input
                        value={param.name}
                        onChange={(e) => handleUpdateParameter(param.id, { name: e.target.value })}
                        placeholder='Parameter name'
                      />
                      <Select
                        value={param.type}
                        onValueChange={(v) =>
                          handleUpdateParameter(param.id, {
                            type: v as CampaignEventParamType,
                          })
                        }>
                        <SelectTrigger>
                          <SelectValue placeholder='Type' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='string'>String</SelectItem>
                          <SelectItem value='number'>Number</SelectItem>
                          <SelectItem value='boolean'>Boolean</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className='flex items-center gap-1'>
                        {param.type === 'boolean' ? (
                          <Select
                            value={
                              param.defaultValue === true ||
                              (typeof param.defaultValue === 'string' &&
                                param.defaultValue.trim().toLowerCase() === 'true')
                                ? 'true'
                                : param.defaultValue === false ||
                                    (typeof param.defaultValue === 'string' &&
                                      param.defaultValue.trim().toLowerCase() === 'false')
                                  ? 'false'
                                  : 'unset'
                            }
                            onValueChange={(v) =>
                              handleUpdateParameter(param.id, {
                                defaultValue: v === 'unset' ? undefined : v === 'true',
                              })
                            }>
                            <SelectTrigger className='w-32'>
                              <SelectValue placeholder='Default' />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value='unset'>No default</SelectItem>
                              <SelectItem value='true'>True</SelectItem>
                              <SelectItem value='false'>False</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            className='w-32'
                            type={param.type === 'number' ? 'number' : 'text'}
                            value={
                              param.defaultValue === null || param.defaultValue === undefined
                                ? ''
                                : String(param.defaultValue)
                            }
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === '') {
                                handleUpdateParameter(param.id, { defaultValue: undefined });
                                return;
                              }
                              if (param.type === 'number') {
                                const num = Number(raw);
                                handleUpdateParameter(param.id, {
                                  defaultValue: Number.isFinite(num) ? num : raw,
                                });
                              } else {
                                handleUpdateParameter(param.id, { defaultValue: raw });
                              }
                            }}
                            placeholder='Default'
                          />
                        )}
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          onClick={() => handleRemoveParameter(param.id)}
                          className='h-7 w-7 text-destructive hover:text-destructive'>
                          ×
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
    </PageWrapper>
  );
}
