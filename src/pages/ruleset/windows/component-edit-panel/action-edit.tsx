import { useComponents } from '@/lib/compass-api';
import { expandDeleteIds } from '@/lib/compass-planes/sheet-editor/component-world-geometry';
import { colorPrimary } from '@/palette';
import { WindowEditorContext } from '@/stores';
import type { Component } from '@/types';
import { Copy, Group, Lock, Trash, Ungroup } from 'lucide-react';
import { useContext } from 'react';
import { useParams } from 'react-router-dom';
import { valueIfAllAreEqual } from './utils';

interface Props {
  components: Array<Component>;
  handleUpdate: (key: string, value: number | string | boolean | null) => void;
}

const MIXED_VALUE_LABEL = '-';

export const ActionEdit = ({ components, handleUpdate }: Props) => {
  const { windowId } = useParams();
  const { createComponents, deleteComponent, components: allComponents } = useComponents(windowId);
  const {
    groupSelectedComponents,
    ungroupSelectedComponents,
    canGroupSelected,
    canUngroupSelected,
  } = useContext(WindowEditorContext);

  const locked = valueIfAllAreEqual(components, 'locked') as string | boolean;

  const handleLock = () => {
    handleUpdate('locked', !locked);
  };

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
    const ids = components.filter((c) => !c.locked).map((c) => c.id);
    for (const id of expandDeleteIds(allComponents, ids)) {
      deleteComponent(id);
    }
  };

  return (
    <div className='flex-col w-full flex flex-col gap-3 pb-2 border-b-1'>
      <p className='text-sm'>Actions</p>

      <div className='w-full flex flex-row gap-4 items-end'>
        <Copy className={`text-xs h-[18px] w-[18px] cursor-pointer`} onClick={handleCopy} />

        <Group
          className={`text-xs h-[18px] w-[18px] cursor-${canGroupSelected ? 'pointer' : 'not-allowed'}`}
          style={{
            color: canGroupSelected ? colorPrimary : 'unset',
            opacity: canGroupSelected ? 1 : 0.45,
          }}
          onClick={() => {
            if (canGroupSelected) groupSelectedComponents();
          }}
        />
        <Ungroup
          className={`text-xs h-[18px] w-[18px] cursor-${canUngroupSelected ? 'pointer' : 'not-allowed'}`}
          style={{
            color: canUngroupSelected ? colorPrimary : 'unset',
            opacity: canUngroupSelected ? 1 : 0.45,
          }}
          onClick={() => {
            if (canUngroupSelected) ungroupSelectedComponents();
          }}
        />
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
