import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

// --- Error log ---
interface ScriptErrorLogProps {
  errors: Array<{
    id: string;
    errorMessage: string;
    lineNumber: number | null;
    stackTrace: string | null;
    timestamp: number;
    scriptId: string;
    characterId: string | null;
  }>;
  onDismiss: (id: string) => void;
}

export function ScriptErrorLog({ errors, onDismiss }: ScriptErrorLogProps) {
  return (
    <div className='rounded-md border bg-muted/20 flex flex-col h-[220px]'>
      <div className='px-3 py-2 border-b'>
        <span className='text-sm font-medium'>Script errors</span>
      </div>
      <ScrollArea className='flex-1 p-2'>
        <div className='space-y-3'>
          {errors.length === 0 ? (
            <p className='text-sm text-muted-foreground italic'>No recorded errors.</p>
          ) : (
            errors.map((err) => (
              <div
                key={err.id}
                className='rounded border border-destructive/30 bg-destructive/5 p-3 text-sm'>
                <div className='flex justify-between gap-2'>
                  <span className='text-muted-foreground text-xs'>
                    {new Date(err.timestamp).toLocaleString()}
                  </span>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => onDismiss(err.id)}
                    className='h-6 px-2'>
                    Dismiss
                  </Button>
                </div>
                <p className='font-medium text-destructive mt-1'>{err.errorMessage}</p>
                {err.lineNumber != null && (
                  <p className='text-xs text-muted-foreground'>Line {err.lineNumber}</p>
                )}
                {err.stackTrace && (
                  <details className='mt-2'>
                    <summary className='cursor-pointer text-xs'>Stack trace</summary>
                    <pre className='mt-1 text-xs overflow-auto max-h-24'>{err.stackTrace}</pre>
                  </details>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
