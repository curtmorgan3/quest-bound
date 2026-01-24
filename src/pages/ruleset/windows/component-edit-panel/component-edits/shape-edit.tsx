import { getComponentData } from '@/lib/compass-planes/utils';
import { WindowEditorContext } from '@/stores';
import type { Component, ShapeComponentData } from '@/types';
import { useContext } from 'react';
import { EditPanelInput } from '../component-edit-panel-input';

interface Props {
  components: Array<Component>;
}

const MIXED_VALUE_LABEL = '-';

export const ShapeEdit = ({ components }: Props) => {
  const { updateComponents } = useContext(WindowEditorContext);
  let value: string | number | null = null;

  for (const component of components) {
    if (value === MIXED_VALUE_LABEL) break;

    const data = getComponentData(component) as ShapeComponentData;
    if (value === null) {
      value = data.sides;
    } else if (data.sides !== value) {
      value = MIXED_VALUE_LABEL;
    }
  }

  const handleUpdate = (value: number | string) => {
    const sides = parseInt(value.toString());
    updateComponents(
      components.map((c) => ({
        id: c.id,
        data: JSON.stringify({
          ...JSON.parse(c.data),
          sides,
        }),
      })),
    );
  };

  return (
    <EditPanelInput
      number
      disabled={value === MIXED_VALUE_LABEL}
      label='Sides'
      value={value ? parseInt(value.toString()) : '-'}
      step={1}
      onChange={handleUpdate}
      min={3}
      max={20}
    />
  );
};
