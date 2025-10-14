import { useComponents } from '@/lib/compass-api';
import { colorBlack } from '@/palette';
import { useParams } from 'react-router-dom';
import { ActionEdit } from './action-edit';
import { PositionEdit } from './position-edit';
import { StyleEdit } from './style-edit';

export const ComponentEditPanel = () => {
  const { compositeId } = useParams();
  const { components } = useComponents(compositeId);
  const selectedComponents = components.filter((c) => c.selected);

  if (selectedComponents.length === 0) return null;

  return (
    <div
      className='w-[240px] h-[100vh] flex flex-col gap-2 items-center p-2'
      style={{ position: 'absolute', right: 0, backgroundColor: colorBlack }}>
      <PositionEdit components={selectedComponents} />
      <StyleEdit components={selectedComponents} />
      <ActionEdit components={selectedComponents} />
    </div>
  );
};
