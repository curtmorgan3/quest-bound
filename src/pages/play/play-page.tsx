import { Loading } from '@/components';
import { useImportRuleset, useRulesetBundle } from '@/lib/compass-api';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export function PlayPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { importRuleset } = useImportRuleset();
  const { getRulesetBundle } = useRulesetBundle();
  const importRulesetRef = useRef(importRuleset);
  importRulesetRef.current = importRuleset;
  const getRulesetBundleRef = useRef(getRulesetBundle);
  getRulesetBundleRef.current = getRulesetBundle;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setError('Missing play slug');
      return;
    }

    let cancelled = false;
    const run = async () => {
      setError(null);
      try {
        const response = await getRulesetBundleRef.current(slug);
        if (cancelled) return;
        if (!response.ok) {
          throw new Error(`Failed to fetch ruleset: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        if (cancelled) return;
        const file = new File([blob], 'ruleset.zip', { type: 'application/zip' });

        const result = await importRulesetRef.current(file, {
          replaceIfNewer: true,
          duplicateAsNew: true,
        });

        if (cancelled) return;

        if (!result.success) {
          setError(result.message ?? 'Import failed');
          return;
        }

        const rulesetId = result.importedRuleset?.id;
        if (rulesetId) {
          navigate(`/landing/${rulesetId}`, { replace: true });
        } else {
          setError('Import succeeded but no ruleset id returned');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load ruleset');
        }
      }
    };

    const timeoutId = setTimeout(run, 0);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [slug, navigate]);

  if (error) {
    return (
      <div className='flex h-full w-full items-center justify-center text-destructive'>{error}</div>
    );
  }

  return <Loading />;
}
