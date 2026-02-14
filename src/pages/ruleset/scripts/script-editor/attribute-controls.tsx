import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAttributes, useCharacterAttributes, useRulesets } from '@/lib/compass-api';
import { colorPrimary } from '@/palette';
import type { CharacterAttribute } from '@/types';

interface AttributeControlsProps {
  scriptAttributeIds: string[];
  associatedAttributeId?: string | null;
}

export const AttributeControls = ({
  scriptAttributeIds,
  associatedAttributeId,
}: AttributeControlsProps) => {
  const { testCharacter } = useRulesets();
  const { characterAttributes, updateCharacterAttribute } = useCharacterAttributes(
    testCharacter?.id,
  );

  const { attributes: rulesetAttributes } = useAttributes();

  const usedAttributes = [
    ...characterAttributes.filter((attr) => scriptAttributeIds.includes(attr.attributeId)),
  ].sort((a, b) => a.title.localeCompare(b.title));

  const associatedAttribute = characterAttributes.find(
    (attr) => attr.attributeId === associatedAttributeId,
  );

  const handleValueChange = (attr: CharacterAttribute, newValue: string | number | boolean) => {
    updateCharacterAttribute(attr.id, { value: newValue });
  };

  const renderControl = (attr: CharacterAttribute) => {
    const id = `attr-${attr.id}`;
    const isAssociated = attr.attributeId === associatedAttributeId;

    const style = isAssociated ? { color: colorPrimary } : undefined;

    switch (attr.type) {
      case 'boolean':
        return (
          <div className='flex items-center gap-2'>
            <Checkbox
              id={id}
              checked={attr.value === true}
              onCheckedChange={(checked) => handleValueChange(attr, checked === true)}
            />
            <Label htmlFor={id} className='text-sm font-normal cursor-pointer' style={style}>
              {attr.title}
            </Label>
          </div>
        );

      case 'number':
        return (
          <div className='flex flex-col gap-1'>
            <Label htmlFor={id} className='text-sm' style={style}>
              {attr.title}
            </Label>
            <Input
              id={id}
              type='number'
              value={attr.value as number}
              min={attr.min}
              max={attr.max}
              onChange={(e) => handleValueChange(attr, parseFloat(e.target.value) || 0)}
              className='h-8'
            />
          </div>
        );

      case 'list': {
        const listOptions = rulesetAttributes.find((r) => r.id === attr.attributeId)?.options ?? [];
        return (
          <div className='flex flex-col gap-1'>
            <Label htmlFor={id} className='text-sm' style={style}>
              {attr.title}
            </Label>
            <Select
              value={(attr.value as string) ?? ''}
              onValueChange={(value) => handleValueChange(attr, value)}>
              <SelectTrigger id={id} className='h-8 w-full'>
                <SelectValue placeholder='Select…' />
              </SelectTrigger>
              <SelectContent>
                {listOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      }

      case 'string':
      default:
        return (
          <div className='flex flex-col gap-1'>
            <Label htmlFor={id} className='text-sm' style={style}>
              {attr.title}
            </Label>
            <Input
              id={id}
              type='text'
              value={attr.value as string}
              onChange={(e) => handleValueChange(attr, e.target.value)}
              className='h-8'
            />
          </div>
        );
    }
  };

  return (
    <div className='rounded-md border bg-muted/20 flex flex-col w-[30%] min-w-[265px] p-2 gap-3 overflow-y-auto'>
      {associatedAttribute ? renderControl(associatedAttribute) : null}
      {usedAttributes.length === 0 ? (
        <span className='text-sm text-muted-foreground italic'>No dependent attributes</span>
      ) : (
        usedAttributes.map((attr) => <div key={attr.id}>{renderControl(attr)}</div>)
      )}
    </div>
  );
};
