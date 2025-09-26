import { Grid, type CellRendererProps, type GridColumn } from '@/components';
import { useAttributes } from '@/lib/compass-api/hooks/rulesets/use-attributes';
import type { Attribute } from '@/types';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChartControls } from '../components';
import { attributeChartColumns } from './attribute-columns';

const typeLabels = {
  number: 'Number',
  string: 'Text',
  boolean: 'Boolean',
  enum: 'List',
};

const valueTypes = {
  Number: 'number',
  Text: 'string',
  Boolean: 'boolean',
  List: 'enum',
};

export const AttributeChart = () => {
  const { attributes, deleteAttribute, updateAttribute } = useAttributes();
  const [, setSearchParams] = useSearchParams();

  const rows: Partial<Attribute>[] = useMemo(
    () =>
      attributes.map((a) => {
        return {
          ...a,
          type: typeLabels[a.type] as keyof typeof typeLabels,
          defaultValue: a.type === 'number' ? parseInt(a.defaultValue.toString()) : a.defaultValue,
        };
      }),
    [attributes],
  );

  const columns: GridColumn<Attribute>[] = [...attributeChartColumns]
    .map((c) => {
      if (c.field !== 'controls') return c;
      return {
        ...c,
        cellRenderer: (params: CellRendererProps<Attribute>) => (
          <ChartControls
            id={params.data.id}
            handleDelete={handleDelete}
            handleEdit={(id) => setSearchParams({ edit: id })}
          />
        ),
      };
    })
    .sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0));

  const handleUpdate = (data: Partial<Attribute>) => {
    if (!data.id) {
      console.error('No ID found for attribute');
      return;
    }

    const newType = data.type
      ? (valueTypes[data.type as keyof typeof valueTypes] as Attribute['type'])
      : undefined;

    updateAttribute(data.id, {
      ...data,
      defaultValue: newType === 'number' ? Number(data.defaultValue) : data.defaultValue,
      type: newType,
    });
  };

  const handleDelete = (id: string) => {
    deleteAttribute(id);
  };

  return <Grid rowData={rows} colDefs={columns} onCellValueChanged={handleUpdate} />;
};
