import { Button, Checkbox, DialogTrigger, Label } from '@/components';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Pencil, Trash } from 'lucide-react';

interface ChartControlsProps {
  id: string;
  handleDelete: (id: string) => void;
  handleEdit: (id: string) => void;
}

export const ChartControls = ({ id, handleDelete, handleEdit }: ChartControlsProps) => {
  const doNotAsk = localStorage.getItem('qb.confirmOnDelete') === 'false';

  return (
    <div className='flex items-center justify-end gap-2'>
      {doNotAsk ? (
        <Button
          variant='ghost'
          size='icon'
          onClick={() => handleDelete(id)}
          data-testid='chart-controls-delete'>
          <Trash className='text-neutral-400' />
        </Button>
      ) : (
        <AlertDialog>
          <AlertDialogTrigger>
            <Button variant='ghost' size='icon' data-testid='chart-controls-delete'>
              <Trash className='text-neutral-400' />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Permanently delete this content?</AlertDialogTitle>
              <div className='flex gap-2'>
                <Label htmlFor='do-not-ask-again'>Do not ask again</Label>
                <Checkbox
                  id='do-not-ask-again'
                  onCheckedChange={(checked) =>
                    localStorage.setItem('qb.confirmOnDelete', String(!checked))
                  }
                />
              </div>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                data-testid='chart-controls-delete-confirm'
                onClick={() => handleDelete(id)}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      <DialogTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          onClick={() => handleEdit(id)}
          data-testid='chart-controls-edit'>
          <Pencil className='text-neutral-400' />
        </Button>
      </DialogTrigger>
    </div>
  );
};
