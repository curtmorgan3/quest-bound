import { Checkbox, Label } from '@/components';
import type { Dispatch, SetStateAction } from 'react';

interface WindowCreateProps {
  hideFromPlayerView: boolean;
  setHideFromPlayerView: Dispatch<SetStateAction<boolean>>;
}

export const WindowCreate = ({
  hideFromPlayerView,
  setHideFromPlayerView,
}: WindowCreateProps) => {
  return (
    <div className='flex flex-col gap-2'>
      <div className='flex items-center gap-2'>
        <Checkbox
          id='hide-from-player-view'
          checked={hideFromPlayerView}
          onCheckedChange={(checked) => setHideFromPlayerView(!!checked)}
        />
        <Label htmlFor='hide-from-player-view'>Hide from player view</Label>
      </div>
      <p className='text-xs text-muted-foreground'>
        When enabled, this window will not appear in the player-facing sheet viewer.
      </p>
    </div>
  );
};

