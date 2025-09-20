import { Button, Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components';
import { useRulesets } from '@/lib/compass-api';
import { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { AttributeChart } from './attributes/attribute-chart';
import { BaseCreate } from './create';
import { ItemChart } from './items/item-chart';

export const Ruleset = ({ page }: { page?: 'attributes' | 'items' | 'actions' | 'charts' }) => {
  const { activeRuleset } = useRulesets();
  const [, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(false);

  if (!page) {
    return <Navigate to={`/rulesets/${activeRuleset?.id}/attributes`} replace={true} />;
  }

  const renderChart = () => {
    switch (page) {
      case 'attributes':
        return <AttributeChart />;
      case 'items':
        return <ItemChart />;
      case 'actions':
        return <div>Actions</div>;
      case 'charts':
        return <div>Charts</div>;
      default:
        return <div>Not Found</div>;
    }
  };

  return (
    <div className='flex flex-col p-4 gap-4'>
      <Dialog
        open={open}
        onOpenChange={(open) => {
          if (!open) setSearchParams({});
          setOpen(open);
        }}>
        <DialogTrigger asChild>
          <Button className='w-[180px]' onClick={() => setOpen(true)}>
            New
          </Button>
        </DialogTrigger>

        {renderChart()}

        <DialogContent className='min-w-[600px] max-w-[80vw] min-h-[50vh]'>
          <DialogTitle className='hidden'>Quick Create</DialogTitle>
          <BaseCreate
            onCreate={(isEditMode) => {
              if (isEditMode) {
                setOpen(false);
                setSearchParams({});
              }
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
