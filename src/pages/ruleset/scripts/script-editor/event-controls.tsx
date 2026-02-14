import { Button } from '@/components';
import { useRulesets } from '@/lib/compass-api';
import { Play } from 'lucide-react';

interface EventControls {
  handleFireOnActivate: () => void;
}

export const EventControls = ({ handleFireOnActivate }: EventControls) => {
  const { testCharacter } = useRulesets();

  return (
    <div className='items-center rounded-md border bg-muted/20 flex flex-col w-[20%] min-w-[200px] p-2 gap-3 overflow-y-auto'>
      <div>
        <Button
          className='w-[160px]'
          onClick={handleFireOnActivate}
          disabled={!testCharacter}
          variant='outline'
          title='Run this script’s on_activate function as the test character'>
          <Play className='h-4 w-4' />
          on_activate
        </Button>
      </div>
    </div>
  );
};
