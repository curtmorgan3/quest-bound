import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Card,
} from '@/components';
import { PageWrapper } from '@/components/composites';
import { useCampaigns, useRulesets } from '@/lib/compass-api';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Campaigns() {
  const { campaigns, deleteCampaign } = useCampaigns();
  const { rulesets } = useRulesets();
  const navigate = useNavigate();

  const getRulesetTitle = (id: string) =>
    rulesets.find((r) => r.id === id)?.title ?? 'Unknown ruleset';

  const sortedCampaigns = [...campaigns].sort((a, b) =>
    getRulesetTitle(a.rulesetId).localeCompare(getRulesetTitle(b.rulesetId)),
  );

  return (
    <PageWrapper
      title='Campaigns'
      headerActions={
        <Button
          size='sm'
          className='gap-1'
          data-testid='campaigns-create'
          onClick={() => navigate('/campaigns/new')}>
          <Plus className='h-4 w-4' />
          Create Campaign
        </Button>
      }>
      <div className='flex flex-col gap-3'>
        {sortedCampaigns.map((campaign) => (
          <Card key={campaign.id} className='overflow-hidden' data-testid='campaign-card'>
            <div className='flex flex-row items-center justify-between gap-4 p-4'>
              <Avatar className='size-12 shrink-0 rounded-lg'>
                <AvatarImage
                  src={campaign.image ?? ''}
                  alt={campaign.label ?? 'Campaign'}
                />
                <AvatarFallback className='rounded-lg text-lg'>
                  {(campaign.label ?? '?').slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className='min-w-0 flex-1'>
                <p className='font-medium'>{campaign.label || 'Unnamed campaign'}</p>
                <p className='text-sm text-muted-foreground'>
                  {getRulesetTitle(campaign.rulesetId)}
                </p>
              </div>
              <div className='flex items-center gap-2'>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      className='shrink-0 hover:text-destructive'
                      aria-label='Delete campaign'
                      data-testid='campaign-card-delete'>
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete campaign?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the campaign. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                        onClick={() => deleteCampaign(campaign.id)}
                        data-testid='campaign-delete-confirm'>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button
                  size='sm'
                  onClick={() => navigate(`/campaigns/${campaign.id}/scenes`)}
                  data-testid='campaign-card-open'>
                  Open
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {sortedCampaigns.length === 0 && (
        <div className='flex flex-col items-center justify-center py-12 text-muted-foreground'>
          <p className='text-lg'>No campaigns yet</p>
          <p className='text-sm'>Create a campaign by selecting a ruleset</p>
        </div>
      )}
    </PageWrapper>
  );
}
