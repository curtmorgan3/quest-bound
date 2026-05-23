import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PatreonUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PatreonUpgradeDialog({ open, onOpenChange }: PatreonUpgradeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unlock Multiplayer &amp; Cloud Sync</DialogTitle>
          <DialogDescription>
            Hosting campaigns and syncing your content to the cloud are available to Quest Bound
            Patreon supporters. Join the Patreon to unlock these features and support continued
            development.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Maybe later
          </Button>
          <Button asChild>
            <a href='https://www.patreon.com/cw/QuestBoundEngine' target='_blank' rel='noopener noreferrer'>
              Join on Patreon
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
