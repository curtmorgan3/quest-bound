import { cloudClient } from './client';

export async function checkGameAuthorization(gameId: string, userId: string): Promise<boolean> {
  if (!cloudClient || !gameId || !userId) return false;
  const { data, error } = await cloudClient
    .from('user_game_purchase_authorizations')
    .select('user_id')
    .eq('game_id', gameId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return false;
  return !!data;
}
