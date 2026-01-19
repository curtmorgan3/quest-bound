import { Button, ImageUpload, Input, Label } from '@/components';
import { useExportRuleset, useFonts, useRulesets } from '@/lib/compass-api';
import type { Ruleset } from '@/types';
import { Download, Trash, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface RulesetSettingsProps {
  activeRuleset: Ruleset;
}

export const RulesetSettings = ({ activeRuleset }: RulesetSettingsProps) => {
  const { updateRuleset } = useRulesets();
  const { exportRuleset } = useExportRuleset(activeRuleset.id);
  const { fonts, createFont, deleteFont } = useFonts(activeRuleset.id);

  const [title, setTitle] = useState(activeRuleset.title);
  const [fontLoading, setFontLoading] = useState(false);
  const fontInputRef = useRef<HTMLInputElement>(null);

  const handleUpdate = async () => {
    await updateRuleset(activeRuleset.id, { title });
  };

  useEffect(() => {
    if (title === activeRuleset.title) return;
    setTimeout(() => {
      handleUpdate();
    }, 500);
  }, [title]);

  const handleFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFontLoading(true);
      try {
        await createFont(file);
      } catch (error) {
        console.error('Failed to upload font:', error);
      } finally {
        setFontLoading(false);
        if (fontInputRef.current) {
          fontInputRef.current.value = '';
        }
      }
    }
  };

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

      <div className='flex flex-col gap-3'>
        <Label>Fonts</Label>
        <div className='flex flex-col gap-2'>
          {fonts.map((font) => (
            <div
              key={font.id}
              className='flex items-center justify-between bg-muted px-3 py-2 rounded-md'>
              <span className='text-sm'>{font.label}</span>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => deleteFont(font.id)}
                className='h-8 w-8 p-0'>
                <Trash className='h-4 w-4 text-destructive' />
              </Button>
            </div>
          ))}
        </div>
        <Button
          variant='outline'
          className='gap-2 w-fit'
          disabled={fontLoading}
          onClick={() => fontInputRef.current?.click()}>
          <Upload className='h-4 w-4' />
          {fontLoading ? 'Uploading...' : 'Upload Font'}
        </Button>
        <input
          ref={fontInputRef}
          type='file'
          accept='.ttf,.otf,.woff,.woff2'
          className='hidden'
          onChange={handleFontUpload}
        />
      </div>
    </div>
  );
};
