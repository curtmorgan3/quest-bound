import { Input, Label } from '@/components';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AttributeLookup } from '@/lib/compass-api';
import { getComponentData } from '@/lib/compass-planes/utils';
import type { Component, ComponentData } from '@/types';

type TooltipPlacement = NonNullable<ComponentData['tooltipPlacement']>;

const PLACEMENT_OPTIONS: { value: TooltipPlacement; label: string }[] = [
  { value: 'top', label: 'Top' },
  { value: 'right', label: 'Right' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'left', label: 'Left' },
];

interface ComponentTooltipSettingsProps {
  component: Component;
  onTooltipValueChange: (value: string) => void;
  onTooltipAttributeIdChange: (id: string | null) => void;
  onTooltipPlacementChange: (placement: TooltipPlacement) => void;
}

export function ComponentTooltipSettings({
  component,
  onTooltipValueChange,
  onTooltipAttributeIdChange,
  onTooltipPlacementChange,
}: ComponentTooltipSettingsProps) {
  const data = getComponentData(component);

  return (
    <Accordion type='single' collapsible>
      <AccordionItem value='tooltip' className='border-none'>
        <AccordionTrigger className='py-2 text-xs text-muted-foreground hover:no-underline hover:text-foreground'>
          Tooltip
        </AccordionTrigger>
        <AccordionContent className='flex flex-col gap-3 pb-2'>
          <div className='flex flex-col gap-2'>
            <Label htmlFor='component-tooltip-value' className='text-xs text-muted-foreground'>
              Tooltip Text
            </Label>
            <Input
              id='component-tooltip-value'
              className='h-8 rounded-[4px]'
              placeholder='Tooltip text…'
              value={data.tooltipValue ?? ''}
              onChange={(e) => onTooltipValueChange(e.target.value)}
            />
          </div>
          <AttributeLookup
            label='Tooltip Attribute'
            value={data.tooltipAttributeId}
            onSelect={(attr) => onTooltipAttributeIdChange(attr.id)}
            onDelete={() => onTooltipAttributeIdChange(null)}
          />
          <div className='flex flex-col gap-2'>
            <Label htmlFor='component-tooltip-placement' className='text-xs text-muted-foreground'>
              Placement
            </Label>
            <Select
              value={data.tooltipPlacement ?? 'top'}
              onValueChange={(v) => onTooltipPlacementChange(v as TooltipPlacement)}>
              <SelectTrigger id='component-tooltip-placement' className='h-8 w-full'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLACEMENT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
