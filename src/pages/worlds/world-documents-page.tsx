import { Button, Dialog, DialogContent, DialogTitle } from '@/components';
import { PageWrapper } from '@/components/composites';
import { useWorld } from '@/lib/compass-api';
import { Loader2, Plus } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { BaseCreate } from '../ruleset/create';
import { Documents } from '../ruleset/documents';

export function WorldDocumentsPage() {
  const { worldId } = useParams<{ worldId: string }>();
  const world = useWorld(worldId);
  const [createOpen, setCreateOpen] = useState(false);

  if (!worldId) return null;
  if (world === undefined) {
    return (
      <div className='flex h-full w-full items-center justify-center p-4'>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
      </div>
    );
  }
  if (!world) {
    return (
      <div className='flex h-full w-full flex-col items-center justify-center gap-2 p-4'>
        <p className='text-muted-foreground'>World not found.</p>
      </div>
    );
  }

  return (
    <PageWrapper
      title={world.label}
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
      <Documents worldId={worldId} />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className='min-w-[600px] max-w-[80vw] min-h-[50vh]'>
          <DialogTitle className='hidden'>New document</DialogTitle>
          <BaseCreate
            worldId={worldId}
            onCreate={() => {
              setCreateOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
