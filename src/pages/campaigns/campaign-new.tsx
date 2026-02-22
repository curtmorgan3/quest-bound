import { Button, Input, Label } from '@/components';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCampaigns, useRulesets, useWorlds } from '@/lib/compass-api';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function CampaignNew() {
  const { createCampaign } = useCampaigns();
  const { worlds } = useWorlds();
  const { rulesets } = useRulesets();
  const navigate = useNavigate();

  const [label, setLabel] = useState('');
  const [worldId, setWorldId] = useState('');
  const [rulesetId, setRulesetId] = useState('');

  const handleSubmit = async () => {
    if (!worldId || !rulesetId) return;
    const id = await createCampaign({
      label: label.trim() || undefined,
      worldId,
      rulesetId,
    });
    if (id) navigate(`/campaigns/${id}`);
  };

  const isValid = Boolean(worldId && rulesetId);
  const sortedWorlds = [...worlds].sort((a, b) => a.label.localeCompare(b.label));
  const sortedRulesets = [...rulesets].sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div className='flex h-full w-full flex-col gap-6 p-4'>
      <h1 className='text-4xl font-bold'>New campaign</h1>

      <div className='flex max-w-md flex-col gap-4'>
        <div className='grid gap-2'>
          <Label htmlFor='campaign-label'>Label (optional)</Label>
          <Input
            id='campaign-label'
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder='e.g. Summer campaign'
          />
        </div>
        <div className='grid gap-2'>
          <Label htmlFor='campaign-world'>
            World <span className='text-destructive'>*</span>
          </Label>
          <Select value={worldId} onValueChange={setWorldId}>
            <SelectTrigger id='campaign-world' data-testid='campaign-world-select'>
              <SelectValue placeholder='Select a world' />
            </SelectTrigger>
            <SelectContent>
              {sortedWorlds.length === 0 ? (
                <SelectItem value='_none' disabled>
                  No worlds available. Create a world first.
                </SelectItem>
              ) : (
                sortedWorlds.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.label}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        <div className='grid gap-2'>
          <Label htmlFor='campaign-ruleset'>
            Ruleset <span className='text-destructive'>*</span>
          </Label>
          <Select value={rulesetId} onValueChange={setRulesetId}>
            <SelectTrigger id='campaign-ruleset' data-testid='campaign-ruleset-select'>
              <SelectValue placeholder='Select a ruleset' />
            </SelectTrigger>
            <SelectContent>
              {sortedRulesets.length === 0 ? (
                <SelectItem value='_none' disabled>
                  No rulesets available
                </SelectItem>
              ) : (
                sortedRulesets.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.title}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        <div className='flex gap-2'>
          <Button variant='outline' onClick={() => navigate('/campaigns')}>
            Cancel
          </Button>
          <Button
            data-testid='campaign-create-submit'
            onClick={handleSubmit}
            disabled={!isValid}>
            Create
          </Button>
        </div>
      </div>
    </div>
  );
}
