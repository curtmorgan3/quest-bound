import { Button } from '@/components';
import { Loading } from '@/components/composites';
import { peekRulesetBundleMetadata, type RulesetBundlePreview, useImportRuleset } from '@/lib/compass-api';
import { useCloudAuthStore } from '@/stores/cloud-auth-store';
import { db } from '@quest-bound/local-db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { useGameAuthorization } from '../hooks/use-game-authorization';
import { useGameMode } from '../hooks/use-game-mode';
import { GamePreviewLanding } from './game-preview-landing';

interface Props {
  children: React.ReactNode;
}

export function GameModeBoot({ children }: Props) {
  const isGameMode = useGameMode();
  const rulesetCount = useLiveQuery(() => db.rulesets.count(), []);
  const { importRuleset, importStep } = useImportRuleset();
  const importRulesetRef = useRef(importRuleset);
  importRulesetRef.current = importRuleset;

  const { isLoading: isAuthLoading } = useCloudAuthStore();
  const isGameAuthorized = useGameAuthorization();

  const [bundleFile, setBundleFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<RulesetBundlePreview | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTriggered = useRef(false);
  const installTriggered = useRef(false);

  // Step 1: Fetch the bundle zip once the DB count is known.
  useEffect(() => {
    if (!isGameMode) return;
    if (rulesetCount === undefined) return;
    if (fetchTriggered.current) return;
    fetchTriggered.current = true;

    const run = async () => {
      try {
        const response = await fetch('/game-ruleset.zip');
        if (!response.ok) throw new Error(`Failed to fetch ruleset (${response.status})`);
        const blob = await response.blob();
        const file = new File([blob], 'ruleset.zip', { type: 'application/zip' });

        if (rulesetCount === 0) {
          // Peek metadata for the preview landing — no DB writes yet.
          const meta = await peekRulesetBundleMetadata(file);
          setPreview(meta);
        }

        setBundleFile(file);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load game.');
      }
    };

    void run();
  }, [isGameMode, rulesetCount]);

  // Step 2: Trigger install when the bundle is ready and conditions are met:
  //   - Returning user (rulesetCount > 0): merge immediately regardless of auth state.
  //   - New user (rulesetCount === 0): wait for authorization.
  useEffect(() => {
    if (!isGameMode) return;
    if (!bundleFile) return;
    if (rulesetCount === undefined) return;
    if (installTriggered.current) return;

    const isReturningUser = rulesetCount > 0;
    const isNewUserAuthorized = rulesetCount === 0 && !isAuthLoading && isGameAuthorized === true;

    if (!isReturningUser && !isNewUserAuthorized) return;

    installTriggered.current = true;
    setIsInstalling(true);

    const opts = isReturningUser ? { mergeIfNewer: true } : { forceReplace: false as const };

    importRulesetRef
      .current(bundleFile, opts)
      .then((result) => {
        if (!result.success && rulesetCount === 0) {
          setError(result.message || 'Import failed.');
        }
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Install failed.');
      })
      .finally(() => {
        setIsInstalling(false);
      });
  }, [isGameMode, bundleFile, rulesetCount, isGameAuthorized, isAuthLoading]);

  if (!isGameMode) return <>{children}</>;

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

  // DB count not yet known.
  if (rulesetCount === undefined) {
    return (
      <div className='flex h-screen w-screen items-center justify-center'>
        <Loading />
      </div>
    );
  }

  // New user flow.
  if (rulesetCount === 0) {
    // Bundle not fetched yet.
    if (!bundleFile) {
      return (
        <div className='flex h-screen w-screen items-center justify-center'>
          <Loading />
        </div>
      );
    }

    // Installing after authorization was granted.
    if (isInstalling) {
      return (
        <div className='flex h-screen w-screen flex-col items-center justify-center gap-2'>
          <Loading />
          {importStep && <p className='text-sm text-muted-foreground'>{importStep}...</p>}
        </div>
      );
    }

    // Not yet authorized — show the preview landing.
    if (isGameAuthorized !== true) {
      return <GamePreviewLanding preview={preview} />;
    }

    // Authorized but install hasn't started yet (brief frame before effect fires).
    return (
      <div className='flex h-screen w-screen items-center justify-center'>
        <Loading />
      </div>
    );
  }

  // Returning user: app is usable immediately; merge runs in the background.
  return <>{children}</>;
}
