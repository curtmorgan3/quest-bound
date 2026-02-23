import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components';
import {
  useArchetypeCustomProperties,
  useActiveRuleset,
} from '@/lib/compass-api';
import type { Archetype } from '@/types';
import { SlidersHorizontal, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { CustomPropertyPicker } from '../items/custom-property-picker';

interface ManageArchetypeCustomPropertiesModalProps {
  archetype: Archetype;
  trigger?: React.ReactNode;
}

export function ManageArchetypeCustomPropertiesModal({
  archetype,
  trigger,
}: ManageArchetypeCustomPropertiesModalProps) {
  const { activeRuleset } = useActiveRuleset();
  const {
    archetypeCustomProperties,
    customProperties,
    addArchetypeCustomProperty,
    removeArchetypeCustomProperty,
  } = useArchetypeCustomProperties(archetype.id);
  const [pickerOpen, setPickerOpen] = useState(false);

  const assignedIds = customProperties.map((cp) => cp.id);

  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          {trigger ?? (
            <Button variant='outline' size='sm' aria-label='Manage custom properties'>
              <SlidersHorizontal className='h-4 w-4' />
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className='min-w-[400px] max-w-[90vw]'>
          <DialogTitle>Custom properties — {archetype.name}</DialogTitle>
          <p className='text-sm text-muted-foreground'>
            Custom properties assigned to this archetype are created on new characters.
          </p>
          <div className='flex flex-col gap-2'>
            <div className='flex items-center justify-between'>
              <span className='text-sm font-medium'>Assigned properties</span>
              <Button
                variant='outline'
                size='sm'
                className='gap-1'
                onClick={() => setPickerOpen(true)}
                disabled={!activeRuleset}>
                Add property
              </Button>
            </div>
            {customProperties.length === 0 ? (
              <p className='text-sm text-muted-foreground py-4'>
                No custom properties assigned. Add one to define values for new characters.
              </p>
            ) : (
              <div className='flex flex-col gap-1 max-h-[240px] overflow-auto'>
                {customProperties.map((cp) => {
                  const acp = archetypeCustomProperties.find(
                    (r) => r.customPropertyId === cp.id,
                  );
                  return (
                    <div
                      key={cp.id}
                      className='flex items-center justify-between rounded-md border px-3 py-2'>
                      <span>
                        {cp.label}
                        <span className='ml-2 text-xs text-muted-foreground'>
                          ({cp.type})
                        </span>
                      </span>
                      {acp && (
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-8 w-8 text-muted-foreground hover:text-destructive'
                          onClick={() => removeArchetypeCustomProperty(acp.id)}
                          aria-label={`Remove ${cp.label}`}>
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <CustomPropertyPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        excludeIds={assignedIds}
        onSelect={async (id) => {
          await addArchetypeCustomProperty(id);
          setPickerOpen(false);
        }}
      />
    </>
  );
}
