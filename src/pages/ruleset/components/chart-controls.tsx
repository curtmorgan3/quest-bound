import { Checkbox, DialogTrigger, Label } from '@/components';
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
} from '@/components/ui/alert-dialog';
import { useScripts } from '@/lib/compass-api';
import { colorPrimary } from '@/palette';
import type { Item } from '@/types';
import { FileCode, FilePlus, Pencil, SlidersHorizontal, Trash } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { ManageItemCustomPropertiesPanel } from '../items/manage-item-custom-properties-panel';

interface ChartControlsProps {
  id: string;
  handleDelete: (id: string) => void;
  handleEdit: (id: string) => void;
  /** When provided (e.g. in item chart), shows a button to manage item custom properties. */
  item?: Item;
  type: 'attribute' | 'action' | 'item';
  title?: string;
}

export const ChartControls = ({
  id,
  handleDelete,
  handleEdit,
  item,
  type,
  title,
}: ChartControlsProps) => {
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
              <AlertDialogDescription>Permanently delete this content?</AlertDialogDescription>
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
      {item && (
        <ManageItemCustomPropertiesPanel
          item={item}
          trigger={
            <SlidersHorizontal
              className='text-neutral-400 h-[18px] w-[18px] clickable'
              aria-label='Manage custom properties'
            />
          }
        />
      )}
      {scriptId ? (
        <Link to={`/rulesets/${rulesetId}/scripts/${scriptId}`}>
          <FileCode
            className='text-neutral-400 h-[18px] w-[18px] clickable'
            style={{ color: colorPrimary }}
          />
        </Link>
      ) : (
        <Link
          to={`/rulesets/${rulesetId}/scripts/new?type=${type}&entityId=${id}&entityName=${title ?? ''}`}>
          <FilePlus className='text-neutral-400 h-[18px] w-[18px] clickable' />
        </Link>
      )}
    </div>
  );
};
