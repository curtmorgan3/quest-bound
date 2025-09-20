import { Button, Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components';
import { useRulesets } from '@/lib/compass-api';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { ActionChart } from './actions';
import { AttributeChart } from './attributes/attribute-chart';
import { ChartSelect } from './charts';
import { BaseCreate } from './create';
import { ItemChart } from './items/item-chart';

export const Ruleset = ({ page }: { page?: 'attributes' | 'items' | 'actions' | 'charts' }) => {
  const { activeRuleset } = useRulesets();
  const [searchParams, setSearchParams] = useSearchParams();
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
        return <ActionChart />;
      case 'charts':
        return <ChartSelect />;
      default:
        return <div>Not Found</div>;
    }
  };

  return (
    <div className='flex flex-col p-4 gap-4'>
      <Dialog
        open={open}
        onOpenChange={(open) => {
          if (!open) {
            searchParams.set('edit', '');
            setSearchParams(searchParams);
          }
          setOpen(open);
        }}>
        <div className='flex gap-2'>
          <DialogTrigger asChild>
            <Button className='w-[180px]' onClick={() => setOpen(true)}>
              New
            </Button>
          </DialogTrigger>
          {page === 'charts' && searchParams.get('chart') && (
            <DialogTrigger asChild>
              <Button
                className='w-[50px]'
                variant='outline'
                onClick={() => {
                  const chartId = searchParams.get('chart');
                  searchParams.set('edit', chartId ?? '');
                  setSearchParams(searchParams);
                  setOpen(true);
                }}>
                <Pencil />
              </Button>
            </DialogTrigger>
          )}
        </div>

        {renderChart()}

        <DialogContent className='min-w-[600px] max-w-[80vw] min-h-[50vh]'>
          <DialogTitle className='hidden'>Quick Create</DialogTitle>
          <BaseCreate
            onCreate={(isEditMode) => {
              if (isEditMode) {
                setOpen(false);
                searchParams.set('edit', '');
                setSearchParams(searchParams);
              }
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
