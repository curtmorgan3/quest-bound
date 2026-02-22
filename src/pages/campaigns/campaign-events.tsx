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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components';
import { useCampaignEvents } from '@/lib/compass-api';
import type { CampaignEventType } from '@/types';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';

const EVENT_TYPE_OPTIONS: { value: CampaignEventType; label: string }[] = [
  { value: 'on_enter', label: 'On Enter' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'on_activate', label: 'On Activate' },
];

const EVENT_TYPE_LABELS: Record<CampaignEventType, string> = {
  on_enter: 'On Enter',
  on_leave: 'On Leave',
  on_activate: 'On Activate',
};

export function CampaignEvents() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const { campaignEvents, createCampaignEvent, deleteCampaignEvent } =
    useCampaignEvents(campaignId);

  const [createOpen, setCreateOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<CampaignEventType>('on_enter');

  const handleCreateOpenChange = (open: boolean) => {
    setCreateOpen(open);
    if (!open) {
      setNewLabel('');
      setNewType('on_enter');
    }
  };

  const handleCreate = async () => {
    if (!campaignId || !newLabel.trim()) return;
    await createCampaignEvent(campaignId, {
      label: newLabel.trim(),
      type: newType,
    });
    setNewLabel('');
    setNewType('on_enter');
    setCreateOpen(false);
  };

  return (
    <div className='flex flex-col gap-4 p-4'>
      <h1 className='text-2xl'>Campaign Events</h1>
      <div className='flex gap-2'>
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
              <div className='grid gap-2'>
                <Label>Type</Label>
                <Select value={newType} onValueChange={(v) => setNewType(v as CampaignEventType)}>
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
              <Button variant='outline' onClick={() => handleCreateOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!newLabel.trim()}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className='flex flex-col gap-2' data-testid='events-list'>
        {campaignEvents.map((event) => (
          <div
            key={event.id}
            className='flex items-center justify-between rounded-md border bg-card px-4 py-3'>
            <div className='flex flex-col gap-0.5'>
              <span className='font-medium'>{event.label}</span>
              <span className='text-sm text-muted-foreground'>{EVENT_TYPE_LABELS[event.type]}</span>
            </div>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => deleteCampaignEvent(event.id)}
              className='text-destructive hover:text-destructive'>
              Delete
            </Button>
          </div>
        ))}
      </div>

      {campaignEvents.length === 0 && (
        <p className='py-8 text-muted-foreground'>No events yet. Create one to place on the map.</p>
      )}
    </div>
  );
}
