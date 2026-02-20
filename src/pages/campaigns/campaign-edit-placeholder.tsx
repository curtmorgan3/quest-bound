import { Button } from '@/components';
import { useNavigate, useParams } from 'react-router-dom';

/**
 * Placeholder for Phase 8: Campaign editor (place characters, items, events).
 */
export function CampaignEditPlaceholder() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();

  return (
    <div className='flex h-full w-full flex-col items-center justify-center gap-4 p-4'>
      <p className='text-muted-foreground'>Campaign editor (Phase 8)</p>
      <Button variant='outline' onClick={() => navigate(`/campaigns/${campaignId}`)}>
        Back to campaign
      </Button>
    </div>
  );
}
