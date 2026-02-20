import { DescriptionEditor, ImageUpload, Input, Label } from '@/components';
import { useAssets, useWorlds } from '@/lib/compass-api';
import type { World } from '@/types';
import { useEffect, useState } from 'react';

interface WorldSettingsProps {
  world: World;
}

export const WorldSettings = ({ world }: WorldSettingsProps) => {
  const { updateWorld } = useWorlds();
  const { assets } = useAssets(null);
  const [label, setLabel] = useState(world.label);
  const [description, setDescription] = useState(world.description ?? '');

  const image =
    world.assetId && assets
      ? assets.find((a) => a.id === world.assetId)?.data ?? world.image ?? null
      : world.image ?? null;

  useEffect(() => {
    setLabel(world.label);
  }, [world.label]);

  useEffect(() => {
    setDescription(world.description ?? '');
  }, [world.description]);

  useEffect(() => {
    if (label === world.label) return;
    const timeout = setTimeout(() => {
      void updateWorld(world.id, { label });
    }, 500);
    return () => clearTimeout(timeout);
  }, [label, world.id, world.label, updateWorld]);

  useEffect(() => {
    if (description === (world.description ?? '')) return;
    const timeout = setTimeout(() => {
      void updateWorld(world.id, { description });
    }, 500);
    return () => clearTimeout(timeout);
  }, [description, world.id, world.description, updateWorld]);

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-col gap-2 max-w-sm'>
        <Label htmlFor='world-name'>Name</Label>
        <Input
          id='world-name'
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder='World name'
        />
      </div>

      <div className='flex w-full justify-between gap-8'>
        <div className='flex flex-col gap-2'>
          <Label>Image</Label>
          <ImageUpload
            image={image}
            alt={world.label}
            onRemove={() => void updateWorld(world.id, { assetId: null })}
            onUpload={(assetId) => void updateWorld(world.id, { assetId })}
            onSetUrl={(url) => void updateWorld(world.id, { image: url, assetId: null })}
            rulesetId={null}
          />
        </div>
        <DescriptionEditor
          className='flex-1'
          value={description}
          onChange={setDescription}
        />
      </div>
    </div>
  );
};
