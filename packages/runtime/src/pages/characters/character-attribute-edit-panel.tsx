import { MarkdownPanel } from '@/components/composites/markdown-panel';
import { NumberInput } from '@/components/composites/number-input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { CharacterContext } from '@quest-bound/runtime/context';
import { PopoverScrollContainerContext } from '@/stores/context/popover-scroll-container-context';
import { useContext, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export function CharacterAttributeEditPanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const editAttributeId = searchParams.get('editAttributeId');
  const readOnly = searchParams.get('readOnly') === 'true';

  const { characterAttributes, updateCharacterAttribute } = useContext(CharacterContext);
  const attribute = editAttributeId
    ? (characterAttributes.find((a) => a.attributeId === editAttributeId) ?? null)
    : null;

  const open = !!editAttributeId;

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSearchParams((prev) => {
        const updated = new URLSearchParams(prev);
        updated.delete('editAttributeId');
        updated.delete('readOnly');
        return updated;
      });
    }
  };

  const handleChange = (value: string | number | boolean) => {
    if (attribute) {
      updateCharacterAttribute(attribute.id, { value });
    }
  };

  const [showingDescription, setShowingDescription] = useState(false);
  const sheetContentRef = useRef<HTMLDivElement>(null);

  const description = attribute?.description?.trim();

  if (!open) return null;

  const renderValueControl = () => {
    if (!attribute) return null;

    switch (attribute.type) {
      case 'string':
        return (
          <MarkdownPanel
            value={typeof attribute.value === 'string' ? attribute.value : ''}
            onChange={handleChange}
            placeholder={`Enter ${attribute.title}...`}
            className='min-h-0 flex-1'
            readOnly={readOnly}
          />
        );

      case 'number':
        return (
          <NumberInput
            value={typeof attribute.value === 'number' ? attribute.value : ''}
            wheelMin={attribute.min}
            wheelMax={attribute.max}
            inputMin={attribute.min}
            inputMax={attribute.max}
            disabled={readOnly}
            onChange={(val) => handleChange(val === '' ? 0 : val)}
            className='h-9 w-full rounded-md border border-input px-3'
          />
        );

      case 'boolean': {
        const checked = attribute.value === true;
        return (
          <div className='flex items-center gap-3'>
            <Checkbox
              id='attr-boolean'
              checked={checked}
              disabled={readOnly}
              onCheckedChange={(next) => handleChange(next === true)}
            />
            <Label htmlFor='attr-boolean' className='cursor-pointer text-sm font-normal'>
              {attribute.title}
            </Label>
          </div>
        );
      }

      case 'list': {
        const options = attribute.options ?? [];
        const currentValue = typeof attribute.value === 'string' ? attribute.value : '';
        const selectedIndex = options.findIndex((o) => o === currentValue);
        const selectValue = selectedIndex >= 0 ? String(selectedIndex) : '';
        return (
          <Select
            value={selectValue}
            disabled={readOnly}
            onValueChange={(val) => {
              const index = parseInt(val, 10);
              if (index >= 0 && index < options.length) {
                handleChange(options[index]);
              }
            }}>
            <SelectTrigger className='h-9 w-full'>
              <SelectValue placeholder='Select…' />
            </SelectTrigger>
            <SelectContent>
              {options.map((option, i) => (
                <SelectItem key={i} value={String(i)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }

      default:
        return null;
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        ref={sheetContentRef}
        side='right'
        className='flex w-full flex-col gap-4 p-2 sm:max-w-lg'>
        <PopoverScrollContainerContext.Provider value={sheetContentRef}>
          <SheetHeader>
            <SheetTitle>{attribute?.title ?? 'Edit Attribute'}</SheetTitle>
            {description && (
              <button
                type='button'
                className='self-start text-xs text-muted-foreground underline-offset-2 hover:underline'
                onClick={() => setShowingDescription((prev) => !prev)}>
                {showingDescription ? 'Back to value' : 'Description'}
              </button>
            )}
          </SheetHeader>
          {showingDescription && description ? (
            <MarkdownPanel value={description} readOnly className='min-h-0 flex-1' />
          ) : (
            renderValueControl()
          )}
        </PopoverScrollContainerContext.Provider>
      </SheetContent>
    </Sheet>
  );
}
