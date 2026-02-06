import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AttributeLookup, useComponents } from '@/lib/compass-api';
import { ComponentTypes } from '@/lib/compass-planes/nodes';
import {
  CheckboxDataEdit,
  GraphDataEdit,
  FrameDataEdit,
  InventoryDataEdit,
} from '@/lib/compass-planes/nodes/components';
import { ImageDataEdit } from '@/lib/compass-planes/nodes/components/image';
import { getComponentData } from '@/lib/compass-planes/utils';
import { colorBlack } from '@/palette';
import type { RGBColor } from 'react-color';
import { useParams } from 'react-router-dom';
import { ActionEdit } from './action-edit';
import { TextEdit } from './component-edits';
import { ShapeEdit } from './component-edits/shape-edit';
import { PositionEdit } from './position-edit';
import { StyleEdit } from './style-edit';

export const ComponentEditPanel = ({ viewMode }: { viewMode: boolean }) => {
  const { windowId } = useParams();
  const { components, updateComponents } = useComponents(windowId);
  let selectedComponents = components.filter((c) => c.selected);

  if (selectedComponents.length === 0) return null;

  // multiple components selected and all are locked
  if (selectedComponents.length > 1) {
    selectedComponents = selectedComponents.filter((c) => !c.locked);
  }

  const handleUpdate = (key: string | string[], value: number | string | boolean | null) => {
    const toUpdate = selectedComponents.filter((c) => (key === 'locked' ? true : !c.locked));

    if (typeof key === 'string') {
      updateComponents(
        toUpdate.map((c) => ({
          id: c.id,
          [key]: value,
        })),
      );
    } else {
      const updated = [...toUpdate];
      for (const component of updated) {
        for (const k of key) {
          Object.assign(component, { [k]: value });
        }
      }
      updateComponents(updated);
    }
  };

  const handleStyleUpdate = (
    key: string | string[],
    value: number | string | boolean | null | RGBColor,
  ) => {
    const toUpdate = selectedComponents.filter((c) => (key === 'locked' ? true : !c.locked));

    if (Object.hasOwn(value as any, 'r')) {
      const color = { ...(value as any) } as RGBColor;
      value = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
    }

    if (typeof key === 'string') {
      updateComponents(
        toUpdate.map((c) => ({
          id: c.id,
          style: JSON.stringify({
            ...JSON.parse(c.style),
            [key]: value,
          }),
        })),
      );
    } else {
      const updated = [...toUpdate];
      for (const component of updated) {
        for (const k of key) {
          Object.assign(component, {
            style: JSON.stringify({
              ...JSON.parse(component.style),
              [k]: value,
            }),
          });
        }
      }
      updateComponents(updated);
    }
  };

  const setConditionalRenderAttributeId = (id: string | null) => {
    const toUpdate = selectedComponents.filter((c) => !c.locked);
    updateComponents(
      toUpdate.map((c) => ({
        id: c.id,
        data: JSON.stringify({
          ...JSON.parse(c.data),
          conditionalRenderAttributeId: id,
        }),
      })),
    );
  };

  if (viewMode) return null;

  // Check if all selected components are image type
  const allAreImages =
    selectedComponents.length > 0 &&
    selectedComponents.every((c) => c.type === ComponentTypes.IMAGE);

  const allAreText =
    selectedComponents.length > 0 &&
    selectedComponents.every(
      (c) =>
        c.type === ComponentTypes.TEXT ||
        c.type === ComponentTypes.INPUT ||
        c.type === ComponentTypes.CONTENT,
    );

  const allAreShapes =
    selectedComponents.length > 0 &&
    selectedComponents.every((c) => c.type === ComponentTypes.SHAPE);

  const allAreCheckboxes =
    selectedComponents.length > 0 &&
    selectedComponents.every((c) => c.type === ComponentTypes.CHECKBOX);

  const allAreInventories =
    selectedComponents.length > 0 &&
    selectedComponents.every((c) => c.type === ComponentTypes.INVENTORY);

  const allAreGraphs =
    selectedComponents.length > 0 &&
    selectedComponents.every((c) => c.type === ComponentTypes.GRAPH);

  const allAreFrames =
    selectedComponents.length > 0 &&
    selectedComponents.every((c) => c.type === ComponentTypes.FRAME);

  return (
    <div
      className='w-[240px] h-[100vh] flex flex-col gap-2 items-center p-2'
      style={{ position: 'absolute', right: 0, backgroundColor: colorBlack, overflow: 'auto' }}>
      {selectedComponents.length > 0 ? (
        <Tabs defaultValue='style' className='w-full flex flex-col'>
          <TabsList className='w-full'>
            <TabsTrigger value='style' className='flex-1'>
              Style
            </TabsTrigger>
            <TabsTrigger value='data' className='flex-1'>
              Data
            </TabsTrigger>
          </TabsList>
          <TabsContent value='style' className='w-full flex flex-col gap-2 mt-2'>
            <ActionEdit components={selectedComponents} handleUpdate={handleUpdate} />
            <PositionEdit components={selectedComponents} handleUpdate={handleUpdate} />
            <StyleEdit components={selectedComponents} handleUpdate={handleStyleUpdate} />
            {allAreText && (
              <TextEdit components={selectedComponents} handleUpdate={handleStyleUpdate} />
            )}
            {allAreShapes && <ShapeEdit components={selectedComponents} />}
          </TabsContent>
          <TabsContent value='data' className='w-full flex flex-col gap-4 mt-2'>
            {selectedComponents.length === 1 &&
              selectedComponents[0].type !== ComponentTypes.INVENTORY &&
              selectedComponents[0].type !== ComponentTypes.GRAPH &&
              selectedComponents[0].type !== ComponentTypes.FRAME && (
                <AttributeLookup
                  value={selectedComponents[0].attributeId}
                  onSelect={(attr) => handleUpdate('attributeId', attr.id)}
                  onDelete={() => handleUpdate('attributeId', null)}
                  filterType={allAreCheckboxes ? 'boolean' : undefined}
                />
              )}
            {selectedComponents.length === 1 && (
              <AttributeLookup
                label='Conditional Render'
                value={getComponentData(selectedComponents[0]).conditionalRenderAttributeId}
                onSelect={(attr) => setConditionalRenderAttributeId(attr.id)}
                onDelete={() => setConditionalRenderAttributeId(null)}
                filterType={'boolean'}
              />
            )}
            {allAreImages && (
              <ImageDataEdit
                components={selectedComponents}
                handleUpdate={handleUpdate}
                updateComponents={updateComponents}
              />
            )}

            {allAreCheckboxes && (
              <CheckboxDataEdit
                components={selectedComponents}
                handleUpdate={handleUpdate}
                updateComponents={updateComponents}
              />
            )}

            {allAreInventories && (
              <InventoryDataEdit
                components={selectedComponents}
                updateComponents={updateComponents}
              />
            )}

            {allAreGraphs && (
              <GraphDataEdit
                components={selectedComponents}
                updateComponents={updateComponents}
              />
            )}

            {allAreFrames && (
              <FrameDataEdit
                components={selectedComponents}
                updateComponents={updateComponents}
              />
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <p className='text-xs'>All selected components are locked</p>
      )}
    </div>
  );
};
