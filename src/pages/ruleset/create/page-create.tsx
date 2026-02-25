import { Checkbox, Label } from '@/components';
import type { Dispatch, SetStateAction } from 'react';

interface PageCreateProps {
  hideFromPlayerView: boolean;
  setHideFromPlayerView: Dispatch<SetStateAction<boolean>>;
}

export const PageCreate = ({
  hideFromPlayerView,
  setHideFromPlayerView,
}: PageCreateProps) => {
  return (
    <div className='flex flex-col gap-2'>
      <div className='flex items-center gap-2'>
        <Checkbox
          id='page-hide-from-player-view'
          checked={hideFromPlayerView}
          onCheckedChange={(checked) => setHideFromPlayerView(!!checked)}
        />
        <Label htmlFor='page-hide-from-player-view'>Hide from player view</Label>
      </div>
      <p className='text-xs text-muted-foreground'>
        When enabled, this page template will not be available when adding pages on the
        player-facing sheet viewer.
      </p>
    </div>
  );
};

