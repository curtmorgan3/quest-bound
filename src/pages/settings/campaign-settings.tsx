import {
  DescriptionEditor,
  ImageUpload,
  Input,
  Label,
} from '@/components';
import { useCampaigns } from '@/lib/compass-api';
import type { Campaign } from '@/types';
import { useEffect, useState } from 'react';

interface CampaignSettingsProps {
  activeCampaign: Campaign;
}

export const CampaignSettings = ({ activeCampaign }: CampaignSettingsProps) => {
  const { updateCampaign } = useCampaigns();
  const [name, setName] = useState(activeCampaign.label ?? '');
  const [description, setDescription] = useState(activeCampaign.description ?? '');

  useEffect(() => {
    setName(activeCampaign.label ?? '');
    setDescription(activeCampaign.description ?? '');
  }, [activeCampaign.id, activeCampaign.label, activeCampaign.description]);

  const handleUpdateName = async () => {
    await updateCampaign(activeCampaign.id, { label: name });
  };

  const handleUpdateDescription = async () => {
    await updateCampaign(activeCampaign.id, { description });
  };

  useEffect(() => {
    if (name === (activeCampaign.label ?? '')) return;
    const timeout = setTimeout(() => {
      handleUpdateName();
    }, 500);
    return () => clearTimeout(timeout);
  }, [name]);

  useEffect(() => {
    if (description === (activeCampaign.description ?? '')) return;
    const timeout = setTimeout(() => {
      handleUpdateDescription();
    }, 500);
    return () => clearTimeout(timeout);
  }, [description]);

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-col gap-2 max-w-sm'>
        <Label htmlFor='campaign-name'>Name</Label>
        <Input
          id='campaign-name'
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder='Campaign name'
        />
      </div>

      <div className='flex w-full justify-between gap-8'>
        <ImageUpload
          image={activeCampaign.image}
          alt={activeCampaign.label ?? 'Campaign'}
          onRemove={() => updateCampaign(activeCampaign.id, { assetId: null })}
          onUpload={(assetId) => updateCampaign(activeCampaign.id, { assetId })}
          rulesetId={activeCampaign.rulesetId}
        />

        <DescriptionEditor
          className='flex-1'
          value={description}
          onChange={setDescription}
        />
      </div>
    </div>
  );
};
