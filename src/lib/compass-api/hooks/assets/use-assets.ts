import { db } from '@/stores';
import { useParams } from 'react-router-dom';

export const useAssets = () => {
  const { rulesetId } = useParams();

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
            rulesetId: rulesetId || null,
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
