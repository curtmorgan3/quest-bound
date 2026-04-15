import { db } from '@/stores';
import { collectSubtreeComponentIds } from './composite-subtree';

/** Remove composite / variant rows when template group roots were deleted outside the library flow. */
export async function repairCompositesAfterComponentDeletes(deletedIds: Iterable<string>): Promise<void> {
  const idSet = new Set(deletedIds);
  if (idSet.size === 0) return;

  for (const id of idSet) {
    const composite = await db.composites.where('rootComponentId').equals(id).first();
    if (composite) {
      await db.compositeVariants.where('compositeId').equals(composite.id).delete();
      await db.composites.delete(composite.id);
    }
  }

  for (const id of idSet) {
    await db.compositeVariants.where('groupComponentId').equals(id).delete();
  }
}

async function deleteComponentSubtreeIfExists(rootId: string): Promise<void> {
  const root = await db.components.get(rootId);
  if (!root) return;
  const windowComps = await db.components.where('windowId').equals(root.windowId).toArray();
  const subtree = collectSubtreeComponentIds(rootId, windowComps);
  await db.components.bulkDelete([...subtree]);
}

/** Delete a composite, its variants, and all template component subtrees (stamped copies are untouched). */
export async function deleteCompositeCascade(compositeId: string): Promise<void> {
  const composite = await db.composites.get(compositeId);
  if (!composite) return;

  const variants = await db.compositeVariants.where('compositeId').equals(compositeId).toArray();
  const roots = new Set<string>([composite.rootComponentId]);
  for (const v of variants) {
    roots.add(v.groupComponentId);
  }

  for (const rootId of roots) {
    await deleteComponentSubtreeIfExists(rootId);
  }

  await db.compositeVariants.where('compositeId').equals(compositeId).delete();
  await db.composites.delete(compositeId);
}
