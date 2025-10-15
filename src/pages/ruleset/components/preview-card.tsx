import {
  Button,
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '@/components';
import { useState } from 'react';

interface Props {
  id: string;
  title: string;
  category?: string;
  onDelete: (id: string) => void;
  onOpen: (id: string) => void;
  onEdit: (title: string, category?: string) => void;
}

export const PreviewCard = ({ id, title, category, onDelete, onOpen, onEdit }: Props) => {
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

  return (
    <Card
      key={id}
      className='p-4 w-[300px] h-[240px] flex flex-col justify-between'
      onClick={handleSave}>
      <CardHeader>
        {editingTitle ? (
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            autoFocus
            onKeyDown={(e) => handleKeyEvent(e as unknown as KeyboardEvent)}
          />
        ) : (
          <CardTitle
            className='text-lg cursor-pointer'
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
        </div>
      </CardDescription>
      <div className='flex gap-2 mt-2 bg-secondary rounded-md p-2 justify-between items-center'>
        <Button variant='ghost' onClick={() => onDelete(id)} className='text-red-500'>
          Delete
        </Button>
        <CardAction>
          <Button variant='link' onClick={() => onOpen(id)}>
            Open
          </Button>
        </CardAction>
      </div>
    </Card>
  );
};
