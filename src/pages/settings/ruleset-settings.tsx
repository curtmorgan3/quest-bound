import { Button, ImageUpload, Input, Label } from '@/components';
import { useExportRuleset, useRulesets } from '@/lib/compass-api';
import type { Ruleset } from '@/types';
import { Download } from 'lucide-react';
import { useEffect, useState } from 'react';

interface RulesetSettingsProps {
  activeRuleset: Ruleset;
}

export const RulesetSettings = ({ activeRuleset }: RulesetSettingsProps) => {
  const { updateRuleset } = useRulesets();
  const { exportRuleset } = useExportRuleset(activeRuleset.id);

  const [title, setTitle] = useState(activeRuleset.title);

  const handleUpdate = async () => {
    await updateRuleset(activeRuleset.id, { title });
  };

  useEffect(() => {
    if (title === activeRuleset.title) return;
    setTimeout(() => {
      handleUpdate();
    }, 500);
  }, [title]);

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex items-end gap-4'>
        <div className='flex flex-col gap-2 max-w-sm flex-1'>
          <Label htmlFor='ruleset-title'>Title</Label>
          <Input id='ruleset-title' value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <Button className='gap-2 w-[50px]' variant='outline' onClick={exportRuleset}>
          <Download className='h-4 w-4' />
        </Button>
      </div>

      <ImageUpload
        image={activeRuleset.image}
        alt={activeRuleset.title}
        onRemove={() => updateRuleset(activeRuleset.id, { assetId: null })}
        onUpload={(assetId) => updateRuleset(activeRuleset.id, { assetId })}
        rulesetId={activeRuleset.id}
      />
    </div>
  );
};
