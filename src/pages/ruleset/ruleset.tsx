import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components';
import { useActiveRuleset, useExportChart } from '@/lib/compass-api';
import { Download, Pencil } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { ActionChart } from './actions';
import { AttributeChart } from './attributes/attribute-chart';
import { ChartSelect } from './charts';
import { Export, Import } from './components';
import { BaseCreate } from './create';
import { ItemChart } from './items/item-chart';
import { WindowSelect } from './windows';

export const Ruleset = ({
  page,
}: {
  page?: 'attributes' | 'items' | 'actions' | 'charts' | 'windows';
}) => {
  const { activeRuleset } = useActiveRuleset();
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const { exportChartAsCSV } = useExportChart();

  const chartId = searchParams.get('chart');

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
      case 'windows':
        return <WindowSelect />;
      default:
        return <p>Not Found</p>;
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
          {page === 'charts' && chartId && (
            <div className='flex gap-2'>
              <DialogTrigger asChild>
                <Button
                  className='w-[50px]'
                  variant='outline'
                  onClick={() => {
                    searchParams.set('edit', chartId);
                    setSearchParams(searchParams);
                    setOpen(true);
                  }}>
                  <Pencil />
                </Button>
              </DialogTrigger>
              <Button onClick={() => exportChartAsCSV(chartId)} variant='outline'>
                <Download className='h-4 w-4' />
              </Button>
            </div>
          )}
          {page !== 'charts' && page !== 'windows' && <Export type={page} />}
          {page !== 'charts' && page !== 'windows' && <Import type={page} />}
        </div>

        {renderChart()}

        <DialogContent className='min-w-[600px] max-w-[80vw] min-h-[50vh]'>
          <DialogTitle className='hidden'>Quick Create</DialogTitle>
          <DialogDescription className='hidden'>Quick Create</DialogDescription>
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
