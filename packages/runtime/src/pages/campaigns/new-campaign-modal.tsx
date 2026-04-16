import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@/components';
import { useCampaigns } from '@/lib/compass-api';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export interface NewCampaignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewCampaignModal({ open, onOpenChange }: NewCampaignModalProps) {
  const [searchParams] = useSearchParams();
  const rulesetId = searchParams.get('rulesetId');
  const { createCampaign } = useCampaigns();
  const navigate = useNavigate();

  const [label, setLabel] = useState('');

  const handleSubmit = async () => {
    if (!rulesetId) return;
    const id = await createCampaign({
      label: label.trim() || undefined,
      rulesetId,
    });
    if (id) {
      onOpenChange(false);
      setLabel('');
      navigate(`/campaigns/${id}/scenes`);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) setLabel('');
    onOpenChange(next);
  };

  const isValid = Boolean(rulesetId);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>New Campaign</DialogTitle>
        </DialogHeader>
        <div className='flex flex-col gap-4 py-2'>
          <div className='grid gap-2'>
            <Label htmlFor='campaign-label'>Title</Label>
            <Input
              id='campaign-label'
              value={label}
              autoComplete='off'
              onChange={(e) => setLabel(e.target.value)}
              placeholder='e.g. Summer campaign'
            />
          </div>
          {!rulesetId && (
            <p className='text-sm text-muted-foreground'>
              Select a ruleset from the campaigns page to create a campaign.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button data-testid='campaign-create-submit' onClick={handleSubmit} disabled={!isValid}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
