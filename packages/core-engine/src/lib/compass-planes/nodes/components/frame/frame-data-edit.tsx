import { Input } from '@/components/ui/input';
import type { ComponentUpdate } from '@/lib/compass-api';
import {
  fireExternalComponentChangeEvent,
  getComponentData,
  updateComponentData,
} from '@/lib/compass-planes/utils';
import type { Component, FrameComponentData } from '@/types';
import { useEffect, useState } from 'react';

interface FrameDataEditProps {
  components: Array<Component>;
  updateComponents: (updates: Array<ComponentUpdate>) => Promise<void>;
}

export const FrameDataEdit = ({
  components,
  updateComponents,
}: FrameDataEditProps) => {
  const [urlValue, setUrlValue] = useState('');

  const editableComponents = components.filter((c) => !c.locked);

  const firstComponentData = components[0]
    ? (getComponentData(components[0]) as FrameComponentData)
    : null;
  const currentUrl = firstComponentData?.url ?? '';

  useEffect(() => {
    setUrlValue(currentUrl);
  }, [currentUrl]);

  const handleUrlBlur = async () => {
    if (editableComponents.length === 0) return;

    const urlToSave = urlValue.trim() || undefined;

    const updates = editableComponents.map((component) => ({
      id: component.id,
      data: updateComponentData(component.data, { url: urlToSave }),
    }));

    await updateComponents(updates);
    fireExternalComponentChangeEvent({ updates });
  };

  return (
    <div className='flex flex-col w-full gap-3 pb-2 border-b-1'>
      <p className='text-sm'>Frame URL</p>
      <div className='flex flex-col gap-1'>
        <label className='text-xs text-muted-foreground'>URL</label>
        <Input
          type='url'
          placeholder='https://example.com'
          value={urlValue}
          onChange={(e) => setUrlValue(e.target.value)}
          onBlur={handleUrlBlur}
          disabled={editableComponents.length === 0}
          onKeyDown={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
};
