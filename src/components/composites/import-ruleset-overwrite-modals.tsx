import { Button, Input, Label } from '@/components';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ImportRulesetResult } from '@/lib/compass-api';

export interface ImportRulesetOverwriteModalsProps {
  /** Replace modal: shown when importing a ruleset with same id but higher version */
  replaceOpen: boolean;
  onReplaceOpenChange: (open: boolean) => void;
  pendingReplaceResult: ImportRulesetResult | null;
  onConfirmReplace: () => void;
  onCancelReplace: () => void;

  /** Duplicate modal: shown when importing a ruleset with same id and same version */
  duplicateOpen: boolean;
  onDuplicateOpenChange: (open: boolean) => void;
  pendingDuplicateResult: ImportRulesetResult | null;
  duplicateTitle: string;
  duplicateVersion: string;
  onDuplicateTitleChange: (value: string) => void;
  onDuplicateVersionChange: (value: string) => void;
  onConfirmDuplicate: () => void;
  onCancelDuplicate: () => void;

  isImporting: boolean;
}

export function ImportRulesetOverwriteModals({
  replaceOpen,
  onReplaceOpenChange,
  pendingReplaceResult,
  onConfirmReplace,
  onCancelReplace,
  duplicateOpen,
  onDuplicateOpenChange,
  pendingDuplicateResult,
  duplicateTitle,
  duplicateVersion,
  onDuplicateTitleChange,
  onDuplicateVersionChange,
  onConfirmDuplicate,
  onCancelDuplicate,
  isImporting,
}: ImportRulesetOverwriteModalsProps) {
  return (
    <>
      <Dialog open={replaceOpen} onOpenChange={onReplaceOpenChange}>
        <DialogContent className='sm:max-w-[425px]'>
          <DialogHeader>
            <DialogTitle>Replace existing ruleset?</DialogTitle>
            <DialogDescription>{pendingReplaceResult?.message}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={onCancelReplace}>
              Cancel
            </Button>
            <Button onClick={onConfirmReplace} disabled={isImporting}>
              {isImporting ? 'Replacing…' : 'Replace'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={duplicateOpen} onOpenChange={onDuplicateOpenChange}>
        <DialogContent className='sm:max-w-[425px]'>
          <DialogHeader>
            <DialogTitle>Save as new ruleset?</DialogTitle>
            <DialogDescription>{pendingDuplicateResult?.message}</DialogDescription>
          </DialogHeader>
          <div className='mt-4 grid gap-4'>
            <div className='grid gap-2'>
              <Label htmlFor='duplicate-title'>Title</Label>
              <Input
                id='duplicate-title'
                value={duplicateTitle}
                onChange={(e) => onDuplicateTitleChange(e.target.value)}
                placeholder={pendingDuplicateResult?.importedRuleset?.title}
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='duplicate-version'>Version</Label>
              <Input
                id='duplicate-version'
                value={duplicateVersion}
                onChange={(e) => onDuplicateVersionChange(e.target.value)}
                placeholder={pendingDuplicateResult?.importedRuleset?.version}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={onCancelDuplicate}>
              Cancel
            </Button>
            <Button onClick={onConfirmDuplicate} disabled={isImporting}>
              {isImporting ? 'Creating…' : 'Create copy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
