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
import { AttributeLookup } from '@/lib/compass-api';
import {
  fireExternalComponentChangeEvent,
  getComponentData,
  updateComponentData,
} from '@/lib/compass-planes/utils';
import type { Component, GraphComponentData, GraphVariant } from '@/types';

interface GraphDataEditProps {
  components: Array<Component>;
  updateComponents: (updates: Array<{ id: string; data: string }>) => Promise<void>;
}

const VARIANTS: { value: GraphVariant; label: string }[] = [
  { value: 'horizontal-linear', label: 'Horizontal linear' },
  { value: 'vertical-linear', label: 'Vertical linear' },
  { value: 'circular', label: 'Circular' },
];

export const GraphDataEdit = ({ components, updateComponents }: GraphDataEditProps) => {
  const editableComponents = components.filter((c) => !c.locked);
  const first = editableComponents[0];
  const firstData = first ? (getComponentData(first) as GraphComponentData) : null;

  const setNumeratorAttributeId = (attributeId: string | null) => {
    const updates = editableComponents.map((c) => ({
      id: c.id,
      data: updateComponentData(c.data, { numeratorAttributeId: attributeId }),
    }));
    updateComponents(updates);
    fireExternalComponentChangeEvent({ updates: updates as any });
  };

  const setDenominatorAttributeId = (attributeId: string | null) => {
    const updates = editableComponents.map((c) => ({
      id: c.id,
      data: updateComponentData(c.data, { denominatorAttributeId: attributeId }),
    }));
    updateComponents(updates);
    fireExternalComponentChangeEvent({ updates: updates as any });
  };

  const setDenominatorValue = (value: number | null) => {
    const updates = editableComponents.map((c) => ({
      id: c.id,
      data: updateComponentData(c.data, { denominatorValue: value }),
    }));
    updateComponents(updates);
    fireExternalComponentChangeEvent({ updates: updates as any });
  };

  const setGraphVariant = (value: GraphVariant) => {
    const updates = editableComponents.map((c) => ({
      id: c.id,
      data: updateComponentData(c.data, { graphVariant: value }),
    }));
    updateComponents(updates);
    fireExternalComponentChangeEvent({ updates: updates as any });
  };

  const setInverseFill = (inverseFill: boolean) => {
    const updates = editableComponents.map((c) => ({
      id: c.id,
      data: updateComponentData(c.data, { inverseFill }),
    }));
    updateComponents(updates);
    fireExternalComponentChangeEvent({ updates: updates as any });
  };

  const setAnimationDebounceSeconds = (seconds: number) => {
    const value = Math.max(0, Number(seconds));
    const updates = editableComponents.map((c) => ({
      id: c.id,
      data: updateComponentData(c.data, { animationDebounceSeconds: value }),
    }));
    updateComponents(updates);
    fireExternalComponentChangeEvent({ updates: updates as any });
  };

  const setSegmentIndex = (value: number | null) => {
    const updates = editableComponents.map((c) => ({
      id: c.id,
      data: updateComponentData(c.data, { segmentIndex: value }),
    }));
    updateComponents(updates);
    fireExternalComponentChangeEvent({ updates: updates as any });
  };

  const setSegmentCount = (value: number | null) => {
    const updates = editableComponents.map((c) => ({
      id: c.id,
      data: updateComponentData(c.data, { segmentCount: value }),
    }));
    updateComponents(updates);
    fireExternalComponentChangeEvent({ updates: updates as any });
  };

  if (editableComponents.length === 0) return null;

  return (
    <div className='flex flex-col gap-3 pb-2 border-b border-border'>
      <div className='flex flex-col gap-2'>
        <Label>Graph style</Label>
        <Select
          value={firstData?.graphVariant ?? 'horizontal-linear'}
          onValueChange={(v) => setGraphVariant(v as GraphVariant)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VARIANTS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className='flex items-center gap-2'>
          <Checkbox
            id='graph-inverse-fill'
            checked={firstData?.inverseFill ?? false}
            onCheckedChange={(checked) => setInverseFill(checked === true)}
          />
          <Label htmlFor='graph-inverse-fill' className='text-sm font-normal cursor-pointer'>
            Invert fill
          </Label>
        </div>
      </div>
      <div className='flex flex-col gap-2'>
        <Label htmlFor='graph-animation-debounce'>Animation delay (seconds)</Label>
        <Input
          id='graph-animation-debounce'
          type='number'
          min={0}
          step={0.1}
          value={
            typeof firstData?.animationDebounceSeconds === 'number'
              ? firstData.animationDebounceSeconds
              : 0.15
          }
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!Number.isNaN(v)) setAnimationDebounceSeconds(v);
          }}
          className='h-9'
        />
      </div>
      <AttributeLookup
        label='Numerator (number)'
        value={firstData?.numeratorAttributeId ?? null}
        onSelect={(attr) => setNumeratorAttributeId(attr.id)}
        onDelete={() => setNumeratorAttributeId(null)}
        filterType='number'
      />
      <AttributeLookup
        label='Denominator (number attribute)'
        value={firstData?.denominatorAttributeId ?? null}
        onSelect={(attr) => setDenominatorAttributeId(attr.id)}
        onDelete={() => setDenominatorAttributeId(null)}
        filterType='number'
      />
      <div className='flex flex-col gap-2'>
        <Label htmlFor='graph-denominator-value' className='text-xs text-muted-foreground'>
          Denominator (fixed value when no attribute)
        </Label>
        <Input
          id='graph-denominator-value'
          type='number'
          min={0}
          step={1}
          placeholder='e.g. 100'
          value={firstData?.denominatorValue != null ? String(firstData.denominatorValue) : ''}
          onChange={(e) => {
            const raw = e.target.value.trim();
            if (raw === '') {
              setDenominatorValue(null);
              return;
            }
            const v = parseFloat(raw);
            if (!Number.isNaN(v) && v >= 0) setDenominatorValue(v);
          }}
          className='h-[20px] rounded-[4px] p-1'
        />
      </div>
      <div className='flex flex-col gap-2'>
        <Label className='text-xs text-muted-foreground'>
          Segment (for multiple components as one graph)
        </Label>
        <div className='flex gap-2 items-center'>
          <div className='flex flex-col gap-1 flex-1'>
            <Label htmlFor='graph-segment-index' className='text-xs text-muted-foreground'>
              Index
            </Label>
            <Input
              id='graph-segment-index'
              type='number'
              min={1}
              step={1}
              placeholder='1'
              value={firstData?.segmentIndex != null ? String(firstData.segmentIndex) : ''}
              onChange={(e) => {
                const raw = e.target.value.trim();
                if (raw === '') {
                  setSegmentIndex(null);
                  return;
                }
                const v = parseInt(raw, 10);
                if (!Number.isNaN(v) && v >= 1) setSegmentIndex(v);
              }}
              className='h-[20px] rounded-[4px] p-1'
            />
          </div>
          <span className='text-muted-foreground pt-5 text-xs'>of</span>
          <div className='flex flex-col gap-1 flex-1'>
            <Label htmlFor='graph-segment-count' className='text-xs text-muted-foreground'>
              Total
            </Label>
            <Input
              id='graph-segment-count'
              type='number'
              min={1}
              step={1}
              placeholder='1'
              value={firstData?.segmentCount != null ? String(firstData.segmentCount) : ''}
              onChange={(e) => {
                const raw = e.target.value.trim();
                if (raw === '') {
                  setSegmentCount(null);
                  return;
                }
                const v = parseInt(raw, 10);
                if (!Number.isNaN(v) && v >= 1) setSegmentCount(v);
              }}
              className='h-[20px] rounded-[4px] p-1'
            />
          </div>
        </div>
      </div>
    </div>
  );
};
