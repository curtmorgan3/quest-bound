import { Button, Input, Label } from '@/components';
import { useExportRuleset, useRulesets } from '@/lib/compass-api';
import type { Ruleset } from '@/types';
import { Download, Trash } from 'lucide-react';
import { useState } from 'react';

interface RulesetSettingsProps {
  activeRuleset: Ruleset;
}

export const RulesetSettings = ({ activeRuleset }: RulesetSettingsProps) => {
  const { updateRuleset } = useRulesets();
  const { exportRuleset } = useExportRuleset(activeRuleset.id);

  const [title, setTitle] = useState(activeRuleset.title);
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    await updateRuleset(activeRuleset.id, { title });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLoading(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        await updateRuleset(activeRuleset.id, { image: base64String });
        setLoading(false);
        e.target.value = '';
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex items-end gap-4'>
        <div className='flex flex-col gap-2 max-w-sm flex-1'>
          <Label htmlFor='ruleset-title'>Title</Label>
          <Input id='ruleset-title' value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <Button
          className='gap-2 w-[50px]'
          variant='outline'
          onClick={exportRuleset}
          disabled={loading}>
          <Download className='h-4 w-4' />
        </Button>
      </div>

      {activeRuleset.image ? (
        <div className='flex gap-2'>
          <img
            className='h-[124px] object-cover rounded-lg cursor-pointer'
            src={activeRuleset.image}
            alt={activeRuleset.title}
            onClick={() => document.getElementById('image-settings-ruleset-image-upload')?.click()}
          />
          <Button
            variant='ghost'
            disabled={loading}
            onClick={() => updateRuleset(activeRuleset.id, { image: null })}>
            <Trash />
          </Button>
        </div>
      ) : (
        <div
          className='h-[124px] w-[124px] bg-muted flex items-center justify-center rounded-lg text-3xl cursor-pointer'
          onClick={() => document.getElementById('image-settings-ruleset-image-upload')?.click()}>
          <span className='text-sm'>{loading ? 'Loading' : 'Upload Image'}</span>
        </div>
      )}

      <input
        id='image-settings-ruleset-image-upload'
        className='hidden'
        type='file'
        accept='image/*'
        onChange={handleImageChange}
      />

      <Button
        className='w-sm'
        onClick={handleUpdate}
        disabled={loading || title === activeRuleset.title}>
        Update
      </Button>
    </div>
  );
};
