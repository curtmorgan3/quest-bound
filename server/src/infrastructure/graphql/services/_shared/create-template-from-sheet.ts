import { v4 as uuidv4 } from 'uuid';
import { createClonedComponents } from './create-sheet-from-template';
import { CreateSheet, SheetType } from '../../generated-types';
import { TPrismaClient } from '@/database';

interface CreateTemplateFromSheetInput {
  db: TPrismaClient;
  sheetId: string;
  rulesetId: string;
  overrides?: CreateSheet;
}

export const createTemplateFromSheet = async ({
  db,
  sheetId,
  rulesetId,
  overrides,
}: CreateTemplateFromSheetInput) => {
  const sheet = await db.sheet.findUnique({
    where: {
      id: `${sheetId}-${rulesetId}`,
    },
    include: {
      image: true,
      backgroundImage: true,
    },
  });

  if (!sheet) {
    throw Error('Sheet not found');
  }

  const entityId = uuidv4();

  const templateFromSheet = await db.sheet.create({
    data: {
      ...sheet,
      id: `${entityId}-${rulesetId}`,
      entityId,
      type: SheetType.TEMPLATE,
      backgroundImage: undefined,

      templateName: null,
      templateId: null,
      version: sheet.version ?? 1,
      pageId: null,

      templateType: overrides?.templateType ?? null,
      title: overrides?.title ?? `Template from ${sheet.title}`,
      description: overrides?.description ?? undefined,
      details: overrides?.details ?? sheet.details ?? '{}',
      rulesetId: overrides?.rulesetId ?? null,

      backgroundImageId: sheet.backgroundImageId ?? null,
      image: undefined,
      imageId: sheet.imageId ?? null,
      tabs: sheet.tabs ?? undefined,
      sections: sheet.sections ?? undefined,
    },
    include: {
      image: true,
    },
  });

  await createClonedComponents({
    db,
    associatedId: rulesetId,
    originalSheetId: sheet.id,
    newSheetId: templateFromSheet.id,
    createdFromPublishedRuleset: false,
  });

  return {
    ...templateFromSheet,
    username: templateFromSheet.createdBy ?? '',
  } as any; // Required for compilation within prisma layer
};
