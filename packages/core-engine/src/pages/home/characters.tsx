import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Card,
  Checkbox,
  Label,
} from '@/components';
import { PageWrapper } from '@/components/composites';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCharacter, useImportCharacter } from '@/lib/compass-api';
import { filterNotSoftDeleted } from '@/lib/data/soft-delete';
import { db } from '@/stores';
import type { Archetype, CharacterArchetype } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { AlertCircle, Upload } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CreateCharacterModal } from './create-character-modal';

export const Characters = () => {
  const [searchParams] = useSearchParams();
  const rulesetIdParam = searchParams.get('rulesetId');

  const { characters, createCharacter, deleteCharacter } = useCharacter();
  const { importCharacter, isImporting } = useImportCharacter();

  const characterArchetypes: CharacterArchetype[] =
    useLiveQuery(
      async () => {
        if (!rulesetIdParam) return [] as CharacterArchetype[];
        const ids = characters.filter((c) => c.rulesetId === rulesetIdParam).map((c) => c.id);
        if (ids.length === 0) return [];
        const rows = await db.characterArchetypes
          .where('characterId')
          .anyOf(ids)
          .sortBy('loadOrder');
        return filterNotSoftDeleted(rows);
      },
      [rulesetIdParam, characters],
    ) ?? [];

  const archetypes: Archetype[] =
    useLiveQuery(
      () =>
        rulesetIdParam
          ? db.archetypes.where('rulesetId').equals(rulesetIdParam).toArray()
          : Promise.resolve([] as Archetype[]),
      [rulesetIdParam],
    ) ?? [];

  const getArchetypeLabel = (characterId: string): string | null => {
    const ca = characterArchetypes.find((a) => a.characterId === characterId);
    if (!ca) return null;
    const archetype = archetypes.find((a) => a.id === ca.archetypeId);
    if (!archetype) return null;
    return ca.variant ? `${archetype.name} (${ca.variant})` : archetype.name;
  };

  const selectableCharacters = useMemo(
    () =>
      !rulesetIdParam
        ? []
        : characters
            .filter((c) => !c.isTestCharacter && c.isNpc !== true)
            .filter((c) => c.rulesetId === rulesetIdParam),
    [characters, rulesetIdParam],
  );

  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    rulesetMissing: boolean;
  } | null>(null);
  const [rulesetWarningOpen, setRulesetWarningOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await importCharacter(file);
      setImportResult({
        success: result.success,
        message: result.message,
        rulesetMissing: result.rulesetMissing,
      });
      if (result.rulesetMissing) {
        setRulesetWarningOpen(true);
      }
    } catch (error) {
      setImportResult({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Character import failed due to an unknown error.',
        rulesetMissing: false,
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <PageWrapper
      title='Characters'
      headerActions={
        <div className='flex items-center gap-2'>
          {importResult && (
            <div
              className={`p-3 rounded-lg border text-sm ${
                importResult.success
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
              <div className='flex items-center gap-2'>
                {importResult.success ? null : <AlertCircle className='h-4 w-4' />}
                <span className='font-medium'>{importResult.message}</span>
              </div>
            </div>
          )}

          <CreateCharacterModal rulesetId={rulesetIdParam} onCreate={createCharacter} />

          <input
            ref={fileInputRef}
            type='file'
            accept='.zip'
            onChange={handleFileSelect}
            className='hidden'
          />
          <Button
            variant='outline'
            size='sm'
            className='gap-1'
            disabled={isImporting}
            onClick={handleImportClick}>
            {isImporting ? (
              <>
                <Upload className='h-4 w-4 animate-pulse' />
                Upload
              </>
            ) : (
              <>
                <Upload className='h-4 w-4' />
                Upload
              </>
            )}
          </Button>

          <Dialog open={rulesetWarningOpen} onOpenChange={setRulesetWarningOpen}>
            <DialogContent className='sm:max-w-[425px]'>
              <DialogHeader>
                <DialogTitle>Ruleset not found</DialogTitle>
                <DialogDescription>
                  The ruleset for this character is not available in this library.
                </DialogDescription>
              </DialogHeader>
              <p className='text-sm text-muted-foreground'>
                The character has been imported, but its original ruleset could not be found. Some
                attributes, items, or windows may not align correctly until the matching ruleset is
                imported.
              </p>
              <DialogFooter>
                <Button onClick={() => setRulesetWarningOpen(false)}>OK</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      }>
      <div className='flex flex-wrap gap-4'>
        {selectableCharacters.map((character) => {
          const doNotAsk = localStorage.getItem('qb.confirmOnDelete') === 'false';
          const archetypeLabel = getArchetypeLabel(character.id);

          return (
            <Card
              key={character.id}
              className='flex aspect-square w-[min(100%,280px)] flex-col overflow-hidden p-0'
              data-testid='character-card'>
              <div
                className='min-h-0 flex-1 bg-muted bg-cover bg-center'
                style={character.image ? { backgroundImage: `url(${character.image})` } : undefined}
              />
              <div className='flex shrink-0 flex-col gap-2 border-t p-3'>
                <div className='flex min-w-0 flex-col gap-0.5'>
                  <h2 className='truncate text-sm font-semibold'>{character.name}</h2>
                  {archetypeLabel && (
                    <span className='truncate text-xs text-muted-foreground'>{archetypeLabel}</span>
                  )}
                </div>
                <div className='flex items-center gap-2'>
                  {doNotAsk ? (
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-8 flex-1 text-red-500'
                      data-testid='preview-card-delete'
                      onClick={() => deleteCharacter(character.id)}>
                      Delete
                    </Button>
                  ) : (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant='ghost'
                          size='sm'
                          className='h-8 flex-1 text-red-500'
                          data-testid='preview-card-delete'>
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Permanently delete this content?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Permanently delete this content?
                          </AlertDialogDescription>
                          <div className='flex gap-2'>
                            <Label htmlFor='preview-card-do-not-ask-again'>Do not ask again</Label>
                            <Checkbox
                              id='preview-card-do-not-ask-again'
                              onCheckedChange={(checked) =>
                                localStorage.setItem('qb.confirmOnDelete', String(!checked))
                              }
                            />
                          </div>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            data-testid='preview-card-delete-confirm'
                            onClick={() => deleteCharacter(character.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-8 flex-1'
                    onClick={() => navigate(`/characters/${character.id}`)}
                    data-testid='character-card-open'>
                    Open
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {selectableCharacters.length === 0 && (
        <div className='flex flex-col items-center justify-center gap-4 py-12 text-center text-muted-foreground'>
          <p className='text-lg'>No Characters</p>
          <p className='text-sm'>Create your first character to get started</p>
          <CreateCharacterModal
            rulesetId={rulesetIdParam}
            onCreate={createCharacter}
            triggerTestId='create-character-empty-cta'
          />
        </div>
      )}
    </PageWrapper>
  );
};
