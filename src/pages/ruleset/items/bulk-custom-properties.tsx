import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components';
import { useItems } from '@/lib/compass-api';
import { Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

const ALL_ITEMS = '__all__';
const PROP_TYPES = ['string', 'number', 'boolean'] as const;
type PropType = (typeof PROP_TYPES)[number];

interface PropertyRow {
  id: string;
  key: string;
  type: PropType;
  value: string;
}

function coerceValue(raw: string, type: PropType): string | number | boolean {
  switch (type) {
    case 'number':
      return raw === '' ? 0 : Number(raw);
    case 'boolean':
      return raw === 'true';
    default:
      return raw;
  }
}

export function BulkCustomProperties() {
  const [scope, setScope] = useState(ALL_ITEMS);
  const [rows, setRows] = useState<PropertyRow[]>([]);
  const [applying, setApplying] = useState(false);
  const [bulkPropsOpen, setBulkPropsOpen] = useState(false);
  const { items, updateItem } = useItems();

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.category?.trim()) set.add(item.category.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [items]);

  const targetItems = useMemo(() => {
    if (scope === ALL_ITEMS) return items;
    return items.filter((i) => i.category?.trim() === scope);
  }, [items, scope]);

  const addRow = () => {
    setRows((prev) => [...prev, { id: crypto.randomUUID(), key: '', type: 'string', value: '' }]);
  };

  const updateRow = (id: string, patch: Partial<Omit<PropertyRow, 'id'>>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const buildCustomProperties = (): Record<string, string | number | boolean> | undefined => {
    const entries = rows
      .filter((r) => r.key.trim() !== '')
      .map((r) => [r.key.trim(), coerceValue(r.value, r.type)] as const);
    if (entries.length === 0) return undefined;
    return Object.fromEntries(entries);
  };

  const handleApply = async () => {
    const keys = rows.map((r) => r.key.trim()).filter(Boolean);
    const hasDuplicates = keys.length !== new Set(keys).size;
    if (hasDuplicates) return;

    setApplying(true);
    try {
      const customProperties = buildCustomProperties();
      await Promise.all(
        targetItems.map((item) =>
          updateItem(item.id, { customProperties: customProperties ?? {} }),
        ),
      );
    } finally {
      setApplying(false);
    }
  };

  const hasDuplicateKeys =
    rows.filter((r) => r.key.trim()).length !==
    new Set(rows.map((r) => r.key.trim()).filter(Boolean)).size;
  const canApply = targetItems.length > 0 && !hasDuplicateKeys;

  return (
    <Dialog open={bulkPropsOpen} onOpenChange={setBulkPropsOpen}>
      <DialogTrigger asChild>
        <Button variant='outline' size='sm' aria-label='Custom Properties'>
          <SlidersHorizontal />
        </Button>
      </DialogTrigger>
      <DialogContent className='min-w-[480px] max-w-[90vw]'>
        <DialogTitle>Custom Properties</DialogTitle>
        <div className='flex flex-col gap-4 rounded-lg border bg-muted/20 p-4'>
          <div className='flex flex-wrap items-end gap-4'>
            <div className='flex flex-col gap-2'>
              <Label className='text-xs text-muted-foreground'>Apply to</Label>
              <Select value={scope} onValueChange={setScope}>
                <SelectTrigger className='w-[180px]' data-testid='bulk-custom-props-scope'>
                  <SelectValue placeholder='Scope' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_ITEMS}>All items</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      Category: {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {categories.length === 0 && scope === ALL_ITEMS && (
              <span className='text-sm text-muted-foreground'>
                {items.length === 0 ? 'No items yet.' : 'No categories set on items.'}
              </span>
            )}
            {targetItems.length > 0 && (
              <span className='text-sm text-muted-foreground'>
                {targetItems.length} item{targetItems.length !== 1 ? 's' : ''} selected
              </span>
            )}
          </div>

          <div className='flex flex-col gap-2'>
            <div className='flex items-center gap-2'>
              <Label className='text-xs text-muted-foreground'>Custom properties</Label>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={addRow}
                className='h-8 gap-1'>
                <Plus className='h-4 w-4' />
                Add property
              </Button>
            </div>
            <p className='text-xs text-muted-foreground'>
              Applied set replaces existing custom properties on selected items.
            </p>

            <div className='flex flex-col gap-2 h-[250px] overflow-auto'>
              {rows.map((row) => (
                <div key={row.id} className='flex flex-wrap items-center gap-2'>
                  <Input
                    placeholder='Key'
                    value={row.key}
                    onChange={(e) => updateRow(row.id, { key: e.target.value })}
                    className='w-[140px] font-mono text-sm'
                  />
                  <Select
                    value={row.type}
                    onValueChange={(v) => updateRow(row.id, { type: v as PropType })}>
                    <SelectTrigger className='w-[100px]'>
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
                  {row.type === 'boolean' ? (
                    <Select
                      value={row.value === 'true' ? 'true' : 'false'}
                      onValueChange={(v) => updateRow(row.id, { value: v })}>
                      <SelectTrigger className='w-[100px]'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='true'>true</SelectItem>
                        <SelectItem value='false'>false</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      placeholder={row.type === 'number' ? '0' : 'Default Value'}
                      type={row.type === 'number' ? 'number' : 'text'}
                      value={row.value}
                      onChange={(e) => updateRow(row.id, { value: e.target.value })}
                      className='w-[120px]'
                    />
                  )}
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className='h-8 w-8 text-muted-foreground hover:text-destructive'
                    onClick={() => removeRow(row.id)}
                    aria-label='Remove property'>
                    <Trash2 className='h-4 w-4' />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className='flex items-center gap-2'>
            <Button
              type='button'
              onClick={handleApply}
              disabled={!canApply || applying}
              data-testid='bulk-custom-props-apply'>
              {applying ? 'Applying…' : 'Apply to selected items'}
            </Button>
            {hasDuplicateKeys && (
              <span className='text-sm text-destructive'>Remove duplicate keys</span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
