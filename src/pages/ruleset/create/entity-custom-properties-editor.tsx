import {
  Button,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components';
import { cn } from '@/lib/utils';
import type { EntityCustomPropertyDef } from '@/types';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface EntityCustomPropertiesEditorProps {
  items: EntityCustomPropertyDef[];
  onChange: (next: EntityCustomPropertyDef[]) => void;
  className?: string;
}

export function EntityCustomPropertiesEditor({
  items,
  onChange,
  className,
}: EntityCustomPropertiesEditorProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'string' | 'number' | 'boolean'>('string');
  const [defaultString, setDefaultString] = useState('');
  const [defaultNumber, setDefaultNumber] = useState(0);
  const [defaultBoolean, setDefaultBoolean] = useState(false);

  const normalized = (s: string) => s.trim().toLowerCase();

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (items.some((p) => normalized(p.name) === normalized(trimmed))) return;

    const defaultValue =
      type === 'number' ? defaultNumber : type === 'boolean' ? defaultBoolean : defaultString;

    onChange([...items, { name: trimmed, type, defaultValue }]);
    setName('');
    setDefaultString('');
    setDefaultNumber(0);
    setDefaultBoolean(false);
    setType('string');
  };

  const removeAt = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, patch: Partial<EntityCustomPropertyDef>) => {
    const prev = items[index];
    if (!prev) return;

    if (patch.name !== undefined) {
      const trimmed = patch.name.trim();
      if (
        trimmed &&
        items.some((p, i) => i !== index && normalized(p.name) === normalized(trimmed))
      ) {
        return;
      }
    }

    const next: EntityCustomPropertyDef = { ...prev, ...patch };

    if (patch.type !== undefined && patch.type !== prev.type && !('defaultValue' in patch)) {
      if (patch.type === 'boolean') {
        next.defaultValue = false;
      } else if (patch.type === 'number') {
        const n = Number(prev.defaultValue);
        next.defaultValue = Number.isFinite(n) ? n : 0;
      } else {
        next.defaultValue =
          prev.defaultValue === undefined || prev.defaultValue === null
            ? ''
            : String(prev.defaultValue);
      }
    }

    onChange(items.map((p, i) => (i === index ? next : p)));
  };

  const rowInputClass = 'h-8 min-h-8 px-2 py-0 text-xs shadow-none md:text-xs';

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <p className='text-sm text-muted-foreground'>Custom Properties</p>
      <div className='flex flex-row flex-wrap items-end gap-3'>
        <div className='grid flex-1 gap-2'>
          <Label htmlFor='ecp-name'>Name</Label>
          <Input
            id='ecp-name'
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='property_name'
          />
        </div>
        <div className='grid w-[100px] gap-2'>
          <Label htmlFor='ecp-type'>Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as 'string' | 'number' | 'boolean')}>
            <SelectTrigger id='ecp-type' className='w-full'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='string'>Text</SelectItem>
              <SelectItem value='number'>Number</SelectItem>
              <SelectItem value='boolean'>Boolean</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className='grid w-[140px] gap-2'>
          <Label
            htmlFor={
              type === 'boolean'
                ? 'ecp-default-bool'
                : type === 'number'
                  ? 'ecp-default-number'
                  : 'ecp-default-string'
            }>
            Default value
          </Label>
          {type === 'boolean' ? (
            <div className='flex h-9 items-center gap-2'>
              <Checkbox
                id='ecp-default-bool'
                checked={defaultBoolean}
                onCheckedChange={(c) => setDefaultBoolean(c === true)}
              />
            </div>
          ) : type === 'number' ? (
            <Input
              id='ecp-default-number'
              type='number'
              value={Number.isFinite(defaultNumber) ? defaultNumber : 0}
              onChange={(e) => setDefaultNumber(Number(e.target.value) || 0)}
            />
          ) : (
            <Input
              id='ecp-default-string'
              value={defaultString}
              onChange={(e) => setDefaultString(e.target.value)}
              placeholder='Default text'
            />
          )}
        </div>
      </div>
      <div>
        <Button type='button' variant='secondary' onClick={handleAdd} disabled={!name.trim()}>
          <Plus className='size-4 mr-1' />
          Add
        </Button>
      </div>
      <div className='grid gap-2'>
        <Label>Properties</Label>
        <div className='max-h-48 overflow-y-auto rounded-md border border-border p-2 space-y-2 bg-secondary/30'>
          {items.length === 0 ? (
            <p className='text-sm text-muted-foreground px-1 py-2'>No custom properties yet.</p>
          ) : (
            items.map((row, index) => (
              <div
                key={index}
                className='flex items-center gap-1.5 rounded-sm bg-background/80 px-1.5 py-1'>
                <Input
                  aria-label={`Property ${index + 1} name`}
                  className={cn(rowInputClass, 'min-w-0 flex-1 basis-[5rem]')}
                  value={row.name}
                  onChange={(e) => updateRow(index, { name: e.target.value })}
                  placeholder='name'
                />
                <Select
                  value={row.type}
                  onValueChange={(v) =>
                    updateRow(index, { type: v as 'string' | 'number' | 'boolean' })
                  }>
                  <SelectTrigger
                    size='sm'
                    aria-label={`Property ${index + 1} type`}
                    className={cn(rowInputClass, 'w-[5.75rem] shrink-0')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='string'>Text</SelectItem>
                    <SelectItem value='number'>Number</SelectItem>
                    <SelectItem value='boolean'>Boolean</SelectItem>
                  </SelectContent>
                </Select>
                <div className='min-w-0 w-[6.5rem] shrink-0 sm:w-[7.5rem]'>
                  {row.type === 'boolean' ? (
                    <div className='flex h-8 items-center justify-center'>
                      <Checkbox
                        aria-label={`Property ${index + 1} default`}
                        className='size-4'
                        checked={Boolean(row.defaultValue)}
                        onCheckedChange={(c) => updateRow(index, { defaultValue: c === true })}
                      />
                    </div>
                  ) : row.type === 'number' ? (
                    <Input
                      aria-label={`Property ${index + 1} default`}
                      type='number'
                      className={rowInputClass}
                      value={
                        Number.isFinite(Number(row.defaultValue)) ? Number(row.defaultValue) : 0
                      }
                      onChange={(e) =>
                        updateRow(index, { defaultValue: Number(e.target.value) || 0 })
                      }
                    />
                  ) : (
                    <Input
                      aria-label={`Property ${index + 1} default`}
                      className={rowInputClass}
                      value={String(row.defaultValue ?? '')}
                      onChange={(e) => updateRow(index, { defaultValue: e.target.value })}
                      placeholder='default'
                    />
                  )}
                </div>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='size-8 shrink-0'
                  aria-label={`Remove ${row.name || 'property'}`}
                  onClick={() => removeAt(index)}>
                  <Trash2 className='size-3.5' />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
