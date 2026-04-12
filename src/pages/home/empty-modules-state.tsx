import { Button, Card } from '@/components';
import { MarkdownPanel } from '@/components/composites/markdown-panel';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { SYSTEM_MODULE_INSTALL_CARDS } from '@/content/system-modules';
import {
  useRulesetBundle,
  type ImportRulesetOptions,
  type ImportRulesetResult,
} from '@/lib/compass-api';
import { Info, Loader2 } from 'lucide-react';
import { useCallback, useState } from 'react';

export interface EmptyModulesStateProps {
  importRuleset: (
    file: File,
    options?: ImportRulesetOptions,
  ) => Promise<ImportRulesetResult>;
  isImporting: boolean;
  /** When true, blocks install (e.g. another destructive action is running). */
  installDisabled?: boolean;
  /** After a successful import; e.g. navigate to landing. */
  onInstalled?: (rulesetId: string) => void;
}

export function EmptyModulesState({
  importRuleset,
  isImporting,
  installDisabled = false,
  onInstalled,
}: EmptyModulesStateProps) {
  const { getRulesetBundle } = useRulesetBundle();
  const [busyModuleId, setBusyModuleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailsModuleId, setDetailsModuleId] = useState<string | null>(null);

  const detailsMod = detailsModuleId
    ? SYSTEM_MODULE_INSTALL_CARDS.find((m) => m.id === detailsModuleId)
    : undefined;

  const handleInstall = useCallback(
    async (mod: (typeof SYSTEM_MODULE_INSTALL_CARDS)[number]) => {
      setError(null);
      const slug = mod.slug?.trim();
      if (!slug) {
        setError('This module has no bundle slug.');
        return;
      }

      setBusyModuleId(mod.id);
      try {
        const response = await getRulesetBundle(slug);
        if (!response.ok) {
          throw new Error(`Download failed (${response.status} ${response.statusText})`);
        }
        const blob = await response.blob();
        const file = new File([blob], 'ruleset.zip', { type: 'application/zip' });

        let result = await importRuleset(file);
        if (result.needsReplaceConfirmation) {
          result = await importRuleset(file, { replaceIfNewer: true });
        }

        if (result.success && result.importedRuleset?.id) {
          onInstalled?.(result.importedRuleset.id);
          return;
        }

        if (result.needsDuplicateConfirmation) {
          setError(
            'This module is already installed with the same version. Open Rulesets to create a copy or replace it.',
          );
          return;
        }

        setError(result.message || 'Install failed.');
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Install failed.');
      } finally {
        setBusyModuleId(null);
      }
    },
    [getRulesetBundle, importRuleset, onInstalled],
  );

  const anyBusy = !!busyModuleId || isImporting;

  if (SYSTEM_MODULE_INSTALL_CARDS.length === 0) {
    return (
      <p className='w-full text-center text-sm text-muted-foreground'>
        No system modules are available.
      </p>
    );
  }

  return (
    <>
      {SYSTEM_MODULE_INSTALL_CARDS.map((mod) => {
        const isThisBusy = busyModuleId === mod.id;
        return (
          <Card
            key={mod.id}
            className='flex aspect-square w-[min(100%,280px)] flex-col overflow-hidden p-0'
            data-testid='empty-modules-catalog-card'>
            <div
              className='min-h-0 flex-1 bg-muted bg-cover bg-center'
              style={mod.image ? { backgroundImage: `url(${mod.image})` } : undefined}
            />
            <div className='flex shrink-0 flex-col gap-2 border-t p-3'>
              <div className='flex min-w-0 items-baseline justify-between gap-2'>
                <h2 className='flex min-w-0 items-center gap-1.5 text-sm font-semibold'>
                  <span className='min-w-0 truncate'>{mod.title}</span>
                </h2>
              </div>
              <div className='flex items-center gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-8 flex-1 gap-1'
                  disabled={installDisabled || anyBusy}
                  data-testid={`empty-modules-install-${mod.id}`}
                  onClick={() => void handleInstall(mod)}>
                  {isThisBusy ? (
                    <>
                      <Loader2 className='h-3.5 w-3.5 animate-spin' />
                      Installing…
                    </>
                  ) : (
                    'Install'
                  )}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  className='h-8 w-8 shrink-0'
                  disabled={installDisabled || anyBusy}
                  data-testid={`empty-modules-info-${mod.id}`}
                  aria-label={`${mod.title} description`}
                  onClick={() => setDetailsModuleId(mod.id)}>
                  <Info className='h-4 w-4' />
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
      {error ? (
        <p className='w-full basis-full text-center text-sm text-destructive' role='alert'>
          {error}
        </p>
      ) : null}

      <Sheet
        open={detailsModuleId !== null}
        onOpenChange={(open) => {
          if (!open) setDetailsModuleId(null);
        }}>
        <SheetContent
          side='right'
          className='flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md md:max-w-lg'>
          <SheetHeader className='shrink-0 border-b px-4 pt-4 pb-3 pr-12'>
            <SheetTitle>{detailsMod?.title ?? 'Module'}</SheetTitle>
            <SheetDescription className='sr-only'>
              Markdown description for this system module.
            </SheetDescription>
          </SheetHeader>
          <div className='flex min-h-0 flex-1 flex-col'>
            <MarkdownPanel
              readOnly
              value={(detailsMod?.description ?? '').trim()}
              placeholder='No description for this module.'
              className='min-h-0 flex-1 p-0'
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
