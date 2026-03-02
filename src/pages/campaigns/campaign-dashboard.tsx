import { Button } from '@/components';
import { PageWrapper } from '@/components/composites';
import { useCampaign } from '@/lib/compass-api';
import { useNavigate, useParams } from 'react-router-dom';

export function CampaignDashboard() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const campaign = useCampaign(campaignId);
  const navigate = useNavigate();

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
    <PageWrapper title={campaign.label ?? 'Unnamed campaign'}>
      <div className='flex flex-col gap-4 p-4'></div>
    </PageWrapper>
  );
}
