import { cloneUtil } from './clone-util';
import { v4 as uuidv4 } from 'uuid';
import { AddToShelf } from '../../generated-types';
import { TPrismaClient } from '@/database';

interface AddToShelfUtil {
  db: TPrismaClient;
  input: AddToShelf;
  userId: string;
  username?: string;
}

/**
 * Copies RS and all associations from published table to ruleset table
 *
 * Entities receive unique IDs, but keep entity IDs to maintain internal relationships
 */
export const addToShelf = async ({ db, input, userId, username }: AddToShelfUtil) => {
  const { id, isModule } = input;

  const publishedRuleset = await db.publishedRuleset.findUnique({
    where: {
      id,
    },
  });

  if (!publishedRuleset) {
    throw Error('Ruleset not found');
  }

  // The creator might have deleted the original ruleset after publishing it. If they re-add it, we want the new copy to
  // control the publishing status. Giving it the same ID as the published ruleset will do that.
  const originalCreatorIsReaddingItToShelf = publishedRuleset.createdById === userId && !isModule;

  const { live, includesAI, includesPDF, explicit, currentPrice, ...sharedRulesetProps } =
    publishedRuleset;

  const rs = await db.ruleset.create({
    data: {
      ...sharedRulesetProps,
      id: originalCreatorIsReaddingItToShelf ? publishedRuleset.id : uuidv4(),
      publishedRulesetId: originalCreatorIsReaddingItToShelf ? null : publishedRuleset.id,
      userId,
      rulesetId: isModule ? publishedRuleset.id : (publishedRuleset.rulesetId ?? undefined), // If this is a module, the ID of the ruleset to which it belongs
      title: isModule ? `${publishedRuleset.title} Module` : publishedRuleset.title,
      isModule: isModule ?? publishedRuleset.isModule ?? false,
      rulesetPermissions: publishedRuleset.rulesetPermissions ?? undefined,
      createdBy: isModule ? username : publishedRuleset.createdBy,
      createdById: isModule ? userId : publishedRuleset.createdById,
      details: publishedRuleset.details ?? undefined,
      rulesetTitle: publishedRuleset.title,
    },
  });

  const rulesetId = rs.id;

  const { cloneAllEntities } = await cloneUtil({
    db,
    originalRulesetId: id,
    rulesetId,
  });

  await cloneAllEntities();

  return rs;
};
