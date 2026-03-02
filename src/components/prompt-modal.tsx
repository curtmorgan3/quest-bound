import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePromptModalStore } from '@/stores/prompt-modal-store';

export function PromptModal() {
  const { open, msg, choices, select, cancel } = usePromptModalStore();

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      cancel();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={false} className='z-[1100]' overlayClassName='z-[1100]'>
        <DialogHeader>
          <DialogTitle>{msg || 'Choose an option'}</DialogTitle>
        </DialogHeader>
        <div className='flex gap-2 flex-wrap justify-start'>
          {choices.map((choice) => (
            <Button
              key={choice}
              variant='outline'
              className='sm:w-auto'
              onClick={() => select(choice)}>
              {choice}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
