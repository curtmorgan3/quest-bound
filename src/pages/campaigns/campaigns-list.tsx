import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Card,
} from '@/components';
import {
  useCampaigns,
  useRulesets,
  useWorlds,
} from '@/lib/compass-api';
import { Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function CampaignsList() {
  const { campaigns, deleteCampaign } = useCampaigns();
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
            <div className='flex items-center gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => navigate(`/campaigns/${campaign.id}`)}
                data-testid='campaign-card-open'>
                Open
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type='button'
                    variant='outline'
                    size='icon'
                    className='shrink-0 text-muted-foreground hover:text-destructive'
                    aria-label='Delete campaign'
                    data-testid='campaign-card-delete'>
                    <Trash2 className='h-4 w-4' />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete campaign?</AlertDialogTitle>
                    <p className='text-sm text-muted-foreground'>
                      This will permanently delete the campaign and its characters, items, and
                      events. This cannot be undone.
                    </p>
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
            </div>
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
