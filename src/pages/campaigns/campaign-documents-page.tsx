import { Button, Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components';
import { PageWrapper } from '@/components/composites';
import { useCampaign } from '@/lib/compass-api';
import { Loader2, Plus } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { BaseCreate } from '../ruleset/create';
import { Documents } from '../ruleset/documents';

export function CampaignDocumentsPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const campaign = useCampaign(campaignId);
  const [createOpen, setCreateOpen] = useState(false);

  if (!campaignId) return null;
  if (campaign === undefined) {
    return (
      <div className='flex h-full w-full items-center justify-center p-4'>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
      </div>
    );
  }
  if (!campaign) {
    return (
      <div className='flex h-full w-full flex-col items-center justify-center gap-2 p-4'>
        <p className='text-muted-foreground'>Campaign not found.</p>
      </div>
    );
  }

  return (
    <PageWrapper
      title={campaign.label ?? 'Campaign'}
      subheader='Documents'
      headerActions={
        <Button
          variant='outline'
          size='sm'
          className='gap-1'
          onClick={() => setCreateOpen(true)}
          data-testid='create-document-button'>
          <Plus className='h-4 w-4' />
          Create Document
        </Button>
      }>
      <Documents campaignId={campaignId} />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className='min-w-[600px] max-w-[80vw] min-h-[50vh]'>
          <DialogTitle className='hidden'>New document</DialogTitle>
          <DialogDescription className='hidden'>New document</DialogDescription>
          <BaseCreate
            campaignId={campaignId}
            onCreate={() => {
              setCreateOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
