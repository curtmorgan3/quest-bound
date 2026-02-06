import { AttributeLookup } from '@/lib/compass-api';
import {
  fireExternalComponentChangeEvent,
  getComponentData,
  updateComponentData,
} from '@/lib/compass-planes/utils';
import type { Component, GraphComponentData, GraphVariant } from '@/types';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface GraphDataEditProps {
  components: Array<Component>;
  updateComponents: (updates: Array<{ id: string; data: string }>) => Promise<void>;
}

const VARIANTS: { value: GraphVariant; label: string }[] = [
  { value: 'horizontal-linear', label: 'Horizontal linear' },
  { value: 'vertical-linear', label: 'Vertical linear' },
  { value: 'circular', label: 'Circular' },
];

export const GraphDataEdit = ({
  components,
  updateComponents,
}: GraphDataEditProps) => {
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

  const setGraphVariant = (value: GraphVariant) => {
    const updates = editableComponents.map((c) => ({
      id: c.id,
      data: updateComponentData(c.data, { graphVariant: value }),
    }));
    updateComponents(updates);
    fireExternalComponentChangeEvent({ updates: updates as any });
  };

  if (editableComponents.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 pb-2 border-b border-border">
      <div className="flex flex-col gap-2">
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
      </div>
      <AttributeLookup
        label="Numerator (number)"
        value={firstData?.numeratorAttributeId ?? null}
        onSelect={(attr) => setNumeratorAttributeId(attr.id)}
        onDelete={() => setNumeratorAttributeId(null)}
        filterType="number"
      />
      <AttributeLookup
        label="Denominator (number)"
        value={firstData?.denominatorAttributeId ?? null}
        onSelect={(attr) => setDenominatorAttributeId(attr.id)}
        onDelete={() => setDenominatorAttributeId(null)}
        filterType="number"
      />
    </div>
  );
};
