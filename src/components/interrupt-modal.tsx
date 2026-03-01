import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useInterruptModalStore } from '@/stores/interrupt-modal-store';

export function InterruptModal() {
  const { open, msg, choices, select, cancel } = useInterruptModalStore();

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      cancel();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className='z-[1100]'
        overlayClassName='z-[1100]'>
        <DialogHeader>
          <DialogTitle>{msg || 'Choose an option'}</DialogTitle>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {choices.map((choice) => (
            <Button
              key={choice}
              variant="default"
              className="w-full sm:w-auto"
              onClick={() => select(choice)}>
              {choice}
            </Button>
          ))}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
