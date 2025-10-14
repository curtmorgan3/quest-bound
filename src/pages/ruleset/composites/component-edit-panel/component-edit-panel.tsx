import { useComponents } from '@/lib/compass-api';
import { colorBlack } from '@/palette';
import { useParams } from 'react-router-dom';
import { ActionEdit } from './action-edit';
import { PositionEdit } from './position-edit';
import { StyleEdit } from './style-edit';

export const ComponentEditPanel = () => {
  const { compositeId } = useParams();
  const { components, updateComponents } = useComponents(compositeId);
  let selectedComponents = components.filter((c) => c.selected);

  if (selectedComponents.length === 0) return null;

  // multiple components selected and all are locked
  if (selectedComponents.length > 1) {
    selectedComponents = selectedComponents.filter((c) => !c.locked);
  }

  const handleUpdate = (key: string, value: number | string | boolean | null) => {
    updateComponents(
      selectedComponents
        .filter((c) => (key === 'locked' ? true : !c.locked))
        .map((c) => ({
          id: c.id,
          [key]: value,
        })),
    );
  };

  return (
    <div
      className='w-[240px] h-[100vh] flex flex-col gap-2 items-center p-2'
      style={{ position: 'absolute', right: 0, backgroundColor: colorBlack }}>
      {selectedComponents.length > 0 ? (
        <>
          <PositionEdit components={selectedComponents} handleUpdate={handleUpdate} />
          <StyleEdit components={selectedComponents} handleUpdate={handleUpdate} />
          <ActionEdit components={selectedComponents} handleUpdate={handleUpdate} />
        </>
      ) : (
        <p className='text-xs'>All selected components are locked</p>
      )}
    </div>
  );
};
