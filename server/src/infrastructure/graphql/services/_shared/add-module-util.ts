import { PrismaClient } from '@prisma/client';
import { cloneUtil } from './clone-util';

interface AddModule {
  db: PrismaClient;
  moduleId: string;
  rulesetId: string;
  userId: string;
}

export async function addModule({ db, rulesetId, moduleId }: AddModule) {
  // Clone the modules entities into the ruleset
  const { cloneAllEntities } = await cloneUtil({
    db,
    rulesetId,
    originalRulesetId: moduleId,
    addingModule: true,
  });

  await cloneAllEntities();

  return 'success';
}
