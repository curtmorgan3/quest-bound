import { Button, DescriptionEditor, ImageUpload, Input, Label } from '@/components';
import { RulesetColorPicker } from '@/components/composites/ruleset-color-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useExportRuleset, useFonts, useRulesets } from '@/lib/compass-api';
import type { Ruleset } from '@/types';
import { Download, Plus, Trash, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { RGBColor } from 'react-color';

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

interface RulesetSettingsProps {
  activeRuleset: Ruleset;
}

export const RulesetSettings = ({ activeRuleset }: RulesetSettingsProps) => {
  const { updateRuleset } = useRulesets();
  const { exportRuleset } = useExportRuleset(activeRuleset.id);
  const { fonts, createFont, deleteFont } = useFonts(activeRuleset.id);

  const [title, setTitle] = useState(activeRuleset.title);
  const [version, setVersion] = useState(activeRuleset.version);
  const [description, setDescription] = useState(activeRuleset.description);
  const [fontLoading, setFontLoading] = useState(false);
  const [paletteAddColor, setPaletteAddColor] = useState<string | undefined>(undefined);
  const fontInputRef = useRef<HTMLInputElement>(null);

  const palette = activeRuleset.palette ?? [];

  const handleUpdateTitle = async () => {
    await updateRuleset(activeRuleset.id, { title });
  };

  const handleUpdateVersion = async () => {
    await updateRuleset(activeRuleset.id, { version });
  };

  const handleUpdateDescription = async () => {
    await updateRuleset(activeRuleset.id, { description });
  };

  useEffect(() => {
    if (title === activeRuleset.title) return;
    const timeout = setTimeout(() => {
      handleUpdateTitle();
    }, 500);
    return () => clearTimeout(timeout);
  }, [title]);

  useEffect(() => {
    if (version === activeRuleset.version) return;
    const timeout = setTimeout(() => {
      handleUpdateVersion();
    }, 500);
    return () => clearTimeout(timeout);
  }, [version]);

  useEffect(() => {
    if (description === activeRuleset.description) return;
    const timeout = setTimeout(() => {
      handleUpdateDescription();
    }, 500);
    return () => clearTimeout(timeout);
  }, [description]);

  const handleAddPaletteColor = (color: RGBColor) => {
    const hex = rgbToHex(color.r, color.g, color.b);
    setPaletteAddColor(hex);
  };

  const handleConfirmAddPaletteColor = async () => {
    if (!paletteAddColor) return;
    const next = [...palette, paletteAddColor];
    await updateRuleset(activeRuleset.id, { palette: next });
    setPaletteAddColor(undefined);
  };

  const handleRemovePaletteColor = async (index: number) => {
    const next = palette.filter((_, i) => i !== index);
    await updateRuleset(activeRuleset.id, { palette: next });
  };

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

        <div className='flex flex-col gap-2 w-32'>
          <Label htmlFor='ruleset-version'>Version</Label>
          <Input
            id='ruleset-version'
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder='1.0.0'
          />
        </div>

        <Button className='gap-2 w-[50px]' variant='outline' onClick={exportRuleset}>
          <Download className='h-4 w-4' />
        </Button>
      </div>

      <div className='flex w-full justify-between gap-8'>
        <ImageUpload
          image={activeRuleset.image}
          alt={activeRuleset.title}
          onRemove={() => updateRuleset(activeRuleset.id, { assetId: null })}
          onUpload={(assetId) => updateRuleset(activeRuleset.id, { assetId })}
          onSetUrl={(url) => updateRuleset(activeRuleset.id, { image: url, assetId: null })}
          rulesetId={activeRuleset.id}
        />

        <DescriptionEditor className='flex-1' value={description} onChange={setDescription} />
      </div>

      <div className='flex flex-col gap-3'>
        <Label>Palette</Label>
        <div className='flex flex-col gap-4'>
          <div className='flex flex-wrap items-center gap-2'>
            {palette.map((color, index) => (
              <div
                key={`${color}-${index}`}
                className='group flex items-center gap-0.5 rounded-md border border-border overflow-hidden bg-muted'>
                <div
                  className='h-8 w-8 shrink-0 border-r border-border'
                  style={{ backgroundColor: color }}
                  title={color}
                />
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => handleRemovePaletteColor(index)}
                  className='h-8 w-6 p-0 opacity-70 hover:opacity-100'
                  aria-label={`Remove ${color}`}>
                  <Trash className='h-3.5 w-3.5 text-destructive' />
                </Button>
              </div>
            ))}
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant='outline' size='sm' className='gap-2 h-8 w-[50px]'>
                <Plus className='h-4 w-4' />
              </Button>
            </PopoverTrigger>
            <PopoverContent className='w-auto p-0 border-0' align='start'>
              <div className='p-2'>
                <RulesetColorPicker
                  color={paletteAddColor}
                  disableAlpha
                  onUpdate={handleAddPaletteColor}
                />
                <Button
                  className='w-full mt-2'
                  size='sm'
                  disabled={!paletteAddColor}
                  onClick={handleConfirmAddPaletteColor}>
                  Add to palette
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

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
