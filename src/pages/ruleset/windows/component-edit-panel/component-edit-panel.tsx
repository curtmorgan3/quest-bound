import { useComponents } from '@/lib/compass-api';
import { colorBlack } from '@/palette';
import { useParams } from 'react-router-dom';
import { ActionEdit } from './action-edit';
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
  const handleStyleUpdate = (key: string | string[], value: number | string | boolean | null) => {
    const toUpdate = selectedComponents.filter((c) => (key === 'locked' ? true : !c.locked));

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

  if (viewMode) return null;

  return (
    <div
      className='w-[240px] h-[100vh] flex flex-col gap-2 items-center p-2'
      style={{ position: 'absolute', right: 0, backgroundColor: colorBlack }}>
      {selectedComponents.length > 0 ? (
        <>
          <PositionEdit components={selectedComponents} handleUpdate={handleUpdate} />
          <StyleEdit components={selectedComponents} handleUpdate={handleStyleUpdate} />
          <ActionEdit components={selectedComponents} handleUpdate={handleUpdate} />
        </>
      ) : (
        <p className='text-xs'>All selected components are locked</p>
      )}
    </div>
  );
};
