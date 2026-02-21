import {
  Button,
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
} from '@/components';
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
import { FileText, Pencil } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';

export type PreviewCardType =
  | 'attributes'
  | 'items'
  | 'actions'
  | 'charts'
  | 'documents'
  | 'windows'
  | 'pages';

interface Props {
  id: string;
  title: string;
  type?: PreviewCardType;
  category?: string;
  image?: string | null;
  /** Optional content shown in the description area (e.g. "PDF attached") */
  descriptionExtra?: ReactNode;
  /** When true, the Open button is disabled */
  openDisabled?: boolean;
  /** Optional class for the title (e.g. blue for module-origin content) */
  titleClassName?: string;
  onDelete: (id: string) => void;
  onOpen: (id: string) => void;
  onEdit: (title: string, category?: string) => void;
  onEditDetails?: () => void;
  /** Edit markdown content (distinct from details). Shown as second icon when provided. */
  onEditMarkdown?: () => void;
  categoryEditable?: boolean;
}

export const PreviewCard = ({
  id,
  title,
  type: _type,
  category,
  image,
  descriptionExtra,
  openDisabled,
  titleClassName,
  onDelete,
  onOpen,
  onEdit,
  onEditDetails,
  onEditMarkdown,
  categoryEditable = true,
}: Props) => {
  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState(title);

  const [editingCategory, setEditingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState(category);

  const doNotAsk = localStorage.getItem('qb.confirmOnDelete') === 'false';

  const handleSave = () => {
    onEdit(newTitle, newCategory);
    setEditingTitle(false);
    setEditingCategory(false);
  };

  const handleKeyEvent = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditingTitle(false);
      setEditingCategory(false);
      setNewTitle(title);
      setNewCategory(category);
    }
  };

  return (
    <Card
      key={id}
      className={`p-4 w-[320px] flex flex-col justify-between h-[240px]`}
      data-testid='preview-card'
      onClick={handleSave}
      style={
        image
          ? {
              background: `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url(${image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }>
      {image ? (
        <div className='rounded-md bg-black/30 px-3 py-2 -mx-1'>
          <CardHeader className='p-0'>
            {editingTitle ? (
              <Input
                value={newTitle}
                data-testid='preview-card-title-input'
                onChange={(e) => setNewTitle(e.target.value)}
                autoFocus
                onKeyDown={(e) => handleKeyEvent(e as unknown as KeyboardEvent)}
              />
            ) : (
              <CardTitle
                className={`text-lg cursor-pointer ${titleClassName ?? ''}`.trim()}
                data-testid='preview-card-title'
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingTitle(true);
                }}>
                {title}
              </CardTitle>
            )}
          </CardHeader>
          <CardDescription className='grow-1 max-h-[200px] overflow-y-auto mt-1'>
            <div className='flex flex-col gap-2'>
              {editingCategory ? (
                <Input
                  value={newCategory}
                  data-testid='preview-card-description-input'
                  onChange={(e) => setNewCategory(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => handleKeyEvent(e as unknown as KeyboardEvent)}
                />
              ) : (
                <p
                  className='cursor-pointer'
                  onClick={(e) => {
                    e.stopPropagation();
                    if (categoryEditable) {
                      setEditingCategory(true);
                    }
                  }}>
                  {categoryEditable ? category || 'Set category' : ''}
                </p>
              )}
              {descriptionExtra}
            </div>
          </CardDescription>
        </div>
      ) : (
        <>
          <CardHeader>
            {editingTitle ? (
              <Input
                value={newTitle}
                data-testid='preview-card-title-input'
                onChange={(e) => setNewTitle(e.target.value)}
                autoFocus
                onKeyDown={(e) => handleKeyEvent(e as unknown as KeyboardEvent)}
              />
            ) : (
              <CardTitle
                className={`text-lg cursor-pointer ${titleClassName ?? ''}`.trim()}
                data-testid='preview-card-title'
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingTitle(true);
                }}>
                {title}
              </CardTitle>
            )}
          </CardHeader>
          <CardDescription className='grow-1 max-h-[200px] overflow-y-auto'>
            <div className='flex flex-col gap-2'>
              {editingCategory ? (
                <Input
                  value={newCategory}
                  data-testid='preview-card-description-input'
                  onChange={(e) => setNewCategory(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => handleKeyEvent(e as unknown as KeyboardEvent)}
                />
              ) : (
                <p
                  className='cursor-pointer'
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingCategory(true);
                  }}>
                  {category || 'Set category'}
                </p>
              )}
              {descriptionExtra}
            </div>
          </CardDescription>
        </>
      )}
      <div className='flex gap-2 mt-2 bg-secondary rounded-md p-2 justify-between items-center'>
        {doNotAsk ? (
          <Button
            variant='ghost'
            onClick={(e) => {
              e.stopPropagation();
              onDelete(id);
            }}
            className='text-red-500'
            data-testid='preview-card-delete'>
            Delete
          </Button>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant='ghost'
                onClick={(e) => e.stopPropagation()}
                className='text-red-500'
                data-testid='preview-card-delete'>
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle>Permanently delete this content?</AlertDialogTitle>
                <div className='flex gap-2'>
                  <Label htmlFor='preview-card-do-not-ask-again'>Do not ask again</Label>
                  <Checkbox
                    id='preview-card-do-not-ask-again'
                    onCheckedChange={(checked) =>
                      localStorage.setItem('qb.confirmOnDelete', String(!checked))
                    }
                  />
                </div>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  data-testid='preview-card-delete-confirm'
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(id);
                  }}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        <CardAction>
          <div className='flex gap-1'>
            {!!onEditDetails && (
              <Button variant='ghost' size='sm' onClick={onEditDetails} aria-label='Edit details'>
                <Pencil className='h-4 w-4' />
              </Button>
            )}
            {!!onEditMarkdown && (
              <Button variant='ghost' size='sm' onClick={onEditMarkdown} aria-label='Edit content'>
                <FileText className='h-4 w-4' />
              </Button>
            )}
            <Button
              variant='link'
              onClick={(e) => {
                e.stopPropagation();
                onOpen(id);
              }}
              disabled={openDisabled}
              data-testid='preview-card-open'>
              Open
            </Button>
          </div>
        </CardAction>
      </div>
    </Card>
  );
};
