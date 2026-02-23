import {
  Button,
  CategoryField,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  RulesetColorPicker,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components';
import {
  useCustomProperties,
  useActiveRuleset,
} from '@/lib/compass-api';
import type { CustomPropertyType } from '@/types';
import { Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { RGBColor } from 'react-color';

const PROP_TYPES: CustomPropertyType[] = ['string', 'number', 'boolean', 'color'];

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

interface CustomPropertyPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (customPropertyId: string) => void;
  excludeIds?: string[];
  /** When set, open directly in create mode instead of select. */
  initialMode?: 'select' | 'create';
}

export function CustomPropertyPicker({
  open,
  onOpenChange,
  onSelect,
  excludeIds = [],
  initialMode = 'select',
}: CustomPropertyPickerProps) {
  const { activeRuleset } = useActiveRuleset();
  const { customProperties, createCustomProperty } = useCustomProperties(activeRuleset?.id);
  const [mode, setMode] = useState<'select' | 'create'>(initialMode);

  useEffect(() => {
    if (open) setMode(initialMode);
  }, [open, initialMode]);

  const [createLabel, setCreateLabel] = useState('');
  const [createType, setCreateType] = useState<CustomPropertyType>('string');
  const [createCategory, setCreateCategory] = useState('');
  const [createDefaultValue, setCreateDefaultValue] = useState('');
  const [creating, setCreating] = useState(false);

  const available = customProperties.filter((cp) => !excludeIds.includes(cp.id));

  const handleSelect = useCallback(
    (id: string) => {
      onSelect(id);
      onOpenChange(false);
    },
    [onSelect, onOpenChange],
  );

  const handleCreate = useCallback(async () => {
    if (!createLabel.trim() || !activeRuleset) return;
    setCreating(true);
    try {
      const defaultValue =
        createType === 'number'
          ? createDefaultValue === ''
            ? 0
            : Number(createDefaultValue)
          : createType === 'boolean'
            ? createDefaultValue === 'true'
            : createType === 'color'
              ? createDefaultValue || ''
              : createDefaultValue;
      const id = await createCustomProperty({
        label: createLabel.trim(),
        type: createType,
        category: createCategory.trim() || undefined,
        defaultValue,
      });
      if (id) {
        handleSelect(id);
      }
      setCreateLabel('');
      setCreateCategory('');
      setCreateDefaultValue('');
      setMode('select');
    } finally {
      setCreating(false);
    }
  }, [
    createLabel,
    createType,
    createCategory,
    createDefaultValue,
    activeRuleset,
    createCustomProperty,
    handleSelect,
  ]);

  const handleClose = useCallback(() => {
    setMode('select');
    setCreateLabel('');
    setCreateCategory('');
    setCreateDefaultValue('');
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='min-w-[360px] max-w-[90vw]'>
        <DialogHeader>
          <DialogTitle>
            {mode === 'select' ? 'Select custom property' : 'Create custom property'}
          </DialogTitle>
        </DialogHeader>
        {mode === 'select' ? (
          <div className='flex flex-col gap-4'>
            {available.length === 0 ? (
              <p className='text-sm text-muted-foreground'>
                No custom properties in this ruleset. Create one first.
              </p>
            ) : (
              <div className='flex flex-col gap-1 max-h-[240px] overflow-auto'>
                {available.map((cp) => (
                  <Button
                    key={cp.id}
                    variant='outline'
                    className='justify-start font-normal'
                    onClick={() => handleSelect(cp.id)}>
                    {cp.label}
                    <span className='ml-2 text-xs text-muted-foreground'>({cp.type})</span>
                  </Button>
                ))}
              </div>
            )}
            <Button
              variant='outline'
              size='sm'
              className='gap-1'
              onClick={() => setMode('create')}>
              <Plus className='h-4 w-4' />
              Create new
            </Button>
          </div>
        ) : (
          <div className='flex flex-col gap-4'>
            <div className='grid gap-2'>
              <Label>Label</Label>
              <Input
                placeholder='e.g. Armor Value'
                value={createLabel}
                onChange={(e) => setCreateLabel(e.target.value)}
              />
            </div>
            <div className='grid gap-2'>
              <Label>Type</Label>
              <Select
                value={createType}
                onValueChange={(v) => {
                  setCreateType(v as CustomPropertyType);
                  setCreateDefaultValue('');
                }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROP_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <CategoryField
              value={createCategory || null}
              onChange={(v) => setCreateCategory(v ?? '')}
              existingCategories={[
                ...new Set(
                  customProperties.map((cp) => cp.category).filter((c): c is string => !!c),
                ),
              ]}
              placeholder='e.g. Combat'
              label='Category (optional)'
            />
            <div className='grid gap-2'>
              <Label>Default value (optional)</Label>
              {createType === 'boolean' ? (
                <Select
                  value={createDefaultValue || 'false'}
                  onValueChange={setCreateDefaultValue}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='false'>false</SelectItem>
                    <SelectItem value='true'>true</SelectItem>
                  </SelectContent>
                </Select>
              ) : createType === 'color' ? (
                <RulesetColorPicker
                  color={createDefaultValue || undefined}
                  label='Default color'
                  disableAlpha
                  onUpdate={(color: RGBColor) =>
                    setCreateDefaultValue(rgbToHex(color.r, color.g, color.b))
                  }
                />
              ) : (
                <Input
                  type={createType === 'number' ? 'number' : 'text'}
                  placeholder={createType === 'number' ? '0' : 'Default'}
                  value={createDefaultValue}
                  onChange={(e) => setCreateDefaultValue(e.target.value)}
                />
              )}
            </div>
            <DialogFooter>
              <Button variant='outline' onClick={() => setMode('select')}>
                Back
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!createLabel.trim() || creating}>
                {creating ? 'Creating…' : 'Create'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
