import { Button } from '@/components';
import { Loading } from '@/components/composites';
import { useImportRuleset } from '@/lib/compass-api';
import { db } from '@quest-bound/local-db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { GAME_MODE } from '../game-mode';

interface Props {
  children: React.ReactNode;
}

export function GameModeBoot({ children }: Props) {
  const rulesetCount = useLiveQuery(() => db.rulesets.count(), []);
  const { importRuleset, importStep } = useImportRuleset();
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(GAME_MODE);
  const importTriggered = useRef(false);

  useEffect(() => {
    if (!GAME_MODE) return;
    if (rulesetCount === undefined) return;
    if (importTriggered.current) return;

    importTriggered.current = true;

    const run = async () => {
      try {
        const response = await fetch('/game-ruleset.zip');
        if (!response.ok) throw new Error(`Failed to fetch ruleset (${response.status})`);
        const blob = await response.blob();
        const file = new File([blob], 'ruleset.zip', { type: 'application/zip' });

        if (rulesetCount === 0) {
          const result = await importRuleset(file, { forceReplace: false });
          if (!result.success) {
            setError(result.message || 'Import failed.');
          }
        } else {
          const result = await importRuleset(file, { mergeIfNewer: true });
          if (!result.success) {
            setError(result.message || 'Update check failed.');
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load ruleset.');
      } finally {
        setIsChecking(false);
      }
    };

    void run();
  }, [rulesetCount, importRuleset]);

  if (!GAME_MODE) return <>{children}</>;

  if (error) {
    return (
      <div className='flex h-screen w-screen flex-col items-center justify-center gap-4'>
        <p className='text-sm text-destructive'>{error}</p>
        <Button variant='outline' onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  if (isChecking) {
    return (
      <div className='flex h-screen w-screen flex-col items-center justify-center gap-2'>
        <Loading />
        {importStep && <p className='text-sm text-muted-foreground'>{importStep}</p>}
      </div>
    );
  }

  return <>{children}</>;
}
