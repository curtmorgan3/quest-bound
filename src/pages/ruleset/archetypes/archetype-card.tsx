import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Card,
  ImageUpload,
  Input,
  Label,
} from '@/components';
import { useActiveRuleset } from '@/lib/compass-api';
import type { Archetype } from '@/types';
import { ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export interface ArchetypeCardProps {
  archetype: Archetype;
  index: number;
  totalCount: number;
  rulesetId: string | undefined;
  getImageFromAssetId: (id: string | null) => string | null;
  isEditing: boolean;
  editName: string;
  editDescription: string;
  editAssetId: string | null;
  editImage: string | null;
  editMapWidth: number | undefined;
  editMapHeight: number | undefined;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditNameChange: (value: string) => void;
  onEditDescriptionChange: (value: string) => void;
  onEditImageUpload: (assetId: string) => void;
  onEditImageRemove: () => void;
  onEditSetUrl: (url: string) => void;
  onEditMapWidthChange: (value: number | undefined) => void;
  onEditMapHeightChange: (value: number | undefined) => void;
  onDelete: () => void;
  confirmBeforeDelete: boolean;
}

export function ArchetypeCard({
  archetype,
  index,
  totalCount,
  rulesetId,
  getImageFromAssetId,
  isEditing,
  editName,
  editDescription,
  editAssetId,
  editImage,
  editMapWidth,
  editMapHeight,
  onMoveUp,
  onMoveDown,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditNameChange,
  onEditDescriptionChange,
  onEditImageUpload,
  onEditImageRemove,
  onEditSetUrl,
  onEditMapWidthChange,
  onEditMapHeightChange,
  onDelete,
  confirmBeforeDelete,
}: ArchetypeCardProps) {
  const { activeRuleset } = useActiveRuleset();
  const navigate = useNavigate();
  const imageSrc = archetype.image ?? getImageFromAssetId(archetype.assetId ?? null) ?? undefined;

  const handleOpenSheetEdit = () => {
    if (!activeRuleset) return;
    navigate(`${archetype.id}/edit`);
  };

  return (
    <Card
      className='p-4 flex flex-row items-center gap-3'
      data-testid={`archetype-item-${archetype.id}`}>
      {!archetype.isDefault && (
        <div className='flex flex-col gap-0'>
          <Button
            variant='ghost'
            size='icon'
            className='h-6 w-6'
            onClick={onMoveUp}
            disabled={index === 1}>
            <ChevronUp className='h-4 w-4' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='h-6 w-6'
            onClick={onMoveDown}
            disabled={index === totalCount - 1}>
            <ChevronDown className='h-4 w-4' />
          </Button>
        </div>
      )}
      {imageSrc && (
        <img
          src={imageSrc}
          alt={archetype.name}
          className='h-12 w-12 shrink-0 rounded-md object-cover'
        />
      )}
      <div className='flex-1 min-w-0'>
        {isEditing ? (
          <div className='flex flex-col gap-2'>
            <Input
              value={editName}
              onChange={(e) => onEditNameChange(e.target.value)}
              placeholder='Name'
            />
            <Input
              value={editDescription}
              onChange={(e) => onEditDescriptionChange(e.target.value)}
              placeholder='Description'
            />
            <div className='grid gap-2'>
              <Label>Image</Label>
              <ImageUpload
                image={editImage || getImageFromAssetId(editAssetId)}
                alt='Archetype image'
                rulesetId={rulesetId}
                onUpload={onEditImageUpload}
                onRemove={onEditImageRemove}
                onSetUrl={onEditSetUrl}
              />
            </div>
            <div className='grid gap-2'>
              <Label className='text-muted-foreground'>Map Size (tiles)</Label>
              <div className='flex gap-2'>
                <div className='flex flex-col gap-1 flex-1'>
                  <Label className='text-muted-foreground text-xs'>Width</Label>
                  <Input
                    type='number'
                    min={1}
                    placeholder='—'
                    value={editMapWidth ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      onEditMapWidthChange(v === '' ? undefined : parseInt(v, 10) || 1);
                    }}
                  />
                </div>
                <div className='flex flex-col gap-1 flex-1'>
                  <Label className='text-muted-foreground text-xs'>Height</Label>
                  <Input
                    type='number'
                    min={1}
                    placeholder='—'
                    value={editMapHeight ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      onEditMapHeightChange(v === '' ? undefined : parseInt(v, 10) || 1);
                    }}
                  />
                </div>
              </div>
            </div>
            <div className='flex gap-2'>
              <Button size='sm' onClick={onSaveEdit}>
                Save
              </Button>
              <Button size='sm' variant='outline' onClick={onCancelEdit}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div className={`font-medium ${archetype.isDefault ? 'text-muted-foreground' : ''}`}>
              {archetype.name}
            </div>
            {archetype.description && (
              <p className='text-sm text-muted-foreground mt-0.5'>{archetype.description}</p>
            )}
            {archetype.scriptId && (
              <Link
                to={`/rulesets/${rulesetId}/scripts/${archetype.scriptId}`}
                className='text-sm text-primary hover:underline'>
                View script
              </Link>
            )}
          </div>
        )}
      </div>
      {!isEditing && (
        <div className='flex gap-1 shrink-0'>
          <Button
            variant='ghost'
            size='sm'
            onClick={handleOpenSheetEdit}
            data-testid='archetype-edit-default-sheet'>
            Edit Default Sheet
          </Button>
          {!archetype.isDefault && (
            <Button disabled={archetype.isDefault} variant='ghost' size='sm' onClick={onStartEdit}>
              <Pencil className='h-4 w-4' />
            </Button>
          )}
          {confirmBeforeDelete
            ? !archetype.isDefault && (
                <Button
                  variant='ghost'
                  size='sm'
                  className='text-destructive'
                  onClick={onDelete}
                  disabled={archetype.isDefault}
                  data-testid='archetype-delete-btn'
                  aria-label={`Delete ${archetype.name}`}>
                  <Trash2 className='h-4 w-4' />
                </Button>
              )
            : !archetype.isDefault && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='text-destructive'
                      data-testid='archetype-delete-btn'
                      aria-label={`Delete ${archetype.name}`}>
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete archetype?</AlertDialogTitle>
                      This will delete the test character and all character associations. This
                      cannot be undone.
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className='bg-destructive text-destructive-foreground'
                        onClick={onDelete}
                        data-testid='archetype-delete-confirm'>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
        </div>
      )}
    </Card>
  );
}
