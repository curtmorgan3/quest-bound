import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Checkbox,
  DescriptionEditor,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  ImageUpload,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components';
import { RulesetColorPicker } from '@/components/composites/ruleset-color-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNotifications } from '@/hooks/use-notifications';
import { useExportRuleset, useFonts, useImportRuleset, useRulesets } from '@/lib/compass-api';
import { addModuleFromZip } from '@/lib/compass-api/hooks/export/add-module-from-zip';
import { addModuleToRuleset } from '@/lib/compass-api/hooks/export/add-module-to-ruleset';
import {
  getDanglingReferencesForModuleRemoval,
  removeModuleFromRuleset,
} from '@/lib/compass-api/hooks/export/remove-module-from-ruleset';
import type { Ruleset, RulesetModuleEntry } from '@/types';
import { Download, Package, Plus, Trash, Upload } from 'lucide-react';
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
  const { updateRuleset, rulesets } = useRulesets();
  const { exportRuleset } = useExportRuleset(activeRuleset.id);
  const { importRuleset } = useImportRuleset();
  const { fonts, createFont, deleteFont } = useFonts(activeRuleset.id);
  const { addNotification } = useNotifications();
  const [addingModule, setAddingModule] = useState(false);
  const [addingModuleFromFile, setAddingModuleFromFile] = useState(false);
  const [addModuleOpen, setAddModuleOpen] = useState(false);
  const addFromFileInputRef = useRef<HTMLInputElement>(null);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [moduleToRemove, setModuleToRemove] = useState<RulesetModuleEntry | null>(null);
  const [danglingRefs, setDanglingRefs] = useState<{
    components: number;
    scripts: number;
    charts: number;
    documents: number;
    windows: number;
    attributes: number;
    actions: number;
    items: number;
  } | null>(null);
  const [removingModule, setRemovingModule] = useState(false);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [conflictDetails, setConflictDetails] = useState<
    Record<string, Array<{ id: string; title?: string }>> | null
  >(null);

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

  const modules = activeRuleset.modules ?? [];
  const availableModuleRulesets = rulesets.filter(
    (r) => r.isModule === true && r.id !== activeRuleset.id,
  );

  const handleAddModule = async (sourceRulesetId: string) => {
    setAddingModule(true);
    try {
      const result = await addModuleToRuleset({
        sourceRulesetId,
        targetRulesetId: activeRuleset.id,
      });
      setAddModuleOpen(false);
      const totalSkipped = Object.values(result.skippedByConflict).reduce((a, b) => a + b, 0);
      if (totalSkipped > 0) {
        setConflictDetails(result.skippedDetails ?? null);
        setConflictDialogOpen(true);
        addNotification('Module added. Some content was skipped due to ID conflicts.', {
          type: 'info',
        });
      } else {
        addNotification('Module added successfully.', { type: 'success' });
      }
    } catch (e) {
      addNotification((e as Error).message, { type: 'error' });
    } finally {
      setAddingModule(false);
    }
  };

  const handleIsModuleChange = async (checked: boolean) => {
    await updateRuleset(activeRuleset.id, { isModule: checked });
  };

  const handleRemoveModuleClick = async (mod: RulesetModuleEntry) => {
    setModuleToRemove(mod);
    try {
      const refs = await getDanglingReferencesForModuleRemoval(activeRuleset.id, mod.id);
      setDanglingRefs(refs);
    } catch {
      setDanglingRefs(null);
    }
    setRemoveDialogOpen(true);
  };

  const handleAddModuleFromFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAddingModuleFromFile(true);
    try {
      const result = await addModuleFromZip({
        file,
        targetRulesetId: activeRuleset.id,
        importRuleset: (f, opts) => importRuleset(f, opts),
      });

      const totalSkipped = Object.values(result.skippedByConflict).reduce((a, b) => a + b, 0);
      if (totalSkipped > 0) {
        setConflictDetails(result.skippedDetails ?? null);
        setConflictDialogOpen(true);
        addNotification('Module added from file. Some content was skipped due to ID conflicts.', {
          type: 'info',
        });
      } else {
        addNotification('Module added from file successfully.', { type: 'success' });
      }
    } catch (err) {
      addNotification((err as Error).message, { type: 'error' });
    } finally {
      setAddingModuleFromFile(false);
      if (addFromFileInputRef.current) addFromFileInputRef.current.value = '';
    }
  };

  const handleConfirmRemoveModule = async () => {
    if (!moduleToRemove) return;
    setRemovingModule(true);
    try {
      await removeModuleFromRuleset({
        targetRulesetId: activeRuleset.id,
        moduleIdToRemove: moduleToRemove.id,
        force: true,
      });
      setRemoveDialogOpen(false);
      setModuleToRemove(null);
      setDanglingRefs(null);
      addNotification(`Module "${moduleToRemove.name}" removed.`, { type: 'success' });
    } catch (e) {
      addNotification((e as Error).message, { type: 'error' });
    } finally {
      setRemovingModule(false);
    }
  };

  return (
    <Tabs defaultValue='details' className='flex flex-col gap-4'>
      <TabsList>
        <TabsTrigger value='details'>Details</TabsTrigger>
        <TabsTrigger value='modules'>Modules</TabsTrigger>
      </TabsList>

      <TabsContent value='details' className='flex flex-col gap-6 mt-0'>
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
      </TabsContent>

      <TabsContent value='modules' className='flex flex-col gap-6 mt-0'>
        <div className='flex flex-col gap-3'>
          <div className='flex items-center gap-2'>
            <Checkbox
              id='ruleset-is-module'
              checked={activeRuleset.isModule === true}
              onCheckedChange={(checked) => handleIsModuleChange(checked === true)}
            />
            <Label htmlFor='ruleset-is-module' className='cursor-pointer font-normal'>
              Use as module (allow this ruleset to be added to other rulesets)
            </Label>
          </div>
        </div>

        <div className='flex flex-col gap-3'>
          <Label>Modules</Label>
          <p className='text-sm text-muted-foreground'>
            Add content from another ruleset that is marked as a module.
          </p>
          <div className='flex flex-col gap-2'>
            {modules.length === 0 ? (
              <p className='text-sm text-muted-foreground'>No modules added yet.</p>
            ) : (
              modules.map((mod) => (
                <div
                  key={mod.id}
                  className='flex items-center gap-3 rounded-md border border-border bg-muted/50 px-3 py-2'>
                  {mod.image ? (
                    <img src={mod.image} alt='' className='h-8 w-8 shrink-0 rounded object-cover' />
                  ) : (
                    <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded bg-muted'>
                      <Package className='h-4 w-4 text-muted-foreground' />
                    </div>
                  )}
                  <span className='text-sm font-medium flex-1'>{mod.name}</span>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-8 w-8 p-0 text-muted-foreground hover:text-destructive'
                    onClick={() => handleRemoveModuleClick(mod)}
                    aria-label={`Remove module ${mod.name}`}>
                    <Trash className='h-4 w-4' />
                  </Button>
                </div>
              ))
            )}
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <Popover open={addModuleOpen} onOpenChange={setAddModuleOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant='outline'
                  size='sm'
                  className='gap-2 w-fit'
                  disabled={addingModule || availableModuleRulesets.length === 0}>
                  <Plus className='h-4 w-4' />
                  {addingModule ? 'Adding...' : 'Add module'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className='w-80 p-0' align='start'>
                <div className='p-2'>
                  <p className='mb-2 text-sm text-muted-foreground'>
                    Choose a ruleset to add as a module:
                  </p>
                  <div className='flex max-h-60 flex-col gap-1 overflow-auto'>
                    {availableModuleRulesets.map((r) => (
                      <Button
                        key={r.id}
                        variant='ghost'
                        size='sm'
                        className='justify-start gap-2'
                        onClick={() => handleAddModule(r.id)}>
                        {r.image ? (
                          <img
                            src={r.image}
                            alt=''
                            className='h-6 w-6 shrink-0 rounded object-cover'
                          />
                        ) : (
                          <Package className='h-4 w-4 shrink-0 text-muted-foreground' />
                        )}
                        {r.title}
                      </Button>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Button
              variant='outline'
              size='sm'
              className='gap-2 w-fit'
              disabled={addingModuleFromFile}
              onClick={() => addFromFileInputRef.current?.click()}>
              <Upload className='h-4 w-4' />
              {addingModuleFromFile ? 'Adding...' : 'Add from file'}
            </Button>
            <input
              ref={addFromFileInputRef}
              type='file'
              accept='.zip'
              className='hidden'
              onChange={handleAddModuleFromFile}
              aria-label='Upload ruleset zip to add as module'
            />
          </div>
        </div>

        <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove module?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className='flex flex-col gap-2'>
                  {moduleToRemove && (
                    <span>
                      All content from <strong>{moduleToRemove.name}</strong> will be removed from
                      this ruleset.
                    </span>
                  )}
                  {danglingRefs &&
                    (danglingRefs.components > 0 ||
                      danglingRefs.scripts > 0 ||
                      danglingRefs.charts > 0 ||
                      danglingRefs.documents > 0 ||
                      danglingRefs.windows > 0 ||
                      danglingRefs.attributes > 0 ||
                      danglingRefs.actions > 0 ||
                      danglingRefs.items > 0) && (
                      <span className='text-destructive font-medium'>
                        Some of your ruleset content references this module (e.g. attributes,
                        scripts, components). Those references will break if you remove it.
                      </span>
                    )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setModuleToRemove(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  void handleConfirmRemoveModule();
                }}
                disabled={removingModule}
                className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
                {removingModule ? 'Removing...' : 'Remove module'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog
          open={conflictDialogOpen}
          onOpenChange={(open) => {
            setConflictDialogOpen(open);
            if (!open) setConflictDetails(null);
          }}>
          <DialogContent className='max-w-md'>
            <DialogHeader>
              <DialogTitle>Skipped due to ID conflicts</DialogTitle>
              <DialogDescription>
                The following content from the module was not added because the target ruleset
                already has content with the same ID. You can rename or remove the conflicting
                content in the target, then add the module again to include it.
              </DialogDescription>
            </DialogHeader>
            <div className='max-h-64 overflow-auto rounded-md border border-border bg-muted/30 p-2'>
              {conflictDetails &&
                Object.entries(conflictDetails).map(([entityType, items]) => {
                  if (!items.length) return null;
                  const label =
                    entityType === 'diceRolls'
                      ? 'Dice rolls'
                      : entityType.charAt(0).toUpperCase() + entityType.slice(1);
                  return (
                    <div key={entityType} className='mb-3 last:mb-0'>
                      <p className='text-sm font-medium text-foreground'>
                        {label} ({items.length})
                      </p>
                      <ul className='mt-1 list-inside list-disc text-sm text-muted-foreground'>
                        {items.map((item) => (
                          <li key={item.id}>
                            {item.title ? `${item.title} (${item.id})` : item.id}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
            </div>
            <DialogFooter>
              <Button onClick={() => setConflictDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TabsContent>
    </Tabs>
  );
};
