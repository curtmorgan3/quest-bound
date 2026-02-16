import { AttributeLookup } from '@/lib/compass-api';
import type { Attribute } from '@/types';

interface ConditionalRenderEdit {
  attributeId?: string | null;
  onSelect: (attr: Attribute | null) => void;
  onDelete: () => void;
}

export const ConditionalRenderEdit = ({
  attributeId,
  onSelect,
  onDelete,
}: ConditionalRenderEdit) => {
  return (
    <AttributeLookup
      label='Conditional Render'
      value={attributeId}
      onSelect={onSelect}
      onDelete={onDelete}
      filterType={'boolean'}
    />
  );
};
