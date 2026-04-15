import type { Transaction } from 'dexie';

export async function migrate32to33(tx: Transaction): Promise<void> {
  const campaignEvents = (tx as any).table('campaignEvents');
  await campaignEvents.toCollection().each((ev: { id: string; type?: string }) => {
    if (ev.type == null) {
      return campaignEvents.update(ev.id, { type: 'on_activate' });
    }
  });
}
