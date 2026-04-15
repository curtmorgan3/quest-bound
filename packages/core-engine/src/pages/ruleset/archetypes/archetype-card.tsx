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
  Button,
  Card,
  CategoryField,
  Checkbox,
  DescriptionEditor,
  ImageUpload,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components';
import { useActiveRuleset } from '@/lib/compass-api';
import { ChartLookup } from '@quest-bound/core-ui/api-components';
import type { Archetype, Chart } from '@/types';
import { ChevronDown, ChevronUp, FileCode, Pencil, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ManageArchetypeCustomPropertiesModal } from './manage-archetype-custom-properties-modal';

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
  editCategory: string | null;
  editUseChartForVariants: boolean;
  editVariantsChartId: string;
  editVariantsChartColumnHeader: string;
  existingCategories: string[];
  charts: Chart[];
  onMoveUp: () => void;
  onMoveDown: () => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditNameChange: (value: string) => void;
  onEditDescriptionChange: (value: string) => void;
  onEditImageUpload: (assetId: string) => void;
  onEditImageRemove: () => void;
  onEditCategoryChange: (value: string | null) => void;
  onEditUseChartForVariantsChange: (value: boolean) => void;
  onEditVariantsChartIdChange: (value: string) => void;
  onEditVariantsChartColumnHeaderChange: (value: string) => void;
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
  editCategory,
  editUseChartForVariants,
  editVariantsChartId,
  editVariantsChartColumnHeader,
  existingCategories,
  charts,
  onMoveUp,
  onMoveDown,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditNameChange,
  onEditDescriptionChange,
  onEditImageUpload,
  onEditImageRemove,
  onEditCategoryChange,
  onEditUseChartForVariantsChange,
  onEditVariantsChartIdChange,
  onEditVariantsChartColumnHeaderChange,
  onDelete,
  confirmBeforeDelete,
}: ArchetypeCardProps) {
  const { activeRuleset } = useActiveRuleset();
  const navigate = useNavigate();
  const imageSrc = archetype.image ?? getImageFromAssetId(archetype.assetId ?? null) ?? undefined;

  const variantsChartColumnHeaders = useMemo(() => {
    if (!editVariantsChartId) return [];
    const chart = charts.find((c) => c.id === editVariantsChartId);
    if (!chart?.data) return [];
    try {
      const rows = JSON.parse(chart.data) as string[][];
      return (rows[0] || []).filter(Boolean);
    } catch {
      return [];
    }
  }, [charts, editVariantsChartId]);

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
          <div className='flex flex-col gap-6'>
            <Input
              value={editName}
              onChange={(e) => onEditNameChange(e.target.value)}
              placeholder='Name'
            />
            <CategoryField
              value={editCategory}
              onChange={onEditCategoryChange}
              existingCategories={existingCategories}
              placeholder='Search categories...'
            />
            <div className='flex gap-8 items-start'>
              <div className='grid gap-2'>
                <Label>Portrait</Label>
                <ImageUpload
                  image={editImage || getImageFromAssetId(editAssetId)}
                  alt='Archetype image'
                  rulesetId={rulesetId}
                  onUpload={onEditImageUpload}
                  onRemove={onEditImageRemove}
                />
              </div>
              <DescriptionEditor
                className='flex-1'
                value={editDescription}
                onChange={onEditDescriptionChange}
                placeholder='Description'
              />
            </div>
            <div className='flex flex-col gap-4'>
              <div className='flex items-center gap-2'>
                <Checkbox
                  id='edit-use-chart-variants'
                  checked={editUseChartForVariants}
                  onCheckedChange={(checked) => {
                    onEditUseChartForVariantsChange(!!checked);
                    if (!checked) {
                      onEditVariantsChartIdChange('');
                      onEditVariantsChartColumnHeaderChange('');
                    }
                  }}
                />
                <Label htmlFor='edit-use-chart-variants'>Add variants from chart</Label>
              </div>
              {editUseChartForVariants && (
                <div className='flex flex-row gap-4 items-end'>
                  <div className='grid gap-2 flex-1'>
                    <ChartLookup
                      rulesetId={rulesetId}
                      label='Chart'
                      value={editVariantsChartId || null}
                      placeholder='Select a chart'
                      onSelect={(chart) => {
                        onEditVariantsChartIdChange(chart.id);
                        onEditVariantsChartColumnHeaderChange('');
                      }}
                      onDelete={() => {
                        onEditVariantsChartIdChange('');
                        onEditVariantsChartColumnHeaderChange('');
                      }}
                    />
                  </div>
                  <div className='grid gap-2 flex-1'>
                    <Label htmlFor='edit-variants-column' className='text-sm text-muted-foreground'>
                      Column
                    </Label>
                    <Select
                      value={editVariantsChartColumnHeader}
                      onValueChange={onEditVariantsChartColumnHeaderChange}
                      disabled={!editVariantsChartId}>
                      <SelectTrigger id='edit-variants-column'>
                        <SelectValue placeholder='Select a column' />
                      </SelectTrigger>
                      <SelectContent>
                        {variantsChartColumnHeaders.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
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
            {archetype.category && (
              <p className='text-sm text-muted-foreground mt-0.5'>{archetype.category}</p>
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
          <ManageArchetypeCustomPropertiesModal archetype={archetype} />
          {archetype.scriptId && (
            <Button variant='ghost' size='sm' asChild aria-label='View script'>
              <Link to={`/rulesets/${rulesetId}/scripts/${archetype.scriptId}`}>
                <FileCode className='h-4 w-4' />
              </Link>
            </Button>
          )}
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
                      <AlertDialogDescription>
                        This will delete the test character and all character associations. This
                        cannot be undone.
                      </AlertDialogDescription>
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
