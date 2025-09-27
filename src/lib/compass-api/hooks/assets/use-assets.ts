import { db } from '@/stores';

export const useAssets = () => {
  const createAsset = async (file: File): Promise<string> => {
    const reader = new FileReader();
    return new Promise<string>((resolve, reject) => {
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
          const id = await db.assets.add({
            id: crypto.randomUUID(),
            data: base64String,
            type: file.type,
            filename: file.name,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          resolve(id);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => {
        reject(new Error('Failed to read the file.'));
      };
      reader.readAsDataURL(file);
    });
  };

  const deleteAsset = async (id: string) => {
    await db.assets.delete(id);
  };

  return {
    createAsset,
    deleteAsset,
  };
};
