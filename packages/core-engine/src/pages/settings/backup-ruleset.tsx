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
} from '@/components';
import { useNotifications } from '@/hooks/use-notifications';
import type { ExportRulesetOptions } from '@/lib/compass-api';
import type { Ruleset } from '@/types';
import { del, get, set as setIdb } from 'idb-keyval';
import { HardDrive, Loader2 } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

const IDB_ROOT_HANDLE_KEY = 'qb.rulesetBackup.rootDirectoryHandle';
/** Marker so we can mirror “a folder was chosen” alongside the IndexedDB handle (handles are not JSON-serializable). */
const LS_BACKUP_CONFIGURED = 'qb.rulesetBackup.configured';

function fileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

function safePathSegment(name: string, fallback: string): string {
  const s = name
    .trim()
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  const truncated = s.length > 120 ? s.slice(0, 120) : s;
  return truncated || fallback;
}

async function rootHandleUsable(
  handle: FileSystemDirectoryHandle,
): Promise<'ok' | 'denied' | 'invalid'> {
  try {
    const q = await handle.queryPermission({ mode: 'readwrite' });
    if (q === 'granted') return 'ok';
    const r = await handle.requestPermission({ mode: 'readwrite' });
    return r === 'granted' ? 'ok' : 'denied';
  } catch {
    return 'invalid';
  }
}

async function fileExistsInDirectory(
  dir: FileSystemDirectoryHandle,
  name: string,
): Promise<boolean> {
  try {
    await dir.getFileHandle(name);
    return true;
  } catch (e) {
    if ((e as DOMException).name === 'NotFoundError') return false;
    throw e;
  }
}

async function writeZipToDirectory(
  dir: FileSystemDirectoryHandle,
  fileName: string,
  blob: Blob,
): Promise<void> {
  const fileHandle = await dir.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

async function persistRootHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  await setIdb(IDB_ROOT_HANDLE_KEY, handle);
  try {
    localStorage.setItem(LS_BACKUP_CONFIGURED, '1');
  } catch {
    /* ignore quota / private mode */
  }
}

async function clearPersistedRoot(): Promise<void> {
  await del(IDB_ROOT_HANDLE_KEY);
  try {
    localStorage.removeItem(LS_BACKUP_CONFIGURED);
  } catch {
    /* ignore */
  }
}

async function getOrPickRootDirectory(): Promise<FileSystemDirectoryHandle | null> {
  let handle = await get<FileSystemDirectoryHandle | undefined>(IDB_ROOT_HANDLE_KEY);

  if (handle) {
    const usable = await rootHandleUsable(handle);
    if (usable === 'ok') {
      return handle;
    }
    if (usable === 'denied') {
      try {
        const picked = await window.showDirectoryPicker({
          mode: 'readwrite',
          startIn: handle,
        });
        await persistRootHandle(picked);
        return picked;
      } catch {
        return null;
      }
    }
    await clearPersistedRoot();
    handle = undefined;
  }

  try {
    const picked = await window.showDirectoryPicker({ mode: 'readwrite' });
    await persistRootHandle(picked);
    return picked;
  } catch {
    return null;
  }
}

export interface BackupRulesetProps {
  activeRuleset: Ruleset;
  exportRuleset: (options?: ExportRulesetOptions) => Promise<void | Blob>;
  isExporting: boolean;
}

export function BackupRuleset({ activeRuleset, exportRuleset, isExporting }: BackupRulesetProps) {
  const { addNotification } = useNotifications();
  const [conflictOpen, setConflictOpen] = useState(false);
  const [conflictZipName, setConflictZipName] = useState<string | null>(null);
  const [backingUp, setBackingUp] = useState(false);
  const pendingOverwriteRef = useRef<{
    rulesetDir: FileSystemDirectoryHandle;
    zipName: string;
  } | null>(null);

  const runBackupWrite = useCallback(
    async (rulesetDir: FileSystemDirectoryHandle, zipName: string, skipExistCheck: boolean) => {
      if (!skipExistCheck && (await fileExistsInDirectory(rulesetDir, zipName))) {
        pendingOverwriteRef.current = { rulesetDir, zipName };
        setConflictZipName(zipName);
        setConflictOpen(true);
        return;
      }

      const blob = await exportRuleset({
        returnBlob: true,
        characterIds: [],
        campaignIds: [],
      });
      if (!(blob instanceof Blob)) {
        addNotification('Export did not produce a file.', { type: 'error' });
        return;
      }
      await writeZipToDirectory(rulesetDir, zipName, blob);
      addNotification(`Backup saved: ${zipName}`, { type: 'success' });
    },
    [addNotification, exportRuleset],
  );

  const handleBackupClick = async () => {
    if (isExporting || backingUp) return;
    if (!fileSystemAccessSupported()) {
      addNotification(
        'Folder backup needs a Chromium-based browser (File System Access API), or update your browser.',
        { type: 'error' },
      );
      return;
    }

    setBackingUp(true);
    try {
      const root = await getOrPickRootDirectory();
      if (!root) {
        setBackingUp(false);
        return;
      }

      const dirName = safePathSegment(activeRuleset.title, 'ruleset');
      const rulesetDir = await root.getDirectoryHandle(dirName, { create: true });
      const zipName = `${safePathSegment(activeRuleset.version, 'untitled')}.zip`;

      await runBackupWrite(rulesetDir, zipName, false);
    } catch (e) {
      addNotification((e as Error).message ?? String(e), { type: 'error' });
    } finally {
      setBackingUp(false);
    }
  };

  const handleOverwrite = async () => {
    const pending = pendingOverwriteRef.current;
    setConflictOpen(false);
    setConflictZipName(null);
    pendingOverwriteRef.current = null;
    if (!pending) return;

    setBackingUp(true);
    try {
      await runBackupWrite(pending.rulesetDir, pending.zipName, true);
    } catch (e) {
      addNotification((e as Error).message ?? String(e), { type: 'error' });
    } finally {
      setBackingUp(false);
    }
  };

  const busy = isExporting || backingUp;
  const unsupported = !fileSystemAccessSupported();

  return (
    <>
      <Button
        type='button'
        className='gap-2 w-[120px]'
        variant='outline'
        disabled={busy || unsupported}
        title={
          unsupported
            ? 'Folder backup is not supported in this browser.'
            : 'Save export zip to a folder on disk (remembers folder after first pick).'
        }
        onClick={() => void handleBackupClick()}>
        {busy ? (
          <Loader2 className='h-4 w-4 animate-spin' aria-hidden />
        ) : (
          <HardDrive className='h-4 w-4' aria-hidden />
        )}
        Backup
      </Button>

      <AlertDialog
        open={conflictOpen}
        onOpenChange={(open) => {
          setConflictOpen(open);
          if (!open) {
            pendingOverwriteRef.current = null;
            setConflictZipName(null);
          }
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Backup already exists</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='flex flex-col gap-2 text-sm text-muted-foreground'>
                <span>
                  A file named{' '}
                  <strong className='text-foreground'>{conflictZipName ?? ''}</strong> already exists in
                  this ruleset&apos;s backup folder.
                </span>
                <span>
                  Bump the ruleset <strong className='text-foreground'>Version</strong> above for a new file
                  name, or overwrite the existing zip.
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleOverwrite()}>Overwrite</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
