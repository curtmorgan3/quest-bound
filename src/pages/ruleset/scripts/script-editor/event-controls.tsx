import { Button } from '@/components';
import { useRulesets } from '@/lib/compass-api';
import { colorPrimary } from '@/palette';
import type { RollFn, Script } from '@/types';
import { Drumstick, Shirt, Zap } from 'lucide-react';

interface EventControls {
  entityId?: string | null;
  entityType: Script['entityType'];
  executeActionEvent: (
    actionId: string,
    characterId: string,
    targetId: string | null,
    eventType: 'on_activate' | 'on_deactivate',
    roll?: RollFn | undefined,
  ) => Promise<void>;
  executeItemEvent: (
    itemId: string,
    characterId: string,
    eventType: string,
    roll?: RollFn | undefined,
  ) => Promise<void>;
}

export const EventControls = ({
  executeActionEvent,
  executeItemEvent,
  entityId,
  entityType,
}: EventControls) => {
  const { testCharacter } = useRulesets();

  const handleOnActivate = () => {
    if (!entityId) return;
    if (entityType === 'action') {
      executeActionEvent(entityId, testCharacter.id, null, 'on_activate');
    } else {
      executeItemEvent(entityId, testCharacter.id, 'on_activate');
    }
  };

  const handleOnEquip = () => {
    if (!entityId) return;
    executeItemEvent(entityId, testCharacter.id, 'on_equip');
  };

  const handleOnUnequip = () => {
    if (!entityId) return;
    executeItemEvent(entityId, testCharacter.id, 'on_unequip');
  };

  const handleOnConsume = () => {
    if (!entityId) return;
    executeItemEvent(entityId, testCharacter.id, 'on_consume');
  };

  return (
    <div className='items-center rounded-md border bg-muted/20 flex flex-col w-[20%] min-w-[200px] p-2 gap-3 overflow-y-auto'>
      <div className='flex flex-col gap-2 justify-center'>
        <Button
          className='w-[160px]'
          onClick={handleOnActivate}
          disabled={!testCharacter}
          variant='outline'
          title='Run this script’s on_activate function as the test character'>
          <Zap className='h-4 w-4' />
          on_activate
        </Button>
        {entityType === 'item' && (
          <>
            <Button
              className='w-[160px]'
              onClick={handleOnEquip}
              disabled={!testCharacter}
              variant='outline'
              title='Run this script’s on_equip function as the test character'>
              <Shirt className='h-4 w-4' style={{ color: colorPrimary }} />
              on_equip
            </Button>
            <Button
              className='w-[160px]'
              onClick={handleOnUnequip}
              disabled={!testCharacter}
              variant='outline'
              title='Run this script’s on_unequip function as the test character'>
              <Shirt className='h-4 w-4' />
              on_unequip
            </Button>
            <Button
              className='w-[160px]'
              onClick={handleOnConsume}
              disabled={!testCharacter}
              variant='outline'
              title='Run this script’s on_consume function as the test character'>
              <Drumstick className='h-4 w-4' />
              on_consume
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
