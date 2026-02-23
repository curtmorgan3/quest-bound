import {
  Badge,
  Button,
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  useArchetypeCustomProperties,
  useActiveRuleset,
} from '@/lib/compass-api';
import type { Archetype, CustomPropertyType } from '@/types';
import { RotateCcw, Search, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { RGBColor } from 'react-color';
import { CustomPropertyPicker } from '../items/custom-property-picker';

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

function getEffectiveDefault(
  acpDefault: string | number | boolean | undefined,
  cpDefault: string | number | boolean | undefined,
  type: CustomPropertyType,
): string | number | boolean {
  if (acpDefault !== undefined) return acpDefault;
  if (cpDefault !== undefined) return cpDefault;
  return type === 'number' ? 0 : type === 'boolean' ? false : type === 'color' ? '' : '';
}

interface ManageArchetypeCustomPropertiesModalProps {
  archetype: Archetype;
  trigger?: React.ReactNode;
}

export function ManageArchetypeCustomPropertiesModal({
  archetype,
  trigger,
}: ManageArchetypeCustomPropertiesModalProps) {
  const { activeRuleset } = useActiveRuleset();
  const {
    archetypeCustomProperties,
    customProperties,
    addArchetypeCustomProperty,
    removeArchetypeCustomProperty,
    updateArchetypeCustomProperty,
  } = useArchetypeCustomProperties(archetype.id);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [labelFilter, setLabelFilter] = useState('');

  const assignedIds = customProperties.map((cp) => cp.id);

  const filteredProperties = useMemo(() => {
    if (!labelFilter.trim()) return customProperties;
    const q = labelFilter.toLowerCase().trim();
    return customProperties.filter((cp) =>
      cp.label.toLowerCase().includes(q),
    );
  }, [customProperties, labelFilter]);

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          {trigger ?? (
            <Button variant='outline' size='sm' aria-label='Manage custom properties'>
              <SlidersHorizontal className='h-4 w-4' />
            </Button>
          )}
        </SheetTrigger>
        <SheetContent
          side='right'
          className='flex w-full flex-col gap-0 sm:max-w-md'>
          <SheetHeader className='shrink-0 border-b px-6 py-4'>
            <SheetTitle>Custom properties — {archetype.name}</SheetTitle>
            <SheetDescription>
              Custom properties assigned to this archetype are created on new characters.
            </SheetDescription>
          </SheetHeader>
          <div className='flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-6'>
            <div className='flex items-center justify-between'>
              <span className='text-sm font-medium'>Assigned properties</span>
              <Button
                variant='outline'
                size='sm'
                className='gap-1'
                onClick={() => setPickerOpen(true)}
                disabled={!activeRuleset}>
                Add property
              </Button>
            </div>
            {customProperties.length > 0 && (
              <div className='relative'>
                <Search className='absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  placeholder='Filter by label'
                  value={labelFilter}
                  onChange={(e) => setLabelFilter(e.target.value)}
                  className='h-8 pl-8'
                />
              </div>
            )}
            {customProperties.length === 0 ? (
              <p className='text-sm text-muted-foreground py-4'>
                No custom properties assigned. Add one to define values for new characters.
              </p>
            ) : (
              <div className='flex min-h-0 flex-1 flex-col gap-2 overflow-auto'>
                {filteredProperties.length === 0 ? (
                  <p className='text-sm text-muted-foreground py-4'>
                    No properties match the filter.
                  </p>
                ) : (
                filteredProperties.map((cp) => {
                  const acp = archetypeCustomProperties.find(
                    (r) => r.customPropertyId === cp.id,
                  );
                  const hasOverride = acp?.defaultValue !== undefined;
                  const effectiveDefault = acp
                    ? getEffectiveDefault(acp.defaultValue, cp.defaultValue, cp.type)
                    : getEffectiveDefault(undefined, cp.defaultValue, cp.type);
                  return (
                    <div
                      key={cp.id}
                      className='flex flex-col gap-2 rounded-md border bg-card px-3 py-2'>
                      <div className='flex items-center justify-between'>
                        <span>
                          {cp.label}
                          <span className='ml-2 text-xs text-muted-foreground'>
                            ({cp.type})
                          </span>
                          {hasOverride && (
                            <Badge
                              variant='secondary'
                              className='ml-2 text-xs font-normal'>
                              Override
                            </Badge>
                          )}
                        </span>
                        {acp && (
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-8 w-8 text-muted-foreground hover:text-destructive'
                            onClick={() => removeArchetypeCustomProperty(acp.id)}
                            aria-label={`Remove ${cp.label}`}>
                            <Trash2 className='h-4 w-4' />
                          </Button>
                        )}
                      </div>
                      {acp && (
                        <div className='flex flex-col gap-1'>
                          <div className='flex items-center justify-between'>
                            <Label className='text-xs text-muted-foreground'>
                              Default value
                              {hasOverride && ' (override)'}
                            </Label>
                            {hasOverride && (
                              <Button
                                variant='ghost'
                                size='sm'
                                className='h-7 gap-1 text-xs text-muted-foreground hover:text-foreground'
                                onClick={() =>
                                  updateArchetypeCustomProperty(acp.id, {
                                    defaultValue: undefined,
                                  })
                                }>
                                <RotateCcw className='h-3 w-3' />
                                Reset to Custom Property Default
                              </Button>
                            )}
                          </div>
                          {cp.type === 'boolean' ? (
                            <Select
                              value={String(effectiveDefault)}
                              onValueChange={(v) =>
                                updateArchetypeCustomProperty(acp.id, {
                                  defaultValue: v === 'true',
                                })
                              }>
                              <SelectTrigger className='h-8'>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value='false'>false</SelectItem>
                                <SelectItem value='true'>true</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : cp.type === 'color' ? (
                            <div className='flex items-center gap-2'>
                              <RulesetColorPicker
                                color={(effectiveDefault as string) || undefined}
                                label='Default color'
                                asIcon
                                disableAlpha
                                onUpdate={(color: RGBColor) =>
                                  updateArchetypeCustomProperty(acp.id, {
                                    defaultValue: rgbToHex(color.r, color.g, color.b),
                                  })
                                }
                              />
                              <div
                                className='h-8 w-8 shrink-0 rounded border border-border bg-muted'
                                style={{
                                  backgroundColor: (effectiveDefault as string) || undefined,
                                }}
                              />
                              <Input
                                value={(effectiveDefault as string) || ''}
                                onChange={(e) =>
                                  updateArchetypeCustomProperty(acp.id, {
                                    defaultValue: e.target.value,
                                  })
                                }
                                placeholder='#000000'
                                className='h-8 flex-1 max-w-[120px]'
                              />
                            </div>
                          ) : cp.type === 'number' ? (
                            <Input
                              type='number'
                              value={String(effectiveDefault)}
                              onChange={(e) =>
                                updateArchetypeCustomProperty(acp.id, {
                                  defaultValue:
                                    e.target.value === '' ? 0 : Number(e.target.value),
                                })
                              }
                              placeholder='0'
                              className='h-8'
                            />
                          ) : (
                            <Input
                              value={String(effectiveDefault)}
                              onChange={(e) =>
                                updateArchetypeCustomProperty(acp.id, {
                                  defaultValue: e.target.value,
                                })
                              }
                              placeholder='Default'
                              className='h-8'
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
      <CustomPropertyPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        excludeIds={assignedIds}
        onSelect={async (id) => {
          await addArchetypeCustomProperty(id);
          setPickerOpen(false);
        }}
      />
    </>
  );
}
