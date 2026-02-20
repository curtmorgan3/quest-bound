import { Button, Card } from '@/components';
import {
  useCampaigns,
  useRulesets,
  useWorlds,
} from '@/lib/compass-api';
import { useNavigate } from 'react-router-dom';

export function CampaignsList() {
  const { campaigns } = useCampaigns();
  const { worlds } = useWorlds();
  const { rulesets } = useRulesets();
  const navigate = useNavigate();

  const getWorldLabel = (id: string) => worlds.find((w) => w.id === id)?.label ?? 'Unknown world';
  const getRulesetTitle = (id: string) =>
    rulesets.find((r) => r.id === id)?.title ?? 'Unknown ruleset';

  const sortedCampaigns = [...campaigns].sort(
    (a, b) =>
      getWorldLabel(a.worldId).localeCompare(getWorldLabel(b.worldId)) ||
      getRulesetTitle(a.rulesetId).localeCompare(getRulesetTitle(b.rulesetId)),
  );

  return (
    <div className='flex h-full w-full flex-col gap-4 p-4'>
      <div className='flex items-center justify-between'>
        <h1 className='text-4xl font-bold'>Campaigns</h1>
        <Button data-testid='campaigns-create' onClick={() => navigate('/campaigns/new')}>
          Create campaign
        </Button>
      </div>

      <div className='flex flex-col gap-3'>
        {sortedCampaigns.map((campaign) => (
          <Card
            key={campaign.id}
            className='flex flex-row items-center justify-between p-4'
            data-testid='campaign-card'>
            <div className='min-w-0'>
              <p className='font-medium'>{campaign.label || 'Unnamed campaign'}</p>
              <p className='text-sm text-muted-foreground'>
                {getWorldLabel(campaign.worldId)} · {getRulesetTitle(campaign.rulesetId)}
              </p>
            </div>
            <Button
              variant='outline'
              size='sm'
              onClick={() => navigate(`/campaigns/${campaign.id}`)}
              data-testid='campaign-card-open'>
              Open
            </Button>
          </Card>
        ))}
      </div>

      {sortedCampaigns.length === 0 && (
        <div className='flex flex-col items-center justify-center py-12 text-muted-foreground'>
          <p className='text-lg'>No campaigns yet</p>
          <p className='text-sm'>Create a campaign by selecting a world and a ruleset</p>
          <Button className='mt-4' onClick={() => navigate('/campaigns/new')}>
            Create campaign
          </Button>
        </div>
      )}
    </div>
  );
}
