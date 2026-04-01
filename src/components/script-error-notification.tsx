import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useScriptErrorLogs, type ScriptErrorEventDetail } from '@/lib/compass-logic';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { useCallback, useState } from 'react';

export interface ScriptErrorNotificationProps {
  scriptName?: string;
  scriptId?: string;
  message: string;
  line?: number;
  column?: number;
  /** Occurrences merged for the same script label + message (title prefix when greater than 1). */
  count?: number;
  onDismiss: () => void;
  className?: string;
}

function scriptLabelForTitle(scriptName?: string, scriptId?: string): string {
  const trimmed = scriptName?.trim();
  if (trimmed) return trimmed;
  if (scriptId?.startsWith('inline-')) return 'inline';
  return 'unknown';
}

export function ScriptErrorNotification({
  scriptName,
  scriptId,
  message,
  line,
  column,
  count = 1,
  onDismiss,
  className,
}: ScriptErrorNotificationProps) {
  const label = scriptLabelForTitle(scriptName, scriptId);
  const positionLines: string[] = [];
  if (line != null) positionLines.push(`line: ${line}`);
  if (column != null) positionLines.push(`column: ${column}`);
  const hasPosition = positionLines.length > 0;
  const countPrefix = count > 1 ? `(${count}) ` : '';

  return (
    <Card
      className={cn(
        'relative w-full max-w-md gap-0 border-destructive/40 py-0 shadow-lg',
        className,
      )}>
      <CardContent className='flex flex-col gap-0 p-0'>
        <div className='flex items-start justify-between gap-2 px-4 pt-4'>
          <h2 className='pr-8 text-sm font-semibold leading-tight'>
            {countPrefix}Script Error: {label}.qbs
          </h2>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='absolute right-2 top-2 size-8 shrink-0 text-muted-foreground hover:text-foreground'
            onClick={onDismiss}
            aria-label='Dismiss script error'>
            <X className='size-4' />
          </Button>
        </div>
        <Separator className='my-3' />
        <div
          className={cn(
            'px-4 text-sm leading-relaxed text-foreground',
            !hasPosition && 'pb-4',
          )}>
          <p className='whitespace-pre-wrap break-words'>{message}</p>
        </div>
        {hasPosition ? (
          <div className='text-muted-foreground mt-4 px-4 pb-4 font-mono text-xs whitespace-pre-line'>
            {positionLines.join('\n')}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

type QueuedScriptError = ScriptErrorEventDetail & { id: string; count: number };

function scriptErrorDedupeKey(detail: ScriptErrorEventDetail): string {
  const label = scriptLabelForTitle(detail.scriptName, detail.scriptId);
  return `${label}\0${detail.message}`;
}

export function ScriptErrorNotificationsHost() {
  const [errors, setErrors] = useState<QueuedScriptError[]>([]);

  const onScriptError = useCallback((detail: ScriptErrorEventDetail) => {
    setErrors((prev) => {
      const key = scriptErrorDedupeKey(detail);
      const idx = prev.findIndex((e) => scriptErrorDedupeKey(e) === key);
      if (idx >= 0) {
        const next = [...prev];
        const cur = next[idx]!;
        next[idx] = {
          ...cur,
          ...detail,
          id: cur.id,
          count: cur.count + 1,
        };
        return next;
      }
      return [...prev, { ...detail, id: crypto.randomUUID(), count: 1 }];
    });
  }, []);

  useScriptErrorLogs(onScriptError);

  const dismiss = useCallback((id: string) => {
    setErrors((prev) => prev.filter((e) => e.id !== id));
  }, []);

  if (errors.length === 0) return null;

  return (
    <div
      className='pointer-events-none fixed bottom-4 right-4 z-[11000] flex w-[min(100vw-2rem,28rem)] flex-col gap-3'
      role='region'
      aria-label='Script errors'>
      {errors.map((err) => (
        <div key={err.id} className='pointer-events-auto'>
          <ScriptErrorNotification
            scriptName={err.scriptName}
            scriptId={err.scriptId}
            message={err.message}
            line={err.line}
            column={err.column}
            count={err.count}
            onDismiss={() => dismiss(err.id)}
          />
        </div>
      ))}
    </div>
  );
}
