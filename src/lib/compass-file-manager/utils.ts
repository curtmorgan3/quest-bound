import type { FileSystemAPIDirectoryHandle } from '@/vite-env';
import { get, set } from 'idb-keyval';

export async function getDirectoryHandle(
  storageKey?: string,
): Promise<FileSystemAPIDirectoryHandle | undefined> {
  if (storageKey) {
    const storedDir = await get(storageKey);
    if (storedDir) {
      const hasPermission = await verifyPermission(storedDir);
      if (!hasPermission) {
        await set(storageKey, null);
      } else {
        return storedDir;
      }
    }
  }

  const dirHandle: FileSystemAPIDirectoryHandle | undefined = await window.showDirectoryPicker({
    mode: 'readwrite',
  });

  if (dirHandle && storageKey) {
    await storeRootDirectoryHandle(dirHandle, storageKey);
  }

  return dirHandle;
}

export async function resetRootDirectory() {
  await set('qb.rootDir', null);
  return null;
}

async function verifyPermission(dirHandle: FileSystemAPIDirectoryHandle) {
  const options = { mode: 'readwrite' };
  if ((await dirHandle.queryPermission(options)) === 'granted') {
    return true;
  }
  return false;
}

export async function storeRootDirectoryHandle(
  dirHandle: FileSystemAPIDirectoryHandle,
  storageKey: string,
) {
  await set(storageKey, dirHandle);
  return dirHandle;
}

export async function getNewFileHandle(
  suggestedName?: string,
  dirHandle?: FileSystemDirectoryHandle,
) {
  const options = {
    suggestedName: suggestedName ?? 'new-file.json',
    startIn: dirHandle,
    types: [
      {
        description: 'Text Files',
        accept: {
          'text/plain': ['.json'],
        },
      },
    ],
  };
  const handle = await window.showSaveFilePicker(options);
  return handle;
}

export async function writeFile(fileHandle: FileSystemFileHandle, contents: string) {
  const writable = await fileHandle.createWritable();
  await writable.write(contents);
  await writable.close();
  return fileHandle;
}

export async function readJsonFile(fileHandle: FileSystemFileHandle): Promise<any> {
  const file = await fileHandle.getFile();
  const fileData = await file.text();
  return JSON.parse(fileData);
}
