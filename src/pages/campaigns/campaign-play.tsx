import { Button } from '@/components';
import { PageWrapper } from '@/components/composites';
import { useCampaign } from '@/lib/compass-api';
import { useNavigate, useParams } from 'react-router-dom';

export function CampaignPlay() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const campaign = useCampaign(campaignId);

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
    <PageWrapper
      title={campaign.label ?? 'Campaign'}
      headerActions={
        <Button variant='outline' onClick={() => navigate(`/campaigns/${campaignId}/scenes`)}>
          Open dashboard
        </Button>
      }>
      <div className='flex flex-1 flex-col items-center justify-center gap-4 p-4 text-muted-foreground'>
        <p>Use the campaign dashboard to manage scenes and run your game.</p>
        <Button onClick={() => navigate(`/campaigns/${campaignId}/scenes`)}>
          Go to dashboard
        </Button>
      </div>
    </PageWrapper>
  );
}
