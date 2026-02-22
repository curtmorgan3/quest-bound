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
import { useCampaignEvents } from '@/lib/compass-api';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';

export function CampaignEvents() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const { campaignEvents, createCampaignEvent, deleteCampaignEvent } =
    useCampaignEvents(campaignId);

  const [createOpen, setCreateOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');

  const handleCreateOpenChange = (open: boolean) => {
    setCreateOpen(open);
    if (!open) {
      setNewLabel('');
    }
  };

  const handleCreate = async () => {
    if (!campaignId || !newLabel.trim()) return;
    await createCampaignEvent(campaignId, {
      label: newLabel.trim(),
    });
    setNewLabel('');
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
            <span className='font-medium'>{event.label}</span>
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
