import { useComponents } from '@/lib/compass-api';
import { colorPrimary } from '@/palette';
import type { Component } from '@/types';
import { Copy, Lock, Trash } from 'lucide-react';
import { valueIfAllAreEqual } from './utils';

interface Props {
  components: Array<Component>;
  handleUpdate: (key: string, value: number | string | boolean | null) => void;
}

const MIXED_VALUE_LABEL = '-';

export const ActionEdit = ({ components, handleUpdate }: Props) => {
  const { createComponents, deleteComponent } = useComponents();

  const locked = valueIfAllAreEqual(components, 'locked') as string | boolean;
  // const groupId = valueIfAllAreEqual(components, 'groupId');

  const handleLock = () => {
    handleUpdate('locked', !locked);
  };

  // const handleGroup = () => {
  //   if (components.length < 2) return;
  //   const newGroupId = groupId === '-' || groupId === null ? crypto.randomUUID() : null;
  //   handleUpdate('groupId', newGroupId);
  // };

  const handleCopy = () => {
    createComponents(
      components.map((c) => ({
        ...c,
        id: undefined,
        x: c.x + 20,
        y: c.y + 20,
      })),
    );
  };

  const handleDelete = () => {
    for (const comp of components.filter((c) => !c.locked)) {
      deleteComponent(comp.id);
    }
  };

  return (
    <div className='flex-col w-full flex flex-col gap-3 pb-2 border-b-1'>
      <p className='text-sm'>Actions</p>

      <div className='w-full flex flex-row gap-4 items-end'>
        <Copy className={`text-xs h-[18px] w-[18px] cursor-pointer`} onClick={handleCopy} />

        {/* <Group
          className={`text-xs h-[18px] w-[18px] cursor-${components.length === 1 ? 'not-allowed' : 'pointer'}`}
          style={{
            color: groupId === MIXED_VALUE_LABEL || groupId === null ? 'unset' : colorPrimary,
          }}
          onClick={handleGroup}
        /> */}
        <Lock
          className={`text-xs h-[18px] w-[18px] cursor-pointer`}
          style={{
            color: locked === MIXED_VALUE_LABEL || locked === false ? 'unset' : colorPrimary,
          }}
          onClick={handleLock}
        />
        <Trash
          className={`text-xs h-[18px] w-[18px] cursor-${locked === MIXED_VALUE_LABEL || locked ? 'not-allowed' : 'pointer'}`}
          onClick={handleDelete}
        />
      </div>
      <div className='w-full flex flex-row gap-4 items-end'></div>
    </div>
  );
};
