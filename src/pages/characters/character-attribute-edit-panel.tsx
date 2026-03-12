import { MarkdownPanel } from '@/components/composites/markdown-panel';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { CharacterContext } from '@/stores/context/character-context';
import { useContext } from 'react';
import { useSearchParams } from 'react-router-dom';

export function CharacterAttributeEditPanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const editAttributeId = searchParams.get('editAttributeId');

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
        return updated;
      });
    }
  };

  const handleChange = (value: string) => {
    if (attribute) {
      updateCharacterAttribute(attribute.id, { value });
    }
  };

  const isTextAttribute = attribute?.type === 'string';
  const textValue = typeof attribute?.value === 'string' ? attribute.value : '';

  if (!open) return null;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side='right' className='flex w-full flex-col gap-4 sm:max-w-lg'>
        <SheetHeader>
          <SheetTitle>{attribute?.title ?? 'Edit Attribute'}</SheetTitle>
        </SheetHeader>
        {isTextAttribute ? (
          <MarkdownPanel
            value={textValue}
            onChange={handleChange}
            placeholder={`Enter ${attribute?.title ?? 'value'}...`}
            className='min-h-0 flex-1'
          />
        ) : (
          <p className='text-sm text-muted-foreground'>
            This attribute type cannot be edited here.
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
}
