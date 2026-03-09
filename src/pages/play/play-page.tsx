import { Loading } from '@/components';
import { ImportRulesetOverwriteModals } from '@/components/composites';
import { useImportRuleset, useRulesetBundle, type ImportRulesetResult } from '@/lib/compass-api';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export function PlayPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const { importRuleset, isImporting } = useImportRuleset();
  const { getRulesetBundle } = useRulesetBundle();
  const importRulesetRef = useRef(importRuleset);
  importRulesetRef.current = importRuleset;
  const getRulesetBundleRef = useRef(getRulesetBundle);
  getRulesetBundleRef.current = getRulesetBundle;
  const [error, setError] = useState<string | null>(null);

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false);
  const [pendingReplaceResult, setPendingReplaceResult] = useState<ImportRulesetResult | null>(
    null,
  );
  const [duplicateConfirmOpen, setDuplicateConfirmOpen] = useState(false);
  const [pendingDuplicateResult, setPendingDuplicateResult] = useState<ImportRulesetResult | null>(
    null,
  );
  const [duplicateTitle, setDuplicateTitle] = useState('');
  const [duplicateVersion, setDuplicateVersion] = useState('');

  const navigateToRuleset = (rulesetId: string) => {
    navigateRef.current(`/landing/${rulesetId}`, { replace: true });
  };

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

        const result = await importRulesetRef.current(file);

        if (cancelled) return;

        if (result.needsReplaceConfirmation) {
          setPendingFile(file);
          setPendingReplaceResult(result);
          setReplaceConfirmOpen(true);
          return;
        }
        if (result.needsDuplicateConfirmation) {
          setPendingFile(file);
          setPendingDuplicateResult(result);
          setDuplicateTitle(result.importedRuleset?.title || '');
          setDuplicateVersion(result.importedRuleset?.version || '');
          setDuplicateConfirmOpen(true);
          return;
        }

        if (!result.success) {
          // When the fetched ruleset is older or equal version, redirect to existing ruleset
          if (result.existingRuleset?.id) {
            navigateToRuleset(result.existingRuleset.id);
            return;
          }
          setError(result.message ?? 'Import failed');
          return;
        }

        const rulesetId = result.importedRuleset?.id;
        if (rulesetId) {
          navigateToRuleset(rulesetId);
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
  }, [slug]);

  const handleConfirmReplace = async () => {
    if (!pendingFile) return;
    setReplaceConfirmOpen(false);
    try {
      const result = await importRuleset(pendingFile, { replaceIfNewer: true });
      if (result.success && result.importedRuleset?.id) {
        navigateToRuleset(result.importedRuleset.id);
      } else {
        setError(result.message ?? 'Import failed');
      }
    } finally {
      setPendingFile(null);
      setPendingReplaceResult(null);
    }
  };

  const handleCancelReplace = () => {
    setReplaceConfirmOpen(false);
    const existingId = pendingReplaceResult?.existingRuleset?.id;
    setPendingFile(null);
    setPendingReplaceResult(null);
    if (existingId) {
      navigateToRuleset(existingId);
    } else {
      setError('Import cancelled');
    }
  };

  const handleConfirmDuplicate = async () => {
    if (!pendingFile) return;
    setDuplicateConfirmOpen(false);
    try {
      const result = await importRuleset(pendingFile, {
        duplicateAsNew: true,
        duplicateTitle: duplicateTitle || pendingDuplicateResult?.importedRuleset?.title,
        duplicateVersion: duplicateVersion || pendingDuplicateResult?.importedRuleset?.version,
      });
      if (result.success && result.importedRuleset?.id) {
        navigateToRuleset(result.importedRuleset.id);
      } else {
        setError(result.message ?? 'Import failed');
      }
    } finally {
      setPendingFile(null);
      setPendingDuplicateResult(null);
      setDuplicateTitle('');
      setDuplicateVersion('');
    }
  };

  const handleCancelDuplicate = () => {
    setDuplicateConfirmOpen(false);
    const existingId = pendingDuplicateResult?.existingRuleset?.id;
    setPendingFile(null);
    setPendingDuplicateResult(null);
    setDuplicateTitle('');
    setDuplicateVersion('');
    if (existingId) {
      navigateToRuleset(existingId);
    } else {
      setError('Import cancelled');
    }
  };

  if (error) {
    return (
      <div className='flex h-full w-full items-center justify-center text-destructive'>{error}</div>
    );
  }

  return (
    <>
      <Loading />
      <ImportRulesetOverwriteModals
        replaceOpen={replaceConfirmOpen}
        onReplaceOpenChange={setReplaceConfirmOpen}
        pendingReplaceResult={pendingReplaceResult}
        onConfirmReplace={handleConfirmReplace}
        onCancelReplace={handleCancelReplace}
        duplicateOpen={duplicateConfirmOpen}
        onDuplicateOpenChange={setDuplicateConfirmOpen}
        pendingDuplicateResult={pendingDuplicateResult}
        duplicateTitle={duplicateTitle}
        duplicateVersion={duplicateVersion}
        onDuplicateTitleChange={setDuplicateTitle}
        onDuplicateVersionChange={setDuplicateVersion}
        onConfirmDuplicate={handleConfirmDuplicate}
        onCancelDuplicate={handleCancelDuplicate}
        isImporting={isImporting}
      />
    </>
  );
}
