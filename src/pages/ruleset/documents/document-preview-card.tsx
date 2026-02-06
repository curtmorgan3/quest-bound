import {
  Button,
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '@/components';
import type { Document } from '@/types';
import { Pencil } from 'lucide-react';
import { useState } from 'react';

interface Props {
  document: Document;
  onDelete: (id: string) => void;
  onOpen: (id: string) => void;
  onEdit: (title: string, category?: string) => void;
  onEditDetails?: () => void;
}

export const DocumentPreviewCard = ({
  document,
  onDelete,
  onOpen,
  onEdit,
  onEditDetails,
}: Props) => {
  const { id, title, category, image, pdfData } = document;

  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState(title);

  const [editingCategory, setEditingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState(category);

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

  const hasPdf = !!pdfData;

  return (
    <Card
      key={id}
      className='p-4 w-[300px] h-[240px] flex flex-col justify-between'
      onClick={handleSave}
      style={
        image
          ? {
              background: `url(${image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }>
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
            className='text-lg cursor-pointer'
            data-testid='preview-card-title'
            onClick={(e) => {
              e.stopPropagation();
              setEditingTitle(true);
            }}>
            {title}
          </CardTitle>
        )}
      </CardHeader>

      <CardDescription className='grow-1 max-h-[60px] overflow-y-auto'>
        <div className='flex flex-col gap-1'>
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
              className='cursor-pointer text-sm'
              onClick={(e) => {
                e.stopPropagation();
                setEditingCategory(true);
              }}>
              {category || 'Set category'}
            </p>
          )}
          {hasPdf && <span className='text-xs text-primary'>PDF attached</span>}
        </div>
      </CardDescription>

      <div className='flex gap-2 mt-2 bg-secondary rounded-md p-2 justify-between items-center'>
        <Button variant='ghost' onClick={() => onDelete(id)} className='text-red-500'>
          Delete
        </Button>
        <CardAction>
          <div className='flex gap-1'>
            {onEditDetails && (
              <Button variant='ghost' size='sm' onClick={onEditDetails}>
                <Pencil className='h-4 w-4' />
              </Button>
            )}
            <Button variant='link' onClick={() => onOpen(id)} disabled={!hasPdf}>
              Open
            </Button>
          </div>
        </CardAction>
      </div>
    </Card>
  );
};
