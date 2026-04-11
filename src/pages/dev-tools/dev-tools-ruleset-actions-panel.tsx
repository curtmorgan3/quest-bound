import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { db } from '@/stores';
import type { Ruleset } from '@/types';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

type BusyKey = 'actions' | 'items' | 'attributes' | null;

export function DevToolsRulesetActionsPanel() {
  const [rulesets, setRulesets] = useState<Ruleset[]>([]);
  const [selectedRulesetId, setSelectedRulesetId] = useState<string>('');
  const [busy, setBusy] = useState<BusyKey>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRulesets = useCallback(async () => {
    const list = await db.rulesets.orderBy('title').toArray();
    setRulesets(list);
  }, []);

  useEffect(() => {
    void loadRulesets();
  }, [loadRulesets]);

  const runClear = async (
    key: Exclude<BusyKey, null>,
    fn: () => Promise<number>,
    label: string,
  ) => {
    if (!selectedRulesetId) return;
    setBusy(key);
    setError(null);
    setStatus(null);
    try {
      const n = await fn();
      setStatus(`${label}: updated ${n} row(s).`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Operation failed');
    } finally {
      setBusy(null);
    }
  };

  const clearActionImages = () =>
    void runClear(
      'actions',
      () =>
        db.actions.where('rulesetId').equals(selectedRulesetId).modify({
          assetId: null,
          image: null,
        }),
      'Actions',
    );

  const clearItemImages = () =>
    void runClear(
      'items',
      () =>
        db.items.where('rulesetId').equals(selectedRulesetId).modify({
          assetId: null,
          image: null,
        }),
      'Items',
    );

  const clearAttributeImages = () =>
    void runClear(
      'attributes',
      () =>
        db.attributes.where('rulesetId').equals(selectedRulesetId).modify({
          assetId: null,
          image: null,
        }),
      'Attributes',
    );

  const disabled = !selectedRulesetId || busy !== null;

  return (
    <div className='h-full overflow-auto p-6'>
      <div className='mx-auto max-w-4xl space-y-4'>
        <div>
          <h2 className='text-2xl font-bold'>Actions</h2>
          <p className='mt-1 text-sm text-muted-foreground'>
            Bulk-clear image links (<code className='rounded bg-muted px-1 text-xs'>assetId</code>{' '}
            and legacy <code className='rounded bg-muted px-1 text-xs'>image</code>) on ruleset
            entities. Does not delete asset files.
          </p>
        </div>

        <div className='space-y-2'>
          <Label htmlFor='dev-tools-ruleset'>Ruleset</Label>
          <Select
            value={selectedRulesetId || undefined}
            onValueChange={(v) => {
              setSelectedRulesetId(v);
              setStatus(null);
              setError(null);
            }}
            disabled={rulesets.length === 0}>
            <SelectTrigger id='dev-tools-ruleset' className='max-w-md'>
              <SelectValue placeholder={rulesets.length ? 'Select a ruleset' : 'No rulesets'} />
            </SelectTrigger>
            <SelectContent>
              {rulesets.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <div className='flex flex-col gap-2 sm:max-w-md'>
          <Button
            variant='outline'
            disabled={disabled}
            onClick={clearActionImages}>
            {busy === 'actions' ? (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            ) : null}
            Clear Images from Actions
          </Button>
          <Button variant='outline' disabled={disabled} onClick={clearItemImages}>
            {busy === 'items' ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
            Clear Images from Items
          </Button>
          <Button
            variant='outline'
            disabled={disabled}
            onClick={clearAttributeImages}>
            {busy === 'attributes' ? (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            ) : null}
            Clear Images from Attributes
          </Button>
        </div>

        {error ? <p className='text-sm text-destructive'>{error}</p> : null}
        {status ? <p className='text-sm text-muted-foreground'>{status}</p> : null}
      </div>
    </div>
  );
}
