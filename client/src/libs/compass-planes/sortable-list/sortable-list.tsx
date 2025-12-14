import { generateId } from '@/libs/compass-web-utils';
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import React, { ReactNode } from 'react';

interface SortableListProps {
  children?: ReactNode;
  onSort?: React.Dispatch<React.SetStateAction<any[]>>;
}

export function SortableList({ children, onSort }: SortableListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const ids: string[] = [];

  const childrenWithIds = React.Children.map(children, (child, index) => {
    const planesSortableListId = generateId();
    ids.push(planesSortableListId);

    return React.cloneElement(child as React.ReactElement<any>, {
      id: planesSortableListId,
      key: planesSortableListId,
    });
  });

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {childrenWithIds}
      </SortableContext>
    </DndContext>
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!active || !over) return;

    const activeId = active.id;
    const droppedId = over.id;

    const currentOrder = active.data?.current?.sortable?.items ?? [];

    if (active.id !== over.id) {
      onSort?.((prev) => {
        const oldIndex = currentOrder.indexOf(activeId);
        const newIndex = currentOrder.indexOf(droppedId);

        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }
}
