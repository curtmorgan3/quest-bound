import type { Transaction } from 'dexie';

/**
 * Create a Campaign for each world that had rulesetId (upgrading from pre-Phase-7).
 */
export async function migrate38to39(tx: Transaction): Promise<void> {
  const worlds = (tx as any).table('worlds');
  const campaigns = (tx as any).table('campaigns');
  await worlds.toCollection().each((world: { id: string; rulesetId?: string }) => {
    if (world.rulesetId) {
      const now = new Date().toISOString();
      return campaigns.add({
        id: crypto.randomUUID(),
        rulesetId: world.rulesetId,
        worldId: world.id,
        createdAt: now,
        updatedAt: now,
      });
    }
  });
}
