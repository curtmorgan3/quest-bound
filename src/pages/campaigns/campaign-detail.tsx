import { Button, Card } from '@/components';
import { useCampaign, useRulesets, useWorlds } from '@/lib/compass-api';
import { useNavigate, useParams } from 'react-router-dom';

export function CampaignDetail() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const campaign = useCampaign(campaignId);
  const { worlds } = useWorlds();
  const { rulesets } = useRulesets();
  const navigate = useNavigate();

  const world = campaign ? worlds.find((w) => w.id === campaign.worldId) : null;
  const ruleset = campaign ? rulesets.find((r) => r.id === campaign.rulesetId) : null;

  if (campaignId && campaign === undefined) {
    return (
      <div className='flex h-full w-full items-center justify-center p-4'>
        <p className='text-muted-foreground'>Loading…</p>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className='flex h-full w-full flex-col items-center justify-center gap-4 p-4'>
        <p className='text-muted-foreground'>Campaign not found</p>
        <Button variant='outline' onClick={() => navigate('/campaigns')}>
          Back to campaigns
        </Button>
      </div>
    );
  }

  return (
    <div className='flex h-full w-full flex-col gap-6 p-4'>
      <h1 className='text-4xl font-bold'>{campaign.label || 'Unnamed campaign'}</h1>

      <Card className='flex flex-col gap-4 p-4'>
        <div>
          <p className='text-sm text-muted-foreground'>World</p>
          <p className='font-medium'>{world?.label ?? 'Unknown'}</p>
        </div>
        <div>
          <p className='text-sm text-muted-foreground'>Ruleset</p>
          <p className='font-medium'>{ruleset?.title ?? 'Unknown'}</p>
        </div>
        <div className='flex flex-wrap gap-2 pt-2'>
          <Button
            variant='outline'
            data-testid='campaign-view-world'
            onClick={() => navigate(`/campaigns/${campaign.id}/view`)}>
            View world
          </Button>
          <Button
            data-testid='campaign-edit'
            onClick={() => navigate(`/campaigns/${campaign.id}/edit`)}>
            Edit campaign
          </Button>
          <Button
            variant='outline'
            data-testid='campaign-play'
            onClick={() => navigate(`/campaigns/${campaign.id}/play`)}>
            Play
          </Button>
        </div>
      </Card>
    </div>
  );
}
