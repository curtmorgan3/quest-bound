import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '@/components';
import type { ComponentUpdate } from '@/lib/compass-api';
import { useComponents, useComposites } from '@/lib/compass-api';
import { ComponentTypes, isGroupLikeComponentType } from '@/lib/compass-planes/nodes';
import {
  expandDeleteIds,
  expandSelectedComponentsWithDescendants,
  remapCopiedComponentsForPaste,
} from '@/lib/compass-planes/sheet-editor/component-world-geometry';
import { colorPrimary } from '@/palette';
import { WindowEditorContext } from '@/stores';
import type { Component } from '@/types';
import { ArrowUpFromDot, BookMarked, Copy, Group, Lock, Trash, Ungroup } from 'lucide-react';
import { useContext, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { valueIfAllAreEqual } from './utils';

function updatesToSelectOnly(components: Component[], id: string): ComponentUpdate[] {
  return components
    .map((c) => ({ id: c.id, selected: c.id === id }))
    .filter((u) => {
      const prev = components.find((c) => c.id === u.id);
      return prev != null && (prev.selected ?? false) !== u.selected;
    });
}

interface Props {
  components: Array<Component>;
  handleUpdate: (key: string, value: number | string | boolean | null) => void;
}

const MIXED_VALUE_LABEL = '-';

export const ActionEdit = ({ components, handleUpdate }: Props) => {
  const { windowId } = useParams();
  const { createComponents, deleteManyComponents, components: allComponents } = useComponents(windowId);
  const { saveOrUpdateComposite } = useComposites();
  const [saveCompositeOpen, setSaveCompositeOpen] = useState(false);
  const [compositeName, setCompositeName] = useState('');
  const {
    groupSelectedComponents,
    ungroupSelectedComponents,
    canGroupSelected,
    canUngroupSelected,
    updateComponents,
  } = useContext(WindowEditorContext);

  const locked = valueIfAllAreEqual(components, 'locked') as string | boolean;

  const { hasGroupedSelection, canSelectGroup, parentGroupId } = useMemo(() => {
    const unlocked = components.filter((c) => !c.locked);
    const hasParent = unlocked.some((c) => Boolean(c.parentComponentId));
    if (!hasParent) {
      return {
        hasGroupedSelection: false,
        canSelectGroup: false,
        parentGroupId: null as string | null,
      };
    }
    const allChildren = unlocked.length > 0 && unlocked.every((c) => Boolean(c.parentComponentId));
    const parentIds = new Set(
      unlocked.map((c) => c.parentComponentId).filter((id): id is string => Boolean(id)),
    );
    const onlyParent = parentIds.size === 1 ? [...parentIds][0] : null;
    const parent =
      onlyParent != null
        ? allComponents.find((c) => c.id === onlyParent && isGroupLikeComponentType(c.type))
        : undefined;
    return {
      hasGroupedSelection: true,
      canSelectGroup: Boolean(allChildren && parent),
      parentGroupId: parent?.id ?? null,
    };
  }, [allComponents, components]);

  const singleGroupRoot =
    components.length === 1 &&
    components[0] &&
    components[0].type === ComponentTypes.GROUP &&
    !components[0].locked
      ? components[0]
      : null;

  const soleSelectedIsContainer =
    components.length === 1 && components[0]?.type === ComponentTypes.CONTAINER;

  const handleLock = () => {
    handleUpdate('locked', !locked);
  };

  const handleCopy = () => {
    if (components.length === 0) return;
    const expanded = expandSelectedComponentsWithDescendants(allComponents, components);
    if (expanded.length === 0) return;
    void createComponents(remapCopiedComponentsForPaste(expanded, 20, 20));
  };

  const handleDelete = () => {
    const ids = components.filter((c) => !c.locked).map((c) => c.id);
    void deleteManyComponents(expandDeleteIds(allComponents, ids));
  };

  const handleSelectGroup = () => {
    if (!canSelectGroup || !parentGroupId) return;
    const updates = updatesToSelectOnly(allComponents, parentGroupId);
    if (updates.length) updateComponents(updates);
  };

  return (
    <div className='flex-col w-full flex flex-col gap-3 pb-2 border-b-1'>
      <p className='text-sm'>Actions</p>

      <div className='w-full flex flex-row gap-4 items-end'>
        <Copy className={`text-xs h-[18px] w-[18px] cursor-pointer`} onClick={handleCopy} />

        {hasGroupedSelection ? (
          <ArrowUpFromDot
            aria-label='Select group'
            className={`text-xs h-[18px] w-[18px] cursor-${canSelectGroup ? 'pointer' : 'not-allowed'}`}
            style={{
              opacity: canSelectGroup ? 1 : 0.45,
            }}
            onClick={() => {
              if (canSelectGroup) handleSelectGroup();
            }}
          />
        ) : (
          <Group
            className={`text-xs h-[18px] w-[18px] cursor-${canGroupSelected ? 'pointer' : 'not-allowed'}`}
            style={{
              opacity: canGroupSelected ? 1 : 0.45,
            }}
            onClick={() => {
              if (canGroupSelected) groupSelectedComponents();
            }}
          />
        )}
        {!soleSelectedIsContainer ? (
          <Ungroup
            className={`text-xs h-[18px] w-[18px] cursor-${canUngroupSelected ? 'pointer' : 'not-allowed'}`}
            style={{
              opacity: canUngroupSelected ? 1 : 0.45,
            }}
            onClick={() => {
              if (canUngroupSelected) ungroupSelectedComponents();
            }}
          />
        ) : null}
        {singleGroupRoot ? (
          <BookMarked
            aria-label='Save as composite'
            className='text-xs h-[18px] w-[18px] cursor-pointer'
            onClick={() => {
              setCompositeName('');
              setSaveCompositeOpen(true);
            }}
          />
        ) : null}

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

      <Dialog open={saveCompositeOpen} onOpenChange={setSaveCompositeOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Save as composite</DialogTitle>
          </DialogHeader>
          <p className='text-muted-foreground text-sm'>
            Adds this group to the composite library for this ruleset. Stamped copies stay
            independent of the template.
          </p>
          <Input
            autoFocus
            placeholder='Composite name'
            value={compositeName}
            onChange={(e) => setCompositeName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && compositeName.trim()) {
                void saveOrUpdateComposite(singleGroupRoot!.id, compositeName.trim());
                setSaveCompositeOpen(false);
              }
            }}
          />
          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => setSaveCompositeOpen(false)}>
              Cancel
            </Button>
            <Button
              type='button'
              disabled={!compositeName.trim()}
              onClick={() => {
                void saveOrUpdateComposite(singleGroupRoot!.id, compositeName.trim());
                setSaveCompositeOpen(false);
              }}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
