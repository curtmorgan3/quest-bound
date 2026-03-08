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
  Button,
  Card,
} from '@/components';
import { PageWrapper } from '@/components/composites';
import { useCampaigns, useRulesets } from '@/lib/compass-api';
import { Plus } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export function Campaigns() {
  const [searchParams] = useSearchParams();
  const rulesetIdParam = searchParams.get('rulesetId');

  const { campaigns, deleteCampaign } = useCampaigns();
  const { rulesets } = useRulesets();
  const navigate = useNavigate();

  const getRulesetTitle = (id: string) =>
    rulesets.find((r) => r.id === id)?.title ?? 'Unknown ruleset';

  const filteredCampaigns = useMemo(
    () =>
      !rulesetIdParam
        ? []
        : [...campaigns]
            .filter((c) => c.rulesetId === rulesetIdParam)
            .sort((a, b) =>
              getRulesetTitle(a.rulesetId).localeCompare(getRulesetTitle(b.rulesetId)),
            ),
    [campaigns, rulesetIdParam, rulesets],
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
      <div className='flex flex-wrap gap-4'>
        {filteredCampaigns.map((campaign) => (
          <Card
            key={campaign.id}
            className='flex aspect-square w-[min(100%,280px)] flex-col overflow-hidden p-0'
            data-testid='campaign-card'>
            <div
              className='min-h-0 flex-1 bg-muted bg-cover bg-center'
              style={campaign.image ? { backgroundImage: `url(${campaign.image})` } : undefined}
            />
            <div className='flex shrink-0 flex-col gap-2 border-t p-3'>
              <div className='flex min-w-0 flex-col gap-0.5'>
                <h2 className='truncate text-sm font-semibold'>
                  {campaign.label || 'Unnamed campaign'}
                </h2>
                <span className='truncate text-xs text-muted-foreground'>
                  {getRulesetTitle(campaign.rulesetId)}
                </span>
              </div>
              <div className='flex items-center gap-2'>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      className='h-8 flex-1 text-red-500'
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
                  variant='outline'
                  size='sm'
                  className='h-8 flex-1'
                  onClick={() => navigate(`/campaigns/${campaign.id}/scenes`)}
                  data-testid='campaign-card-open'>
                  Open
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredCampaigns.length === 0 && (
        <div className='flex flex-col items-center justify-center py-12 text-muted-foreground'>
          <p className='text-lg'>No campaigns yet</p>
          <p className='text-sm'>Create a campaign by selecting a ruleset</p>
        </div>
      )}
    </PageWrapper>
  );
}
