import { Checkbox, DialogTrigger, Label } from '@/components';
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
import { useScripts } from '@/lib/compass-api';
import { FileCode, Pencil, Trash } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

interface ChartControlsProps {
  id: string;
  handleDelete: (id: string) => void;
  handleEdit: (id: string) => void;
}

export const ChartControls = ({ id, handleDelete, handleEdit }: ChartControlsProps) => {
  const { rulesetId } = useParams<{ rulesetId: string }>();
  const { getScriptIdForEntity } = useScripts();
  const scriptId = getScriptIdForEntity(id);
  const doNotAsk = localStorage.getItem('qb.confirmOnDelete') === 'false';

  return (
    <div className='flex items-center justify-start gap-4 w-full h-full'>
      {doNotAsk ? (
        <Trash
          onClick={() => handleDelete(id)}
          data-testid='chart-controls-delete'
          className='text-neutral-400 h-[18px] w-[18px] clickable'
        />
      ) : (
        <AlertDialog>
          <AlertDialogTrigger>
            <Trash
              className='text-neutral-400 h-[18px] w-[18px] clickable'
              data-testid='chart-controls-delete'
            />
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
        <Pencil
          onClick={() => handleEdit(id)}
          data-testid='chart-controls-edit'
          className='text-neutral-400 h-[18px] w-[18px] clickable'
        />
      </DialogTrigger>
      {scriptId && (
        <Link to={`/rulesets/${rulesetId}/scripts/${scriptId}`}>
          <FileCode className='text-neutral-400 h-[18px] w-[18px] clickable' />
        </Link>
      )}
    </div>
  );
};
